const Coupon=require('../models/couponModel')
const Category=require('../models/categoryModel')
const User = require('../models/userModel')
const session = require('express-session')


module.exports = {

    loadCouponPage : async(req,res)=>{
        try {
            let admin = req.session.adminName;
            let message=''
            if(req.query.message){
                message='Coupon code already exists'
            }
            const coupon=await Coupon.find({})
            res.render('coupon',{coupon,message,admin})
        } catch (error) {
            console.log(error.message)
            res.redirect('/500')
        }
    },



    addCoupon : async(req,res)=>{
        try{
            const {couponCode,discount,minPurchase,expiry}=req.body
            const expirydate=expiry
            const couponData=await Coupon.findOne({couponCode:couponCode})
            if(couponData){
                res.redirect('/admin/coupon?message=alreadyExists')
            }else{
                const newCoupon=new Coupon({
                    couponCode:couponCode,
                    discount:discount,
                    minPurchase:minPurchase,
                    expiry:expirydate,
                    is_active:true
                })
                await newCoupon.save()
                res.redirect('/admin/coupon')
            }
        }catch(error){
            console.log(error.message)
            res.redirect('/500')
        }
    },


    
    deleteCoupon : async(req,res)=>{
        try {
            console.log(req.query.id)
            const couponId=req.query.id
            await Coupon.deleteOne({ _id: couponId });
            res.redirect('/admin/coupon')
        } catch (error) {
            console.log(error.message)
            res.redirect('/500')
        }
    },


    applyCoupon : async (req, res) => {
        try {
            req.session.couponCode = req.query.couponCode
            const couponCode = req.query.couponCode;
            const totalAmount = req.query.totalAmount;
            console.log(couponCode)
            try {
                const couponData = await Coupon.findOne({ couponCode: couponCode });
    
                if (!couponData) {
    
                    return res.status(200).json({
                        message: 'Invalid Coupon',
                        finalPrice: totalAmount
                    });
                }
    
                const userData = await User.findOne({ email: req.session.email });
    
                // Check if the user ID is in the redeemedUsers array
                const isRedeemed = couponData.redeemedUsers.some(user => user.userId === userData._id.toString());
    
    
                // console.log(isRedeemed)
                if (isRedeemed || totalAmount < couponData.minPurchase) {
                    return res.status(200).json({
                        message: 'Invalid Coupon',
                        finalPrice: totalAmount
                    });
                } else {
    
                    const finalPrice = totalAmount - couponData.discount;
                    const discountAmount = couponData.discount
    
                    res.status(200).json({
                        message: 'Coupon Applied Successfully',
                        finalPrice: finalPrice,
                        couponAmount: discountAmount
                    });
                }
    
    
            } catch (error) {
                console.error(error);
                res.status(500).json({
                    message: 'Internal Server Error'
                });
            }
    
    
    
    
        } catch (error) {
            console.log(error.message)
            res.redirect('/500')
        }
    },
    

    deleteAppliedCoupon: async (req, res) => {
        try {
            req.session.couponCode = null; // Clear the coupon code from the session
            const totalAmount = req.query.totalAmount;
    
            res.status(200).json({
                message: 'Coupon Deleted Successfully',
                finalPrice: totalAmount
            });
        } catch (error) {
            console.log(error.message);
            res.status(500).json({
                message: 'Internal Server Error'
            });
        }
    },
    


}
  
