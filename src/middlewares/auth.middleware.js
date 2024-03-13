import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken"
import { User } from "../models/user.model.js";


export const verifyJWT = asyncHandler( async ( req , res, next ) => {

    // Initially token is something like

    //Authorization: Bearer <token>

    // Bearer "xyz"
    // When we replace "Bearer " actually we left with token 

    //So that is how we got the token which came from user request 

    try {
        const token = req.cookies?.accessToken || req.header("Authorization")?.replace("Bearer ", "")

    if(!token)
    {
       throw new ApiError( 401 , "Please login to access this resource")
    }

    const decodedToken = await jwt.verify(token, process.env.ACCESS_TOKEN_SECRET)

    const user = await User.findById(decodedToken?._id).select("-password -refreshToken")
    
    if (!user) {
        
        throw new ApiError(401, "Invalid Access Token")
    }

    req.user = user

    // in user.routes.js
    // we are running verifyJWT middleware and then logout is called
    // when verifyJWT middleware is completed is says next so it goes to logout
    // that is the reason we are calling next here
    next()


        
    } catch (error) {
        throw new ApiError(401, error?.message || "Invalid access token")

    }
    

})