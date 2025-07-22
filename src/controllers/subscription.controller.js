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
const getUserChannelSubscribers = asyncHandler(async(req, res) => {
    const {channelId} = req.params

    if(!channelId || !isValidObjectId(channelId)){
        throw new ApiError(400, "channelId is not valid")
    }

    const subscribers = await Subscription.aggregate([
        {
            $match : {
                channel : new mongoose.Types.ObjectId(channelId)
            }
        },
        {
            $lookup : {
                from : "users",
                localField : "subscriber",
                foreignField : "_id",
                as : "subscribers",
                pipeline : [
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
            $unwind : "$subscribers"
        }
    ])

    if(!subscribers || subscribers.length  === 0) {
        throw new ApiError(400, "NO subscribers found")
    }

    return res.status(200)
              .json(new ApiResponse(200,subscribers,"subscribers updated successfully"))

})

//controller to return channel list to which user has subscribed
const getSubscribedChannels = asyncHandler(async(req, res) => {
    const {subscriberId} = req.params

    if(!subscriberId || !isValidObjectId(subscriberId)){
        throw new ApiError(400,"Invalid subscriberId")
    }

    const subscribedChannels = await Subscription.aggregate([
        {
            $match : {
                subscriber : new mongoose.Types.ObjectId(subscriberId)
            }
        },
        {
            $lookup : {
                from : "users",
                localField : "channel",
                foreignField : "_id",
                as : "channels",
                pipeline : [
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
            $unwind : "$channels"
        }
    ])

    if(!subscribedChannels || subscribedChannels.length === 0 ){
        throw new ApiError (404, "No subscribedChannels found")
    }

    return res.status(200)
              .json(new ApiResponse(200,subscribedChannels,"subscribed channels fetched successfully"))

})

export {
    toggleSubscription,
    getSubscribedChannels,
    getUserChannelSubscribers
}