import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudnary.js";
import { ApiResponse } from "../utils/ApiResponse.js";


const generateAccessAndRefreshTokens = async(userId) =>{
    try {
        const user = await User.findById(userId)
        const accessToken = user.generateAccessToken()
        const refreshToken = user.generateRefreshToken()

        // Adding refresh Token in DB
        user.refreshToken = refreshToken
        // Don't validate just save
        await user.save({ validateBeforeSave: false })

        return {accessToken, refreshToken}


    } catch (error) {
        throw new ApiError(500, "Something went wrong while generating refresh and access token")
    }
}

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

const loginUser = asyncHandler( async (req , res) => {

    // req body -> data

    const {email, username, password } = req.body


    // username or email

    if(!username && !email)
    {
        throw new ApiError(400, "username or email is required")
    }


    //find the user

    const user = await User.findOne({
        $or: [{username}, {email}]
    })

    if (!user) {
        throw new ApiError(404, "User does not exist")
    }


    //password check

    const isPasswordValid = await user.isPasswordCorrect(password)

    if (!isPasswordValid) {
     throw new ApiError(401, "Invalid user credentials")
     }
 



    //access and referesh token

    const {accessToken, refreshToken} = await generateAccessAndRefreshTokens(user._id)

     // Why we call it again as we can see we are getting value from user created at 136 line but that user doesn't have any access to refresh Token or any token after calling the method on line 158 we are getting it and saving it in user

     // Here we get two choices:
     // 1. Update Object
     // 2. Fetch updated user

     // If DB call is costly then update the current object if not then fetch updater user from DB

    const loggedInUser = await User.findById(user._id).select("-password -refreshToken")

    //send cookie

    const options = {
        httpOnly : true,
        secure : true
    }

    return res
    .status(200)
    .cookie("accessToken",accessToken,options)
    .cookie("refreshToken",refreshToken,options)
    .json(
        new ApiResponse(
            200,
            {
                user : loggedInUser,accessToken,refreshToken
            },
            "User logged in successfully",
            true
        )
    )


})

const logoutUser = asyncHandler( async (req , res) => {

    //Q: Where we can get the Logged In user
    //A: We can get it from req.user

    // How? ---  as we add route to logout user in routes/user.routes.js which has middleware to verify JWT after verifying the user by access token we are adding the user in req object so when we are in logout method acc to routes/user.routes.js we can get the user from req.user which is inserted by verifyJWT middleware

    await User.findByIdAndUpdate(
        req.user._id,
        {
            // when user is logged out we have to remove the refresh token
            $unset: {
                refreshToken: 1 // this removes the field from document
            }
        },
        {
            new: true
        }
    )

    const options = {
        httpOnly: true,
        secure: true
    }

    return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200, {}, "User logged Out"))


})

export { 
    registerUser,
    loginUser,
    logoutUser
 }