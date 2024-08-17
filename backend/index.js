import express, { urlencoded } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";
import connectDB from "./utils/db.js";

import userRoute from './routes/user.route.js';
import postRoute from './routes/post.route.js';
import messageRoute from './routes/message.route.js';
import { app , server } from "./socket/socket.js";
import path from "path";

dotenv.config({});

const PORT = process.env.PORT || 3000;

const __dirname = path.resolve();

app.get("/",(req,res,next)=>{
    return res.status(200).json({
        message:"I m from backend server",
        success:true
    })
})
// middlewares
app.use(express.json());
app.use(cookieParser()); // to store token in cookie whenever you hit request on backend
app.use(urlencoded({extended:true}));

const corsOptions = {
    origin:'http://localhost:5173',
    credentials:true
}

app.use(cors(corsOptions));  // It is Basically used when server and frontend application are not running at the same localhost or URL

// Here Our API's will come

app.use("/api/v1/user",userRoute);     // "http://localhost:8000/api/v1/user/register", "http://localhost:8000/api/v1/user/login"
app.use("/api/v1/post",postRoute);
app.use("/api/v1/message",messageRoute);

app.use(express.static(path.join(__dirname,"/frontend/dist")));
app.get("*",(req,res)=>{
    res.sendFile(path.resolve(__dirname,"frontend","dist","index.html"))
})

server.listen(PORT,()=>{
    connectDB();
    console.log('server listen at PORT: ',PORT);
})