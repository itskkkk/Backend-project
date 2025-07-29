import {v2 as cloudinary } from "cloudinary";
import fs from "fs";


cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME ,
  api_key: process.env.CLOUDINARY_API_KEY ,
  api_secret: process.env.CLOUDINARY_API_SECRET
});


const uploadOnCloudinary = async (localFilePath) => {
    try {
        if(!localFilePath) return null
        // upload the file on cloudinary
       const response = await cloudinary.uploader.upload(localFilePath, {
            resource_type: "auto",
            folder : "youtube/files"
        })
        // file has been uploaded successfully
        // console.log("file is uploaded on cloudinary", response.url);
        fs.unlinkSync(localFilePath)
        return response ;
    } catch (error) {
        fs.unlinkSync(localFilePath)  //remove the locally saved temporary file as the upload operation got failed
        return null ;
    }
} 

const deleteOnCloudinary = async (url) => {
    try {
        if (!url)  return null;

        // Match common Cloudinary URL pattern
        const match =  url.match(/\/upload\/(?:v\d+\/)?(.+?)\.\w+$/);

        if (!match || !match[1]) {
            console.log("Invalid Cloudinary URL structure.");
            return null;
        }

        const publicId = match[1]; // e.g., "youtube/files/xyz123"

        // Determine if it's a video or image based on URL extension
        const isVideo = /\.(mp4|mov|webm|avi|mkv)$/.test(url);

        const response = await cloudinary.uploader.destroy(publicId, {
            resource_type: isVideo ? "video" : "image",
        });

        return response;

    } catch (error) {
        console.log("Cloudinary delete error:", error.message);
        return null;
    }
};



export {uploadOnCloudinary, deleteOnCloudinary} ;    
