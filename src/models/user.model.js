import mongoose,{ Schema } from "mongoose";
import jwt from "jsonwebtoken"
import bcrypt from "bcrypt"


const userSchema = new Schema(
    {
    username: {
        type: String,
        required: [true,'Username is required'],
        unique: true,
        lowercase: true,
        trim: true, 
        index: true // For optimized search 
    },
    email: {
        type: String,
        required: [true,'Email is required'],
        unique: true,
        lowercase: true,
        trim: true, 
    },
    fullName: {
        type: String,
        required: [true,'Full name is required'],
        trim: true, 
        index: true
    },
    avatar: {
        type: String, // cloudinary url
        required: [true,'Avatar is required']
    },
    coverImage: {
        type: String, // cloudinary url
    },
    watchHistory: [
        {
            type: Schema.Types.ObjectId,
            ref: "Video"
        }
    ],
    password: {
        type: String,
        required: [true, 'Password is required']
    },
    refreshToken: {
        type: String
    }

},
    {
        timestamps: true,
    }
);

// use this hook before "save user" to hash password
userSchema.pre("save", async function (next) {
    // if password is not modified, skip hashing
    if(!this.isModified("password")) return next();

    this.password = await bcrypt.hash(this.password, 10)
    next()
})

/**
 * Check if the provided password is correct.
 *
 * @param {string} password - The password to be checked
 * @return {boolean} Whether the provided password is correct or not
 */
userSchema.methods.isPasswordCorrect = async function(password){
    return await bcrypt.compare(password, this.password)
}

userSchema.methods.generateAccessToken = function(){
    return jwt.sign(
        {
            _id: this._id,
            email: this.email,
            username: this.username,
            fullName: this.fullName
        },
        process.env.ACCESS_TOKEN_SECRET,
        {
            expiresIn: process.env.ACCESS_TOKEN_EXPIRY
        }
    )
}
userSchema.methods.generateRefreshToken = function(){
    return jwt.sign(
        {
            _id: this._id,
            
        },
        process.env.REFRESH_TOKEN_SECRET,
        {
            expiresIn: process.env.REFRESH_TOKEN_EXPIRY
        }
    )
}



export const User = mongoose.model("User", userSchema)