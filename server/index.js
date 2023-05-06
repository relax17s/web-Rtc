const mongoose=require('mongoose');
const Document=require('./documentSchema');
const express=require('express')
const app=express();
const http=require("http").createServer(app);
const {Server} =require("socket.io");
const cors=require('cors')

app.use(cors()); 

const io =new Server(http,{
    cors :{
        origin : "*", 
        methods:["GET","POST"],
    },   
});
port = process.env.PORT || 3001;
http.listen(port,()=>{
    console.log("server running on port 3001");
})

mongoose.connect(process.env.MONGO_URL,{
    useNewUrlParser: true,
    useUnifiedTopology: true,
}).then(()=>{console.log("connected to db")}).catch((err)=>{
    console.log(err);
})


io.on('connection',socket =>{
    console.log("connected");
    socket.on('disconnect',()=>{
        console.log("disconnected")
    })
    socket.on('get-document', async (id)=>{
        let document=await findOrCreateDocument(id);
        console.log(id);
        socket.join(id);
        socket.emit('load-document',document.data)
        socket.on('send-changes',(delta)=>{
            socket.broadcast.to(id).emit("receive-changes",delta);
        })
        socket.on("save-document", async (data)=>{
            await Document.findByIdAndUpdate(id,{data})
        })
    })
    socket.on('canvas-data', (data)=> {
        socket.broadcast.emit('canvas-data', data);
        console.log("whitboard");
  }) 
})

let findOrCreateDocument = async (id)=>{
    if(id===null){
        return ;
    }
    const document = await Document.findById(id);
    if(document){
        return document;
    }
    return await Document.create({_id:id,data:"" })
}