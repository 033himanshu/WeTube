import { ApiError } from "../utils/ApiError.js"
import {asyncHandler} from "../utils/asyncHandler.js"
import { deleteFileFromCloudinary, uploadOnCloudinary } from "../utils/couldinary.js"
import { Video } from "../models/video.model.js"
import { ApiResponse } from "../utils/ApiResponse.js"

const getAllVideos = asyncHandler(async (req, res) => {
    let { page = 1, limit = 10, query, sortBy, sortType, userId } = req.query
    //TODO: get all videos based on query, sort, pagination
    //TODO: add sortBy,  SortType, query functionality
    page = Number(page)
    limit = Number(limit)
    if(page<=0 || limit<=0) {
        throw new ApiError(401, "Invalid Query")
    }
    const skip = (page-1)*limit;
    const videos = await Video.aggregate([
        {
            $match : { owner : userId}
        }
    ]).skip(skip).limit(limit)
    return res
    .status(200)
    .json(new ApiResponse(200, videos, "Videos Fetched Successfully"))
})

const publishAVideo = asyncHandler(async (req, res) => {
    const { title, description} = req.body
    if(!title){
        throw new ApiError(401, "Title is Required")
    }
    if(!description){
        throw new ApiError(401, "Description is Required")
    }
    const owner = req.user._id
    // TODO: get video, upload to cloudinary, create video
    const videoLocalPath = req.file?.videoFile?.[0]?.path
    if(!videoLocalPath){
        throw new ApiError(401, "Video is required")
    }
    const thumbnailLocalPath  = req.files?.thumbnail?.[0]?.path
    if(!thumbnailLocalPath){
        throw new ApiError(401, "Thumbnail is required")
    }
    const video = await uploadOnCloudinary(videoLocalPath)
    if(!video.url){
        throw new ApiError(501, "Error while uploading video")
    }
    const thumbnail = await uploadOnCloudinary(thumbnailLocalPath)
    if(!thumbnail.url){
        console.log("Thumbnail not uploading successfully, then deleting video file also")
        await deleteFileFromCloudinary(video.url)
        throw new ApiError(501, "Error while uploading video")
    }
    // TODO: set duration of video
    console.log(video)
    console.log(thumbnail)
    const uploadedVideo  =  await Video.create({
        title,
        description,
        videoFile : video.url,
        thumbnail : thumbnail.url,
        owner,
        duration : video.duration,
    })
    return res
    .status(200)
    .json(new ApiResponse(200, uploadedVideo,  "Video Published Successfully"))
})

const getVideoById = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    //TODO: get video by id
    const video = await Video.findById(videoId)
    if(!video){
        throw new ApiError(401, "Invalid Video Id")
    }
    if(!video.isPublished && video.owner != req.user._id ){
        throw new ApiError(401, "User Don't Have Access to this video file")
    }
    return res
    .status(200)
    .json(new ApiResponse(200, video, "video fetched"))
})

const updateVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    //TODO: update video details like title, description, thumbnail
    const {title, description} = req.body
    const video = await Video.findById(videoId)
    if(!video){
        throw new ApiError(401, "Invalid Video Id")
    }
    if(video.owner != req.user._id){
        throw new ApiError(401, "User don't have access to update this file")
    }
    if(!title || !description){
        throw new ApiError(401, "Title and Description is required")
    }
    const updatedVideo = await Video.findByIdAndUpdate(
        videoId,
        {
            $set : {
                title,
                description,
            }
        },
        {new : true},
    )

    return res
    .status(200)
    .json(new ApiResponse(200, updatedVideo, "Video updated Successfully"))
})

const updateThumbnail = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    const newThumbnailLocalPath = req.file?.thumbnail?.path
    const video = await Video.findById(videoId)
    if(video.owner != req.user._id){
        try{
            await deleteFileFromCloudinary("", newThumbnailLocalPath)
        }catch(e){
            console.error("ERROR : ",e)
        }finally{
            throw new ApiError(401, "User don't have access to update this file")
        }
    }
    const oldThumbnailURL = video?.thumbnail
    const deleteFromCloudinaryResponse = await deleteFileFromCloudinary(oldThumbnailURL, newThumbnailLocalPath)
    console.log(deleteFromCloudinaryResponse)
    const newThumbnailPath = await uploadOnCloudinary(newThumbnailLocalPath)
    if(!newThumbnailPath.url){
        throw new ApiError(501, "Error while uploading the new Thumbnail")
    }
    const updatedThumbnail = await Video.findByIdAndUpdate(
        videoId,
        {
            $set : {
                thumbnail : newThumbnailPath.url
            }
        },
        {new : true},
    )
    return  res
    .status(200)
    .json(new ApiResponse(200, updatedThumbnail, "thumbnail Updated"))

}) 


const deleteVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    const video = await Video.findById(videoId)
    if(video.owner != req.user._id){
        throw new ApiError(401, "User don't have access to delete this video")
    }
    await deleteFileFromCloudinary(video.url)
    await Video.findByIdAndDelete(videoId)
    return res
    .status(200)
    .json(new ApiResponse(200, {}, "Video Deleted Successfully"))
})

const togglePublishStatus = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    const video = await Video.findById(videoId)
    if(video.owner != req.user._id){
        throw new ApiError(401, "User don't have access to change Pulish Status of this video")
    }
    const updatedVideo = await Video.findByIdAndUpdate(
        videoId,
        {
            $set : {
                isPublished : !video.isPublished,
            },
        },
        {new : true},
    )

    return  res
    .status(200)
    .json(new ApiResponse(200, updatedVideo, "Publish Status Changed"))
})

export {
    getAllVideos,
    publishAVideo,
    getVideoById,
    updateVideo,
    deleteVideo,
    togglePublishStatus,
    updateThumbnail
}
