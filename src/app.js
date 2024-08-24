import express from "express"
import cors from "cors"
import cookieParser from "cookie-parser"


const app = express()
app.use(cors({
    origin : process.env.CORS_ORIGIN,
    credentials: true,
}))

app.use(express.json({
    limit : "16kb",
}))
app.use(express.urlencoded({extended: true, limit:"16kb"})) // extended because we can give object under another object
app.use(express.static("public"))
app.use(cookieParser())

const apiVersion = "/api/v1"

//routes
import {
    commentRouter,
    dashboardRouter,
    healthcheckRouter,
    likeRouter,
    playlistRouter,
    subscriptionRouter,
    tweetRouter,
    userRouter,
    videoRouter,
} from "./routes/index.js"

app.use(`${apiVersion}/users`, userRouter)
//https://localhost:8000/api/v1/users/register
app.use(`${apiVersion}/video`, videoRouter)
app.use(`${apiVersion}/tweet`, tweetRouter)
app.use(`${apiVersion}/subscribtion`, subscriptionRouter)
app.use(`${apiVersion}/like`, likeRouter)
app.use(`${apiVersion}/comment`, commentRouter)
app.use(`${apiVersion}/dashboard`, dashboardRouter)
app.use(`${apiVersion}/healthcheck`, healthcheckRouter)
app.use(`${apiVersion}/playlist`, playlistRouter)

export {app}