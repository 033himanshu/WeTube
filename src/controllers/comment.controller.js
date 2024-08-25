import { asyncHandler } from "../utils/asyncHandler.js";
import { Comment } from "../models/comment.model.js"
import {Video} from "../models/video.model.js"
import { ApiResponse } from "../utils/ApiResponse.js";
import { ApiError } from "../utils/ApiError.js";
import mongoose from "mongoose";
const getVideoComments = asyncHandler(async(req, res)=>{
    const {videoId} = req.params
    const video = new mongoose.Types.ObjectId(videoId)
    const comments = await Comment.aggregate([
        {$match : {video}}
    ])
    return  res
    .status(200)
    .json(new ApiResponse(200, comments, "comments fetched Successfully"))
})

const addComment = asyncHandler(async(req, res)=>{
    const {videoId} = req.params
    const {content} = req.body
    const video = await Video.findById(videoId)
    // if(req.user?.id)
    //     throw new ApiError(401, "User Not exist")
    if(!video){
        throw new ApiError(401, "Invalid Video Id")
    }
    if(!content){
        throw new ApiError(401, "Comment Required")
    }
    const comment = await Comment.create({
        video : videoId,
        content,
        owner : req.user._id,
    })

    return res
    .status(200)
    .json(new ApiResponse(200, comment, "Comment added Successfully"))

})


const updateComment = asyncHandler(async(req, res)=>{
    const {commentId} = req.params
    const {content} = req.body
    const comment = await Comment.findById(commentId)
    if(!content){
        throw new ApiError(401, "Comment Required")
    }
    if(!comment){
        throw new ApiError(401, "Comment Id Not Found")
    }
    if(!comment.owner.equals(new mongoose.Types.ObjectId(req.user._id))){
        throw new ApiError(400, "User not Authenicate to Update this comment")
    }
    const updatedComment = await Comment.findByIdAndUpdate(
        commentId,
        {
            $set : {
                content,
            }
        },
        {new : true},
    ).select("-createdAt -updatedAt -__v")
    return res
    .status(200)
    .json(new ApiResponse(200, updatedComment, "Comment Updated Succesffully"))

})

const deleteComment = asyncHandler(async(req, res)=>{
    const {commentId} = req.params
    const comment = await Comment.findById(commentId)
    if(!comment){
        throw new ApiError(401, "Comment Id Not Found")
    }
    if(!comment.owner.equals(new mongoose.Types.ObjectId(req.user._id))){
        throw new ApiError(400, "User not Authenicate to delete this comment")
    }
    await Comment.findByIdAndDelete(commentId)
    return res
    .status(200)
    .json(new ApiResponse(200, {}, "Comment deleted Successfully"))

})


export {
    getVideoComments,
    addComment,
    updateComment,
    deleteComment
}