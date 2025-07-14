import userModel from "../models/userModels.js"

export const getUserData = async (req , res ) =>{
    try{
         const userId = req.userId;
        const user = await userModel.findById(userId);
        if(!user){
 res.json({success:false,message:"user not found"});
        }
        return res.json({
            success:true,
            userData:{
                name:user.name,
                isAccountVerified: user.isAccountVerified,
                
            }
        })
    }
    catch(error){
        res.json({success:false,message:error.message});
    }
}