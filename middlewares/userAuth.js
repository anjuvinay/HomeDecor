require('dotenv').config()
const User = require('../models/userModel')



const isLogin = async (req, res, next) => {
    try {
        if (req.session.email || req.isAuthenticated()) {
            next();
        } else {
            console.log("session is: nothing");
            req.session.redirectTo = req.originalUrl;
            res.redirect('/login');
        }
    } catch (error) {
        console.log(error.message);
        res.redirect('/500');
    }
};




const isBlocked = async (req, res, next) => {
    try {
        const userData = await User.findOne({ email: req.session.email });

        if (userData && userData.is_active === false) {
            req.session.destroy()
            res.redirect('/login?message=blocked');
            return     
        }

        next();
    } catch (error) {
        console.log(error.message)
    }
};


const isLogout=async(req,res,next)=>{
    try{
        if(req.session.email){

            res.redirect('/')
        }else{
            next()
        }
        
    }catch(error){
        console.log(error.message)
    }
};



module.exports={
    isLogin,
    isBlocked,
    isLogout
}