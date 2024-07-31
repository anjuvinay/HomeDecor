const User = require('../models/userModel')
const Product = require('../models/productModel')
const Category = require('../models/categoryModel')
const Order = require('../models/orderModel')
const Brand = require('../models/brandModel')
const moment = require('moment');




module.exports={





addCategoryOffer: async (req, res) => {
  try {
      let admin = req.session.adminName;
      const id = req.query.categoryId;
      const category = await Category.find({});
      let specificCategory = {};
      
      if (id) {
          specificCategory = await Category.findById({ _id: id });
      } else {
          specificCategory = { _id: '', categoryName: '', discount: '', expiry: '', offerStatus: false };
      }

      const formattedCategoryData = category.map(cat => {
          return {
              ...cat._doc,
              formattedExpiry: cat.expiry ? moment(cat.expiry).format('ddd MMM DD YYYY') : ''
          };
      });

      res.render('addCategoryOffer', { specificCategory, category: formattedCategoryData, admin });
  } catch (error) {
      console.log(error.message);
      res.redirect('/500');
  }
},



updateCategoryOffer : async(req,res)=>{
    try {
        
        const categoryId=req.query.categoryId
        const discount=parseFloat(req.body.discount)
        const expiry=req.body.expiry
        const categoryData=await Category.findByIdAndUpdate({_id:categoryId},{$set:{discount:discount,expiry:expiry,offerStatus:true}})
        const discountMultiplier = 1 - discount / 100;

       

        const updateProducts = await Product.updateMany(
          { categoryId: categoryId },
          [
            {
              $set: {
                catDiscountPercentage: discount,
                bestDiscount: {
                  $cond: {
                    if: { $gt: ['$discountPercentage', discount] },
                    then: '$discountPercentage',
                    else: discount
                  }
                },
                salePrice: {
                  $cond: {
                    if: { $lt: ['$discountPercentage', discount] },
                    then: {
                      $round: {
                        $multiply: ['$regularPrice', discountMultiplier]
                      }
                    },
                    else: '$salePrice' // Keep the existing salePrice if the condition is not met
                  }
                }
              }
            }
          ]
        );
        
        
        
        
          console.log(updateProducts)
          
        if(categoryData){
            res.redirect('/admin/addCategoryOffer')
        }
    } catch (error) {
        console.log(error.message)
        res.redirect('/500')
    }
},



deleteCategoryOffer : async(req,res)=>{
  try {
     
      const categoryId=req.query.categoryId
      const expiry=req.body.expiry
      const categoryData=await Category.findByIdAndUpdate({_id:categoryId},{$set:{discount:null,expiry:null,offerStatus:false}})
     
      // Update product data
      const updateProducts = await Product.updateMany(
        { categoryId: categoryId },
        [
          {
            $set: {
              catDiscountPercentage: null,
              bestDiscount: {
                $cond: {
                  if: { $ifNull: ['$discountPercentage', false] },
                  then: '$discountPercentage',
                  else: null
                }
              },
              salePrice: {
                $subtract: [
                  '$regularPrice',
                  {
                    $multiply: [
                      '$regularPrice',
                      { $ifNull: [{ $divide: ['$discountPercentage', 100] }, 1] }
                    ]
                  }
                ]
              }
            }
          }
        ]
      );
      
      
      if(categoryData){
          res.redirect('/admin/addCategoryOffer')
      }
  } catch (error) {
      console.log(error.message)
      res.redirect('/500')
  }
},



 editCategoryOffer: async (req, res) => {
    try {
      let admin = req.session.adminName;
      const id = req.query.categoryId;
      const specificCategory = await Category.findById({ _id: id });
      const formattedExpiry = specificCategory.expiry ? moment(specificCategory.expiry).format('YYYY-MM-DD') : '';
      
      res.render('editCategoryOffer', { specificCategory, formattedExpiry, admin });
    } catch (error) {
      console.log(error.message);
      res.redirect('/500');
    }
  },



}