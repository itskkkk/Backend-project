import mongoose, { isValidObjectId } from "mongoose";
import {ApiError} from "../utilis/ApiError.js";
import {ApiResponse} from "../utilis/ApiResponse.js";
import {asyncHandler} from "../utilis/asyncHandler.js";
import {Like} from "../models/like.model.js";
import {Video} from "../models/video.model.js";
import {Comment} from "../models/comment.model.js";
import {Tweet} from "../models/tweet.model.js";



// Helper function to get like counts efficiently
const getLikeCounts = async (filter) => {
  const result = await Like.aggregate([
    { $match: filter },
    {
      $group: {
        _id: null,
        totalLikes: { $sum: { $cond: [{ $eq: ["$liked", true] }, 1, 0] } },
        totalDislikes: { $sum: { $cond: [{ $eq: ["$liked", false] }, 1, 0] } }
      }
    }
  ]);
  
  return result.length > 0 
    ? { totalLikes: result[0].totalLikes, totalDislikes: result[0].totalDislikes }
    : { totalLikes: 0, totalDislikes: 0 };
};

// Helper function to validate content exists
const validateContentExists = async (contentType, contentId) => {
  let content;
  
  switch (contentType) {
    case 'video':
      content = await Video.findById(contentId).lean();
      if (!content) throw new ApiError(404, `Video with ID ${contentId} not found`);
      break;
    case 'comment':
      content = await Comment.findById(contentId).lean();
      if (!content) throw new ApiError(404, `Comment with ID ${contentId} not found`);
      break;
    case 'tweet':
      content = await Tweet.findById(contentId).lean();
      if (!content) throw new ApiError(404, `Tweet with ID ${contentId} not found`);
      break;
    default:
      throw new ApiError(400, "Invalid content type");
  }
  
  return content;
};

const getLikedVideos = asyncHandler(async (req, res) => {
  const likedVideos = await Like.aggregate([
    {
      $match: {
        video: { $ne: null },
        likedBy: new mongoose.Types.ObjectId(req.user?._id),
        liked: true // Only get actual likes, not dislikes
      },
    },
    {
      $lookup: {
        from: "videos",
        localField: "video",
        foreignField: "_id",
        as: "video",
        pipeline: [
          {
            $match: {
              isPublished: true // Filter out unpublished videos at lookup level
            }
          },
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
                    fullName: 1,
                    avatar: 1,
                  },
                },
              ],
            },
          },
          {
            $unwind: "$owner",
          },
        ],
      },
    },
    {
      $unwind: "$video",
    },
    {
      $replaceRoot: {
        newRoot: "$video"
      }
    }
  ]);

  return res
    .status(200)
    .json(new ApiResponse(200, likedVideos, "Liked videos fetched successfully"));
});

const toggleLike = asyncHandler(async (req, res) => {
  const { toggleLike, commentId, videoId, tweetId } = req.query;

  // Validate exactly one content ID is provided
  const providedIds = [
    { id: commentId, type: 'comment' },
    { id: videoId, type: 'video' },
    { id: tweetId, type: 'tweet' }
  ].filter(item => item.id && isValidObjectId(item.id));

  if (providedIds.length === 0) {
    throw new ApiError(400, "At least one valid ID (videoId, commentId, or tweetId) is required");
  }

  if (providedIds.length > 1) {
    throw new ApiError(400, "Only one content ID should be provided at a time");
  }

  // Validate toggleLike parameter
  let isLikeAction;
  if (toggleLike === "true") {
    isLikeAction = true;
  } else if (toggleLike === "false") {
    isLikeAction = false;
  } else {
    throw new ApiError(400, "toggleLike parameter must be 'true' or 'false'");
  }

  const { id: contentId, type: contentType } = providedIds[0];

  // Validate content exists
  await validateContentExists(contentType, contentId);

  // Create filter for database operations
  const baseFilter = { likedBy: req.user._id };
  baseFilter[contentType] = contentId;

  // Use atomic operation to handle like toggle
  const session = await mongoose.startSession();
  let result;

  try {
    result = await session.withTransaction(async () => {
      // Find existing like/dislike
      const existingLike = await Like.findOne(baseFilter).session(session);

      let isLiked = false;
      let isDisLiked = false;

      if (existingLike) {
        if (existingLike.liked === isLikeAction) {
          // Same action (like->like or dislike->dislike), so remove it
          await Like.findByIdAndDelete(existingLike._id).session(session);
          isLiked = false;
          isDisLiked = false;
        } else {
          // Different action (like->dislike or dislike->like), so update it
          existingLike.liked = isLikeAction;
          await existingLike.save({ session });
          isLiked = isLikeAction;
          isDisLiked = !isLikeAction;
        }
      } else {
        // No existing entry, create new one
        const newLike = new Like({
          ...baseFilter,
          liked: isLikeAction
        });
        await newLike.save({ session });
        isLiked = isLikeAction;
        isDisLiked = !isLikeAction;
      }

      // Get updated counts
      const counts = await getLikeCounts({ [contentType]: contentId });

      return {
        isLiked,
        isDisLiked,
        ...counts
      };
    });
  } finally {
    await session.endSession();
  }

  return res.status(200).json(
    new ApiResponse(200, result, "Like toggled successfully")
  );
});

