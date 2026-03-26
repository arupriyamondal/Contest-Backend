import mongoose from "mongoose";

export const dbConnect=async(req,res)=>{
    try {
        await mongoose.connect(process.env.Mongo_url)
        console.log("database connected successfully")
    } catch (error) {
        console.log(`the error is ${error}`)
    }
}