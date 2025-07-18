import { asyncHandler} from "../utils/asyncHandeller.js"
import {ApiError} from "../utils/ApiError.js"
import {User} from "../models/user.model.js"
import {uploadONCloudinary} from "../utils/cloudinary.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import jwt from "jsonwebtoken"

const generateAccessAndRefreshTokens=async(userId)=>
{
  try{
        const user= await User.findById(userId);
       const refreshToken = user.generateRefreshToken()
       const accessToken= user.generateAccessToken()
      
       user.refreshToken=refreshToken
      await user.save({validateBeforeSave: false})
      return {accessToken, refreshToken}

      }
  catch(error)
  {
    throw new ApiError(500,"Something Went Wrong while generating refresh and access token");
  }
}

const registerUser=asyncHandler(async (req,res)=>{
     console.log(req.body)
      const {fullName, email, username, password} =  req.body
      
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
    let coverImageLocalPath;
    if(req.files &&Array.isArray(req.files.coverImage)&& req.files.coverImage.length >0)
    {
      coverImageLocalPath=req.files.coverImage[0].path}
    
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
const loginUser =asyncHandler(async (req,res)=>{
  // req body->data
  // usernameor email
  // find the user
  // password check
  // access and refreash token
  // send cookie
 
  const {email, username, password}=req.body
  
  if(!username && !email)
  {
    throw new ApiError(400,"username or email is required")
  }
  const user=await User.findOne({$or:[{email},{username}]})
  if(!user)
  {
    throw new ApiError(404,"User does not exist");
  }
 const isPasswordValid= await user.isPasswordCorrect(password);
 if(!isPasswordValid)
 {
  throw new ApiError(401,"Invalid Credentials");

 }
  const {accessToken, refreshToken}= await generateAccessAndRefreshTokens(user._id)
  const loggedInUser=await User.findById(user._id).
    select("-password -refreshToken")
  const options ={
    httpOnly: true,
    secure:true,
    //this makes cokkied unmodifiable
    //cokkies can only be modified from server not from frontend
  } 
  return res
  .status(200)
  .cookie("accessToken", accessToken, options)
  .cookie("refreshToken", refreshToken, options)
  .json(
    new ApiResponse(
      200,{
        user:loggedInUser, accessToken,
        refreshToken
      },
      "User logged In Successfully"
    )
  )
})

const logoutUser=asyncHandler(
  async(req,res)=>{
     await  User.findByIdAndUpdate(
        req.user._id,
        {
          $unset: {
            refreshToken:1//this removes the field from the document
          }
        },
        {
          new:true
        }
      )
       const options ={
        httpOnly: true,
        secure:true,
        //this makes cokkied unmodifiable
        //cokkies can only be modified from server not from frontend
      } 
      return res
      .status(200)
      .clearCookie("accessToken",options)
      .clearCookie("refreshToken", options)
      .json(new ApiResponse(200,{}, "User logged Out"))
  }
)

const refreshAccessToken=asyncHandler(
  async(req,res)=>{
     const incomingRefreshToken=req.cookies.refreshToken || req.body.refreshToken
    if(!incomingRefreshToken){ throw new ApiError(401,"unauthorized request")}
  try {
      const decodedToken= await jwt.verify(incomingRefreshToken,process.env.REFRESH_TOKEN_SECRET);
      const user=await User.findById(decodedToken?._id)
      if(!user){
        throw new ApiError(401,"Invalid Refresh Token");
      }
      if(incomingRefreshToken !== user?.refreshToken)
      {
        throw new ApiError(401,"Refresh token is expired or used")
  
      }
      const options={
        httpOnly:true,
        secure: true
      }
     const {accessToken,newRefreshToken}= await generateAccessAndRefreshTokens(user._id)
  
   return res.status(200)
              .cookie("accessToken",accessToken,options)
              .cookie("refreshToken",newRefreshToken,options)
              .json
              (
                new ApiResponse(
                  200,{accessToken,newRefreshToken},"Access token refreshed"
                )
              )
  } catch (error) {
    throw new ApiError(401,error?.message||"Invalid refresh token")
  }
          })

const changeCurrentPassword=asyncHandler(async(req,res)=>
{
  const {oldPassword, newPassword}=req.body
  const user=await User.findById(req.user?._id)
 const isPasswordCorrect= await user.isPasswordCorrect(oldPassword)
 if(!isPasswordCorrect)
 {
  throw new ApiError(401,"Invalid old Password")
 }
 user.password=newPassword
 await user.save({validateBeforeSave: false})

 return res.status(200)
            .json(new ApiResponse(200,{}, "Password changed successfully"))

})
const getCurrentUser= await asyncHandler(async(req,res)=>{
  return res.status(200)
            .json(new ApiResponse(200,req.user,"current user fetched successfully"))

})
const updateAccountDetails= asyncHandler(async(req,res)=>
 { const {fullName, email}=req.body
if(!fullName || !email)
  {
    throw new ApiError(400,"All fields are required")
  }

const user=await User.findByIdAndUpdate(
  req.user?._id,
  {
    $set:{fullName,email}
  },
  {new:true}

).select("-password")
 return res 
      .status(200)
      .json(new ApiResponse(200,user,"Account details updated successfully")) 
}
)
const updateUserAvatar=asyncHandler(async(req,res)=>
{
   const avatarLocalPath=req.file?.path
   if(avatarLocalPath)
   {
    throw new ApiError(400,"Avatar File is missing")

   }
   const avatar=await uploadONCloudinary(avatarLocalPath)
   if(!avatar.url)
   {
    throw new ApiError(400,"Error while uploading avatar")
   }
   // old image to be deleted
  const user= await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set:{
        avatar: avatar.url
      }
    },
    {new:true}
   ).select("-password")
   return res.status(200)
   .json(new ApiResponse(200,user,"Avatar uploaded successfully"))
})
const updateUserCoverImage=asyncHandler(async(req,res)=>
  {
     const coverImageLocalPath=req.file?.path
     if(!coverImageLocalPath)
     {
      throw new ApiError(400,"Cover Image File is missing")
  
     }
     const cover=await uploadONCloudinary(coverImageLocalPath)
     if(!cover.url)
     {
      throw new ApiError(400,"Error while uploading cover Image")
     }
     const user=await User.findByIdAndUpdate(
      req.user?._id,
      {
        $set:{
          coverImage: cover.url
        }
      },
      {new:True}
     ).select("-password")
     return res.status(200)
   .json(new ApiResponse(200,user,"Cover Image uploaded successfully"))
  })
  const getUserChannelProfile=asyncHandler(async(req,res)=>
    {
        const {username}=req.params
        if(!username?.trim())
        {
            throw new ApiError(400,"username is missing")
        }
        const channel=await User.aggregate([
            {
                $match:{
                    username:username?.toLowerCase()
    
                }
            },
              {  $lookup:{
                    from: "subscriptions",
                    localField:"_id",
                    foreignField:"channel",
                    as: "subscribers"
                }},
                {
                $lookup:{
                    from: "subscriptions",
                    localField:"_id",
                    foreignField:"subscriber",
                    as: "subscribedTo"
                }},
                {
                    $addFields:{
                        subscribersCount:{
                            $size:"$subscribers"
                        },
                        channelsSubscribedToCount:{
                                   $size:"$subscribedTo"
                        },
                        isSubscribed:{
                            $cond:{
                                if:{$in:[req.user?._id,"$subscribers.subscriber"]},
                                then:true,
                                else: false
                            }
                        }
                    }
                },
                {
                    $project:{
                        fullName:1,
                        username:1,
                        subscribersCount:1,
                        channelsSubscribedToCount:1,
                        isSubscribed:1,
                        avatar:1,
                        coverImage:1,
                        email:1
                       
                        
                    } 
                }
            
        ])
        if(!channel?.length)
        {
          throw new ApiError(404,"channel does not exists")
        }
        return res
               .status(200)
               .json(
                new ApiResponse(200,channel[0],"User channel fetched successfully")
                
               )
    })

  const getWatchHistory=asyncHandler(async(req,res)=>
  {
    const user =await User.aggregate([
      {
        $match:{
          _id : new mongoose.Types.Objectid(req.user._id)
  
        }
      },
      {
      $lookup:{
        from:"videos",
        localField:"watchHistory",
        foreignField:"_id",
        as:"watchHistory",
        pipeline:[
          {
              $lookup:{
                from :"users",
                localfield:"owner",
                foreignField:"_id",
                as:"owner",
                pipeline:[
                  {
                    $project:{
                      fullName:1,
                      username:1,
                      avatar:1
                    }
                  }
                ]
              }
          },
          {
            $addFields:{
              owner:{
                $first:"$owner"
              }
            }
          }
        ]
      }}
    ])

    return res
             .status(200)
             .json(new ApiResponse(200,user[0].watchHistory,"Watch History fetched successfully"))
  })
  
  
export {registerUser, loginUser, logoutUser,refreshAccessToken,updateUserAvatar,updateUserCoverImage
  ,getUserChannelProfile,getWatchHistory,changeCurrentPassword,getCurrentUser,updateAccountDetails
}