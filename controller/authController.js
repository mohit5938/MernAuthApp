import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken'
import userModel from '../models/userModels.js';
import transporter from '../config/nodemailer.js';


export const register = async (req, res) => {
    const { name, email, password } = req.body;

    console.log("Register request:", req.body);

    if (!name || !email || !password) {
        return res.json({ success: false, message: 'Missing required fields' })
    }

    try {
        const existingUser = await userModel.findOne({ email });
        if (existingUser) {
            return res.json({ success: false, message: "user already exists" });

        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const user = new userModel({ name, email, password: hashedPassword })
        await user.save();

        const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });
        res.cookie('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: process.env.NODE_ENV === 'production' ?
                'none' : 'strict',
            maxAge: 7 * 24 * 60 * 60 * 1000
        });

        //SENDING WELLCOME EMAIL 

        const mailOptions = {
            from: process.env.SENDER_EMAIL,
            to: email,
            subject: 'wellcome to MOHITs stack',
            text: `Wellcome to Mohits web-site. Your account has been created with your email id:${email} on this web site . Congratulations🎉`
        }

        await transporter.sendMail(mailOptions);


        return res.json({ success: true });


    }
    catch (error) {
        res.json({ success: false, message: error.message || 'missing Details' })
    }
}


export const login = async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.json({ sucess: false, message: "Email and Password required" })
    }

    try {

        const user = await userModel.findOne({ email });
        if (!user) {
            return res.json({ success: false, message: "Invalid email" })
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.json({ success: false, message: "Invalid password" })
        }

        const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });
        res.cookie('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: process.env.NODE_ENV === 'production' ?
                'none' : 'strict',
            maxAge: 7 * 24 * 60 * 60 * 1000
        });

        return res.json({ success: true });

    }
    catch (error) {
        return res.json({ success: false, message: error.message })
    }
}


export const logout = async (req, res) => {

    try {
        res.clearCookie('token', {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: process.env.NODE_ENV === 'production' ?
                'none' : 'strict',
        })

        return res.json({ success: true, message: "logged out" })

    }
    catch (error) {
        return res.json({ success: false, message: error.message })
    }
}

//send verification OTP to the user's Email

export const sendVerifyOtp = async (req,res)=>{
    try{
const userId = req.userId;

const user = await userModel.findById(userId);

if(user.isAccountVerified){
    return res.json({success:false,message:"Account already verified"})
}

    const otp = String(Math.floor(100000+Math.random()*900000));
    
    user.verifyOtp = otp;
    user.verifyOtpExpireAt= Date.now() + 24*60*60*1000;
    await user.save();

   const mailOptions = {
            from: process.env.SENDER_EMAIL,
            to: user.email,
            subject: 'Account Varification otp',
            text: `Your OTP is ${otp}. Verify your account using this otp`
        }

        await transporter.sendMail(mailOptions);

       return  res.json({success:true,message:'Verification OTP sent on email'})

    }
    catch(error){
       return res.json({ success: false, message: error.message })
    }
}

// verify otp

export const verifyEmail = async (req,res )=>{
    const {otp} = req.body;
    const userId = req.userId;
    if( !userId || !otp){
        return res.json({success: false, message:'missing Details'});
    }

    try{
        const user = await userModel.findById(userId);

        if(!user){
            return res.json({success:false,message:'user not found'})

        }
        if(user.verifyOtp === '' || user.verifyOtp != otp ){
            return res.json({success: false, message:'invalid OTP'})
        }

        if(user.verifyOtpExpireAt < Date.now() ){
             return res.json({success: false, message:'OTP expired'})
        }

        user.isAccountVerified = true;
        user.verifyOtp='';
        user.verifyOtpExpireAt=0;
        await user.save();

         return res.json({success: true, message:'email varified successfully'})
    }
    catch(error){
        return res.json({success:false,message:error.message});
    }

}

//check if user is Authenticated

export const isAuthenticated = async (req,res)=>{
    try{
        return res.json({success:true})
    }
    catch(error){
        return res.json({success:false,message:error.message});
    }
}

//resend the OTP to reset your password
export const sendResetOtp = async (req,res)=>{
    const {email} = req.body;
      console.log(email);
    if(!email){
        return res.json({success:false,message:'email is required'})
    }

    try{
        const user = await userModel.findOne({ email });
       console.log(user);
        if(!user){
              return res.json({success:false,message:'user not found'});
        }
        const otp = String(Math.floor(100000+Math.random()*900000));
    
    user.resetOtp= otp;
    user.resetOtpExpireAt= Date.now() + 15*60*1000;
    await user.save();

   const mailOptions = {
            from: process.env.SENDER_EMAIL,
            to: user.email,
            subject: 'Password Reset OTP',
            text: `Your OTP for resetting your password is ${otp},
            proceed this otp to reset your password`
        }

        await transporter.sendMail(mailOptions);

        return res.json({success:true,message:'OTP sent to your email'})

    }
    catch(error){
          return res.json({success:false,message:error.message});
    }

}

// reset your Password

export const resetPassword = async (req,res)=>{
    const {email,otp,newPassword} = req.body;

    if(!email || !otp || !newPassword){
           return res.json({success:false,message:'email,otp,newPassword  are required'})
    }

    try{

            const user = await userModel.findOne({email});
            if(!user){
                   return res.json({success:false,message:'user is not found'})
            }
            if(user.resetOtp === '' || user.resetOtp != otp){
                   return res.json({success:false,message:'invalid otp'})
            }
            if(user.resetOtpExpireAt < Date.now()){
                   return res.json({success:false,message:'otp is expired'})
            }

            const hashedPassword = await bcrypt.hash(newPassword,10);

            user.password= hashedPassword;
            user.resetOtp = "";
            user.resetOtpExpireAt=0;
            await user.save();

               return res.json({success:true,message:'password has been reset'})


    }
    catch(error){
           return res.json({success:false,message:error.message})
    }
}