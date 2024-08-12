import {asyncHandler} from "../utils/asyncHandler.js"
import {ApiError} from '../utils/ApiError.js'
import { ApiResponse } from "../utils/ApiResponse.js"
import {User} from '../models/user.model.js'
import {deleteFileFromCloudinary, uploadOnCloudinary} from '../utils/couldinary.js'
import jwt from "jsonwebtoken"
import mongoose from "mongoose"

const generateAccessAndRefreshTokens = async (userId) =>{
    try{
        const user = await User.findById(userId)
        console.log(user)
        const accessToken = user.generateAccessToken()
        const refreshToken = user.generateRefreshToken()
        user.refreshToken = refreshToken
        await user.save({validateBeforeSave: false})
        return {accessToken, refreshToken}
    }catch(err){
        throw new ApiError(500, 'Something went wrong while generating refresh and access token')
    }
}

const registerUser = asyncHandler(async (req, res) => {
    const{fullName,username, email, password} =req.body
    if([fullName, username, email, password].some((field) => field?.trim() === "")){
        throw new ApiError(400, "All Fields are required")
    }
    // add other  validations
    const existedUser = await User.findOne({
        $or : [{username}, {email}]
    })
    if(existedUser){
        throw new ApiError(409, "Username or email already in use")
    }
    console.log(req.files)
    const avatarLocalPath = req.files?.avatar?.[0]?.path
    const coverImageLocalPath = req.files?.coverImage?.[0]?.path
    if(!avatarLocalPath){
        throw new ApiError(400, "Avatar file is required")
    }
    const avatar = await uploadOnCloudinary(avatarLocalPath)
    let coverImage= null
    if(coverImageLocalPath){
        coverImage = await uploadOnCloudinary(coverImageLocalPath)
    }
    if(!avatar){
        throw new ApiError(400, "Avatar file is required")
    }
    console.log(avatar)
    const user = await User.create({
        fullName,
        password,
        email,
        username: username.toLowerCase(),
        avatar : avatar.url,
        coverImage : coverImage?.url || "",
    })

    const createdUser = await User.findById(user._id).select(
        "-password -refreshToken"
    )
    if(!createdUser){
        throw new ApiError(500, "Something went Wrong while registering the user")
    }
    return res.status(200).json(
        new ApiResponse(200, createdUser, "User Registered Successfully")
    )
})

const loginUser = asyncHandler(async (req, res) => {
    // console.log(req)
    const {username, password, email} = req.body
    console.log(username)
    console.log(email)
    if(!username && !email){
        throw new ApiError(404, 'Username or email is required')
    }
    const user = await User.findOne({
        $or : [{username}, {email}]
    })
    if(!user){
        throw new ApiError(404, `No Matching user with ${username || email}`)
    }
    const isPasswordValid  = await user.isPasswordCorrect(password)
    if(!isPasswordValid){
        throw new ApiError(401, "Password not match")
    }
    //access And Refresh Token 
    const {accessToken, refreshToken} = await generateAccessAndRefreshTokens(user._id)
    //send cookie
    const loggedInUser = await User.findById(user._id).select("-password -refreshToken")

    const options= {
        httpOnly : true,
        secure : true,
    }

    return res.status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(new ApiResponse(200, {accessToken, refreshToken, loggedInUser}, "User logged In Successfully"))

})

const logoutUser = asyncHandler(async (req, res)=>{
    const userId = req.user._id
    console.log("---inside logut handler --" ,req.user)
    await User.findByIdAndUpdate(
        userId,
        {
            $unset : {
                refreshToken :""
            }
        },
        {
            new :true
        }
    )
    const options= {
        httpOnly : true,
        secure : true,
    }
    return res.status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200, "User Logged Out"))
})

const refreshAccessToken = asyncHandler(async(req, res) => {
    try {
        const token = req.cookies.refreshToken || req.body.refreshToken
        if(!token)
            throw new ApiError(401, 'Unauthorized Request')
        const decodedToken = jwt.verify(token, process.env.REFRESH_TOKEN_SECRET)
        const user = await User.findById(decodedToken._id)
        if(!user)
            throw new ApiError(401, 'Invalid Token')

        const {accessToken, refreshToken} = await generateAccessAndRefreshTokens(user._id)  
        const options= {
            httpOnly : true,
            secure : true,
        }
        return res.status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", refreshToken, options)
        .json(new ApiResponse(200, {accessToken, refreshToken}, "Access Token Renewed"))
    } catch (error) {
        throw new ApiError(501, "Something went wrong in refreshing Access Token")
    }

})

// const changeCurrentPassword = asyncHandler( async (req, res) => {
//     const {oldPassword, newPassword} = req.body
//     const user = await User.findById(req.user?._id)
//     const isPasswordCorrect = user.isPasswordCorrect(oldPassword)
//     if(!isPasswordCorrect){
//         throw new ApiError(400,  "Invalid old Password")
//     }
//     user.password = newPassword
//     await user.save({validateBeforeSave: false})

//     return res
//     .status(200)
//     .json(new ApiResponse(200, {}, "Password Changed Successfully"))
// })

const updateAccountInfo = asyncHandler(async (req, res)=>{
    const {fullName, oldPassword, newPassword} = req.body
    if(!fullName){
        throw new ApiError(401, "FullName is required")
    }
    console.log(newPassword)
    console.log(oldPassword)
    if(!newPassword || !oldPassword){
        throw new ApiError(401, "Old and New password are both compulsory")
    }
    const user = await User.findById(req.user?._id)
    const isPasswordCorrect = user.isPasswordCorrect(oldPassword)
    if(!isPasswordCorrect){
        throw new ApiError(400,  "Invalid old Password")
    }
    user.password = newPassword
    user.fullName = fullName
    await user.save({validateBeforeSave: false})

    return res
    .status(200)
    .json(new ApiResponse(200, {}, "Account Info Changed Successfully"))

})
const getCurrentUser = asyncHandler(async (req,  res)=>{
    return res
    .status(200)
    .json(new ApiResponse(200,  req.user,  "Current User Fetched Successfully"))
})

