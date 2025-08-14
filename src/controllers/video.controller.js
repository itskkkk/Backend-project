import mongoose, { isValidObjectId } from "mongoose";
import {Video} from "../models/video.model.js";
import {User} from "../models/user.model.js";
import {ApiError} from "../utilis/ApiError.js"
import  {ApiResponse}    from "../utilis/ApiResponse.js";
import {asyncHandler}  from "../utilis/asyncHandler.js";
import {uploadOnCloudinary,deleteOnCloudinary} from "../utilis/cloudinary.js";


const getAllVideos  = asyncHandler(async(req, res) => {
    const { userId } = req.query;

    if(userId && !isValidObjectId(userId)){
        throw new ApiError(400,"Invalid userId")
    }
    const matchStage = { isPublished: true }
    if(userId) {
        matchStage.owner = new mongoose.Types.ObjectId(userId)
    }

    const videos = await Video.aggregate([
        {
            $match : matchStage
        },
        {
            $lookup: {
                from: "users",
                localField: "owner",
                foreignField: "_id",
                as: "owner",
                pipeline: [
                    {
                        $project : {
                            username: 1,
                            fullName: 1,
                            avatar: 1,
                        }
                    }
                ]
            }
        },
        {
            $unwind: "$owner",
        }
    ]);

    return res.status(200)
              .json(new ApiResponse(200,videos, "video fetched successfully"))

});

const getAllVideosByOption = asyncHandler(async(req, res) => {
    const { page = 1, limit = 10, query, sortBy = "createdAt", sortType = "desc", userId } = req.query
    //Todo: get all videos based on query,sort, pagination

    const pageNumber = parseInt(page,10);
    const pageLimit = parseInt(limit,10);
    const skip = (pageNumber - 1) * pageLimit;
    const sortOrder = sortType === "asc" ? 1 : -1 ;
    const mongoQuery = {} ;

    if(userId && ! mongoose.isValidObjectId(userId)){
        throw new ApiError(400,"Invalid userId")
    }
    
    if(query){
        mongoQuery.title = { $regex : query, $options : "i"}
    };
    if(userId){
        mongoQuery.owner = new mongoose.Types.ObjectId(userId)
    }
    
    const videos = await Video.aggregate([
        {
            $match : mongoQuery
        },
        {
            $lookup : {
                from : "users",
                localField : "owner",
                foreignField: "_id",
                as : "owner",
                pipeline: [
                    {
                        $project : {
                            username : 1,
                            fullName : 1,
                            avatar : 1,
                        }
                    }
                ]
            }
        },
        {
            $addFields : {
                owner : { $first : "$owner" }
            }
        },
        {
            $sort : { [sortBy] : sortOrder }
        },
        {
            $skip : skip
        },
        {
            $limit : pageLimit
        }
    ])

    const total =  await Video.countDocuments(mongoQuery)

    return res.status(200)
              .json(
                new ApiResponse(
                    200,
                    {
                        videos,
                        pagination: {
                            total,
                            page: pageNumber,
                            limit: pageLimit,
                            totalPages: Math.ceil(total/pageLimit)
                        }
                    },
                    "videos fetched successfully"
                )
              )


})

const publishAVideo = asyncHandler(async(req, res) => {
    const { title, description } = req.body
    //Todo: get video, upload to cloudinary,create video

    if(
        [ title , description ].some((field) => field?.trim() === "")
    ){
        throw new ApiError(400,"All fields are required")
    }
    const videoLocalPath = req.files?.videoFile[0]?.path
    const thumbnailLocalPath = req.files?.thumbnail[0]?.path

    if(!videoLocalPath){
        throw new ApiError(400,"Video file is required")
    }

    if(!thumbnailLocalPath){
        throw new ApiError(400, "thumbnail file is required")
    }

    const videoFile = await uploadOnCloudinary(videoLocalPath)
    const thumbnail = await uploadOnCloudinary(thumbnailLocalPath)

    if(!videoFile){
        throw new ApiError(500, "something went wrong while uploading on cloudinary")
    }
    if(!thumbnail) {
        throw new ApiError(500, "something went wrong while uploading on cloudinary")
    }

    const video = await Video.create({
        title,
        description,
        videoFile :   videoFile.url,
        thumbnail :   thumbnail.url,
        isPublished : true,
        owner : req.user._id,
        duration : videoFile.duration  || 0 ,
    })


    if(!video){
        throw new ApiError(500, "something went wrong while uploading video")
    }

    return res.status(200)
              .json(
               new ApiResponse(
                    200,
                    video,
                    "video upload successfully"
                )
              )

})

