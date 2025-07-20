import mongoose, {isValidObjectId} from "mongoose";
import {Like} from "../models/like.model.js";
import {ApiError} from "../utilis/ApiError.js"
import  {ApiResponse}    from "../utilis/ApiResponse.js";
import {asyncHandler}  from "../utilis/asyncHandler.js";


const toggleVideoLike = asyncHandler(async(req, res) => {
    const {videoId} = req.params
    //Todo: toggle like on video

    if(!videoId || !mongoose.isValidObjectId(videoId)){
        throw new ApiError(400," invalid videoId")
    }

    const likedVideo = await Like.findOne({
        video : videoId,
        likedBy : req.user._id
    })

    let isLiked = false

    if(!likedVideo) {
        await Like.create({
            video : videoId,
            likedBy : req.user._id
        })
        isLiked = true
    }else{
        await likedVideo.deleteOne()
    }

    return res.status(200)
              .json(new ApiResponse(200,{isLiked}, "like toggled successfully"))

})

const toggelCommentLike = asyncHandler(async(req, res) => {
    const {commentId} = req.params
    //Todo: toggle like on comment

    if(!commentId || !mongoose.isValidObjectId(commentId)){
        throw new ApiError(400,"invalid commentId")
    }

    const likedComment = await Like.findOne({
        comment : commentId,
        likedBy : req.user._id
    })

    let isLiked = false

    if(!likedComment){
        await Like.create({
            comment : commentId,
            likedBy : req.user._id
        })
        isLiked  = true
    }else{
        await likedComment.deleteOne()
    }

    return res.status(200)
              .json(new ApiResponse(200,{isLiked},"comment like toggled successfully"))

})

const toggleTweetLike = asyncHandler(async(req, res) => {
    const {tweetId} = req.params
    //Todo: toggle like on tweet

    if(!tweetId || !mongoose.isValidObjectId(tweetId)){
        throw new ApiError(400,"invalid tweetId")
    }

    const likedTweet = await Like.findOne({
        tweet : tweetId,
        likedBy : req.user._id
    })

    let isLiked = false 

    if(!likedTweet) {
        await Like.create({
            tweet : tweetId,
            likedBy : req.user._id
        })
        isLiked = true
    }else{
        await likedTweet.deleteOne()
    }

    return res.status(200)
              .json(new ApiResponse(200,{isLiked},"tweet like toggled successfully"))

})

const getLikedVideos = asyncHandler(async(req, res) => {
    //Todo: get all liked videos

    const likedVideos = await Like.aggregate([
        {
            $match : {
                video : {$ne : null},
                likedBy : new mongoose.Types.ObjectId(req.user._id)
            }
        },
        {
            $lookup : {
                from : "videos",
                localField : "video",
                foreignField : "_id",
                as : "likedVideo",
                pipeline : [
                    {
                     $lookup : {
                        from : "users",
                        localField : "owner",
                        foreignField : "_id",
                        as : "owner",
                        pipeline : [
                            {
                                $project : {
                                    fullName : 1,
                                    username : 1,
                                    avatar : 1
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
        },
        {
            $unwind : "$likedVideo"
        },
        {
            $replaceRoot : {
                newRoot : "$likedVideo"
            }
        }
    ])

    if(!likedVideos.length){
        throw new ApiError ( 400,"no liked videos found")
    }

    return res.status(200)
              .json(new ApiResponse(200,likedVideos," fetched liked videos successfully "))

})

export {
    toggelCommentLike,
    toggleTweetLike,
    toggleVideoLike,
    getLikedVideos
}
