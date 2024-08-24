import { ApiError } from "../utils/ApiError.js"
import {asyncHandler} from "../utils/asyncHandler.js"
import { deleteFileFromCloudinary, uploadOnCloudinary } from "../utils/couldinary.js"
import { Video } from "../models/video.model.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import mongoose from "mongoose"
const getAllVideos = asyncHandler(async (req, res) => {
    let { page = 1, limit = 10, query, sortBy = 'createdAt', sortType = 'asc', userId } = req.query;

    // Convert to numbers and validate
    page = Number(page);
    limit = Number(limit);
    if (page <= 0 || limit <= 0) {
        throw new ApiError(401, "Invalid Query");
    }

    // Define the skip value for pagination
    const skip = (page - 1) * limit;

    // Define the search criteria
    let searchCriteria = {};
    if (userId) {
        searchCriteria.owner = userId;
    }
    if (query) {
        searchCriteria.title = { $regex: query, $options: 'i' }; // Case-insensitive search on video title
    }

    // Define the sorting order
    const sortOrder = sortType.toLowerCase() === 'desc' ? -1 : 1;
    const sortCriteria = { [sortBy]: sortOrder };

    // Fetch videos based on the criteria
    // const videos = await Video.find(searchCriteria)
    //     .sort(sortCriteria)
    //     .skip(skip)
    //     .limit(limit)
    //     .select(
    //         "-isPublished"
    //     )
    const videos = await Video.aggregate([
        // Match stage for filtering documents
        { $match: {...searchCriteria, isPublished : true} },
        
        // Sort stage
        { $sort: sortCriteria },
        
        // Skip stage for pagination
        { $skip: skip },
        
        // Limit stage for pagination
        { $limit: limit },
        
        // Project stage to include/exclude fields
        { 
            $project: {
                _id : 1,
                videoFile : 1,
                thumbnail : 1,
                title : 1,
                description : 1,
                duration : 1,
                views :  1,
                owner :1,
            }
        }
    ]);

    // Handle the case when no videos are found
    // if (!videos.length) {
    //     throw new ApiError(404, "No videos found");
    // }

    // Return the videos in the response
    return res
        .status(200)
        .json(new ApiResponse(200, videos, "Videos Fetched Successfully"));
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
    console.log(title)
    console.log(description)
    console.log(req.files)
    // TODO: get video, upload to cloudinary, create video
    const videoLocalPath = req.files?.videoFile?.[0]?.path
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
    const video = await Video.findById(videoId).select("-isPublished -createdAt -updatedAt")
    if(!video){
        throw new ApiError(401, "Invalid Video Id")
    }
    // if(!video.isPublished && video.owner != req.user._id ){
    //     throw new ApiError(401, "User Don't Have Access to this video file")
    // }
    return res
    .status(200)
    .json(new ApiResponse(200, video, "video fetched"))
})

const updateVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    //TODO: update video details like title, description, thumbnail
    const { title, description} = req.body
    console.log(req.body)
    if(!title || !description){
        throw new ApiError(400, "Title and Description is required")
    }
    const video = await Video.findById(videoId)
    if(!video){
        throw new ApiError(404, "Invalid Video Id")
    }
    if(!video.owner.equals(new mongoose.Types.ObjectId(req.user._id))){
        throw new ApiError(403, "User don't have access to update this file")
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
    const newThumbnailLocalPath = req.file?.path
    const video = await Video.findById(videoId)
    if(!video.owner.equals(new mongoose.Types.ObjectId(req.user._id))){
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
    console.log(newThumbnailLocalPath)
    if(!newThumbnailPath || !newThumbnailPath.url){
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
    if(!video.owner.equals(new mongoose.Types.ObjectId(req.user._id))){
        throw new ApiError(401, "User don't have access to delete this video")
    }
    console.log(video.videoFile)
    console.log(video.thumbnail)
    await deleteFileFromCloudinary(video.videoFile)
    await deleteFileFromCloudinary(video.thumbnail)
    await Video.findByIdAndDelete(videoId)
    return res
    .status(200)
    .json(new ApiResponse(200, {}, "Video Deleted Successfully"))
})

const togglePublishStatus = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    const video = await Video.findById(videoId)
    if(!video.owner.equals(new mongoose.Types.ObjectId(req.user._id))){
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