const getVideoById = asyncHandler(async(req, res) => {
    const {videoId} = req.params
    //Todo: get video by id

    if (!mongoose.isValidObjectId(videoId)) {
    throw new ApiError(400, "Invalid video ID format")
    }

    const video = await Video.aggregate([
        {
            $match : {
                _id : new mongoose.Types.ObjectId(videoId)
            }
        },
        {
            $lookup : {
                from : "users",
                localField : "owner",
                foreignField : "_id",
                as : "owner",
                pipeline : [
                    {
                        $project : {
                            username : 1 ,
                            fullName : 1 ,
                            avatar : 1 ,
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
    ])

    if(!video || video.length === 0){
        throw new ApiError(404, "NO video is found")
    }

    return res.status(200)
              .json(
                new ApiResponse(
                    200,
                    video[0],
                    "video fetched successfully"
                )
              )


})

const updateVideo = asyncHandler(async(req, res) => {
    const { videoId } = req.params
    const { title , description } = req.body
    //Todo: update video details like title, description, thumbnail

     if (!mongoose.isValidObjectId(videoId)) {
    throw new ApiError(404, "Invalid video ID format")
    }

    const video =  await Video.findById(videoId)

    if(video.owner.toString() !== req.user._id.toString()) {
        throw new ApiError(403,"you are not authorized to update the video")
    }

    const previousVideo = video.videoFile
    const previousThumbnail = video.thumbnail

    const videoLocalPath = req.files?.videoFile[0]?.path
    const thumbnailLocalPath = req.files?.thumbnail[0]?.path

    if(!videoLocalPath){
        throw new ApiError(400,"videofile is missing")
    }
    if(!thumbnailLocalPath){
        throw new ApiError(400,"thumbnail is missing")
    }

    const videoFile = await uploadOnCloudinary(videoLocalPath)
    const thumbnail = await uploadOnCloudinary(thumbnailLocalPath)

    if(!videoFile) {
        throw new ApiError(500, "something went wrong while uploading video")
    }
    if(!thumbnail) {
        throw new ApiError(500, "something went wrong while uploading photo")
    }

    video.videoFile =  videoFile.url
    video.thumbnail =  thumbnail.url

    if(title?.trim()){
        video.title = title.trim()
    }

    if(description?.trim()){
        video.description = description.trim()
    }

    await video.save({validateBeforeSave : false});

    if (previousVideo) await deleteOnCloudinary(previousVideo);
    if (previousThumbnail) await deleteOnCloudinary(previousThumbnail);


    return res.status(200)
              .json(
                new ApiResponse(
                    200,
                    video,
                    " video uploaded successfully"
                )
              )

})

const deleteVideo = asyncHandler(async(req, res) => {
    const {videoId} = req.params
    //Todo: delete video

    if(!videoId || !mongoose.Types.ObjectId.isValid(videoId)){
        throw new ApiError(400," valid videoId is required")
    }

    const video = await Video.findById(videoId)

    if(!video){
        throw new ApiError(400,"video is not found")
    }
    const videoFile = video.videoFile
    const thumbnail = video.thumbnail

    if(video.owner.toString() !== req.user._id.toString()){
        throw new ApiError(400,"user is not authenticated to delete")  
    }

    await Video.findByIdAndDelete(videoId)
    await deleteOnCloudinary(videoFile);
    await deleteOnCloudinary(thumbnail) ;

    return res.status(200)
              .json(
                new ApiResponse(200,null,"video deleted successfully")
              )

})

const togglePublishStatus = asyncHandler(async(req, res) => {
    const {videoId} = req.params

    if(!videoId){
        throw new ApiError(400,"videoId is required")
    }

    const video = await Video.findById(videoId)

    if(!video) {
        throw new ApiError(400, "video is not found")
    }
    video.isPublished = !video.isPublished
    await video.save({validateBeforeSave: false})

    return res.status(200)
              .json(
                new ApiResponse(200,video.isPublished,"video publish toggle successfully")
              )

})




export { getAllVideos,getAllVideosByOption,publishAVideo,getVideoById,updateVideo,deleteVideo,togglePublishStatus}