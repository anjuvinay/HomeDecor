const User = require('../models/userModel')
const Category = require('../models/categoryModel')
const Brand = require('../models/brandModel')
const Product = require('../models/productModel')
const Coupon = require('../models/couponModel')
const Wishlist = require('../models/wishlistModel')
const Address = require('../models/addressModel')
const bcrypt=require('bcrypt')
const session = require('express-session')
const path = require('path')
const sharp = require('sharp')
const fs = require('fs')


module.exports = {

    loadAddProduct : async (req, res) => {
        try {
            let admin = req.session.adminName;
            const categoryData = await Category.find({ is_active: true })
            const brandData = await Brand.find({ is_active: true })
            res.render('addproduct', { category: categoryData, brand: brandData, admin:admin })
            
        } catch (error) {
            console.log(error.message)
            res.redirect('/500')
        }
    },
    

   
    
    addNewProduct: async (req, res) => {
        try {
            let salePrice;
            if (req.body.discountPercentage.trim() > 0) {
                salePrice = req.body.regularPrice - (req.body.regularPrice.trim() * req.body.discountPercentage / 100);
            } else {
                salePrice = req.body.regularPrice.trim();
            }
    
            const imagePromises = req.files.map(async (file, index) => {
                const imagePath = `uploads/${file.filename}`;
                const resizedImagePath = `uploads/resized_${file.filename}`;
                const cropX = parseInt(req.body[`cropX${index}`], 10);
                const cropY = parseInt(req.body[`cropY${index}`], 10);
                const cropWidth = parseInt(req.body[`cropWidth${index}`], 10);
                const cropHeight = parseInt(req.body[`cropHeight${index}`], 10);
    
                if (isNaN(cropX) || isNaN(cropY) || isNaN(cropWidth) || isNaN(cropHeight)) {
                    console.error('Invalid crop coordinates:', { cropX, cropY, cropWidth, cropHeight });
                    throw new Error('Invalid crop coordinates');
                }
    
                await sharp(imagePath)
                    .extract({ left: cropX, top: cropY, width: cropWidth, height: cropHeight })
                    .resize({ width: 400, height: 400 })
                    .toFile(resizedImagePath);
    
                // Remove the original uploaded image
                fs.unlink(imagePath, (err) => {
                    if (err) {
                        console.error('Failed to delete original image', err);
                    } else {
                        console.log('Original image deleted successfully');
                    }
                });
    
                return resizedImagePath;
            });
    
            const resizedImageUrls = await Promise.all(imagePromises);
    
            const productData = {
                title: req.body.title.trim(),
                material: req.body.material.trim(),
                color: req.body.color.trim(),
                shape: req.body.shape.trim(),
                brandId: req.body.brand.trim(),
                description: req.body.description.trim(),
                regularPrice: req.body.regularPrice.trim(),
                discountPercentage: req.body.discountPercentage.trim(),
                bestDiscount: req.body.discountPercentage.trim(),
                discountPrice: salePrice,
                salePrice: salePrice,
                quantity: req.body.quantity.trim(),
                categoryId: req.body.category.trim(),
                featured: req.body.featured.trim(),
                image: resizedImageUrls,
            };
    
            const product = new Product(productData);
    
            const savedProduct = await product.save();
    
            if (savedProduct) {
                res.redirect('/admin/productsList');
            } else {
                console.log('Error saving product');
                res.status(500).send('Error saving product');
            }
        } catch (error) {
            console.error(error.message);
            res.redirect('/500');
        }
    },
    
    
    

    
    
    
    productsList : async (req, res) => {
        try {
            let admin = req.session.adminName;
            const userData = await Product.find({})
            if (userData) {
    
                res.render('productsList', { products: userData ,admin:admin})
            } else {
                res.write('No products')
                res.end()
            }
        } catch (error) {
            console.log(error.message)
            res.redirect('/500')
        }
    },
    
    
    blockProductList : async (req, res) => {
        try {
            const id = req.query.productId
            console.log("The productId:"+id)
            const userData = await Product.findByIdAndUpdate({ _id: id }, { $set: { is_active: false } })
            if (userData) {
                res.redirect('/admin/productsList')
            } else {
                console.log('product not found or update failed')
                res.status(404).send('product not found')
            }
        } catch (error) {
            console.log(error.message)
            res.redirect('/500')
        }
    },
    
    
    unBlockProductList : async (req, res) => {
        try {
            const id = req.query.productId
            const userData = await Product.findByIdAndUpdate({ _id: id }, { $set: { is_active: true } })
            if (userData) {
                res.redirect('/admin/productsList')
            } else {
                console.log('product not found or update failed')
                res.status(404).send('product not found')
            }
    
        } catch (error) {
            console.log(error.message)
            res.redirect('/500')
        }
    },
    
    
    
    deleteProduct: async (req, res) => {
        try {
            const id = req.query.productId;
    
            // Retrieve the product to get image paths
            const product = await Product.findById(id);
            if (!product) {
                res.status(404).send('Product not found');
                return;
            }
    
            // Delete the images from the file system
            product.image.forEach(imagePath => {
                if (fs.existsSync(imagePath)) {
                    fs.unlinkSync(imagePath);
                }
            });
    
            // Delete the product from the database
            await Product.deleteOne({ _id: id });
    
            res.redirect('/admin/productsList');
        } catch (error) {
            console.log(error.message);
            res.redirect('/500');
        }
    },
    
    
    editProductList : async (req, res) => {
        try {
            let admin = req.session.adminName;
            const id = req.query.id
            const userData = await Product.findOne({ _id: id })
            // console.log(userData)
            const brandData = await Brand.find({ is_active: true })
    
            const categoryData = await Category.find({ is_active: true })
            if (userData) {
                res.render('editProduct', { products: userData, category: categoryData, brand: brandData, admin:admin})
            }
    
        } catch (error) {
            console.log(error.message)
            res.redirect('/500')
        }
    },
    
    
    
    
    
    loadEditProductList : async (req, res) => {
        try {
            const id = req.query.id;
            const product = await Product.findOne({ _id: id });
    
            let Newimages = [];
            if (req.files.length > 0) {
                // Resize new images and prepare the array of new image paths
                await Promise.all(req.files.map(async (file) => {
                    const imagePath = `uploads/${file.filename}`;
                    const resizedImagePath = `uploads/resized_${file.filename}`;
    
                    // Resize the image
                    await sharp(imagePath)
                        .resize({ width: 400, height: 400 })
                        .toFile(resizedImagePath);
    
                    // Remove the original image
                    fs.unlink(imagePath, (err) => {
                        if (err) {
                            console.error('Failed to delete original image', err);
                        } else {
                            console.log('Original image deleted successfully');
                        }
                    });
    
                    Newimages.push(resizedImagePath);
                }));
    
                // Delete old images from the filesystem
                product.image.forEach((imagePath) => {
                    fs.unlink(path.resolve(imagePath), (err) => {
                        if (err) {
                            console.error(`Failed to delete image: ${imagePath}`, err);
                        }
                    });
                });
    
                // Replace old images with new images
                product.image = Newimages;
            } else {
                // Keep the old images if no new images are uploaded
                Newimages = product.image;
            }
    
            let salePrice;
            if (req.body.discountPercentage.trim() > 0) {
                salePrice = req.body.regularPrice - (req.body.regularPrice.trim() * req.body.discountPercentage / 100);
            } else {
                salePrice = req.body.regularPrice.trim();
            }
    
            const categoryData = await Category.findById(product.categoryId);
            const catDiscountPercentage = categoryData.discount;
    
            const bestDiscount = req.body.discountPercentage > catDiscountPercentage
                ? req.body.discountPercentage
                : catDiscountPercentage;
    
            const userData = await Product.findByIdAndUpdate(
                { _id: id },
                {
                    $set: {
                        title: req.body.title.trim(),
                        material: req.body.material.trim(),
                        color: req.body.color.trim(),
                        shape: req.body.shape.trim(),
                        brandId: req.body.brand.trim(),
                        description: req.body.description.trim(),
                        regularPrice: req.body.regularPrice.trim(),
                        discountPercentage: req.body.discountPercentage.trim(),
                        bestDiscount: bestDiscount,
                        salePrice: salePrice,
                        quantity: req.body.quantity.trim(),
                        categoryId: req.body.category.trim(),
                        
                        featured:req.body.featured.trim(),
                        image: Newimages // Ensure images are updated here
                    }
                }
            );
    
            if (userData) {
                res.redirect('/admin/productsList');
            }
        } catch (error) {
            console.log(error.message);
            res.redirect('/500');
        }
    },
    
    

    loadHome: async (req, res, next) => {
        try {
            let user = req.session.userName;
          let page = 1;
    
          if (req.query.page) {
            page = req.query.page;
          }
    
          const limit = 9;

          const products = await Product.find({})
            .skip((page - 1) * limit)
            .limit(limit * 1)
            .exec();
            const count = await Product.find().countDocuments();
          return res.render("index", {
           
            products,
            pages: Math.ceil(count / limit),
            current: page,
            previous: page - 1,
            nextPage: Number(page) + 1,
            limit,
            count,
            user:user
          });
        } catch (err) {
          console.log(err);
          next(err);
        }
      },
    
      
   
    productDetails : async (req, res) => {
        try {
            const id = req.query.id
            let user = req.session.userName;
            const productData = await Product.findById({ _id: id }).populate('brandId')
            const categoryId=productData.categoryId
            const relatedProducts= await Product.find({categoryId:categoryId,is_active:true}).limit(4)
             console.log("user email id is: "+req.session.email)
            let isWishlisted = false;
            if (req.session.email) {
                // Find the user by email
                const user = await User.findOne({ email: req.session.email });
    
                if (user) {
                    // Find the wishlist by user ID
                    const userWishlist = await Wishlist.findOne({ userId: user._id });
    
                    // Check if the product is in the wishlist
                    if (userWishlist && userWishlist.products.some(product => product.productId.equals(id))) {
                        isWishlisted = true;
                    }
                }
            }
            console.log("wishlist status:" +isWishlisted)
          
            if (productData) {
                res.render('productDetails', { product: productData, user: user, relatedProducts, isWishlisted})
            } else {
                res.redirect('/home')
    
            }
        } catch (error) {
            console.log(error.message)
            res.redirect('/500')
        }
    },




    addToCart: async (req, res) => {
        try {
            const productId = req.query.productId;
            const email = req.session.email;
            const quantity = parseInt(req.body.quantity, 10) || 1;
    
            const userData = await User.findOne({ email });
            const productData = await Product.findById(productId);
    
            if (!productData) {
                res.redirect('/cart?message=Product not found');
                return;
            }
    
            let cartItem = userData.cart.find(item => item.productId.toString() === productId);
    
            if (cartItem) {
                if (cartItem.quantity + quantity > productData.quantity) {
                    res.redirect('/cart?message=Insufficient stock to add');
                    return;
                }
                cartItem.quantity += quantity;
            } else {
                if (quantity > productData.quantity) {
                    res.redirect('/cart?message=Insufficient stock available');
                    return;
                }
                userData.cart.push({ productId, quantity });
            }
    
            await userData.save();
            res.redirect('/cart');
        } catch (error) {
            console.log(error.message);
            res.redirect('/500');
        }
    },
    
    


    

    showCart: async (req, res) => {
        try {
            const email = req.session.email;
            const userData = await User.findOne({ email }).populate('cart.productId');
            const categories = await Category.find({ is_active: true });
            const brands = await Brand.find({ is_active: true });
            // const message = req.query.message ?? '';
            const message = req.query.message || '';
       
           
            res.render('cart', { user: userData, userCart: userData, brands, categories, message });
        } catch (error) {
            console.log(error.message);
            res.redirect('/500');
        }
    },

    
    deleteFromCart : async (req, res) => {
        try {
            const email = req.session.email
            const cartItemId = req.query.id
            const userData = await User.updateOne(
                { email: email },
                { $pull: { 'cart': { 'productId': cartItemId } } }
            );
            if (userData) {
                res.redirect('/cart')
            }
        } catch (error) {
            console.log(error.message)
            res.redirect('/500')
        }
    },

    



    shop: async (req, res) => {
        try {
            const email = req.session.email;
            const userData = await User.findOne({ email: email });
            const categories = await Category.find({ is_active: true });
            const message = req.query.message ?? null;
            const sort = req.query.sort ?? '';
            const searchQuery = req.query.search ?? '';
            const categoryId = req.query.categoryId ?? '';
            const currentPage = parseInt(req.query.page) || 1;
            const pageSize = 9;
    
                     

             // Construct the base query for fetching products
            
             let query = { is_active: true };

              if (searchQuery) {
                query.$or = [
                     { title: new RegExp(searchQuery, 'i') },
                     { description: new RegExp(searchQuery, 'i') }
                 ];
             }
    
            // Apply category filter if present
            if (categoryId) {
                query.categoryId = categoryId;
            }
    
            // Determine sorting options based on user selection
            let sortOptions = {};
            switch (sort) {
                case 'atoz':
                    sortOptions = { title: 1 }; // Sort by title A-Z
                    break;
                case 'ztoa':
                    sortOptions = { title: -1 }; // Sort by title Z-A
                    break;
                case 'ascending':
                    sortOptions = { salePrice: 1 }; // Sort by price low to high
                    break;
                case 'descending':
                    sortOptions = { salePrice: -1 }; // Sort by price high to low
                    break;
                case 'newarrival':
                    sortOptions = { date: -1 }; // Sort by new arrivals
                    break;
                case 'rating':
                    sortOptions = { rating: -1 }; // Sort by rating
                    break;
                default:
                    sortOptions = {}; // No sorting applied
            }
    
            // Calculate the number of items to skip for pagination
            const skip = (currentPage - 1) * pageSize;
    
            // Fetch the total number of products matching the query for pagination
            const totalProducts = await Product.countDocuments(query);
    
            // Fetch the filtered and sorted products from the database
            const productData = await Product.find(query)
                .sort(sortOptions) // Apply sorting
                .skip(skip)
                .limit(pageSize);
    
            // Calculate the total number of pages
            const totalPages = Math.ceil(totalProducts / pageSize);
    
            // Render the shop page with the filtered, sorted, and paginated products
            res.render('shop', {
                products: productData,
                user: userData,
                categories,
                search: searchQuery,
                message,
                currentPage,
                totalPages,
                sort,
                categoryId
            });
        } catch (error) {
            console.error(error.message);
            res.redirect('/500');
        }
    },
    
    
    
    showCheckOut: async (req, res) => {
        try {
            const email = req.session.email;
            const brands = await Brand.find({ is_active: true });
            const userData = await User.findOne({ email: email }).populate('cart.productId');
            const coupon = await Coupon.find({ is_active: true, "redeemedUsers.userId": { $ne: userData._id } });
            const categories = await Category.find({ is_active: true });
    
            // Fetch addresses from the Address model
            const addresses = await Address.find({ userId: userData._id });
    
            let flag = 0;
            userData.cart.forEach(item => {
                if (item.productId.quantity < 1) {
                    flag = 1;
                } else if (item.productId.quantity < item.quantity) {
                    flag = 2;
                }
            });
    
            if (flag == 1) {
                return res.redirect('/cart?message=stockout');
            } else if (flag == 2) {
                return res.redirect('/cart?message=stocklow');
            }
    
            if (userData.cart.length > 0) {
                let originalTotal = 0;
                let discountTotal = 0;
                let totalDiscountPercentage = 0;
                let isCodDisabled = false;
                let deliveryCharge = 0;
    
                userData.cart.forEach(item => {
                    const originalPrice = item.productId.regularPrice * item.quantity;
                    const salePrice = item.productId.salePrice * item.quantity;
                    const discountAmount = originalPrice - salePrice;
                    originalTotal += originalPrice;
                    discountTotal += discountAmount;
                });
    
                totalDiscountPercentage = (discountTotal / originalTotal) * 100;
    
                // Calculate delivery charge
                const totalAmountAfterDiscount = originalTotal - discountTotal;
                if (totalAmountAfterDiscount < 1000) {
                    deliveryCharge = 100;
                } else if (totalAmountAfterDiscount >= 1000 && totalAmountAfterDiscount <= 5000) {
                    deliveryCharge = 50;
                }
    
                // Disable Cash On Delivery if total amount exceeds 1000
                if (originalTotal - discountTotal > 1000) {
                    isCodDisabled = true;
                }
    
                // Calculate final amount including delivery charge
                const finalAmount = totalAmountAfterDiscount + deliveryCharge;
    
                return res.render('checkout', {
                    user: userData,
                    categories,
                    brands,
                    coupon,
                    addresses, // Pass the addresses to the template
                    originalTotal: originalTotal.toFixed(2),
                    discountTotal: discountTotal.toFixed(2),
                    totalDiscountPercentage: totalDiscountPercentage.toFixed(2),
                    isCodDisabled,
                    deliveryCharge: deliveryCharge.toFixed(0),
                    finalAmount: finalAmount.toFixed(2)
                });
            } else {
                return res.redirect('/cart');
            }
        } catch (error) {
            console.log(error.message);
            return res.redirect('/500');
        }
    },
    
     
    
    

    updateQuantity : async (req, res) => {
        try {
            const { index, newQuantity } = req.params;
            const email = req.session.email
            const userData = await User.findOne({ email: email }).populate('cart.productId');
    
            if (!userData) {
                return res.status(404).send('Product not found');
            }
    
            // Update the quantity
            //   console.log(userData)
            userData.cart[index].quantity = newQuantity;
            await userData.save();
    
            // Send a success response
            res.status(200).send('Quantity updated successfully');
        } catch (error) {
            console.error(error);
            res.redirect('/500')
            // res.status(500).send('Internal Server Error');
        }
    },
    

}