// Specific toggle functions for backward compatibility and direct API calls
const toggleVideoLike = asyncHandler(async (req, res) => {
  const { videoId } = req.params;

  if (!isValidObjectId(videoId)) {
    throw new ApiError(400, "Invalid video ID format");
  }

  // Validate video exists
  await validateContentExists('video', videoId);

  // Find existing like
  const existingLike = await Like.findOne({
    video: videoId,
    likedBy: req.user._id
  });

  let isLiked = false;
  let totalLikes = 0;

  if (existingLike) {
    // Remove existing like
    await Like.findByIdAndDelete(existingLike._id);
    isLiked = false;
  } else {
    // Create new like
    await Like.create({
      video: videoId,
      likedBy: req.user._id,
      liked: true
    });
    isLiked = true;
  }

  // Get updated count
  const counts = await getLikeCounts({ video: videoId });
  totalLikes = counts.totalLikes;

  return res.status(200).json(
    new ApiResponse(
      200,
      { isLiked, totalLikes },
      "Video like toggled successfully"
    )
  );
});

const toggleCommentLike = asyncHandler(async (req, res) => {
  const { commentId } = req.params;
  const { toggleLike } = req.query;

  if (!isValidObjectId(commentId)) {
    throw new ApiError(400, "Invalid comment ID format");
  }

  let isLikeAction;
  if (toggleLike === "true") {
    isLikeAction = true;
  } else if (toggleLike === "false") {
    isLikeAction = false;
  } else {
    throw new ApiError(400, "toggleLike query parameter must be 'true' or 'false'");
  }

  // Validate comment exists
  await validateContentExists('comment', commentId);

  // Handle like/dislike toggle
  const existingLike = await Like.findOne({
    comment: commentId,
    likedBy: req.user._id
  });

  let isLiked = false;
  let isDisLiked = false;

  if (existingLike) {
    if (existingLike.liked === isLikeAction) {
      // Same action, remove it
      await Like.findByIdAndDelete(existingLike._id);
      isLiked = false;
      isDisLiked = false;
    } else {
      // Different action, update it
      existingLike.liked = isLikeAction;
      await existingLike.save();
      isLiked = isLikeAction;
      isDisLiked = !isLikeAction;
    }
  } else {
    // Create new entry
    await Like.create({
      comment: commentId,
      likedBy: req.user._id,
      liked: isLikeAction
    });
    isLiked = isLikeAction;
    isDisLiked = !isLikeAction;
  }

  // Get updated counts
  const counts = await getLikeCounts({ comment: commentId });

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        isLiked,
        isDisLiked,
        totalLikes: counts.totalLikes,
        totalDislikes: counts.totalDislikes
      },
      "Comment like toggled successfully"
    )
  );
});

const toggleTweetLike = asyncHandler(async (req, res) => {
  const { tweetId } = req.params;

  if (!isValidObjectId(tweetId)) {
    throw new ApiError(400, "Invalid tweet ID format");
  }

  // Validate tweet exists
  await validateContentExists('tweet', tweetId);

  // Find existing like
  const existingLike = await Like.findOne({
    tweet: tweetId,
    likedBy: req.user._id
  });

  let isLiked = false;
  let totalLikes = 0;

  if (existingLike) {
    // Remove existing like
    await Like.findByIdAndDelete(existingLike._id);
    isLiked = false;
  } else {
    // Create new like
    await Like.create({
      tweet: tweetId,
      likedBy: req.user._id,
      liked: true
    });
    isLiked = true;
  }

  // Get updated count
  const counts = await getLikeCounts({ tweet: tweetId });
  totalLikes = counts.totalLikes;

  return res.status(200).json(
    new ApiResponse(
      200,
      { isLiked, totalLikes },
      "Tweet like toggled successfully"
    )
  );
});

export {
  toggleCommentLike,
  toggleTweetLike,
  toggleVideoLike,
  getLikedVideos,
  toggleLike,
};

{/* import mongoose, {isValidObjectId} from "mongoose";
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

    // if(!likedVideos.length){
    //     throw new ApiError ( 400,"no liked videos found")
    // }

    return res.status(200)
              .json(new ApiResponse(200,likedVideos," fetched liked videos successfully "))

})

export {
    toggelCommentLike,
    toggleTweetLike,
    toggleVideoLike,
    getLikedVideos
} */}
