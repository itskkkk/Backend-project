import mongoose, {isValidObjectId} from "mongoose";
import {Playlist} from "../models/playlist.model.js";
import {ApiError} from "../utilis/ApiError.js"
import  {ApiResponse}    from "../utilis/ApiResponse.js";
import {asyncHandler}  from "../utilis/asyncHandler.js";


const createPlaylist = asyncHandler(async(req, res) => {
    const {name, description} = req.body
    //Todo: create playlist

    if(!name || !description){
        throw new ApiError(400,"All fields are required")
    }

    const playlist = await Playlist.create({
        name,
        description,
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

    const playlists = await Playlist.find({ owner : userId })

    if(playlists.length === 0){
        throw new ApiError(404,"No playlists found for this user")
    }

    return res.status(200)
              .json(new ApiResponse(200,playlists,"playlists fetched successfully"))


})

const getPlaylistById  = asyncHandler(async(req, res) => {
    const {playlistId} = req.params
    //Todo: get  playlist by id

    if(!playlistId || !isValidObjectId(playlistId)){
        throw new ApiError(400,"Invalid playlistId")
    }

    const playlist = await Playlist.findById(playlistId)

    if(!playlist){
        throw new ApiError(404,"playlist not found")
    }

    return res.status(200)
              .json(new ApiResponse(200,playlist,"playlist fetched successfully"))

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


export {
    createPlaylist,
    getPlaylistById,
    getUserPlaylists,
    addVideoToPlaylist,
    removeVideoFromPlaylist,
    deletePlaylist,
    updatePlaylist
}