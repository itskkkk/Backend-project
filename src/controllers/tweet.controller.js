import mongoose, {isValidObjectId} from "mongoose";
import {Tweet} from "../models/tweet.model.js";
import {User} from "../models/user.model.js";
import {ApiError} from "../utilis/ApiError.js"
import  {ApiResponse}    from "../utilis/ApiResponse.js";
import {asyncHandler}  from "../utilis/asyncHandler.js";

const createTweet = asyncHandler(async(req, res) => {
    //Todo: create tweet
    const {content} = req.body

    if(!content || content.trim() === "") {
        throw new ApiError(400,"content is required")
    }

    const tweet = await Tweet.create({
        content : content.trim(),
        owner : req.user._id
    })

    if(!tweet) {
        throw new ApiError(500,"something went wrong while creating tweet")
    }

    return res.status(201)
              .json(
                new ApiResponse(201,tweet,"tweet successfully created")
              )

})

const getUserTweets = asyncHandler(async(req, res) => {
    //Todo: get user tweets

    const {username} = req.params
    
    if(!username?.trim()) {
        throw new ApiError(400, "username is missing")
    }

    const tweets = await User.aggregate([
        {
            $match : {
                username : username?.toLowerCase()
            }
        },
        {
            $lookup : {
                from : "tweets",
                localField : "_id",
                foreignField : "owner",
                as : "tweets" ,
                pipeline : [
                    {
                        $project : {
                            content : 1,
                            createdAt : 1,
                            updatedAt : 1,
                        }
                    }
                ]
            }
        },
        {
            $project : {
                username : 1,
                fullName : 1,
                avatar : 1,
                tweets : 1, 
            }
        }
    ])

    if (!tweets?.length) {
        throw new ApiError(400,"No tweets available")
    }

    return res.status(200)
              .json(
                new ApiResponse(200,tweets[0],"tweets fetched successfully")
              )
})

const updateTweet = asyncHandler(async(req, res) => {
    //Todo: update tweet
    const {content} = req.body
    const {tweetId} = req.params

    if(!mongoose.Types.ObjectId.isValid(tweetId)){
        throw new ApiError ( 400,"invalid tweetId")
    }

    if(!content || content.trim() ==="") {
        throw new ApiError (400,"content is required")
    }

    const tweet = await Tweet.findById(tweetId)

     if(!tweet) {
        throw new ApiError (404,"tweet not found")
    }

    if( tweet.owner.toString() !== req.user._id.toString() ) {
        throw new ApiError (403,"user is not authenticated to update the tweet")
    }

    tweet.content = content.trim()

     await tweet.save({validateBeforeSave : false});

    return res.status(200)
              .json(new ApiResponse(200,tweet,"tweet updated successfully"))


})


const deleteTweet = asyncHandler(async(req, res) => {
    //Todo: delete tweet

    const { tweetId } = req.params
    
    if(!tweetId || !mongoose.Types.ObjectId.isValid(tweetId)){
        throw new ApiError(400,"valid tweetId is required")
    }

    const tweet = await Tweet.findById(tweetId)

    if(!tweet){
        throw new ApiError(404,"tweet is not found")
    }

    if(tweet.owner.toString() !== req.user._id.toString()) {
        throw new ApiError(403,"you are not authorized to delete this tweet")
    }

    await tweet.deleteOne();


    return res.status(200)
              .json(new ApiResponse(200,null,"tweet deleted successfully"))

})

export {
    createTweet,
    getUserTweets,
    updateTweet,
    deleteTweet
}