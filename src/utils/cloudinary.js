import { v2 as cloudinary } from 'cloudinary';
import fs from "fs"


    cloudinary.config({ 
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME, 
        api_key: process.env.CLOUDINARY_API_KEY, 
        api_secret:process.env.CLOUDINARY_API_SECRET
    });
const uploadONCloudinary=async(localFilePath)=>
{
    try{
       
        if(!localFilePath)return null
       const response= await cloudinary.uploader.upload(localFilePath,{
            resource_type:"auto"
        })
        //file has been uploaded successfulluy
        // console.log("file is uploaded on cloudinary",response.url);
        fs.unlinkSync(localFilePath);
        return response;
    }
    catch(error)
    {
        fs.unlinkSync(localFilePath)//remove the temporary sacved file
    }
}
export {uploadONCloudinary}
