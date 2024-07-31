
const User = require('../models/userModel')
const Product = require('../models/productModel')
const Category = require('../models/categoryModel')
const Brand = require('../models/brandModel')
const Order = require('../models/orderModel')
const { json } = require('express')
const session = require('express-session')
require('dotenv').config()
const bcrypt=require("bcrypt")
const nodemailer =require('nodemailer')
const RandomString = require('randomstring')
const cron = require('node-cron')


module.exports = {


loadSignup : async (req, res) => {
    try {
        res.render('user_signup', { message: '' })
       
    } catch (error) {
        console.log(error.message)
        res.redirect('/500')
    }
},


checkUniqueEmail : async (req, res, next) => {
    const { email } = req.body;

    try {
        const existingUser = await User.findOne({ email });

        if (existingUser) {

            res.render('user_signup', { message: 'Email already exists' })

        } else {
            next();
        }

    } catch (err) {
        console.log(err.message)
        res.redirect('/500')
    }
},


checkUniqueMobile : async (req, res, next) => {
    const { mobile } = req.body;

    try {
        const existingUser = await User.findOne({ mobile });

        if (existingUser) {

            res.render('user_signup', { message: 'Mobile already registered' })

        } else {
            next();
        }

    } catch (err) {
        console.log(err.message)
        res.redirect('/500')
    }
},



insertUser : async (req, res) => {
    try {
        if (req.body.password == req.body.confirmPassword) {
            const obj = {
                name: req.body.name,
                email: req.body.email,
                mobile: req.body.mobile,
                password: req.body.password,
                referralCode: req.body.referralCode
            }
            
            console.log(obj)

            req.session.data = obj
            if (obj.name) {
                res.redirect('/verifyOtp')
            } else {
                res.write('fill all fields')
            }
        }

    } catch (error) {
        console.log(error.message)
        res.redirect('/500')
    }
},


checkReferral : async (req, res) => {
    try {
        const code = req.query.code
        const userData = await User.findOne({ referralCode: code })
        if (userData) {
            req.session.referralCode = code
            res.status(200).json({
                message: 'Valid Code'
            })
        } else {
            res.status(200).json({
                message: 'Invalid Code'
            })
        }
    } catch (error) {
        console.log(error.message)
        res.redirect('/500')
    }
},


sendOtp : async (req, res) => {

    try {
        const { email } = req.session.data
        const randomotp = Math.floor(1000 + Math.random() * 9000);
        console.log(randomotp)
        const transporter = nodemailer.createTransport({
            service: 'Gmail',
            auth: {
                user: 'aanjups88@gmail.com',
                pass: process.env.NODEMAILER_PASS_KEY
            }
        });


        const mailOptions = {
            from: 'aanjups88@gmail.com',
            to: email,
            subject: 'Hello, Nodemailer!',
            text: `Your verification OTP is ${randomotp}`
        };

        transporter.sendMail(mailOptions, (error, info) => {
            if (error) {
                console.log('Error sending email: ' + error);
            } else {
                console.log('Email sent: ' + info.response);
            }
        });

        req.session.otp = randomotp

        console.log(req.session.otp)
        setTimeout(() => {
            console.log('session ended')
        }, 30000);

        req.session.otpTime = Date.now()

        res.render('otpverification', { message: '' })

    } catch (error) {
        console.log(error.message)
        res.redirect('/500')
    }
},


verifyOtp : async (req, res) => {
    try {
        const otp = req.session.otp
        const randomotp = req.body.otp
        const timelimit = Date.now()

        if (timelimit - req.session.otpTime > 30000) {
            res.render('otpverification', { message: 'OTP timeout' })
        } else {
            const { name, email, mobile, password, referralCode } = req.session.data

            if (randomotp == otp) {

                const myReferralCode = await generateReferralCode();

                async function generateReferralCode() {
                    const randomString = RandomString.generate(5);
                    const randomNumber = Math.floor(100 + Math.random() * 900).toString();
                    const RandomReferralCode = randomString + randomNumber;

                    const userData = await User.findOne({ RandomReferralCode });

                    if (userData) {
                        return await generateReferralCode();
                    } else {
                        return RandomReferralCode;
                    }
                }


                const salt=await bcrypt.genSalt(10)
                const hashedPassword=await bcrypt.hash(password,salt)
                const user = new User({
                    name: name,
                    email: email,
                    mobile: mobile,
                    password: hashedPassword,
                    is_admin: 0,
                    referralCode: myReferralCode
                   
                })
                await user.save()
                const code = await User.findOne({ referralCode: referralCode })
                console.log("refferelCode: "+referralCode)

                if (referralCode && code) {
                    await User.findOneAndUpdate({ referralCode: referralCode }, { $inc: { wallet: +200 } })
                    await User.findOneAndUpdate({ email: email }, { $set: { wallet: 100 } })
                }
              
                res.redirect('/login')
            } else {
                res.render('otpverification', { message: 'Invalid Otp' })
            }

        }


    } catch (error) {
        console.log(error.message)
        res.redirect('/500')
    }
},


loginLoad : async (req, res) => {
    try {
        if(req.session.userName){
            res.redirect('/')
          }
          else{

        if (req.query.message === 'blocked') {
            res.render('user_login', { message: 'User is Blocked' })
        } else {
            res.render('user_login', { message: '' })
        }
    }
            
    } catch (error) {
        console.log(error.message)
        res.redirect('/500')
    }
},



verifyLogin: async (req, res) => {
    try {
        const email = req.body.email;
        const password = req.body.password;
        const userData = await User.findOne({ email: email });
        
        if (userData && userData.is_active == true) {
            req.session.userName = userData.name;
            
            const passwordMatch = await bcrypt.compare(password, userData.password);
            
            if (passwordMatch) {
                req.session.email = email;
                const redirectTo = req.session.redirectTo || '/';
                delete req.session.redirectTo;
                res.redirect(redirectTo);
            } else {
                res.render('user_login', { message: 'invalid password' });
            }
        } else {
            res.redirect('/login?message=blocked');
        }
    } catch (error) {
        console.log(error.message);
        res.redirect('/500');
    }
},



userLogout : async (req, res) => {
    try {
        req.session.destroy()
        res.redirect('/login')
    } catch (error) {
        console.log(error.message)
        res.redirect('/500')
    }
},


usersList : async (req, res) => {
    try {
        const userData = await User.find({ is_admin: false })
        let admin = req.session.adminName;
        res.render('userList', { users: userData, admin:admin })
    } catch (error) {
        console.log(error.message)
        res.redirect('/500')
    }
    
},



blockUser : async (req, res) => {
    try {
        const id = req.query.id
        const userData = await User.findByIdAndUpdate({ _id: id }, { $set: { is_active: false } })
        if (userData) {
            res.redirect('/admin/usersList')
        }

    } catch (error) {
        console.log(error.message)
        res.redirect('/500')
    }
},



unblockUser : async (req, res) => {
    try {
        const id = req.query.id
        const userData = await User.findByIdAndUpdate({ _id: id }, { $set: { is_active: true } })
        if (userData) {
            res.redirect('/admin/usersList')
        }

    } catch (error) {
        console.log(error.message)
        res.redirect('/500')
    }
},


forgotPassword : async (req, res) => {
    try {
        let user = req.session.userName;
        res.render('forgotPassword', { message: '',user })
    } catch (error) {
        console.log(error.message)
    }
},

getPasswordOtp : async (req, res) => {
    try {
        
        req.session.forgotPasswordEmail = req.body.email
        res.redirect('/generatePasswordOtp')
    } catch (error) {
        console.log(error.message)
        res.redirect('/500')
    }
},



generatePasswordOtp : async (req, res) => {
    try {
        const randomotp = Math.floor(1000 + Math.random() * 9000);
        console.log(randomotp)
        const transporter = nodemailer.createTransport({
            service: 'Gmail',
            auth: {
                user: 'aanjups88@gmail.com',
                pass:  process.env.NODEMAILER_PASS_KEY
            }
        });


        const mailOptions = {
            from: 'aanjups88@gmail.com',
            to: req.session.forgotPasswordEmail,
            subject: 'Hello, Nodemailer!',
            text: `Your reset password verification OTP is ${randomotp}`
        };

        transporter.sendMail(mailOptions, (error, info) => {
            if (error) {
                console.log('Error sending email: ' + error);
            } else {
                console.log('Email sent: ' + info.response);
            }
        });
        req.session.passwordOtpTime = Date.now()
        const email = req.session.forgotPasswordEmail
        const userData = await User.findOneAndUpdate({ email: email }, { $set: { otp: randomotp } })
        let user = req.session.userName;
        if (userData) {
            res.render('passwordOtpform', { randomotp, email, message: '' ,user})
        } else {
            res.render('forgotPassword', { message: 'Invalid email' ,user})
        }


    } catch (error) {
        console.log(error.message)
        res.redirect('/500')
    }
},


verifypasswordotp : async (req, res) => {
    try {
        const passwordTimeLimit = Date.now()
        let user = req.session.userName;
        // console.log('limit'+passwordTimeLimit)
        // console.log('start'+req.session.passwordOtpTime)
        const typedotp = req.body.otp
        const email = req.body.email
        const randomotp = req.body.randomotp
        const userData = await User.findOne({ email: email })
        if (passwordTimeLimit - req.session.passwordOtpTime < 60000) {
            if (typedotp == randomotp) {
                await User.findOneAndUpdate({ email: email }, { $set: { otp: null } })
                res.render('newPassword', { email, message: '',user })
            } else {
                res.render('passwordOtpform', { message: 'invalid otp', randomotp: userData.otp, email ,user})
            }
        } else {
            res.render('passwordOtpform', { message: 'invalid otp', randomotp: userData.otp, email ,user})
        }
    } catch (error) {
        console.log(error.message)
        res.redirect('/500')
    }
},


resetPassword : async (req, res) => {
    try {
        let user = req.session.userName;
        const email = req.body.email
        const password1 = req.body.password1
        const password2 = req.body.password2
        if (password1 == password2) {
            const salt=await bcrypt.genSalt(10)
            const hashedPassword=await bcrypt.hash(password1,salt)
            const userData = await User.findOneAndUpdate({ email: email }, { $set: { password: hashedPassword} })
            if (userData) {
                res.redirect('/login')
            }
        } else {
            res.render('newPassword', { email, message: "Password dont match" ,user})
        }

    } catch (error) {
        console.log(error.message)
        res.redirect('/500')
    }
},


userAccount : async (req, res) => {
    try {
        let email;
        if(req.query.newEmail){
            email=req.query.newEmail
        }else{
            email = req.session.email;
        }
        console.log("Email is: "+email)
              
        const user = await User.findOne({ email: email });
        const orders = await Order.find({ userId: user._id }).populate('products.productId').sort({ orderDate: -1 });
        res.render('userAccount', { user: user, orders })
       
        

    } catch (error) {
        console.log(error.message)
        res.redirect('/500')
    }
},


addressForm : async (req, res) => {
    try {
        const email = req.session.email;
        const user = await User.findOne({ email: email });
        const checkout = req.query.checkout
        res.render('addressform', { checkout, user })
    } catch (error) {
        console.log(error.message)
        res.redirect('/500')
    }
},


addAddress : async (req, res) => {
    try {
        const checkout = req.body.checkout
        // console.log(checkout)
        const email = req.session.email
        const userData = await User.findOne({ email: email })
        const { fname, lname, country, houseName, city, state, pincode, phone } = req.body
        const result = await User.updateOne({ email: email },
            {
                $push:
                {
                    address:
                    {
                        $each:
                            [
                                {
                                    fname: fname,
                                    lname: lname,
                                    country: country,
                                    housename: houseName,
                                    city: city,
                                    state: state,
                                    pincode: pincode,
                                    phone: phone,
                                    email: email
                                }
                            ]
                    }
                }
            })
            
        if (result) {
            if (checkout) {
                res.redirect('/checkout')
            } else {
                res.redirect('/userAccount')
            }
        }
    } catch (error) {
        console.log(error.message)
        res.redirect('/500')
    }
},


editAddressForm : async (req, res) => {
    try {
        const checkout = req.query.checkoutcode
        const email = req.session.email;
        const index = req.query.index
        const userData = await User.findOne({ email: email })
        const address = userData.address[index]
        res.render('editAddressForm', { address, index, checkout, user: userData })
    } catch (error) {
        console.log(error.message)
        res.redirect('/500')
    }
},


updateAddress : async (req, res) => {
    try {
        const email = req.session.email
        const index = req.query.index
        const checkout = req.query.checkout
        
        const userData = await User.findOne({ email: email })
        const { fname, lname, country, houseName, city, state, pincode, phone } = req.body
        const newAddress = {
            fname: fname,
            lname: lname,
            country: country,
            housename: houseName,
            city: city,
            state: state,
            pincode: pincode,
            phone: phone,
            email: email
        }
        userData.address[index] = newAddress
        await userData.save();
        if (checkout) {
            res.redirect('/checkout')
        } else {
            res.redirect('/userAccount')
        }


    } catch (error) {
        console.log(error.message)
        res.redirect('/500')
    }
},


deleteAddress: async (req, res) => {
    try {
        const userId = req.query.userId;
        const addressId = req.query.addressId;

        await User.updateOne(
            { _id: userId },
            { $pull: { address: { _id: addressId } } }
        );

        res.redirect('/userAccount');
    } catch (error) {
        console.log(error.message);
        res.redirect('/500');
    }
},


updateUserDetails : async (req, res) => {
    try {
        const email = req.session.email
        const { name, nemail, mobile } = req.body
        const userData = await User.findOneAndUpdate({ email }, { $set: { name: name, email: nemail, mobile: mobile } })
        if (userData) {
            res.redirect(`/userAccount?newEmail=${nemail}`)
        } else {
            res.write('need to handle')
            res.end()
        }

    } catch (error) {
        console.log(error.message)
        res.redirect('/500')
    }
},



updatePassword : async (req, res) => {
    try {

        const email = req.session.email
        const { currentPassword, npassword, cpassword } = req.body
        

        const userData = await User.findOne({ email })
        const passwordMatch = await bcrypt.compare( currentPassword,userData.password);

        if (passwordMatch) {
            if (npassword == cpassword) {
                const salt=await bcrypt.genSalt(10)
                const hashedPassword=await bcrypt.hash(npassword,salt)
                userData.password = hashedPassword
                userData.save()

                res.status(200).json({
                    message3: 'success'
                })
            } else {
                res.status(200).json({
                    message2: 'Passwords dont match'
                })
            }
        } else {
            res.status(200).json({
                message1: 'Invalid Password'
            })
        }
    } catch (error) {
        console.log(error.message)
        res.redirect('/500')
    }
},


}