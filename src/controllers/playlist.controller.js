import mongoose, {isValidObjectId} from "mongoose";
import {Playlist} from "../models/playlist.model.js";
import {ApiError} from "../utilis/ApiError.js"
import  {ApiResponse}    from "../utilis/ApiResponse.js";
import {asyncHandler}  from "../utilis/asyncHandler.js";


const createPlaylist = asyncHandler(async(req, res) => {
    const {name, description} = req.body
    //Todo: create playlist

    if(!name){
        throw new ApiError(400,"Name is required")
    }

    const playlist = await Playlist.create({
        name,
        description: description || "",
        owner : req.user._id
    })

    if(!playlist){
        throw new ApiError(400,"Error while creating playlist")
    }

    return res.status(200)
              .json(new ApiResponse(200,playlist,"Playlist created successfully"))


})

const getUserPlaylists = asyncHandler(async(req, res) => {
    const {userId} = req.params
    //Todo: get user playlist

    if(!userId || !isValidObjectId(userId)){
        throw new ApiError(400,"Invalid userId")
    }

    // const playlists = await Playlist.find({ owner : userId })

    // if(playlists.length === 0){
    //     throw new ApiError(404,"No playlists found for this user")
    // }

    const playlists = await Playlist.aggregate([
        {
            $match: {
                owner: new mongoose.Types.ObjectId(userId),
            },
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
                            fullName: 1,
                            avatar: 1,
                            username: 1,
                            views: 1,
                        },
                    },
                ],
            },
        },
        {
            $lookup: {
                from: "videos",
                localField: "videos",
                foreignField: "_id",
                as: "videos",
                pipeline: [
                    {
                        $project: {
                            thumbnail: 1,
                            views: 1,
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
                name: 1,
                description: 1,
                owner: 1,
                thumbnail: 1,
                videosCount: 1,
                createdAt: 1,
                updatedAt: 1,
                thumbnail: {
                    $first: "$videos.thumbnail",
                },
                videosCount: {
                    $size: "$videos",
                },
                totalViews: {
                    $sum: "$videos.views",
                },
            },
        },
    ]);


    return res.status(200)
              .json(new ApiResponse(200,playlists,"playlists fetched successfully"))


})

const getPlaylistById  = asyncHandler(async(req, res) => {
    const {playlistId} = req.params
    //Todo: get  playlist by id

    if(!playlistId || !isValidObjectId(playlistId)){
        throw new ApiError(400,"Invalid playlistId")
    }

    // const playlist = await Playlist.findById(playlistId)

    // if(!playlist){
    //     throw new ApiError(404,"playlist not found")
    // }
    const playlists = await Playlist.aggregate([
        {
            $match: {
                _id: new mongoose.Types.ObjectId(playlistId),
            },
        },
        {
            $lookup: {
                from: "videos",
                localField: "videos",
                foreignField: "_id",
                as: "videos",
                pipeline: [
                    {
                        $match: { isPublished: true },
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
                        $addFields: {
                            owner: {
                                $first: "$owner",
                            },
                        },
                    },
                ],
            },
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
            $addFields: {
                owner: {
                    $first: "$owner",
                },
            },
        },
        {
            $project: {
                name: 1,
                description: 1,
                videos: 1,
                owner: 1,
                thumbnail: 1,
                videosCount: 1,
                createdAt: 1,
                updatedAt: 1,
                thumbnail: {
                    $first: "$videos.thumbnail",
                },
                videosCount: {
                    $size: "$videos",
                },
                totalViews: {
                    $sum: "$videos.views",
                },
            },
        },
    ]);


    return res.status(200)
              .json(new ApiResponse(200,playlists[0],"playlist fetched successfully"))

})

