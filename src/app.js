import express from "express"
import cookieParser from "cookie-parser";
import cors from "cors";
import morgan from "morgan";

const app = express()

app.use(cors({
    origin: ["https://tube-tweet-kohl.vercel.app","http://localhost:5173"],
    credentials: true 
}))

app.use(express.json({limit: "16kb"}))
app.use(express.urlencoded({extended: true, limit: "16kb"}))
app.use(express.static("public"))
app.use(cookieParser())
app.use(morgan("dev"))

//routes import

import userRouter from './routes/user.routes.js';
import videoRouter from './routes/video.routes.js';
import tweetRouter from './routes/tweet.routes.js';
import subscriptionRouter from './routes/subscription.routes.js';
import commentRouter from './routes/comment.routes.js';
import playlistRouter from './routes/playlist.routes.js';
import likeRouter from './routes/like.routes.js';
import dashboardRouter from './routes/dashboard.routes.js';

//routes declaration
app.use("/api/v1/users" , userRouter);
//http://localhost:8000/api/v1/users/register
app.use("/api/v1/videos", videoRouter);
app.use("/api/v1/tweets", tweetRouter);
app.use("/api/v1/subscription", subscriptionRouter);
app.use("/api/v1/playlist", playlistRouter);
app.use("/api/v1/comment", commentRouter);
app.use("/api/v1/like", likeRouter);
app.use("/api/v1/dashboard", dashboardRouter);

export { app };