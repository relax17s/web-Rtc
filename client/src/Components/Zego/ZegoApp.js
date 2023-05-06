import React, {  useState } from 'react';
import '../../App.css';
// import TextEditor from './Components/TextEditor';
import Zego from './Zego';
import cam from "../images/doc.png";
import TextEditor from '../texteditor/Texteditor';
function ZegoApp() {
    const [popup, setpopup] = useState(false);

    function toggleVideo() {
        setpopup(popup ? false : true)
    }
    return (
        <div className="Zego">
            <div className='controls'>
                <div className='control-container'>
                    <img src={cam} alt="error" onClick={toggleVideo}></img>
                </div>
            </div>
            <Zego roomId="123" />
            <div>
                {popup && <TextEditor roomId="123" />  }
            </div>
        </div>

    );
}
export default ZegoApp;












