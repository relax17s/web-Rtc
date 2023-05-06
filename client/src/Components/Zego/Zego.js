import React from 'react'
import { ZegoUIKitPrebuilt } from '@zegocloud/zego-uikit-prebuilt';
import {v4 as uuidV4} from 'uuid'
import { ZegoSuperBoardManager } from "zego-superboard-web";

export default function Zego(props) {
    // const { id } = useParams();
    const id = props.roomId;
    let myMeeting = async (element) => {
        const appID = 1024162299;
        const serverSecret = "b841cc82c2ba631fe7cd0796d9b5233a";
        const kitToken = ZegoUIKitPrebuilt.generateKitTokenForTest(appID, serverSecret, id, uuidV4(), "puneeth");
        const zp = ZegoUIKitPrebuilt.create(kitToken);
        zp.addPlugins({ZegoSuperBoardManager});
        zp.joinRoom({
            container: element,
            scenario: {
                mode: ZegoUIKitPrebuilt.VideoConference,
            },
            whiteboardConfig: {            
                showAddImageButton: true, 
             },
        })
    }
    return (
        <>
            <div className='myCallContainer' ref={myMeeting} style={{ width: '60vw', height: '80vh' }}>
            </div>
        </>
    )
}

