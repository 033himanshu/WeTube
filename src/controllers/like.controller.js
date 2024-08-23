import { Like } from "../models/like.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import {ApiResponse} from "../utils/ApiResponse.js"
import {ApiError} from "../utils/ApiError.js"
const getLikedVideos =  asyncHandler(async(req, res)=>{
    const videos = await Like.find(
        {likedBy: req.user?._id},
        {video : {$exists : true}},
    )
    return res
    .status(200)
    .json(new ApiResponse(200, videos, "Liked videos fetched"))
})

const toggleCommentLike = asyncHandler(async(req, res)=>{
    const {commentId} = req.params
    const comment = await Comment.findById(commentId)
    if(!comment){
        throw new ApiError("Comment Does not Exist")
    }
    const like = await Like.findOne({comment : commentId, likedBy: req.user._id})
    if(!like){
        const newLike = await Like.create({comment : commentId, likedBy: req.user._id})
        return res
        .status(200)
        .json(new ApiResponse(200, newLike, "Comment Liked"))
    }else{
        await Like.findByIdAndDelete(like._id)
        return res
        .status(200)
        .json(new ApiResponse(200, {}, "Comment Like removed"))
    }
})

const toggleTweetLike = asyncHandler(async(req, res)=>{
    const {tweetId} = req.params
    const tweet = await Tweet.findById(tweetId)
    if(!tweet){
        throw new ApiError("Tweet Does not Exist")
    }
    const like = await Like.findOne({tweet : tweetId, likedBy: req.user._id})
    if(!like){
        const newLike = await Like.create({tweet : tweetId, likedBy: req.user._id})
        return res
        .status(200)
        .json(new ApiResponse(200, newLike, "Tweet Liked"))
    }else{
        await Like.findByIdAndDelete(like._id)
        return res
        .status(200)
        .json(new ApiResponse(200, {}, "Tweet Like removed"))
    }
})

const toggleVideoLike = asyncHandler(async(req, res)=>{
    const {videoId} = req.params
    const video = await Video.findById(videoId)
    if(!video){
        throw new ApiError("Video Does not Exist")
    }
    const like = await Like.findOne({video : videoId, likedBy: req.user._id})
    if(!like){
        const newLike = await Like.create({video : videoId, likedBy: req.user._id})
        return res
        .status(200)
        .json(new ApiResponse(200, newLike, "Video Liked"))
    }else{
        await Like.findByIdAndDelete(like._id)
        return res
        .status(200)
        .json(new ApiResponse(200, {}, "Video Like removed"))
    }
})

export {
    getLikedVideos,
    toggleCommentLike,
    toggleTweetLike,
    toggleVideoLike,
}
