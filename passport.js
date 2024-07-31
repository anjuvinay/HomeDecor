
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth2').Strategy;
const User = require('./models/userModel')
const express = require('express');
const userRoute = express();
const dotenv=require('dotenv').config()




passport.serializeUser((user, done) => {
  done(null, user.id)
})

passport.deserializeUser( async(id, done) => {
  
      done(null, User)
})



passport.use(new GoogleStrategy({
  clientID: process.env.CLIENT_ID,
  clientSecret: process.env.CLIENT_SECRET,
  callbackURL: "http://localhost:3000/auth/google/callback",
  passReqToCallback: true
},
  async (request, accessToken, refreshToken, profile, done)=> {
    let user=await User.findOne({email:profile.emails[0].value})
    console.log("user is: "+user)
    console.log("profile is: "+profile)
    if(!user){
      user=await User.create({
        name:profile.displayName,
        email:profile.emails[0].value,
        password:"",
        
      })

    }
   
      return done(null, profile)
    }
));



module.exports = passport