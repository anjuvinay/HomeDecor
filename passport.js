
// const passport = require('passport');
// const GoogleStrategy = require('passport-google-oauth2').Strategy;
// const User = require('./models/userModel')
// const express = require('express');
// const userRoute = express();
// const dotenv=require('dotenv').config()




// passport.serializeUser((user, done) => {
//   done(null, user.id)
// })

// passport.deserializeUser( async(id, done) => {
  
//        done(null, User)
//  })






// passport.use(new GoogleStrategy({
//   clientID: process.env.CLIENT_ID,
//   clientSecret: process.env.CLIENT_SECRET,
//   callbackURL: "http://localhost:3000/auth/google/callback",
//   passReqToCallback: true
// },
//   async (request, accessToken, refreshToken, profile, done)=> {
//     let user=await User.findOne({email:profile.emails[0].value})
//     console.log("user is: "+user)
//     console.log("profile is: "+profile)
//     if(!user){
//       user=await User.create({
//         name:profile.displayName,
//         email:profile.emails[0].value,
//         password:"",
        
//       })

//     }
//     request.session.email = profile.emails[0].value;
   
//       return done(null, profile)
//     }
// ));



// module.exports = passport







const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth2').Strategy;
const User = require('./models/userModel')
const express = require('express');
const userRoute = express();
const dotenv=require('dotenv').config()




passport.serializeUser((user, done) => {
  
  done(null, user.googleId);
});

passport.deserializeUser(async (googleId, done) => {
  try {
    const user = await User.findOne({ googleId: googleId });
    if (user) {
      done(null, { id: user.id, email: user.email, userName: user.name });
    } else {
      done(new Error('User not found'), null);
    }
  } catch (error) {
    done(error, null);
  }
});








passport.use(new GoogleStrategy({
  clientID: process.env.CLIENT_ID,
  clientSecret: process.env.CLIENT_SECRET,
  // callbackURL: "http://localhost:3000/auth/google/callback",
  callbackURL: "https://www.anjups.live/auth/google/callback",
  passReqToCallback: true
},
  async (request, accessToken, refreshToken, profile, done) => {
    try {
      // Check if a user with this email already exists
      let user = await User.findOne({ email: profile.emails[0].value });

      if (user) {
        // If the user exists but doesn't have a googleId, add it
        if (!user.googleId) {
          user.googleId = profile.id;
          await user.save();
        }
      } else {
        // If the user doesn't exist, create a new user
        user = await User.create({
          name: profile.displayName,
          email: profile.emails[0].value,
          googleId: profile.id,  // Store the Google ID in the database
          password: "", // Leave password empty for Google-authenticated users
        });
      }

      // Store the user's email and name in the session
      request.session.email = user.email;
      request.session.userName = user.name;

      return done(null, user);
    } catch (error) {
      return done(error);
    }
  }
));




module.exports = passport






