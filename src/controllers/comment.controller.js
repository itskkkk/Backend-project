import mongoose, { isValidObjectId } from "mongoose";
import {Comment} from "../models/comment.model.js";
import {ApiError} from "../utilis/ApiError.js"
import  {ApiResponse}    from "../utilis/ApiResponse.js";
import {asyncHandler}  from "../utilis/asyncHandler.js";


const getVideoComments = asyncHandler(async(req, res) => {
    const {videoId} = req.params
    const {page = 1, limit = 10, sortBy = "createdAt", order = "desc"} = req.query
    //Todo: get all comments for a video

    if(!videoId || !isValidObjectId(videoId)){
        throw new ApiError(400,"invalid videoId")
    }

    const pageNumber = parseInt(page,10)
    const pageLimit  = parseInt(limit,10)

    const videoComments = await Comment.aggregate([
        {
            $match : {
                video : new mongoose.Types.ObjectId(videoId)
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
                owner : { $first : "$owner"}
            }
        },
        {
            $sort : { [sortBy] : order === "asc" ? 1 : -1 }
        },
        {
            $skip : (pageNumber-1)*pageLimit
        },
        {
            $limit : pageLimit
        }
    ])

    if(!videoComments){
        throw new ApiError(400,"error while fetching comments")
    }

    const totalComments = await Comment.countDocuments({ video : new mongoose.Types.ObjectId(videoId) })

    return res.status(200)
              .json(new ApiResponse(
                200,
                {
                    videoComments,
                    pagination : {
                        totalComments,
                        page : pageNumber,
                        limit : pageLimit,
                        totalPages : Math.ceil(totalComments/pageLimit)
                    }
                },
                "comments fetched successfully"
              ))


})

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

    return res.status(200)
              .json(new ApiResponse(200,null,"comment deleted successfully"))


})


export {
    getVideoComments,
    addComment,
    updateComment,
    deleteComment
}
