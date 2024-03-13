import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudnary.js";
import { ApiResponse } from "../utils/ApiResponse.js";

const registerUser = asyncHandler( async (req , res) => {


    

    // if data is coming from from || json it will handle
    // for url we will see different approach


    // get user details from frontend


    const {fullName, email, username, password } = req.body

    // validation - not empty

    if (
        [fullName, email, username, password].some((field) => field?.trim() === "")
    ) {
        throw new ApiError(400, "All fields are required")
    }

    // check if user already exists: username, email

    const existedUser = await User.findOne({ $or: [{ username }, { email }] })

    if(existedUser)
    {
        throw new ApiError(409, "User already exists")
    }

    // check for images, check for avatar

    const avatarLocalPath = req.files?.avatar[0]?.path
    //const coverImageLocalPath = req.files?.coverImage[0]?.path

    let coverImageLocalPath;
    if (req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0) {
        coverImageLocalPath = req.files.coverImage[0].path
    }


    if(!avatarLocalPath)
    {
        throw new ApiError(400, "Avatar is required")
    }

    // upload them to cloudinary, avatar


    const avatar = await uploadOnCloudinary(avatarLocalPath)
    const coverImage = await uploadOnCloudinary(coverImageLocalPath)

    if(!avatar)
    {
        throw new ApiError(500, "Failed to upload avatar")
    }

    // create user object - create entry in db

    const user = await User.create({
        fullName,
        email,
        username:username.toLowerCase(), 
        password,
        avatar: avatar.secure_url,
        coverImage: coverImage?.secure_url || "",
    })

    // remove password and refresh token field from response


    const createdUser = await User.findById(user._id).select(
        "-password -refreshToken"
    )

    // check for user creation

    if(!createdUser)
    {
        throw new ApiError(500, "Failed to create user")
    }

    // return res

    return res.status(201).json(
        new ApiResponse(200,"User registered Successfully", createdUser, true) 
    )
 

})

export { registerUser }