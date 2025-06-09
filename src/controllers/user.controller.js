import { asyncHandler } from "../utilis/asyncHandler.js";
import {ApiError} from "../utilis/ApiError.js";
import { User } from "../models/user.model.js";
import {uploadOnCloudinary} from "../utilis/cloudinary.js";
import { ApiResponse } from "../utilis/ApiResponse.js";

const registerUser = asyncHandler(async (req , res) => {
    // get user details from frontend
    // validation - not empty
    // check if user already exists; username,email
    // check for images,check for avatar
    // upload them to cloudinary,avatar
    // create user object - create entry in db
    // remove password and refresh token field from response
    // check for user creation 
    // return response

    
    const {fullName, email, username, password } = req.body
    console.log("email:" , email);

    // if (fullName === "") {
    //     throw new ApiError(400 , 'fullname is required')
    // }

    if(
        [fullName, email, username, password].some((field) => field?.trim() === "")
    ) {
        throw new ApiError(400, "All fields are required")
    }

    const existedUser = User.findOne({
        $or: [{ username }, { email }]
    })

    if(existedUser) {
        throw new ApiError(409, "User with email or username already exists")
    }

    const avatarLocalpath = req.files?.avatar[0]?.path;
    const coverImageLocalpath = req.files?.coverImage[0]?.path;

    if (!avatarLocalpath) {
        throw new ApiError(400, "Avatar file is required")
    }

    const avatar = await uploadOnCloudinary(avatarLocalpath)
    const coverImage = await uploadOnCloudinary(coverImageLocalpath)

    if (!avatar) { 
        throw new ApiError(400, "Avatar files is required")
    }

    const user = await User.create({
        fullName,
        avatar: avatar.url,
        coverImage: coverImage?.url || "",
        email, 
        password,
        username: username.toLowerCase()
    })

    const createdUser = await User.findById(user._id).select(
        "-password -refreshToken "
    )

    if (!createdUser) {
        throw new ApiError(500 , "something went wrong while registering the user")
    }

    return res.status(201).json(
        new ApiResponse(200, createdUser, "User Registered successfully")
    )

})


export { registerUser }