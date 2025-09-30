import mongoose, { isValidObjectId } from "mongoose";
import {Tweet} from "../models/tweet.model.js";
import {ApiError} from "../utilis/ApiError.js";
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

const getUserTweets = asyncHandler(async (req, res) => {
  const { userId } = req.params;

  if (!isValidObjectId(userId))
    throw new ApiError(400, "Invalid userId: " + userId);

  const allTweets = await Tweet.aggregate([
    {
      $match: {
        owner: new mongoose.Types.ObjectId(userId),
      },
    },
    // sort by latest
    {
      $sort: {
        createdAt: -1,
      },
    },
    // fetch likes of tweet
    {
      $lookup: {
        from: "likes",
        localField: "_id",
        foreignField: "tweet",
        as: "likes",
        pipeline: [
          {
            $match: {
              liked: true,
            },
          },
          {
            $group: {
              _id: "liked",
              owners: { $push: "$likedBy" },
            },
          },
        ],
      },
    },
    {
      $lookup: {
        from: "likes",
        localField: "_id",
        foreignField: "tweet",
        as: "dislikes",
        pipeline: [
          {
            $match: {
              liked: false,
            },
          },
          {
            $group: {
              _id: "liked",
              owners: { $push: "$likedBy" },
            },
          },
        ],
      },
    },
    // Reshape Likes and dislikes
    {
      $addFields: {
        likes: {
          $cond: {
            if: {
              $gt: [{ $size: "$likes" }, 0],
            },
            then: { $first: "$likes.owners" },
            else: [],
          },
        },
        dislikes: {
          $cond: {
            if: {
              $gt: [{ $size: "$dislikes" }, 0],
            },
            then: { $first: "$dislikes.owners" },
            else: [],
          },
        },
      },
    },
    // get owner details
    {
      $lookup: {
        from: "users",
        localField: "owner",
        foreignField: "_id",
        as: "owner",
        pipeline: [
          {
            $project: {
              username: 1,
              avatar: 1,
              fullName: 1,
            },
          },
        ],
      },
    },
    {
      $unwind: "$owner",
    },
    {
      $project: {
        content: 1,
        createdAt: 1,
        updatedAt: 1,
        owner: 1,
        totalLikes: {
          $size: "$likes",
        },
        totalDisLikes: {
          $size: "$dislikes",
        },
        isLiked: {
          $cond: {
            if: {
              $in: [req.user?._id, "$likes"],
            },
            then: true,
            else: false,
          },
        },
        isDisLiked: {
          $cond: {
            if: {
              $in: [req.user?._id, "$dislikes"],
            },
            then: true,
            else: false,
          },
        },
      },
    },
  ]);

  return res
    .status(200)
    .json(new ApiResponse(200, allTweets, "all tweets send successfully"));
});


const getAllTweets = asyncHandler(async (req, res) => {
  const allTweets = await Tweet.aggregate([
    //sort by latest
    {
      $sort: {
        createdAt: -1,
      },
    },
    //fetch likes of tweet
    {
      $lookup: {
        from: "likes",
        localField: "_id",
        foreignField: "tweet",
        as: "likes",
        pipeline: [
          {
            $match: {
              liked: true,
            },
          },
          {
            $group: {
              _id: "liked",
              owners: { $push: "$likedBy" },
            },
          },
        ],
      },
    },
    {
      $lookup: {
        from: "likes",
        localField: "_id",
        foreignField: "tweet",
        as: "dislikes",
        pipeline: [
          {
            $match: {
              liked: false,
            },
          },
          {
            $group: {
              _id: "liked",
              owners: { $push: "$likedBy" },
            },
          },
        ],
      },
    },
    //Reshape Likes and dislikes
    {
      $addFields: {
        likes: {
          $cond: {
            if: {
              $gt: [{ $size: "$likes" }, 0],
            },
            then: { $first: "$likes.owners" },
            else: [],
          },
        },
        dislikes: {
          $cond: {
            if: {
              $gt: [{ $size: "$dislikes" }, 0],
            },
            then: { $first: "$dislikes.owners" },
            else: [],
          },
        },
      },
    },
    // get owner details
    {
      $lookup: {
        from: "users",
        localField: "owner",
        foreignField: "_id",
        as: "owner",
        pipeline: [
          {
            $project: {
              username: 1,
              avatar: 1,
              fullName: 1,
            },
          },
        ],
      },
    },
    {
      $unwind: "$owner",
    },
    {
      $project: {
        content: 1,
        createdAt: 1,
        updatedAt: 1,
        owner: 1,
        isOwner: {
          $cond: {
            if: { $eq: [req.user?._id, "$owner._id"] },
            then: true,
            else: false,
          },
        },
        totalLikes: {
          $size: "$likes",
        },
        totalDisLikes: {
          $size: "$dislikes",
        },
        isLiked: {
          $cond: {
            if: {
              $in: [req.user?._id, "$likes"],
            },
            then: true,
            else: false,
          },
        },
        isDisLiked: {
          $cond: {
            if: {
              $in: [req.user?._id, "$dislikes"],
            },
            then: true,
            else: false,
          },
        },
      },
    },
  ]);

  return res
    .status(200)
    .json(new ApiResponse(200, allTweets, "all tweets send successfully"));
});


const updateTweet = asyncHandler(async(req, res) => {
    //Todo: update tweet
    const {content} = req.body
    const {tweetId} = req.params

    if(!mongoose.isValidObjectId(tweetId)){
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
    
    if(!tweetId || !mongoose.isValidObjectId(tweetId)){
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
    getAllTweets,
    updateTweet,
    deleteTweet
}