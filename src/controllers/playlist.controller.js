import { asyncHandler } from "../utils/asyncHandler.js";
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import { Playlist } from "../models/playlist.model.js";
import { Video } from "../models/video.model.js";
import mongoose from "mongoose";
const createPlaylist = asyncHandler(async(req, res)=>{
    const {name, description} = req.body
    if(!name || !description){
        throw new ApiError(401, "Playlist name and description is required")
    }
    const owner = req.user?._id
    const playlist = await Playlist.create({name, description, owner})
    return res
    .status(200)
    .json(new ApiResponse(200, playlist, "Playlist Created"))
})

const getUserPlaylists =asyncHandler(async(req, res)=>{
    // const {userId} = req.params
    // return res.status(200).json({"message" : "ok"})
    const userId = req.user?._id;

    // Check if userId exists and is a valid ObjectId
    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
        throw new ApiError(401, "User not authenticated or invalid ID format");
    }
    const owner = new mongoose.Types.ObjectId(req?.user?._id)
    const  playlists = await Playlist.aggregate([
        {
            $match : {owner },
        },
        {
            $project : {
                _id : 1,
                name : 1,
                description : 1,
            },
        }
    ])
    return res
    .status(200)
    .json(new ApiResponse(200, playlists, "User Playlists fetched"))
})

const getPlaylistById = asyncHandler(async (req, res) => {
    const {playlistId} = req.params
    const playlist = await Playlist.findById(playlistId)
    if(!playlist){
        throw new ApiError(401, "No PlayList Exist")
    }
    return res
    .status(200)
    .json(new ApiResponse(200, playlist, "PlayList Fetched"))
})

const addVideoToPlaylist = asyncHandler(async (req, res) => {
    const {playlistId, videoId} = req.params
    console.log(playlistId)
    console.log(videoId)
    const playlist = await Playlist.findById(playlistId)
    if(!playlist){
        throw new ApiError(401, "No PlayList Exist")
    }
    // if(playlist.owner !== req.user?._id){
    //     throw new ApiError(401, "User not authorized to add Video in Playlist")
    // }
    const video = await Video.findById(videoId)
    if(!video)
        throw new ApiError(401,  "Video doesn't exist")

    const updatedPlaylist = await Playlist.findByIdAndUpdate(
        playlistId, 
        {$addToSet : { videos : videoId}},
        {new : true}
    )
    return res
    .status(200)
    .json(new ApiResponse(200, updatedPlaylist, "Video added to playlist"))
})

const removeVideoFromPlaylist = asyncHandler(async (req, res) => {
    const {playlistId, videoId} = req.params
    // TODO: remove video from playlist
    const playlist = await Playlist.findById(playlistId)
    if(!playlist){
        throw new ApiError(401, "No PlayList Exist")
    }
    if(!playlist.owner.equals(new mongoose.Types.ObjectId(req.user._id))){
        throw new ApiError(401, "User not authorized to delete Video from Playlist")
    }
    const updatedPlaylist = await Playlist.findByIdAndUpdate(
        playlistId, 
        {$pull : { videos : videoId}},
        {new : true}
    )
    return res
    .status(200)
    .json(new ApiResponse(200, updatedPlaylist, "Video deleted from playlist"))
})

const deletePlaylist = asyncHandler(async (req, res) => {
    const {playlistId} = req.params
    // TODO: delete playlist
    const playlist = await Playlist.findById(playlistId)
    if(!playlist){
        throw new ApiError(401, "No PlayList Exist")
    }
    if(!playlist.owner.equals(new mongoose.Types.ObjectId(req.user._id))){
        throw new ApiError(401, "User not authorized to delete this Playlist")
    }

    await Playlist.findByIdAndDelete(playlistId)
    return res
    .status(200)
    .json(new ApiResponse(200, {}, "Playlist deleted"))
    
})

const updatePlaylist = asyncHandler(async (req, res) => {
    const {playlistId} = req.params
    const {name, description} = req.body
    //TODO: update playlist
    const playlist = await Playlist.findById(playlistId)
    if(!playlist){
        throw new ApiError(401, "No PlayList Exist")
    }
    if(!playlist.owner.equals(new mongoose.Types.ObjectId(req.user._id))){
        throw new ApiError(401, "User not authorized to delete this Playlist")
    }
    const updatedPlaylist = await Playlist.findByIdAndUpdate(
        playlistId, 
        {$set : { name, description}},
        {new : true}
    )
    return res
    .status(200)
    .json(new ApiResponse(200, updatedPlaylist, "Playlist updated"))
})

export {
    createPlaylist,
    getUserPlaylists,
    getPlaylistById,
    addVideoToPlaylist,
    removeVideoFromPlaylist,
    deletePlaylist,
    updatePlaylist
}