import { v2 as cloudinary } from 'cloudinary';
import fs from "fs"
import { ApiError } from './ApiError.js';
cloudinary.config({ 
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME, 
    api_key: process.env.CLOUDINARY_API_KEY, 
    api_secret: process.env.CLOUDINARY_API_SECRET,
})




const uploadOnCloudinary = async (localFilePath) =>{
    try{
        if(!localFilePath) return null
        //upload the  file on cloudinary
        const response = await cloudinary.uploader.upload(localFilePath, {
            resource_type: 'auto',
        })
        // file has been  uploaded succesfully
        console.log("file uploaded successfully", response)
        fs.unlinkSync(localFilePath)
        return response
    }catch(error){
        fs.unlinkSync(localFilePath) // remove the  locally saved temporary file as the  upload operation got failed
        return null;
    }
}

const deleteFileFromCloudinary = async(cloudinaryFilePath, newImageLocalPath) => {
    try {
        if(!cloudinaryFilePath) return null
        console.log(cloudinaryFilePath)
        let cloudinaryPath = cloudinaryFilePath.split('/').pop().split('.')[0]
        console.log(cloudinaryPath)
        const response =  await cloudinary.api.delete_resources([cloudinaryPath], { type: 'upload', resource_type: 'image' })
        console.log("file deleted successfully", response)
        return response
    } catch (error) {
        if(newImageLocalPath){
            fs.unlinkSync(newImageLocalPath)
            console.log("Error is occuring new file deleted")
        }
        throw new ApiError(400, `Error in Deleting old Image file from cloudinary, ${error}`)
    }
}

export {uploadOnCloudinary, deleteFileFromCloudinary}