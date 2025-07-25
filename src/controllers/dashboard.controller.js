import mongoose from "mongoose";
import {Subscription} from "../models/subscription.model.js";
import {Video} from "../models/video.model.js";
import {Like} from "../models/like.model.js"
import {ApiError} from "../utilis/ApiError.js"
import  {ApiResponse}    from "../utilis/ApiResponse.js";
import {asyncHandler}  from "../utilis/asyncHandler.js";


const getChannelStats = asyncHandler(async(req , res) => {
    //Todo: Get the channel stats like total video views,total subscribers,total videos,total likes

    const totalVideos = await Video.countDocuments({
        owner : req.user._id,
        isPublished : true
    })

    const totalSubscribers = await Subscription.countDocuments({
        channel : req.user._id
    })

    const totalLikes = await Like.countDocuments({
        video : { $in : await Video.find({ owner : req.user._id}).distinct('_id')}
    })

    const totalVideoViewsResult = await Video.aggregate([
        {
            $match : {
                owner : new mongoose.Types.ObjectId(req.user._id),
                isPublished : true
            }
        },
        {
            $group : {
                _id : null,
                totalViews : { $sum : "$views" }
            }
        }
    ])

    const totalVideoViews = totalVideoViewsResult[0]?.totalViews || 0 ;

    return res.status(200)
              .json(new ApiResponse(
                    200,
                    {
                       totalLikes,totalVideoViews,totalVideos,totalSubscribers
                    },
                    "data fetched successfully"
              ))


})

const getChannelVideos = asyncHandler(async(req , res) => {
    //Todo: Get all the videos uploaded by the channel

    const allVideos = await Video.aggregate([
        {
            $match : {
                owner : new mongoose.Types.ObjectId(req.user._id),
                isPublished : true
            }
        },
        {
            $project : {
                videoFile : 1,
                thumbnail : 1,
                title : 1,
                description : 1,
                duration : 1,
                views : 1,
                createdAt : 1,
                updatedAt : 1
            }
        },
        {
            $sort : { createdAt : -1 }
        }
    ])

    if(!allVideos  || allVideos.length === 0){
        throw new ApiError(404,"videos not found")
    }

    return res.status(200)
              .json(new ApiResponse(200,allVideos,"All videos fetched successfully"))


})

export {
    getChannelStats,
    getChannelVideos
}