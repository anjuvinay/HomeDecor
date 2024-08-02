const User = require('../models/userModel');
const Product = require('../models/productModel');
const Wishlist = require('../models/wishlistModel');
const Category = require('../models/categoryModel');
const Brand = require('../models/brandModel');



module.exports = {
    showWishlist: async (req, res) => {
        try {
            const email = req.session.email;
            const userData = await User.findOne({ email });
            const wishlistData = await Wishlist.findOne({ userId: userData._id }).populate('products.productId');
            
            res.render('wishlist', { wishlist: wishlistData, user: userData });
        } catch (error) {
            console.log(error.message);
            res.redirect('/500');
        }
    },


    

    addToWishlist: async (req, res) => {
        try {
            const id = req.query.id;
            const email = req.session.email;

            const userData = await User.findOne({ email: email });
            const productData = await Product.findById(id);
            const wishlist = await Wishlist.findOne({ userId: userData._id });

            if (wishlist) {
                let productExists = false;

                for (let item of wishlist.products) {
                    if (item.productId.toString() === productData._id.toString()) {
                        productExists = true;
                        break;
                    }
                }

                if (productExists) {
                    res.redirect('/wishlist');
                } else {
                    wishlist.products.push({ productId: productData._id });
                    const wishlistData = await wishlist.save();

                    if (wishlistData) {
                        res.redirect('/wishlist');
                    } else {
                        res.status(500).send('Failed to save wishlist data');
                    }
                }
            } else {
                const wishlistData = new Wishlist({
                    userId: userData._id,
                    products: [{ productId: productData._id }]
                });

                const data = await wishlistData.save();

                if (data) {
                    res.redirect('/wishlist');
                } else {
                    res.status(500).send('Failed to save wishlist data');
                }
            }
        } catch (error) {
            console.error(error.message);
            res.redirect('/500');
        }
    },


    addToCart: async (req, res) => {
        try {
            const productId = req.query.productId;
            const email = req.session.email;
            const userData = await User.findOne({ email: email });
            const productData = await Product.findById(productId);
    
            if (!productData || productData.quantity < 1) {
                res.redirect('/cart?message=Product is out of stock&type=error');
                return;
            }
    
            if (userData && userData.cart) {
                const existingProduct = userData.cart.find(item => item.productId.toString() === productId);
                const newQuantity = existingProduct ? existingProduct.quantity + 1 : 1;
    
                if (newQuantity > productData.quantity) {
                    res.redirect('/cart?message=Insufficient stock to add&type=error');
                    return;
                }
    
                if (existingProduct) {
                    await User.findOneAndUpdate(
                        { email: email, 'cart.productId': productId },
                        { $inc: { 'cart.$.quantity': 1 } }
                    );
                } else {
                    const cartItem = {
                        productId: productId,
                        quantity: 1
                    };
                    await User.findOneAndUpdate(
                        { email: email },
                        { $push: { cart: cartItem } }
                    );
                }
    
                await Wishlist.updateOne(
                    { userId: userData._id },
                    { $pull: { products: { productId: productId } } }
                );
    
                res.redirect('/cart');
                return;
            }
    
            res.redirect('/cart?message=Something went wrong&type=error');
        } catch (error) {
            console.log(error.message);
            res.redirect('/500');
        }
    },
    
    



    // addToCart: async (req, res) => {
    //     try {
    //         const productId = req.query.productId;
    //         const email = req.session.email;
    //         const cartItem = {
    //             productId: productId,
    //             quantity: 1
    //         };
    //         const userData = await User.findOne({ email: email });

    //         if (userData && userData.cart) {
    //             await User.findOneAndUpdate(
    //                 { email: email },
    //                 { $push: { cart: cartItem } }
    //             );

    //             await Wishlist.updateOne(
    //                 { userId: userData._id },
    //                 { $pull: { products: { productId: productId } } }
    //             );

    //             res.redirect('/cart');
    //         }
    //     } catch (error) {
    //         console.log(error.message);
    //         res.redirect('/500');
    //     }
    // },

    deleteFromWishlist: async (req, res) => {
        try {
            const productId = req.query.productId;
            const email = req.session.email;
            const userData = await User.findOne({ email });
            const wishlistData = await Wishlist.updateOne(
                { userId: userData._id },
                { $pull: { 'products': { 'productId': productId } } }
            );
            if (wishlistData) {
                res.redirect('/wishlist');
            }
        } catch (error) {
            console.log(error.message);
            res.redirect('/500');
        }
    }
};
