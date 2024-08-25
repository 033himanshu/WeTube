import { Video } from "../models/video.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import {ApiResponse} from "../utils/ApiResponse.js"
import {Like} from "../models/like.model.js"
import {Comment} from "../models/comment.model.js"
import {Subscription} from "../models/subscription.model.js"
import { Tweet } from "../models/tweet.model.js";

const countTotalLikes = async (video) => {
    const countLikes = await Like.aggregate([
        {
            $match :{
                video
            }
        },
        {
            $count : 'total'
        }
    ])
    return countLikes.length>0 ? countLikes[0].total: 0
}
const countTotalComments = async (video) => {
    const countComments = await Comment.aggregate([
        {
            $match :{
                video
            }
        },
        {
            $count : 'total'
        }
    ])
    return countComments.length>0 ? countComments[0].total: 0
}
const countTotalViews = async (video) => {
    const countViews = await Video.aggregate([
        {
            $match :{
                _id: video
            }
        },
        {
            $group : {
                _id : null,
                total : {$sum : "$views"}
            }
        }
    ])
    return countViews.length>0 ? countViews[0].total: 0
}
const countTotalSubscribers = async (channel) => {
    const countSubscribers = await Subscription.aggregate([
        {
            $match :{
                channel
            }
        },
        {
            $count : 'total'
        }
    ])
    return countSubscribers.length>0 ? countSubscribers[0].total: 0
}
const countTotalTweets = async (owner) => {
    const countTweets = await Tweet.aggregate([
        {
            $match :{
                owner
            }
        },
        {
            $count : 'total'
        }
    ])
    return countTweets.length>0 ? countTweets[0].total: 0
}

const getChannelStats = asyncHandler(async(req,res)=>{
    // likes on video
    const id =  req.user?._id
    const videos  = await Video.aggregate([
        {
            $match : {owner : id},
        },
        {
            $project : {
                _id : 1,
            }
        }
    ])
    let likes = 0
    let comments =  0 
    let views = 0 
    for(let video of videos){
        likes += await countTotalLikes(video)
        views += await countTotalViews(video)
        comments += await countTotalComments(video)
    }
    const subscribers = await countTotalSubscribers(id)
    // total tweets
    const tweets = await countTotalTweets(id)

    return res
    .status(200)
    .json(new ApiResponse(200,
        {likes, comments, subscribers,  tweets, views},
        "Channel Stats Fetched",
    ))

})

const getChannelVideos = asyncHandler(async(req, res)=>{
    const videos = await Video.aggregate([
        {$match : {owner : req.user?._id}},
        {$project : {
            videoFile : 1,
            thumbnail : 1,
            title : 1,
            description : 1,
            views : 1,
            isPublished : 1,
        }}
    ])
    return res
    .status(200)
    .json(new ApiResponse(200, videos, "Channel Video Fetched"))
})


export {
    getChannelStats,
    getChannelVideos,
}