const updateUserAvatar = asyncHandler(async(req,  res) => {
    const avatarLocalPath =  req.file?.path
    if(!avatarLocalPath){
        throw new ApiError(400, "Avatar file is missing")
    }
    const oldAvatarUrl = (await User.findById(req.user?._id))?.avatar
    const deleteFromCloudinaryResponse = await deleteFileFromCloudinary(oldAvatarUrl, avatarLocalPath)
    console.log(deleteFromCloudinaryResponse)
    // if(!deleteFileFromCloudinary){
    //     throw new ApiError(501, "Error in Deleting File from Cloudinary")
    // }
    const avatar = await uploadOnCloudinary(avatarLocalPath)
    if(!avatar.url){
        throw new ApiError(400, "Error while Uploading on avatar")
    }
    
    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set:{
                avatar : avatar.url
            }
        },
        {new : true}
    ).select("-password")

    return res
    .status(200)
    .json(new ApiResponse(200, user, "Avatar Updated Successfully"))

})

const updateUserCoverImage = asyncHandler(async(req,  res) => {
    const coverLocalPath =  req.file?.path
    if(!coverLocalPath){
        throw new ApiError(400, "Cover Image file is missing")
    }
    const oldCoverImageUrl = (await User.findById(req.user?._id))?.coverImage
    const deleteFromCloudinaryResponse = await deleteFileFromCloudinary(oldCoverImageUrl, coverLocalPath)
    console.log(deleteFromCloudinaryResponse)
    const coverImage = await uploadOnCloudinary(coverLocalPath)
    if(!coverImage.url){
        throw new ApiError(400, "Error while Uploading on Cover Image")
    }
    
    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set:{
                coverImage : coverImage.url
            }
        },
        {new : true}
    ).select("-password")

    return res
    .status(200)
    .json(new ApiResponse(200, user, "Cover Image Updated Successfully"))

})


const deleteUserCoverImage = asyncHandler(async (req, res)=>{
    let user = await User.aggregate([
        {
            $match : {
                _id : req.user?._id
            }
        },
        {
            $project : {
                coverImage : 1,
            }
        },
    ])
    const coverImagePath = user[0].coverImage
    const deletedFile = await deleteFileFromCloudinary(coverImagePath)
    console.log(deletedFile)
    user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $unset : {
                coverImage : 1,
            }
        },
        {new :  true},
    )
    return res
    .status(200)
    .json(new ApiResponse(200, user, "Cover Image Deleted Successfully"))
})

const getUserChannelProfile = asyncHandler(async (req, res) =>  {
    const {username} = req.params

    if(!username?.trim()){
        throw new ApiError(401, "Username is Missing")
    }
    const channel = await User.aggregate([
        {
            $match :{
                username : username?.toLowerCase()
            }
        },
        {
            $lookup : {
                from : "subscriptions",
                localField:"_id",
                foreignField : "channel",
                as : "subscribers",
            }
        },
        {
            $lookup : {
                from : "subscriptions",
                localField:"_id",
                foreignField : "subscriber",
                as : "subscribedTo",
            }
        },
        {
            $addFields:{
                subscribersCount : {
                    $size : "$subscribers"
                },
                channelsSubscribedTo : {
                    $size : "$subscribedTo"
                },
                isSubscribed : {
                    $cond : {
                        if : {$in : [req.user?._id, "$subscribers.subscriber"]},
                        then : true,
                        else : false,
                    }
                }
            }
        },
        {
            $project : {
                fullName : 1,
                username : 1,
                subscribersCount: 1,
                channelsSubscribedTo : 1,
                isSubscribed : 1,
                avatar: 1,
                coverImage : 1,
                email: 1,
            }
        }
    ])
    console.log(channel)
    if(channel?.length==0){
        throw new ApiError(404, "Channel does not exists")
    }
    return res
    .status(200)
    .json(
        new ApiResponse(200, channel, "User Channel Fetched Successfully")
    )
})

const getWatchHistory = asyncHandler(async (req, res) =>{
    const user = await User.aggregate([
        {
            $match : {
                _id : new mongoose.Types.ObjectId(req.user._id)
            }
        },
        {
            $lookup : {
                from : "video",
                localField : "watchHistory",
                foreignField : "_id",
                as : "watchHistory",
                pipeline : [
                    {
                        $lookup : {
                            from : "user",
                            localField : "owner",
                            foreignField : "_id",
                            as : "owner",
                            pipeline : [
                                {
                                    $project :  {
                                        fullName: 1,
                                        username: 1,
                                        avatar : 1,

                                    }
                                }
                            ]
                        }
                    },
                    {
                        $addFields : {
                            owner : {
                                $first : "$owner"
                            }
                        }
                    }
                ]
            }
        }
    ])

    return  res
    .status(200)
    .json(new ApiResponse(200, user[0].watchHistory, "watch History Fetcher Succesffully"))
})

export {
    registerUser,
    loginUser, 
    logoutUser,  
    refreshAccessToken, 
    updateAccountInfo, 
    getCurrentUser, 
    updateUserAvatar, 
    updateUserCoverImage,
    getUserChannelProfile,
    getWatchHistory,
    deleteUserCoverImage,
}