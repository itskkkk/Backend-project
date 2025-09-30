import mongoose, { isValidObjectId } from "mongoose";
import {Comment} from "../models/comment.model.js";
import { Video } from "../models/video.model.js";
import { Like }  from "../models/like.model.js";
import {ApiError} from "../utilis/ApiError.js";
import  {ApiResponse}    from "../utilis/ApiResponse.js";
import {asyncHandler}  from "../utilis/asyncHandler.js";


const getVideoComments = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  const { page = 1, limit = 10 } = req.query;

  if (!isValidObjectId(videoId)) throw new ApiError(400, "Invalid VideoId");

  const options = {
    page,
    limit,
  };

  const video = await Video.findById(videoId);

  const allComments = await Comment.aggregate([
    {
      $match: {
        video: new mongoose.Types.ObjectId(videoId),
      },
    },
    // sort by date
    {
      $sort: {
        createdAt: -1,
      },
    },
    // fetch likes of Comment
    {
      $lookup: {
        from: "likes",
        localField: "_id",
        foreignField: "comment",
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
        foreignField: "comment",
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
              fullName: 1,
              username: 1,
              avatar: 1,
              _id: 1,
            },
          },
        ],
      },
    },
    { $unwind: "$owner" },
    {
      $project: {
        content: 1,
        owner: 1,
        createdAt: 1,
        updatedAt: 1,
        isOwner: {
          $cond: {
            if: { $eq: [req.user?._id, "$owner._id"] },
            then: true,
            else: false,
          },
        },
        likesCount: {
          $size: "$likes",
        },
        disLikesCount: {
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
        isLikedByVideoOwner: {
          $cond: {
            if: {
              $in: [video.owner, "$likes"],
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
    .json(new ApiResponse(200, allComments, "All comments Sent"));

  // TODO: Send paginated comments

  Comment.aggregatePaginate(allComments, options, function (err, results) {
    console.log("results", results);
    if (!err) {
      const {
        docs,
        totalDocs,
        limit,
        page,
        totalPages,
        pagingCounter,
        hasPrevPage,
        hasNextPage,
        prevPage,
        nextPage,
      } = results;

      return res.status(200).json(
        new ApiResponse(
          200,
          {
            Comments: docs,
            totalDocs,
            limit,
            page,
            totalPages,
            pagingCounter,
            hasPrevPage,
            hasNextPage,
            prevPage,
            nextPage,
          },
          "Comments fetched successfully"
        )
      );
    } else throw new ApiError(500, err.message);
  });
});

const addComment = asyncHandler(async(req, res) => {
     //Todo: add a comment to a video
     const {videoId} = req.params
     const {content} = req.body

     if(!videoId || !isValidObjectId(videoId)){
        throw new ApiError(400,"invalid videoId")
     }

     if(!content || content.trim() === ""){
        throw new ApiError(400,"content is empty")
     }

     const comment = await Comment.create({
        content : content.trim(),
        video : videoId,
        owner : req.user._id
     })

     if(!comment){
        throw new ApiError(500, "something went wrong while creating comment")
     }

     return res.status(200)
               .json(new ApiResponse(200,comment,"comment added successfully"))

})

const updateComment = asyncHandler(async(req, res) => {   
    //Todo: update a comment
    const {commentId} = req.params
    const {content} = req.body

    if(!commentId || !isValidObjectId(commentId)){
        throw new ApiError(400,"invalid commentId")
    }

    if(!content || content.trim() === ""){
        throw new ApiError(400,"content is empty")
    }

    const comment = await Comment.findById(commentId)

    if(!comment){
        throw new ApiError(404,"comment is not found")
    }

    if(comment.owner.toString() !== req.user._id.toString()){
        throw new ApiError(403,"you are not authorized to update the comment")
    }

    comment.content = content.trim()
    await comment.save()

    return res.status(200)
              .json(new ApiResponse(200,comment,"comment updated successfully"))

})

const deleteComment = asyncHandler(async(req, res) => {   
    //Todo: delete a comment

    const {commentId} = req.params

    if(!commentId || !isValidObjectId(commentId)) {
        throw new ApiError(400,"invalid commentId")
    }

    const comment = await Comment.findById(commentId)

    if(!comment){
        throw new ApiError(404,"No comment is found")
    }

    if(comment.owner.toString() !== req.user._id.toString()){
        throw new ApiError(403 , "you are not authorized to delete the commment")
    }

    await comment.deleteOne()

    const deleteLikes = await Like.deleteMany({
        comment: new mongoose.Types.ObjectId(commentId),
    })

    return res.status(200)
              .json(new ApiResponse(200,null,"comment deleted successfully"))


})


export {
    getVideoComments,
    addComment,
    updateComment,
    deleteComment
}
