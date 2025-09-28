import mongoose from "mongoose";
import {Subscription} from "../models/subscription.model.js";
import {Video} from "../models/video.model.js";
import {Like} from "../models/like.model.js"
import {ApiError} from "../utilis/ApiError.js"
import  {ApiResponse}    from "../utilis/ApiResponse.js";
import {asyncHandler}  from "../utilis/asyncHandler.js";


const getChannelStats = asyncHandler(async (req, res) => {
  const channelStats = {};

  const videoStates = await Video.aggregate([
    {
      $match: {
        owner: req.user?._id,
      },
    },
    {
      $group: {
        _id: null,
        totalViews: { $sum: "$views" },
        totalVideos: { $count: {} },
      },
    },
  ]);

  const subscriber = await Subscription.aggregate([
    {
      $match: {
        channel: req.user?._id,
      },
    },
    {
      $count: "totalSubscribers",
    },
  ]);

  const totalLikes = await Like.aggregate([
    {
      $match: {
        video: { $ne: null },
        liked: true,
      },
    },
    {
      $lookup: {
        from: "videos",
        localField: "video",
        foreignField: "_id",
        as: "channelVideo",
        pipeline: [
          {
            $match: {
              owner: req.user?._id,
            },
          },
          {
            $project: {
              _id: 1,
            },
          },
        ],
      },
    },
    {
      $addFields: {
        channelVideo: {
          $first: "$channelVideo",
        },
      },
    },
    {
      $match: {
        channelVideo: { $ne: null },
      },
    },
    {
      $group: {
        _id: null,
        likeCount: {
          $sum: 1,
        },
      },
    },
  ]);

  channelStats.ownerName = req.user?.fullName;
  channelStats.totalViews = (videoStates && videoStates[0]?.totalViews) || 0;
  channelStats.totalVideos = (videoStates && videoStates[0]?.totalVideos) || 0;
  channelStats.totalSubscribers =
    (subscriber && subscriber[0]?.totalSubscribers) || 0;
  channelStats.totalLikes = (totalLikes && totalLikes[0]?.likeCount) || 0;

  return res
    .status(200)
    .json(
      new ApiResponse(200, channelStats, "Channel states sent successfully")
    );
});


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

    // if(!allVideos  || allVideos.length === 0){
    //     throw new ApiError(404,"videos not found")
    // }

    return res.status(200)
              .json(new ApiResponse(200,allVideos,"All videos fetched successfully"))


})

export {
    getChannelStats,
    getChannelVideos
}