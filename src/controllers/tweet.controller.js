import { Tweet } from "../models/tweet.model.js"
import { ApiError } from "../utils/ApiError.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"
import mongoose from "mongoose"

const createTweet = asyncHandler(async (req, res) => {
    //TODO: create tweet
    const {content} = req.body
    const owner = req.user._id
    if(!content){
        throw new ApiError(401, "Content Required..")
    }
    const tweet = await Tweet.create({
            content,
            owner,
    })
    return res
    .status(200)
    .json(new ApiResponse(200, tweet, "Tweet Created"))
})

const getUserTweets = asyncHandler(async (req, res) => {
    // TODO: get user tweets
    const {userId} = req.params
    const owner = new mongoose.Types.ObjectId(userId);
    const tweets = await Tweet.aggregate([
        {$match : {owner}},
        {
            $project : {
                _id :1,
                content : 1,
                owner : 1,
            }
        },
    ])
    return res
    .status(200)
    .json( new ApiResponse(200, tweets, "Tweets fetched successfully"))
})

const updateTweet = asyncHandler(async (req, res) => {
    //TODO: update tweet
    const {tweetId} = req.params
    const {content} = req.body
    if(!content){
        throw new ApiError(401, "Content Required..")
    }
    const tweet = await Tweet.findById(tweetId)
    if(!tweet.owner.equals(new mongoose.Types.ObjectId(req.user._id))){
        throw new ApiError(401, "User not authorized to Update Tweet")
    }
    const updatedTweet = await Tweet.findByIdAndUpdate(
        tweetId,
        {
            $set : {
                content,
            }
        },
        {new : true},
    ).select("-createdAt -updatedAt -__v")

    return res
    .status(200)
    .json(new ApiResponse(200, updatedTweet, "Tweet Updated"))
})

const deleteTweet = asyncHandler(async (req, res) => {
    //TODO: delete tweet
    const tweetId = req.params?.tweetId
    const tweet = await Tweet.findById(tweetId)
    if(!tweet.owner.equals(new mongoose.Types.ObjectId(req.user._id))){
        throw new ApiError(401, "User not authorized to Delete Tweet")
    }
    await Tweet.findByIdAndDelete(tweetId)
    return res
    .status(200)
    .json(new ApiResponse(200, {}, "Tweet deleted"))

})

export {
    createTweet,
    getUserTweets,
    updateTweet,
    deleteTweet
}