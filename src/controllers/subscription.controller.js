import { Subscription } from "../models/subscription.model.js"
import { User } from "../models/user.model.js"
import { ApiError } from "../utils/ApiError.js"
import {asyncHandler} from "../utils/asyncHandler.js"
import {ApiResponse} from "../utils/ApiResponse.js"
const toggleSubscription = asyncHandler(async (req, res) => {
    const {channelId} = req.params
    // TODO: toggle subscription
    const channel = await User.findById(channelId)
    if(!channel){
        throw new ApiError("Channel Does not Exist")
    }
    const subscription = await Subscription.find({channel, subscriber: req.user._id})
    if(!subscription){
        const newSubscription = await Subscription.create({channel, subscriber : req.user._id})
        return res
        .status(200)
        .json(new ApiResponse(200, newSubscription, "Channel Subscribed"))
    }else{
        await Subscription.findByIdAndDelete(subscription._id)
        return res
        .status(200)
        .json(new ApiResponse(200, {}, "Unsubscribed"))
    }
})

// controller to return subscriber list of a channel
const getUserChannelSubscribers = asyncHandler(async (req, res) => {
    const {channelId} = req.params
    // TODO : do aggregation and find All Subscribers
})

// controller to return channel list to which user has subscribed
const getSubscribedChannels = asyncHandler(async (req, res) => {
    const { subscriberId } = req.params
    // TODO : do aggregation and find All Channels
})

export {
    toggleSubscription,
    getUserChannelSubscribers,
    getSubscribedChannels
}