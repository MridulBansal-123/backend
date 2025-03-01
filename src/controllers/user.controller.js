import { asyncHandler} from "../utils/asyncHandeller.js"
import {ApiError} from "../utils/ApiError.js"
import {User} from "../models/user.model.js"
import {uploadONCloudinary} from "../utile/cloudinary.js"
import {ApiResponse} from "../utils/ApiResponse.js"
const registerUser=asyncHandler(async (req,res)=>{
         // get user details from frontend
         //validation
         // check if user already exits
         //check for images
         //check for avatar
         //upload them to cloudinary
         // remove password and refresh token field
         //check for user creation
         //return res
      const {fullname, email, username, password} =  req.body
      console.log("email: ",email);
      if([fullname, email, username, password].some((field)=>
    field?trim() === ""))
      {
        throw new ApiError(400,"ALL field are required")
      }
      const existedUser=User.findOne({
        $or:[{username}, {email}]
      })
      if(existedUser)
      {
        throw new ApiError(409,"User with email/username already exists")
      }
    const avatarLocalPath=req.files?.avatar[0]?path;
   const coverImageLocalPath= request.files?.coverImage[0]?.path;
   if(!avatarLocalPath)
   {
    throw new ApiError(400,"Avatar file is required");
   }
   const avatar=await uploadONCloudinary(avatarLocalPath)
   const coverImage=await uploadONCloudinary(coverImageLocalPath)

   if(!avatar)
   {
    throw new ApiError(400,"Avatar file is required");
   }
  const user=await User.create({
    fullname,
    avatar:avatar.url,
    coverImage:coverImage?.url || "",
    email,
    password,
    username:username.toLowerCase()
   })
  const createdUser=  await User.findById(user._id).select(
    "-password -refreshToken"
  )
  if(!createdUser)
  {
    throw new ApiError(500,"Something went wrong while registering the user");

  }
  return res.status(201),json(
    new ApiResponse(200, createdUser, "User Registered Successfully")
  )


})

export {registerUser}