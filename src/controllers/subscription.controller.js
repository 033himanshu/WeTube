import { Subscription } from "../models/subscription.model.js"
import { User } from "../models/user.model.js"
import { ApiError } from "../utils/ApiError.js"
import {asyncHandler} from "../utils/asyncHandler.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import mongoose from "mongoose"

const toggleSubscription = asyncHandler(async (req, res) => {
    const {channelId} = req.params
    // TODO: toggle subscription
    const channel = await User.findById(channelId)
    if(!channel){
        throw new ApiError("Channel Does not Exist")
    }
    const subscription =await Subscription.findOne({channel : channelId, subscriber: req.user._id})
    if(!subscription){
        const newSubscription = await Subscription.create({channel : channelId, subscriber : req.user._id})
        return res
        .status(200)
        .json(new ApiResponse(200, {_id: newSubscription._id, channel : newSubscription.channel, subscriber : newSubscription.subscriber}, "Channel Subscribed"))
    }else{
        await Subscription.findByIdAndDelete(subscription._id)
        return res
        .status(200)
        .json(new ApiResponse(200, {}, "Unsubscribed"))
    }
})

// controller to return subscriber list of a channel
const getUserChannelSubscribers = asyncHandler(async (req, res) => {
    const {channelId} = req.user?._id
    // TODO : do aggregation and find All Subscribers
    // const channel = await User.findById(channelId)
    // if(!channel){
    //     throw new ApiError("Channel Does not Exist")
    // }
    const channel = new mongoose.Types.ObjectId(channelId)
    const subscribers = await Subscription.aggregate([
        // Match documents where the channel is equal to the provided channelId
        { $match: { channel } },
        
        // Perform a lookup to join the Subscription collection with the User collection
        {
            $lookup: {
                from: 'users', // The name of the User collection in MongoDB
                localField: 'subscriber', // The field in the Subscription model to match
                foreignField: '_id', // The field in the User model to match
                as: 'subscriberDetails' // The name of the new field where the result will be stored
            }
        },
        
        // Unwind the resulting array of subscriberDetails to work with them as individual objects
        { $unwind: '$subscriberDetails' },
        
        // Project to include only the necessary fields
        {
            $project: {
                _id: '$subscriberDetails._id', // Include subscriber's name
                avatar: '$subscriberDetails.avatar', // Include subscriber's avatar
                username : 'subscriberDetails.username'
            }
        }
    ])

    return  res
    .status(200)
    .json(new ApiResponse(200, subscribers, "Channel Subscribers Fetched Successfully"))
})

// controller to return channel list to which user has subscribed
const getSubscribedChannels = asyncHandler(async (req, res) => {
    const subscriberId = req.user?._id
    // TODO : do aggregation and find All Channels
    // const subscriber = await User.findById(subscriberId)
    // if(!subscriber){
    //     throw new ApiError(401, "Subscriber Doesn't exit")
    // }
    const subscriber = new mongoose.Types.ObjectId(subscriberId)

    const channels = await Subscription.aggregate([
        {
            $match :{ subscriber }
        },
        {
            $lookup : {
                from : "users",
                foreignField : "_id",
                localField : "channel",
                as : "channelDetails"
            }
        },
        { $unwind : "$channelDetails"},
        {
            $project : {
                _id : "$channelDetails._id",
                username : "$channelDetails.username",
                avatar : "$channelDetails.avatar",
            }
        }
    ])
    return res
    .status(200)
    .json(new ApiResponse(200, channels, "Subscribed Channels Fetched Successfully"))
})

export {
    toggleSubscription,
    getUserChannelSubscribers,
    getSubscribedChannels
}