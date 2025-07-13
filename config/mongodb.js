import mongoose from "mongoose";

const connectDB = async () => {
   try{
 
await mongoose.connect(`${process.env.MONGODB_URI}`)
 console.log("✅ connectDB() function executed");

 mongoose.connection.on('connected', ()=>console.log("database is connected"))
   }
   catch(error){
    console.error("Failed to connect to MongoDB:", error.message);
   }

   
}

export default connectDB;