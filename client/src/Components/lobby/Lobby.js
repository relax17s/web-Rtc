import React, { useEffect, useState } from 'react'
import './lobby.css';
import { useNavigate } from 'react-router-dom';

export default function Lobby(props) {
    const [room,setRoom]=useState('');
    const [uname,setUname]=useState('');
    const navigate = useNavigate();
    const { setname } = props;

    useEffect(()=>{
        if(props.flag){
            window.location.reload();
        }
    },[props.flag])

    let toRoom=()=>{
        setname(uname);
        navigate(`/${room}`);
    }
    let toZego=()=>{
        navigate('/zego');
    }
    let onChangeHandler=(e)=>{
        e.preventDefault();
        setRoom(e.target.value);
    }
    return (
        <>
            <main id="room__lobby__container">

                <div id="form__container">
                    <div id="form__container__header">
                        <p>👋 Create or Join Room</p>
                    </div>
                    <form id="lobby__form">
                        <div className="form__field__wrapper">
                            <label>Your Name</label>
                            <input type="text" name="name" value={uname} onChange={(e)=>{setUname(e.target.value)}} required placeholder="Enter your display name..." />
                        </div>
                        <div className="form__field__wrapper">
                            <label>Room Name</label>
                            <input type="text" name="room" value={room} onChange={onChangeHandler} required placeholder="Enter room name..." />
                        </div>
                        <div className="form__field__wrapper">
                            <button type="submit" onClick={toRoom}>Go to Webrtc
                                <svg xmlns="https://www.w3.org/TR/SVG2/" width="24" height="24" viewBox="0 0 24 24"><path d="M13.025 1l-2.847 2.828 6.176 6.176h-16.354v3.992h16.354l-6.176 6.176 2.847 2.828 10.975-11z" /></svg>
                            </button>
                            <button type="submit" onClick={toZego}>Go to Zego
                                <svg xmlns="https://www.w3.org/TR/SVG2/" width="24" height="24" viewBox="0 0 24 24"><path d="M13.025 1l-2.847 2.828 6.176 6.176h-16.354v3.992h16.354l-6.176 6.176 2.847 2.828 10.975-11z" /></svg>
                            </button>
                        </div>
                    </form>
                </div>
            </main>
        </>
    )
}
