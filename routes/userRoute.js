const express = require('express')
const userRoute = express()
const session = require('express-session')
userRoute.set('view engine', 'ejs')
userRoute.set('views', './views/user')
const userController = require('../controllers/userControllers')
const productController = require('../controllers/productController')
const orderController = require('../controllers/orderController')
const auth = require('../middlewares/userAuth')
const passport=require('passport')
const couponController = require('../controllers/couponController')
const wishlistController = require('../controllers/wishlistController')
require('../passport')



userRoute.use(passport.initialize())
userRoute.use(passport.session())



userRoute.get('/',productController.loadHome)
userRoute.get('/shop', productController.shop)

//-----------------------------------------------Authentication---------------------------------------->

userRoute.get('/signup', userController.loadSignup)
userRoute.get('/checkReferral', userController.checkReferral)
userRoute.post('/signup', userController.checkUniqueEmail, userController.checkUniqueMobile, userController.insertUser)
userRoute.get('/verifyOtp', userController.sendOtp)
userRoute.post('/verifyOtp', userController.verifyOtp)
userRoute.get('/login', userController.loginLoad)
userRoute.post('/login', userController.verifyLogin)
userRoute.get('/logout', userController.userLogout)

//-----------------------------------------------google authentication---------------------------------------->

userRoute.get('/auth/google', passport.authenticate('google', {scope: ['email', 'profile'] }))
userRoute.get('/auth/google/callback',passport.authenticate('google',{successRedirect:'/', failureRedirect:'/login'}))

//-----------------------------------------------forgot password---------------------------------------->

userRoute.get('/forgotPassword', auth.isLogout, userController.forgotPassword)
userRoute.post('/forgotPassword', auth.isLogout, userController.getPasswordOtp)
userRoute.get('/generatePasswordOtp', userController.generatePasswordOtp)
userRoute.post('/passwordOtp', auth.isLogout, userController.verifypasswordotp)
userRoute.post('/resetPassword', auth.isLogout, userController.resetPassword)

userRoute.get('/productDetails',auth.isLogin, auth.isBlocked, productController.productDetails)

//-----------------------------------------------my account---------------------------------------->

userRoute.get('/userAccount', auth.isBlocked, auth.isLogin, userController.userAccount)
userRoute.post('/updateUserDetails', auth.isLogin, userController.updateUserDetails)
userRoute.post('/updatePassword', auth.isBlocked, auth.isLogin, userController.updatePassword)

//-----------------------------------------------Address---------------------------------------->

userRoute.get('/addressForm', auth.isLogin, userController.addressForm)
userRoute.post('/addressForm', auth.isLogin, userController.addAddress)
userRoute.get('/editAddressForm', auth.isLogin, userController.editAddressForm)
userRoute.post('/editAddressForm', auth.isLogin, userController.updateAddress)
userRoute.get('/deleteAddress', auth.isLogin, userController.deleteAddress)

//-----------------------------------------------cart---------------------------------------->

userRoute.post('/productDetails', auth.isLogin, productController.addToCart)
userRoute.get('/cart', auth.isBlocked, auth.isLogin, productController.showCart)
userRoute.get('/deleteFromCart', auth.isLogin, productController.deleteFromCart)
userRoute.post('/updateQuantity/:newQuantity/:index', auth.isLogin, productController.updateQuantity)




//-----------------------------------------------coupon---------------------------------------->

userRoute.get('/checkout', auth.isBlocked, auth.isLogin, productController.showCheckOut)
userRoute.get('/applyCoupon', auth.isLogin, couponController.applyCoupon)
userRoute.get('/deleteCoupon', auth.isLogin, couponController.deleteAppliedCoupon);


//-----------------------------------------------orders---------------------------------------->


userRoute.post('/placeOrder', auth.isBlocked, auth.isLogin, orderController.placeOrder)
userRoute.get('/orderDetails', auth.isBlocked, auth.isLogin, orderController.orderDetails)
userRoute.get('/cancelOrder', orderController.cancelOrder)
userRoute.get('/returnOrder', orderController.returnOrder)

userRoute.get('/cancelProduct',auth.isLogin, orderController.cancelProduct);
userRoute.post('/returnProduct', auth.isLogin, orderController.returnProduct);




//----------------------------------------------wishlist------------------------------------------------>

userRoute.get('/addToWishlist', auth.isBlocked, auth.isLogin, wishlistController.addToWishlist)
userRoute.get('/wishlist', auth.isBlocked, auth.isLogin, wishlistController.showWishlist)
userRoute.get('/addToCart', auth.isBlocked, auth.isLogin, wishlistController.addToCart)
userRoute.get('/deleteFromWishlist', auth.isLogin, wishlistController.deleteFromWishlist)


//----------------------------------------------wallet------------------------------------------------>


userRoute.get('/checkWallet', orderController.checkWallet)
userRoute.get('/walletpayment', orderController.walletPayment)
userRoute.get('/wallet', orderController.getWallet)


//----------------------------------------------Razorpay------------------------------------------------>


userRoute.post('/onlinepayment', orderController.onlinePayment)
userRoute.get('/onlinepayment', orderController.paymentSuccess)
userRoute.post('/handlePaymentFailure',auth.isLogin, orderController.handlePaymentFailure);


//----------------------------------------------Repayment------------------------------------------------>

userRoute.post('/updatePaymentStatus',auth.isLogin, orderController.rePayment) 
userRoute.get('/Payment',auth.isLogin, orderController.initiatePayment) 
userRoute.get('/walletRepayment', orderController.walletRePayment)
userRoute.post('/onlineRepayment', orderController.onlineRePayment)
userRoute.get('/onlineRepayment', orderController.rePaymentSuccess)
userRoute.post('/placeReOrder', auth.isLogin, orderController.placeReorder)













module.exports = userRoute