const addVideoToPlaylist = asyncHandler(async(req, res) => {
    const {playlistId, videoId} = req.params
    //Todo: add video to playlist

    if(!playlistId || !isValidObjectId(playlistId)){
        throw new ApiError(400,"Invalid playlistId")
    }

    if(!videoId || !isValidObjectId(videoId)){
        throw new ApiError(400,"Invalid videoId")
    }

    const playlist = await Playlist.findById(playlistId)

    if(!playlist){
        throw new ApiError(400,"playlist not found")
    }

    if(playlist.owner.toString() !== req.user._id.toString()){
        throw new ApiError(403,"You are not authorized to add video to playlist")
    }

    if(!playlist.videos.includes(videoId)){
        playlist.videos.push(videoId)
        await playlist.save()
    }
    

    return res.status(200)
              .json(new ApiResponse(200,playlist,"video successfully added to playlist"))

})

const removeVideoFromPlaylist = asyncHandler(async(req, res) => {
    const {playlistId, videoId} = req.params
    //Todo: remove video from playlist

    if(!playlistId || !isValidObjectId(playlistId)){
        throw new ApiError(400,"invalid playlistId")
    }

    if(!videoId || !isValidObjectId(videoId)){
        throw new ApiError(400,"invalid videoId")
    }

    const playlist = await Playlist.findById(playlistId)

    if(!playlist){
        throw new ApiError(404,"playlist  not found")
    }

    if(playlist.owner.toString() !== req.user._id.toString()){
        throw new ApiError(403,"you are not authorized to remove video from the playlist")
    }

    playlist.videos.pull(videoId)
    await playlist.save()

    return res.status(200)
              .json(new ApiResponse(200,playlist,"video removed successfully"))

})

const deletePlaylist = asyncHandler(async(req, res) => {
    const {playlistId} = req.params
    //Todo: delete playlist

    if(!playlistId || !isValidObjectId(playlistId)){
        throw new ApiError(400,"Invalid playlistId")
    }

    const playlist = await Playlist.findById(playlistId)

    if(!playlist){
        throw new ApiError(404,"playlist is not available")
    }

    if(playlist.owner.toString() !== req.user._id.toString()){
        throw new ApiError(403,"you are not authorized to delete the playlist")
    }

    await playlist.deleteOne()

    return res.status(200)
              .json(new ApiResponse(200,null,"playlist deleted successfully"))

})

const updatePlaylist = asyncHandler(async(req, res) => {
    const {playlistId} = req.params
    const {name, description} = req.body
    //Todo: update playlist

    if(!name || !description){
        throw new ApiError(400,"All fields are required")
    }

    if(!playlistId || !isValidObjectId(playlistId)){
        throw new ApiError(400,"Invalid playlistId")
    }

    const playlist = await Playlist.findById(playlistId)

    if(!playlist){
        throw new ApiError(400,"playlist is not available")
    }

    if(playlist.owner.toString() !== req.user._id.toString()){
        throw new ApiError(403,"You are not authorized to update the playlist")
    }

    playlist.name = name
    playlist.description = description
    await playlist.save()

    return res.status(200)
              .json(new ApiResponse(200,playlist,"playlist updated successfully"))

})

const getVideoSavePlaylists = asyncHandler(async (req, res) => {
  const { videoId } = req.params;

  if (!isValidObjectId(videoId))
    throw new ApiError(400, "Valid videoId required");

  const playlists = await Playlist.aggregate([
    {
      $match: {
        owner: new mongoose.Types.ObjectId(req.user?._id),
      },
    },
    {
      $project: {
        name: 1,
        isVideoPresent: {
          $cond: {
            if: { $in: [new mongoose.Types.ObjectId(videoId), "$videos"] },
            then: true,
            else: false,
          },
        },
      },
    },
  ]);

  return res
    .status(200)
    .json(new ApiResponse(200, playlists, "Playlists sent successfully"));
});



export {
    createPlaylist,
    getPlaylistById,
    getUserPlaylists,
    addVideoToPlaylist,
    removeVideoFromPlaylist,
    deletePlaylist,
    updatePlaylist,
    getVideoSavePlaylists,
}