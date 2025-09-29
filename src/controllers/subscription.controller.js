import mongoose, {isValidObjectId} from "mongoose";
import {Subscription} from "../models/subscription.model.js";
import {User} from "../models/user.model.js";
import {ApiError} from "../utilis/ApiError.js"
import  {ApiResponse}    from "../utilis/ApiResponse.js";
import {asyncHandler}  from "../utilis/asyncHandler.js";

const toggleSubscription = asyncHandler(async(req, res) => {
    const {channelId} = req.params
    //Todo: toggle subscription

     if(!channelId || !mongoose.isValidObjectId(channelId)){
        throw new ApiError(400, "channelId is not valid")
    }

    const existedSubscription = await Subscription.findOne({
        channel : channelId,
        subscriber : req.user._id
    })

    let isSubscribed = false

    if(!existedSubscription){
              await Subscription.create({
                channel : channelId,
                subscriber : req.user._id
              })
            isSubscribed = true
    }else {
        await existedSubscription.deleteOne()
    }

    return res.status(200)
              .json(new ApiResponse(200,{ isSubscribed },"Toggled subscription successfully"))

})

//controller to return subscriber list of a channel
const getUserChannelSubscribers = asyncHandler(async (req, res) => {
  const { channelId = req.user?._id } = req.params;

  if (!isValidObjectId(channelId)) throw new ApiError(400, "Invalid ChannelId");

  const subscriberList = await Subscription.aggregate([
    {
      $match: {
        channel: new mongoose.Types.ObjectId(channelId),
      },
    },
    {
      $lookup: {
        from: "subscriptions",
        localField: "channel",
        foreignField: "subscriber",
        as: "subscribedChannels",
      },
    },
    {
      $lookup: {
        from: "users",
        localField: "subscriber",
        foreignField: "_id",
        as: "subscriber",
        pipeline: [
          {
            $lookup: {
              from: "subscriptions",
              localField: "_id",
              foreignField: "channel",
              as: "subscribersSubscribers",
            },
          },
          {
            $project: {
              username: 1,
              avatar: 1,
              fullName: 1,
              subscribersCount: {
                $size: "$subscribersSubscribers",
              },
            },
          },
        ],
      },
    },
    {
      $unwind: {
        path: "$subscriber",
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $addFields: {
        "subscriber.isSubscribed": {
          $cond: {
            if: {
              $in: ["$subscriber._id", "$subscribedChannels.channel"],
            },
            then: true,
            else: false,
          },
        },
      },
    },
    {
      $group: {
        _id: "channel",
        subscriber: {
          $push: "$subscriber",
        },
      },
    },
  ]);

  const subscribers =
    subscriberList?.length > 0 ? subscriberList[0].subscriber : [];

  return res
    .status(200)
    .json(new ApiResponse(200, subscribers, "Subscriber Sent Successfully"));
});

// controller to return channel list to which user has subscribed
const getSubscribedChannels = asyncHandler(async (req, res) => {
  const { subscriberId } = req.params;

  if (!isValidObjectId(subscriberId))
    throw new ApiError(400, "Invalid subscriberId");

  const subscribedChannels = await Subscription.aggregate([
    // get all subscribed channels
    {
      $match: {
        subscriber: new mongoose.Types.ObjectId(subscriberId),
      },
    },
    // get channel details
    {
      $lookup: {
        from: "users",
        localField: "channel",
        foreignField: "_id",
        as: "channel",
        pipeline: [
          {
            $project: {
              fullName: 1,
              username: 1,
              avatar: 1,
            },
          },
        ],
      },
    },
    {
      $unwind: "$channel",
    },
    // get channel's subscribers
    {
      $lookup: {
        from: "subscriptions",
        localField: "channel._id",
        foreignField: "channel",
        as: "channelSubscribers",
      },
    },
    {
      // logic if current user has subscribed the channel or not
      $addFields: {
        "channel.isSubscribed": {
          $cond: {
            if: { $in: [req.user?._id, "$channelSubscribers.subscriber"] },
            then: true,
            else: false,
          },
        },
        // channel subscriber count
        "channel.subscribersCount": {
          $size: "$channelSubscribers",
        },
      },
    },
    {
      $group: {
        _id: "subscriber",
        subscribedChannels: {
          $push: "$channel",
        },
      },
    },
  ]);

  const users =
    subscribedChannels?.length > 0
      ? subscribedChannels[0].subscribedChannels
      : [];

  return res
    .status(200)
    .json(
      new ApiResponse(200, users, "Subscribed channel list sent successfully")
    );
});


export {
    toggleSubscription,
    getSubscribedChannels,
    getUserChannelSubscribers
}