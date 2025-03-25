import mongoose, {Schema} from "mongoose"
import { asyncHandler } from "../utils/asyncHandeller"
import { updateUserCoverImage } from "../controllers/user.controller"
const subscriptionSchema=new Schema({
    subscriber:{
        type:Schema.Types.ObjectId,
        ref:"User"
    },
    channel:{
        type:Schema.Types.ObjectId,
        ref:"User"
    }

}, {timestamps: true})


export const Subscription=mongoose.model("Subscription",subscriptionSchema)