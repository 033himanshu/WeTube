import { asyncHandler } from "../utils/asyncHandler";

const getLikedVideos =  asyncHandler(async(req, res)=>{

})

const toggleCommentLike = asyncHandler(async(req, res)=>{
    const {commentId} = req.params
})

const toggleTweetLike = asyncHandler(async(req, res)=>{
    const {tweetId} = req.params
})

const toggleVideoLike = asyncHandler(async(req, res)=>{
    const {videoId} = req.params
})

export {
    getLikedVideos,
    toggleCommentLike,
    toggleTweetLike,
    toggleVideoLike,
}
