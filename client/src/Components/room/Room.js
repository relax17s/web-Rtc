import React, { useCallback, useEffect, useRef, useState } from 'react'
import './room.css';
import {  useNavigate, useParams } from 'react-router-dom';
import logo from '../images/logo.png';
import doc from '../images/download.png';
import white from '../images/images.png';
import AgoraRTM from 'agora-rtm-sdk';
import { v4 as uuid } from 'uuid';
import AgoraRTC from 'agora-rtc-react';
import TextEditor from '../texteditor/Texteditor';
import Container from '../Whiteboard/container/Container';
//app id of agora
const APP_ID = "43380b8b9bee42509926d158c0a2fea1";
//rtm client
let rtmClient;
let channel;//channel or room

let token = null;
//rtc client
let client;
//to store local(user) tracks
let localTracks = [];
// to store tracks of other participants in the room
let remoteUsers = {};
// to store which user is there in display frame
let userInDisplayFrame;
//to store the screen sharing tracks
let localScreenTracks;
// to check to expand or hide the display frame
let shouldExpandOrHide=true;

export default function Room(props) {
    const memberContainer = useRef();
    const chatContainer = useRef();
    const chat = useRef();
    const displayFrame = useRef();
    const camRef = useRef();
    const streamActionsRef = useRef();
    const streamsContainerRef = useRef();
    const membersWrapperRef = useRef();
    const joinBtnRef = useRef();
    const [activeChat, setActiveChat] = useState(true);
    const [activeMembers, setActiveMembers] = useState(true);
    const { roomId } = useParams();
    const [uid, setUid] = useState();
    const [camActive, setCamActive] = useState(true);
    const [micActive, setMicActive] = useState(true);
    const [screenActive, setScreenActive] = useState(false);
    const [docDisplay, setDocDisplay] = useState(false);
    const [whiteBoardDisplay, setWhiteBoardDisplay] = useState(false);
    const navigate = useNavigate();
    const [total,setTotal] = useState(0);
    const [msg,setMsg] = useState('');

    // set a unique user id for ever user joined
    useEffect(() => {
        // to make sure the chat is always scrolled down
        chat.current.scrollTop = chat.current.scrollHeight;
        //generating a new user id for the user
        const uuidValue = uuid();
        //setting the user id
        setUid(uuidValue);
    }, []);
    // to toggle the chat
    let displayChat = () => {
        if (activeChat) {
            chatContainer.current.style.display = 'block';
            setActiveChat(false);
        }
        else {
            chatContainer.current.style.display = 'none';
            setActiveChat(true);
        }
    }
    // to toggle the members list
    let displayMembers = () => {
        if (activeMembers) {
            memberContainer.current.style.display = 'block';
            setActiveMembers(false);
        } else {
            memberContainer.current.style.display = 'none';
            setActiveMembers(true);
        }
    }
    //to toggle the mic
    let toggleMic = async () => {
        if (localTracks[0].muted) {
            //unmuting the audio tracks
            await localTracks[0].setMuted(false);
            setMicActive(true);
        }
        else {
            //muting the video tracks
            await localTracks[0].setMuted(true);
            setMicActive(false);
        }
    }
    // to toggle text editor
    let docHandler = () => {
        if(!whiteBoardDisplay){
            if (!docDisplay) {
                displayFrame.current.style.display = 'block';
                setDocDisplay(true);
                shouldExpandOrHide=false;
                // if there is a video streaming in the displayFrame removing and appending to small frame
                let child = displayFrame.current.children[0];
                if (child) {
                    streamsContainerRef.current.appendChild(child);
                }
            }
            else {
                //hiding the diplay frame and removing the doc
                displayFrame.current.style.display = 'none';
                setDocDisplay(false);
                shouldExpandOrHide = true;
            }
        }
    }
    //to toggle whiteboard
    let whiteboardHandler = () => {
        if(!docDisplay){
            if (!whiteBoardDisplay) {
                displayFrame.current.style.display = 'block';
                setWhiteBoardDisplay(true);
                shouldExpandOrHide=false;
                // if there is a video streaming in the displayFrame removing and appending to small frame
                let child = displayFrame.current.children[0];
                if (child) {
                    streamsContainerRef.current.appendChild(child);
                }
            }
            else {
                //hiding the diplay frame and removing the doc
                displayFrame.current.style.display = 'none';
                setWhiteBoardDisplay(false);
                shouldExpandOrHide = true;
            }
        }
    }
    // to toggle screen
    let toggleScreen = async (e) => {
        if (!screenActive) {
            setScreenActive(true);
            camRef.current.style.display = 'none';
            //asks the user for screen share and storing its tracks
            localScreenTracks = await AgoraRTC.createScreenVideoTrack();
            //removing the current video frame before adding screen share
            document.getElementById(`user-container-${uid}`).remove();
            displayFrame.current.style.display = 'block';
            //creating a new player frame for screen sharing
            let player = `<div class="video__container" id="user-container-${uid}" >
                                <div class = "video-player" id="user-${uid}"></div>
                        </div>`;
            // adding the screen player to the display frame
            displayFrame.current.insertAdjacentHTML('beforeend', player);
            //adding the expandVideoFrame event listener to the player
            document.getElementById(`user-container-${uid}`).addEventListener('click', expandVideoFrame);
            //storing the uid which is in the display frame
            userInDisplayFrame = `user-container-${uid}`;
            //playing the screen sharing tracks
            localScreenTracks.play(`user-${uid}`);
            //unpublishing the video track when screen is active
            await client.unpublish([localTracks[1]]);
            //publishing the screen sharing tracks
            await client.publish([localScreenTracks]);
        }
        else {
            setScreenActive(false);
            camRef.current.style.display = 'block';
            // removing the player from dom
            document.getElementById(`user-container-${uid}`).remove();
            //unpublishing the screen sharing tracks
            await client.unpublish([localScreenTracks]);
            //adding back our video frame after removing the screen sharing track
            switchToCam();
        }
    }
    // to toggle the cam 
    let toggleCamera = async () => {
        if (localTracks[1].muted) {
            //unmuting the video tracks
            await localTracks[1].setMuted(false);
            setCamActive(true);
        }
        else {
            //muting the video tracks
            await localTracks[1].setMuted(true);
            setCamActive(false);
        }
    }
    //hiding the display frame
    let hideDisplayFrame = () => {
        // checking if doc is currently active or not
        if(shouldExpandOrHide){
            userInDisplayFrame = null;
            displayFrame.current.style.display = null;
            let child = displayFrame.current.children[0];
            streamsContainerRef.current.appendChild(child);
        }
    }
    // to get all the members in the room
    let getMembers = useCallback( async ()=>{
        let members= await channel.getMembers();
        //updating the total members count
        updateMemberTotal(members);
        //adding all the members to the dom to display the members in room
        for(let i=0;i<members.length;i++){
            addMemberToDom(members[i]);
        }
    },[])

    let handleChannelMessage = useCallback( async (messageData,MemberId)=>{
        // console.log('A new message received');
        let data=JSON.parse(messageData.text);
        // console.log(data);
        if(data.type==='chat'){
            addMessageToDom(data.diplayName,data.message);
        }
        else if(data.type==='user_left'){
            let usr =document.getElementById(`user-container-${data.uid}`);
            if(usr){
                usr.remove();
            }
            if(userInDisplayFrame===`user-container-${uid}`) {
                displayFrame.current.style.display='none';
            }
        }
    },[uid])

    let sendMessage = async (e)=>{
        e.preventDefault();
        if(msg!==''){
            channel.sendMessage({text:JSON.stringify({'type':'chat','message':msg,'diplayName':props.name})});
            addMessageToDom(props.name,msg);
            setMsg('');
        }
    }

    let addMessageToDom = (name,message)=>{
        let newMessage = `<div className="message__wrapper">
                            <div className="message__body">
                                <strong className="message__author">${name}</strong>
                                <p className="message__text">${message}</p>
                            </div>
                        </div>`
        chat.current.insertAdjacentHTML('beforeend',newMessage);
        const lastMessage = document.querySelector('#messages .message__wrapper :last-child');
        if(lastMessage){
            // lastMessage.scrollIntoView();
            chat.current.scrollTop = chat.current.scrollHeight;
        }
    }

    let addBotMessageToDom = (botMessage)=>{
        let newMessage =`<div className="message__wrapper">
                            <div className="message__body__bot">
                                <strong className="message__author__bot">🤖 Mumble Bot</strong>
                                <p className="message__text__bot">${botMessage}</p>
                            </div>
                        </div>`
        chat.current.insertAdjacentHTML('beforeend',newMessage);
        const lastMessage = document.querySelector('#messages .message__wrapper :last-child');
        if(lastMessage){
            // lastMessage.scrollIntoView();
            chat.current.scrollTop = chat.current.scrollHeight;
        }
    }

    let updateMemberTotal = async (members)=>{
        setTotal(members.length);
    }

    let addMemberToDom = async (MemberId)=>{
        let {name} = await rtmClient.getUserAttributesByKeys(MemberId,['name']);

        let memberItem = `<div className="member__wrapper" id="member__${MemberId}__wrapper">
                            <span className="green__icon"></span>
                                <p className="member_name">${name}</p>
                            </div>`
        membersWrapperRef.current.insertAdjacentHTML('beforeend',memberItem);
    } 

    let removeMemberFromDom = useCallback( async (MemberId)=>{
        let member = document.getElementById(`member__${MemberId}__wrapper`);
        let {name} = await rtmClient.getUserAttributesByKeys(MemberId,['name']);
        await member.remove();
        addBotMessageToDom(`${name} has left the room`);
    },[]);

    let handleMemberLeft = useCallback(async(MemberId)=>{
        removeMemberFromDom(MemberId);
        let members = await channel.getMembers()
        updateMemberTotal(members)
    },[removeMemberFromDom])

    let handleMemberJoined = useCallback(async (MemberId)=>{
        // console.log("a member joined",MemberId);
        let {name} = await rtmClient.getUserAttributesByKeys(MemberId,['name']);
        addMemberToDom(MemberId);
        let members = await channel.getMembers()
        updateMemberTotal(members)
        addBotMessageToDom(`Welcome to the room ${name}! 👋`)
    },[])

    let expandVideoFrame = useCallback(async (e) => {
        if (shouldExpandOrHide) {
            let child = displayFrame.current.children[0];
            if (child) {
                streamsContainerRef.current.appendChild(child);
            }
            displayFrame.current.style.display = 'block';
            displayFrame.current.appendChild(e.currentTarget);
            userInDisplayFrame = e.currentTarget.id;
            displayFrame.current.addEventListener('click', hideDisplayFrame);
        }
    }, [])

    let leaveStream = async (e)=>{
        // e.preventDefault();
        joinBtnRef.current.style.display='block';
        streamActionsRef.current.style.display='none';

        for(let i=0;i<localTracks.length;i++){
            localTracks[i].stop();
            localTracks[i].close();
        }
        await client.unpublish([localTracks[0],localTracks[1]]);
        if(localScreenTracks){
            await client.unpublish([localScreenTracks]);
        }
        let user = document.getElementById(`user-container-${uid}`);
        if(user){
            user.remove();
        }
        if(userInDisplayFrame===`user-container-${uid}`) {
            displayFrame.current.style.display='none';
        }
        channel.sendMessage({text:JSON.stringify({'type':'user_left','uid':uid})});
    }

    // let handleLobbyBtn = async()=>{
    //     for(let i=0;i<localTracks.length;i++){
    //         localTracks[i].stop();
    //         localTracks[i].close();
    //     }
    //     await client.unpublish([localTracks[0],localTracks[1]]);
    //     if(localScreenTracks){
    //         await client.unpublish([localScreenTracks]);
    //     }
    //     let user = document.getElementById(`user-container-${uid}`);
    //     if(user){
    //         user.remove();
    //     }
    //     if(userInDisplayFrame===`user-container-${uid}`) {
    //         displayFrame.current.style.display='none';
    //     }
    //     channel.sendMessage({text:JSON.stringify({'type':'user_left','uid':uid})});
    //     await channel.leave();
    //     navigate('/');
    //     // await client.logout();
    //     props.setflag(true);

    // }

    let joinStream = useCallback(async () => {
        joinBtnRef.current.style.display='none';
        streamActionsRef.current.style.display='flex';

        localTracks = await AgoraRTC.createMicrophoneAndCameraTracks({}, {
            encoderConfig: {
                width: { min: 640, ideal: 1920, max: 1920 },
                height: { min: 480, ideal: 1080, max: 1080 }
            }
        });
        if (uid) {
            let player = `<div class="video__container" id="user-container-${uid}" >
                                <div class = "video-player" id="user-${uid}"></div>
                        </div>`;
            streamsContainerRef.current.insertAdjacentHTML('beforeend', player);
            document.getElementById(`user-container-${uid}`).addEventListener('click', expandVideoFrame);

            localTracks[1].play(`user-${uid}`);
            await client.publish([localTracks[0], localTracks[1]])
        }
    }, [uid, expandVideoFrame]);
    //switching back to the cam after screen sharing is closed && muting the cam n voice initially
    let switchToCam = async () => {
        let player = `<div class="video__container" id="user-container-${uid}" >
                                <div class = "video-player" id="user-${uid}"></div>
                        </div>`;
        streamsContainerRef.current.insertAdjacentHTML('beforeend', player);
        await localTracks[0].setMuted(true);
        await localTracks[1].setMuted(true);
        setCamActive(false);
        setMicActive(false);
        localTracks[1].play(`user-${uid}`);
        await client.publish([localTracks[1]])
    }

    let handleUserLeft = useCallback(async (user) => {
        delete remoteUsers[user.uid];
        let item=document.getElementById(`user-container-${user.uid}`);
        if(item){
            item.remove();
        }
        if (userInDisplayFrame === `user-container-${user.uid}`) {
            displayFrame.current.style.display = null;
        }
    }, [])

    let handleUserPublished = useCallback(async (user, mediaType) => {
        remoteUsers[user.uid] = user;

        await client.subscribe(user, mediaType);

        let player = await document.getElementById(`user-container-${user.uid}`);
        if (player === null) {
            player = `<div class="video__container" id="user-container-${user.uid}" >
                        <div class = "video-player" id="user-${user.uid}"></div>
                    </div>`;
            streamsContainerRef.current.insertAdjacentHTML('beforeend', player);
            document.getElementById(`user-container-${user.uid}`).addEventListener('click', expandVideoFrame);
        }
        if (mediaType === 'video') {
            user.videoTrack.play(`user-${user.uid}`);
        }
        if (mediaType === 'audio') {
            user.audioTrack.play();
        }
    }, [expandVideoFrame])
    // removing the user from the room
    let leaveChannel = useCallback(async () => {
        await channel.leave()
        await client.logout()
    }, [])

    useEffect(() => {
        //adding the event to leave the user when user closes the window or page
        window.addEventListener('beforeunload', leaveChannel);
        return () => {
            //unmounting
            window.removeEventListener('beforeunload', leaveChannel);
        };
    }, [leaveChannel]);

    useEffect(() => {
        let joinRoomInit = async () => {
            rtmClient = await AgoraRTM.createInstance(APP_ID);
            await rtmClient.login({ uid, token });
            // adding the name for the user
            await rtmClient.addOrUpdateLocalUserAttributes({'name':props.name});

            channel = await rtmClient.createChannel(roomId);
            await channel.join();
            // to handle channel events
            channel.on('MemberJoined',handleMemberJoined);
            channel.on('MemberLeft',handleMemberLeft);
            channel.on('ChannelMessage',handleChannelMessage);
            //to update participants list and count when a new user is joined
            getMembers();
            //a bot msg to say a new user has joined
            addBotMessageToDom(`Welcome to the room ${props.name}! 👋`)

            client = AgoraRTC.createClient({ mode: 'rtc', codec: 'vp8' });
            await client.join(APP_ID, roomId, token, uid);
            //to handle client events
            client.on('user-published', handleUserPublished);
            client.on('user-left', handleUserLeft);
            return channel;
        }
        let connection;
        //checking if user has joined direct the channel or from the lobby page
        if(props.name){
            connection = joinRoomInit();
        }
        else{
            navigate('/');//else navigating to the lobby page
        }
        return ()=>{
            //unmounting
            const leave = async () => {
                const channel = await connection;
                await client.logout();
                await channel.leave();
            }
            leave();
        }
    }, [roomId, joinStream, handleUserPublished, handleUserLeft, uid,handleMemberJoined,handleMemberLeft,getMembers,navigate,props.name,handleChannelMessage])
    return (
        <>
            <header id="nav">
                <div className="nav--list">
                    <button id="members__button" onClick={displayMembers}>
                        <svg width="24" height="24" xmlns="http://www.w3.org/2000/svg" fillRule="evenodd" clipRule="evenodd"><path d="M24 18v1h-24v-1h24zm0-6v1h-24v-1h24zm0-6v1h-24v-1h24z" fill="#ede0e0" /><path d="M24 19h-24v-1h24v1zm0-6h-24v-1h24v1zm0-6h-24v-1h24v1z" /></svg>
                    </button>
                    <h3 id="logo">
                        <img src={logo} alt="Site Logo" />
                        <span>Webrtc</span>
                    </h3>
                </div>
                <div id="nav__links">
                    <button id="chat__button" onClick={displayChat}><svg width="24" height="24" xmlns="http://www.w3.org/2000/svg" fillRule="evenodd" fill="#ede0e0" clipRule="evenodd"><path d="M24 20h-3v4l-5.333-4h-7.667v-4h2v2h6.333l2.667 2v-2h3v-8.001h-2v-2h4v12.001zm-15.667-6l-5.333 4v-4h-3v-14.001l18 .001v14h-9.667zm-6.333-2h3v2l2.667-2h8.333v-10l-14-.001v10.001z" /></svg></button>
                    {/* <button className="nav__link" id="create__room__btn" onClick={handleLobbyBtn}>
                        Lobby
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="#ede0e0" viewBox="0 0 24 24"><path d="M12 0c-6.627 0-12 5.373-12 12s5.373 12 12 12 12-5.373 12-12-5.373-12-12-12zm6 13h-5v5h-2v-5h-5v-2h5v-5h2v5h5v2z" /></svg>
                    </button> */}
                </div>
            </header >
            <main className="main__container">
                <div id="room__container">
                    <section id="members__container" ref={memberContainer}>

                        <div id="members__header">
                            <p>Participants</p>
                            <strong id="members__count">{total}</strong>
                        </div>
                        <div id="member__list" ref={membersWrapperRef}>
                        </div>
                    </section>

                    <section id="stream__container">
                        <div id='stream__box' className='diplay__frame' ref={displayFrame}>
                            {docDisplay && <TextEditor roomId={roomId} />}
                            {whiteBoardDisplay && <Container />}

                        </div>
                        <div id='streams__container' ref={streamsContainerRef}  >
                        </div>
                        <div className="stream__actions" ref={streamActionsRef}>
                            <button className={camActive ? "active" : ''} onClick={toggleCamera} ref={camRef}>
                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path d="M5 4h-3v-1h3v1zm10.93 0l.812 1.219c.743 1.115 1.987 1.781 3.328 1.781h1.93v13h-20v-13h3.93c1.341 0 2.585-.666 3.328-1.781l.812-1.219h5.86zm1.07-2h-8l-1.406 2.109c-.371.557-.995.891-1.664.891h-5.93v17h24v-17h-3.93c-.669 0-1.293-.334-1.664-.891l-1.406-2.109zm-11 8c0-.552-.447-1-1-1s-1 .448-1 1 .447 1 1 1 1-.448 1-1zm7 0c1.654 0 3 1.346 3 3s-1.346 3-3 3-3-1.346-3-3 1.346-3 3-3zm0-2c-2.761 0-5 2.239-5 5s2.239 5 5 5 5-2.239 5-5-2.239-5-5-5z" /></svg>
                            </button>
                            <button className={micActive ? "active" : ''} onClick={toggleMic}>
                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path d="M12 2c1.103 0 2 .897 2 2v7c0 1.103-.897 2-2 2s-2-.897-2-2v-7c0-1.103.897-2 2-2zm0-2c-2.209 0-4 1.791-4 4v7c0 2.209 1.791 4 4 4s4-1.791 4-4v-7c0-2.209-1.791-4-4-4zm8 9v2c0 4.418-3.582 8-8 8s-8-3.582-8-8v-2h2v2c0 3.309 2.691 6 6 6s6-2.691 6-6v-2h2zm-7 13v-2h-2v2h-4v2h10v-2h-4z" /></svg>
                            </button>
                            <button className={screenActive ? "active" : ''} onClick={toggleScreen}>
                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path d="M0 1v17h24v-17h-24zm22 15h-20v-13h20v13zm-6.599 4l2.599 3h-12l2.599-3h6.802z" /></svg>
                            </button>
                            <button onClick={docHandler}>
                                <img src={doc} alt="error" width="30px" height="30px" />
                            </button>
                            <button onClick={whiteboardHandler}>
                                <img src={white} alt="error" width="30px" height="30px" />
                            </button>
                            <button style={{backgroundColor:`#ff5050`}} onClick={leaveStream}>
                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path d="M16 10v-5l8 7-8 7v-5h-8v-4h8zm-16-8v20h14v-2h-12v-16h12v-2h-14z" /></svg>
                            </button>
                        </div>
                        <button className='join-btn' onClick={joinStream} ref={joinBtnRef}>Join Stream</button>
                    </section>
                    <section id="messages__container" ref={chatContainer}>
                        <div id="messages" ref={chat}>
                        </div>
                        <div>
                            <form id="message__form" onSubmit={sendMessage}>
                                <input type="text" name="message" value={msg} onChange={(e)=>{setMsg(e.target.value)}} placeholder="Send a message...." />
                            </form>
                        </div>
                    </section>
                </div>
            </main>
        </>
    )
}
