import { asyncHandler} from "../utils/asyncHandeller.js"
import {ApiError} from "../utils/ApiError.js"
import {User} from "../models/user.model.js"
import {uploadONCloudinary} from "../utils/cloudinary.js"
import {ApiResponse} from "../utils/ApiResponse.js"
const registerUser=asyncHandler(async (req,res)=>{
     
      const {fullName, email, username, password} =  req.body
      console.log("email: ",email);
      if([fullName, email, username, password].some((field)=>
    field?.trim() === ""))
      {
        throw new ApiError(400,"ALL field are required")
      }
      const existedUser=await User.findOne({
        $or:[{username}, {email}]
      })
      if(existedUser)
      {
        throw new ApiError(409,"User with email/username already exists")
      }
      // console.log(req.files)
    const avatarLocalPath=req.files?.avatar[0]?.path
    const coverImageLocalPath= req.files?.coverImage[0]?.path
    console.log("Avatar Path:", avatarLocalPath);
   if(!avatarLocalPath)
   {
    throw new ApiError(400,"Avatar file is required")
   }
  
   const avatar=await uploadONCloudinary(avatarLocalPath)
   const coverImage=await uploadONCloudinary(coverImageLocalPath)
  // const avatar = await uploadONCloudinary(fixedAvatarPath);
  // const coverImage = coverImageLocalPath
  //   ? await uploadONCloudinary(fixedCoverImagePath)
  //   : null;
  
   if(!avatar)
   {
    throw new ApiError(400,"Avatar file not uploaded");
   }
  const user=await User.create({
    fullName,
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
  return res.status(201).json(
    new ApiResponse(200, createdUser, "User Registered Successfully")
  )


})

export {registerUser}