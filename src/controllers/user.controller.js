import {asyncHandler} from "../utils/asyncHandler.js"
import {ApiError} from '../utils/ApiError.js'
import { ApiResponse } from "../utils/ApiResponse.js"
import {User} from '../models/user.model.js'
import {uploadOnCloudinary} from '../utils/couldinary.js'
import jwt from "jsonwebtoken"

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

export {registerUser, loginUser, logoutUser,  refreshAccessToken}