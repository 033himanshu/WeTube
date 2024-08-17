import { asyncHandler } from "../utils/asyncHandler.js";
import { Comment } from "../models/comment.model.js"
import {Video} from "../models/video.model.js"
import { ApiResponse } from "../utils/ApiResponse";
import { ApiError } from "../utils/ApiError.js";
const getVideoComments = asyncHandler(async(req, res)=>{
    const {videoId} = req.params
    const comments = await Comment.find({
        $match : {
            video : videoId
        }
    })
    return  res
    .status(200)
    .json(new ApiResponse(200, comments, "comments fetched Successfully"))
})

const addComment = asyncHandler(async(req, res)=>{
    const {videoId} = req.params
    const {content} = req.body
    const video = await Video.findById(videoId)
    if(req.user?.id)
        throw new ApiError(401, "User Not exist")
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
    .json(200, comment, "Comment added Successfully")

})


const updateComment = asyncHandler(async(req, res)=>{
    const {commentId} = req.params
    const {content} = req.body
    const comment = await Comment.findById(commentId)
    if(!comment){
        throw new ApiError(401, "Comment Id Not Found")
    }
    if(comment.owner != req.user?._id){
        throw new ApiError(400, "User not Authenicate to Update this comment")
    }
    if(!content){
        throw new ApiError(401, "Comment Required")
    }

    comment.content = content
    const newComment= await comment.save({ValidateBeforeSave : false})
    return res
    .status(200)
    .json(new ApiResponse(200, newComment, "Comment Updated Succesffully"))

})

const deleteComment = asyncHandler(async(req, res)=>{
    const {commentId} = req.params
    const comment = await Comment.findById(commentId)
    if(!comment){
        throw new ApiError(401, "Comment Id Not Found")
    }
    if(comment.owner != req.user?._id){
        throw new ApiError(400, "User not Authenicate to delete this comment")
    }
    await Comment.findByIdAndDelete(commentId)
    return res
    .status(200)
    .json(200, {}, "Comment deleted Successfully")

})


export {
    getVideoComments,
    addComment,
    updateComment,
    deleteComment
}