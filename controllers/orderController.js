const User = require('../models/userModel')
const Product = require('../models/productModel')
const Order = require('../models/orderModel')
const Coupon=require('../models/couponModel')
const Brand = require('../models/brandModel')
const Category = require('../models/categoryModel')
const Address = require('../models/addressModel')
const session = require('express-session')
require('dotenv').config();


const Razorpay=require('razorpay')
var instance = new Razorpay({
  key_id: process.env.YOUR_KEY_ID,
  key_secret: process.env.YOUR_KEY_SECRET
});


module.exports = {


    placeOrder: async (req, res) => {
        try {
            const couponCode = req.body.couponSelected;
            const email = req.session.email;
            const userData = await User.findOne({ email: email }).populate('cart.productId');
            const addressId = req.body.selectAddress;
            const paymentMethod = req.body.payment_option;
            let totalAmount = parseFloat(req.body.totalAmount);
    
            let originalTotal = 0;
            let discountTotal = 0;
    
            // Check product stock
            for (let i = 0; i < userData.cart.length; i++) {
                if (userData.cart[i].productId.quantity < 1) {
                    return res.redirect('/cart?message=stockout');
                } else if (userData.cart[i].productId.quantity < userData.cart[i].quantity) {
                    return res.redirect('/cart?message=stocklow');
                }
            }
    
            // Calculate totals
            userData.cart.forEach(item => {
                const originalPrice = item.productId.regularPrice * item.quantity;
                const salePrice = item.productId.salePrice * item.quantity;
                const discountAmount = originalPrice - salePrice;
                originalTotal += originalPrice;
                discountTotal += discountAmount;
            });
    
            // Apply coupon if available
            let couponData = await Coupon.findOne({ couponCode: couponCode });
            let coupon = null;
            if (couponData != null) {
                totalAmount -= couponData.discount;
                totalAmount = parseFloat(totalAmount.toFixed(2)); // Ensure two decimal places
                const obj = {
                    userId: userData._id
                };
                await couponData.redeemedUsers.push(obj);
                await couponData.save();
                coupon = couponData.discount;
            }
    
            const totalDiscountPercentage = (discountTotal / originalTotal) * 100;
    
            // Calculate the delivery charge based on the total amount
            let deliveryCharge = 0;
            if (totalAmount < 1000) {
                deliveryCharge = 100;
            } else if (totalAmount >= 1000 && totalAmount <= 5000) {
                deliveryCharge = 50;
            }
    
            totalAmount += deliveryCharge;
            totalAmount = parseFloat(totalAmount.toFixed(2)); // Ensure two decimal places
    
            const address = await Address.findById(addressId);
    
            if (address && userData.cart.length > 0) {
                const userCart = userData.cart;
    
                for (let i = 0; i < userCart.length; i++) {
                    userCart[i].productId.quantity -= userCart[i].quantity;
    
                    if (userCart[i].productId.quantity < 0) {
                        userCart[i].productId.quantity = 0;
                    }
    
                    await Product.findByIdAndUpdate(
                        { _id: userCart[i].productId._id },
                        { 
                            $set: { quantity: userCart[i].productId.quantity },
                            $inc: { popularity: userCart[i].quantity }
                        }
                    );
                }
    
                let arr = [];
                userCart.forEach((item) => {
                    arr.push({
                        productId: item.productId._id,
                        quantity: item.quantity,
                        regularPrice: item.productId.regularPrice,
                        salePrice: item.productId.salePrice
                    });
                });
    
                const randomid = randomId();
                async function randomId() {
                    const min = 100000;
                    const max = 999999;
                    const randomSixDigitNumber = Math.floor(Math.random() * (max - min + 1)) + min;
                    const orderData = await Order.findOne({ orderId: randomSixDigitNumber });
                    if (orderData) {
                        return await randomId();
                    } else {
                        return randomSixDigitNumber;
                    }
                }
                const orderId = await randomid;
    
                const order = new Order({
                    userId: userData._id,
                    products: arr,
                    shippingAddress: {
                        fname: address.fname,
                        lname: address.lname,
                        country: address.country,
                        housename: address.housename,
                        city: address.city,
                        state: address.state,
                        pincode: address.pincode,
                        phone: address.phone,
                        email: address.email
                    },
                    totalAmount: totalAmount,
                    originalTotal: originalTotal,
                    discountTotal: discountTotal,
                    totalDiscountPercentage: totalDiscountPercentage,
                    paymentMethod: paymentMethod,
                    orderId: orderId,
                    coupon: coupon,
                    adminTotal: totalAmount,
                    shipping: deliveryCharge,
                });
                const orderData = await order.save();
    
                if (orderData) {
                    userData.cart = [];
                    await userData.save();
                    setTimeout(() => {
                        res.redirect('/userAccount');
                    }, 2000);
                } else {
                    res.redirect('/checkOut');
                }
            } else {
                res.redirect('/checkOut');
            }
        } catch (error) {
            console.log(error.message);
            res.redirect('/500');
        }
    },
    
    
    


orderDetails : async (req, res) => {
    try {
        const email = req.session.email
        const orderId = req.query.id
        const userData = await User.findOne({ email: email }).populate('cart.productId')
        const orderData = await Order.findById({ _id: orderId }).populate('products.productId').populate('userId')
       
        res.render('orderdetails', { orders: orderData, user:userData })
    } catch (error) {
        console.log(error.message)
        res.redirect('/500')
    }
},

cancelOrder : async (req, res) => {
    try {
        const email = req.session.email
        const orderId = req.query.id
        const userData = await User.findOne({ email: email }).populate('cart.productId')
        const orderData = await Order.findById({ _id: orderId }).populate('products.productId').populate('userId')

        if(orderData.userId._id.toString()==userData._id){
           
        orderData.orderstatus = 'Cancelled'
        await orderData.save()
        

        async function processOrder(orderData) {
            for (const item of orderData.products) {
                const productId = item.productId._id;
                console.log(productId)
                const quantityToAdd = item.quantity
               
                const productData = await Product.findById(productId);
                productData.quantity += quantityToAdd;
                await productData.save()

                if (productData)
                    console.log(productData);
                else
                    console.log('no data found')
            }
        }

        // Call the async function
        processOrder(orderData);
        //updating wallet
        if(orderData.paymentStatus=='Success'){
            userData.wallet+=parseFloat(orderData.totalAmount)
            await userData.save()
            res.redirect('/orderDetails?id=' + orderId)
        }else{
            res.redirect('/orderDetails?id=' + orderId)
        }
       

    }else{
        res.render('404page')
    }
    } catch (error) {
        console.log(error.message)
        res.redirect('/500')
    }
},


ordersList : async (req, res) => {
    try {
        let admin = req.session.adminName;
        const orderData = await Order.find({}).sort({ orderDate: -1 }).populate('userId')
        
        if (orderData) {
            res.render('ordersList', { order: orderData,admin })

        } else {
            res.write('no orders')
            res.end()
        }

    } catch (error) {
        console.log(error.message)
        res.redirect('/500')
    }
},


orderDetailsAdmin : async (req, res) => {
    try {
        let admin = req.session.adminName;
        const orderId = req.query.orderId
        const orderData = await Order.findOne({ _id: orderId }).populate('products.productId').populate('userId')
        // console.log(orderData.products[0].productId.image[0]);
        res.render('orderDetails', { order: orderData,admin })
    } catch (error) {
        console.log(error.message)
        res.redirect('/500')
    }
},





updateOrderStatus: async (req, res) => {
    try {
        const { orderId, productId, status: newStatus } = req.body;
        console.log('Received orderId:', orderId);
        console.log('Received productId:', productId);
        console.log('Received newStatus:', newStatus);

        const orderData = await Order.findById(orderId);
        if (!orderData) {
            console.error('Order not found');
            return res.redirect('/500');
        }

        console.log('Order found:', orderData);
        const product = orderData.products.find(p => p.productId.toString() === productId.toString());
        if (!product) {
            console.error('Product not found in order');
            return res.redirect('/500');
        }

        console.log('Product found:', product);
        product.status = newStatus;
        console.log('Updated product status to:', newStatus);

        if (newStatus === 'Delivered') {
            const allDelivered = orderData.products.every(p => p.status === 'Delivered');
            if (allDelivered) {
                orderData.paymentStatus = 'Success';
                console.log('All products delivered. Updated payment status to Success.');
            }
        }

        // .........................................
         // Find the specific product in the order
       
        if (newStatus === 'Returned') {

           
            const productInOrder = orderData.products.find(item => item.productId._id.toString() === productId);
            const userId = orderData.userId._id;
            const userData = await User.findById(userId);
            
         
   

            // Update the product's quantity in inventory
        const productData = await Product.findById(productId);
        if (productData && productInOrder.status === 'Returned') {
            productData.quantity += productInOrder.quantity;
            await productData.save();
        }

        // Update the user's wallet if payment was successful
        if (orderData.paymentStatus === 'Success' && productInOrder.status === 'Returned') {
            userData.wallet += parseFloat(productInOrder.salePrice) * productInOrder.quantity;
            orderData.adminTotal -=  parseFloat(productInOrder.salePrice) * productInOrder.quantity;
            await userData.save();
        }

        }

        // .........................................

        await orderData.save();
        console.log('Order saved successfully');
        res.redirect('/admin/orderDetails?orderId=' + orderId);
    } catch (error) {
        console.error('Error updating order status:', error.message);
        res.redirect('/500');
    }
},






returnOrder : async (req, res) => {
    try {
        const email = req.session.email
        const orderId = req.query.id
        const userData = await User.findOne({ email: email }).populate('cart.productId')
        const orderData = await Order.findById({ _id: orderId }).populate('products.productId').populate('userId')
      
        orderData.orderstatus = 'Return requested'
        await orderData.save()

        async function processOrder(orderData) {
            for (const item of orderData.products) {
                const productId = item.productId._id;
              
                const quantityToAdd = item.quantity
                
                const productData = await Product.findById(productId);
                productData.quantity += quantityToAdd;
                await productData.save()
            }
        }

        // Call the async function
        processOrder(orderData);
        //updating wallet
        if(orderData.paymentStatus=='Success'){
            userData.wallet+=parseFloat(orderData.totalAmount)
            await userData.save()
            res.redirect('/orderDetails?id=' + orderId)
        }else{
            res.redirect('/orderDetails?id=' + orderId)
        }


        
    } catch (error) {
        console.log(error.message)
        res.redirect('/500')
    }
},



checkWallet : async (req, res) => {
    try {
        const couponCode = req.session.couponCode;
        const email = req.session.email;
        const userData = await User.findOne({ email: email }).populate('cart.productId');
        const addressId = req.query.addressId;
        let totalAmount = parseFloat(req.query.totalAmount);

        if (!userData) {
            return res.redirect('/500');
        }

        // Fetch the address details
        const address = await Address.findById(addressId);

        if (!address) {
            return res.redirect('/500');
        }

        const couponData = await Coupon.findOne({ couponCode: couponCode });

        if (couponData) {
            const finalPrice = totalAmount - couponData.discount;
            totalAmount = finalPrice;
        }

        console.log(userData.wallet);
        if (totalAmount > userData.wallet) {
            res.status(200).json({
                message: 'Insufficient Balance in Wallet'
            });
        } else {
            console.log("I have entered inside");
            res.status(200).json({ status: "Success", message: '' });
        }

    } catch (error) {
        console.log(error.message);
        res.redirect('/500');
    }
},





walletPayment : async (req, res) => {
    try {
        console.log('wallet');
        const couponCode = req.session.couponCode;
        const email = req.session.email;
        const userData = await User.findOne({ email: email }).populate('cart.productId');
        const addressId = req.query.addressId;
        const paymentMethod = 'Wallet';
        let totalAmount = parseFloat(req.query.totalAmount);

        if (!userData) {
            return res.redirect('/500');
        }

        // Fetch the address details
        const address = await Address.findById(addressId);

        if (!address) {
            return res.redirect('/500');
        }

        let originalTotal = 0;
        let discountTotal = 0;

        userData.cart.forEach(item => {
            const originalPrice = item.productId.regularPrice * item.quantity;
            const salePrice = item.productId.salePrice * item.quantity;
            const discountAmount = originalPrice - salePrice;
            originalTotal += originalPrice;
            discountTotal += discountAmount;
        });

        const totalDiscountPercentage = (discountTotal / originalTotal) * 100;

        // Apply coupon if available
        const couponData = await Coupon.findOne({ couponCode: couponCode });
        let coupon = null;
        if (couponData) {
            totalAmount -= couponData.discount;
            totalAmount = parseFloat(totalAmount.toFixed(2)); // Ensure two decimal places
            const obj = {
                userId: userData._id
            };
            await couponData.redeemedUsers.push(obj);
            await couponData.save();
            coupon = couponData.discount;
        }

        // Calculate the delivery charge based on the total amount
        let deliveryCharge = 0;
        if (totalAmount < 1000) {
            deliveryCharge = 100;
        } else if (totalAmount >= 1000 && totalAmount <= 5000) {
            deliveryCharge = 50;
        }

        totalAmount += deliveryCharge;
        totalAmount = parseFloat(totalAmount.toFixed(2)); // Ensure two decimal places

        // Update user's wallet
        userData.wallet -= totalAmount;
        await userData.save();

        if (address && userData.cart.length > 0) {
            const userCart = userData.cart;

            for (let i = 0; i < userCart.length; i++) {
                userCart[i].productId.quantity -= userCart[i].quantity;

                if (userCart[i].productId.quantity < 0) {
                    userCart[i].productId.quantity = 0;
                }

                await Product.findByIdAndUpdate(
                    { _id: userCart[i].productId._id },
                    { $set: { quantity: userCart[i].productId.quantity },
                    $inc: { popularity: userCart[i].quantity } }
                );
            }

            let arr = [];
            userCart.forEach((item) => {
                arr.push({
                    productId: item.productId._id,
                    quantity: item.quantity,
                    regularPrice: item.productId.regularPrice,
                    salePrice: item.productId.salePrice
                });
            });

            const randomid = randomId();
            async function randomId() {
                const min = 100000;
                const max = 999999;
                const randomSixDigitNumber = Math.floor(Math.random() * (max - min + 1)) + min;
                const orderData = await Order.findOne({ orderId: randomSixDigitNumber });
                if (orderData) {
                    return await randomId();
                } else {
                    return randomSixDigitNumber;
                }
            }
            const orderId = await randomid;

            const order = new Order({
                userId: userData._id,
                products: arr,
                shippingAddress: {
                    fname: address.fname,
                    lname: address.lname,
                    country: address.country,
                    housename: address.housename,
                    city: address.city,
                    state: address.state,
                    pincode: address.pincode,
                    phone: address.phone,
                    email: address.email
                },
                totalAmount: totalAmount,
                originalTotal: originalTotal,
                discountTotal: discountTotal,
                totalDiscountPercentage: totalDiscountPercentage,
                paymentMethod: paymentMethod,
                orderId: orderId,
                paymentStatus: 'Success',
                coupon: coupon,
                adminTotal: totalAmount,
                shipping: deliveryCharge
            });
            const orderData = await order.save();

            if (orderData) {
                userData.cart = [];
                await userData.save();
                setTimeout(() => {
                    res.redirect('/userAccount');
                }, 2000);
            } else {
                res.redirect('/checkOut');
            }
        } else {
            res.redirect('/checkOut');
        }
    } catch (error) {
        console.log(error.message);
        res.redirect('/500');
    }
},






getWallet: async (req, res) => {
    try {
        const email = req.session.email;
        const user = await User.findOne({ email: email });

        if (!user) {
            return res.redirect('/login');
        }

        // Fetch orders with product details
        const orders = await Order.find({ userId: user._id }).populate('products.productId');

        // Extract transactions based on the order's payment method and product status
        const transactions = orders.flatMap(order => {
            const productTransactions = order.products
                .filter(product => product.status === 'Returned' || product.status === 'Cancelled')
                .map(product => ({
                    orderDate: order.orderDate,
                    amount: product.salePrice * product.quantity,
                    type: 'Credited'
                }));

            if (order.paymentMethod === 'Wallet' && order.paymentStatus === 'Success') {
                productTransactions.push({
                    orderDate: order.orderDate,
                    amount: order.totalAmount,
                    type: 'Debited'
                });
            }

            return productTransactions;
        });

        // Ensure consistent date format parsing
        transactions.forEach(transaction => {
            transaction.orderDate = new Date(transaction.orderDate);
        });

        // Sort transactions by orderDate in descending order
        transactions.sort((a, b) => b.orderDate - a.orderDate);

        res.render('wallet', { user, transactions });
    } catch (error) {
        console.error(error);
        res.redirect('/500');
    }
},









onlinePayment: async (req, res) => {
    try {
        let totalAmount = parseFloat(req.query.totalAmount);
        const couponCode = req.session.couponCode;
        const couponData = await Coupon.findOne({ couponCode: couponCode });
        const userData = await User.findOne({ email: req.session.email }).populate('cart.productId');
    
        let flag = 0;

        const userCart = userData.cart;
        userCart.forEach(item => {
            if (item.productId.quantity < 1) {
                flag = 1;
            } else if (item.productId.quantity < item.quantity) {
                flag = 2;
            }
        });

        let coupon = null;
        if (couponData) {
            totalAmount -= couponData.discount;
            totalAmount = parseFloat(totalAmount.toFixed(2));
            coupon = couponData.discount;
        }

        // Calculate the delivery charge based on the total amount
        let deliveryCharge = 0;
        if (totalAmount < 1000) {
            deliveryCharge = 100;
        } else if (totalAmount >= 1000 && totalAmount <= 5000) {
            deliveryCharge = 50;
        }

        totalAmount += deliveryCharge;
        totalAmount = parseFloat(totalAmount.toFixed(2));

        var options = {
            amount: totalAmount * 100, // Amount in paisa
            currency: "INR",
            receipt: "order_rcptid_11"
        };

        if (flag == 0) {
            instance.orders.create(options, async function (err, razorOrder) {
                if (err) {
                    console.log(err.message);
                    res.status(500).json({ error: "Failed to create order" });
                } else {
                    res.status(200).json({
                        message: "Order placed successfully.",
                        razorOrder: razorOrder,
                        paymentStatus: "Successfull"
                    });
                }
            });
        } else if (flag == 1) {
            res.json({ message: 'Stock out' });
        } else if (flag == 2) {
            res.json({ message: 'Stock low' });
        }
    } catch (error) {
        console.error(error);
        res.redirect('/500');
    }
},







paymentSuccess: async (req, res) => {
    try {
        const email = req.session.email;
        const userData = await User.findOne({ email: email }).populate('cart.productId');
        
        if (!userData) {
            console.error("User not found");
            return res.redirect('/500');
        }

        const addressId = req.query.addressId; // Ensure addressId is received
        let totalAmount = parseFloat(req.query.totalAmount);
        const couponCode = req.query.couponCode;
        const paymentMethod = 'Razorpay';

        console.log("Received addressId:", addressId);

        // Fetch the address using the addressId
        const address = await Address.findById(addressId);

        console.log("Found address:", address);  // Add this line for debugging

        if (!address) {
            console.error("Address not found");
            return res.redirect('/500');
        }

        let originalTotal = 0;
        let discountTotal = 0;

        userData.cart.forEach(item => {
            const originalPrice = item.productId.regularPrice * item.quantity;
            const salePrice = item.productId.salePrice * item.quantity;
            const discountAmount = originalPrice - salePrice;
            originalTotal += originalPrice;
            discountTotal += discountAmount;
        });

        const totalDiscountPercentage = (discountTotal / originalTotal) * 100;

        const couponData = await Coupon.findOne({ couponCode: couponCode });
        let coupon = null;
        if (couponData) {
            totalAmount -= couponData.discount;
            totalAmount = parseFloat(totalAmount.toFixed(2));
            const obj = { userId: userData._id };
            await couponData.redeemedUsers.push(obj);
            await couponData.save();
            coupon = couponData.discount;
        }

        let deliveryCharge = 0;
        if (totalAmount < 1000) {
            deliveryCharge = 100;
        } else if (totalAmount >= 1000 && totalAmount <= 5000) {
            deliveryCharge = 50;
        }
        totalAmount += deliveryCharge;
        totalAmount = parseFloat(totalAmount.toFixed(2));

        if (userData.cart.length > 0) {
            const userCart = userData.cart;

            for (let i = 0; i < userCart.length; i++) {
                userCart[i].productId.quantity -= userCart[i].quantity;

                if (userCart[i].productId.quantity < 0) {
                    userCart[i].productId.quantity = 0;
                }

                await Product.findByIdAndUpdate(
                    { _id: userCart[i].productId._id },
                    { $set: { quantity: userCart[i].productId.quantity },
                    $inc: { popularity: userCart[i].quantity } }
                );
            }

            let arr = [];
            userCart.forEach((item) => {
                arr.push({
                    productId: item.productId._id,
                    quantity: item.quantity,
                    regularPrice: item.productId.regularPrice,
                    salePrice: item.productId.salePrice
                });
            });

            const randomid = randomId();
            async function randomId() {
                const min = 100000;
                const max = 999999;
                const randomSixDigitNumber = Math.floor(Math.random() * (max - min + 1)) + min;
                const orderData = await Order.findOne({ orderId: randomSixDigitNumber });
                if (orderData) {
                    return await randomId();
                } else {
                    return randomSixDigitNumber;
                }
            }
            const orderId = await randomid;

            const order = new Order({
                userId: userData._id,
                products: arr,
                shippingAddress: {
                    fname: address.fname,
                    lname: address.lname,
                    country: address.country,
                    housename: address.housename,
                    city: address.city,
                    state: address.state,
                    pincode: address.pincode,
                    phone: address.phone,
                    email: address.email
                },
                totalAmount: totalAmount,
                originalTotal: originalTotal,
                discountTotal: discountTotal,
                totalDiscountPercentage: totalDiscountPercentage,
                paymentMethod: paymentMethod,
                orderId: orderId,
                paymentStatus: 'Success',
                coupon: coupon,
                adminTotal: totalAmount,
                shipping: deliveryCharge
            });
            const orderData = await order.save();

            if (orderData) {
                userData.cart = [];
                await userData.save();
                res.redirect('/userAccount');
            }
        } else {
            console.error('Cart is empty');
            res.redirect('/500');
        }
    } catch (error) {
        console.log(error.message);
        res.redirect('/500');
    }
},




handlePaymentFailure : async (req, res) => {
    try {
        console.log("Handling payment failure...");

        const email = req.session.email;
        const userData = await User.findOne({ email: email }).populate('cart.productId');
      
        const addressId = req.body.addressId;
        let totalAmount = parseFloat(req.body.totalAmount);
        const couponCode = req.body.couponCode;

        const paymentMethod = 'Razorpay';

        let originalTotal = 0;
        let discountTotal = 0;

        userData.cart.forEach(item => {
            console.log("1")
            const originalPrice = item.productId.regularPrice * item.quantity;
            const salePrice = item.productId.salePrice * item.quantity;
            const discountAmount = originalPrice - salePrice;
            originalTotal += originalPrice;
            discountTotal += discountAmount;
        });

        const totalDiscountPercentage = (discountTotal / originalTotal) * 100;

        const couponData = await Coupon.findOne({ couponCode: couponCode });
        let coupon = null;
        if (couponData) {
            totalAmount -= couponData.discount;
            totalAmount = parseFloat(totalAmount.toFixed(2));
            const obj = { userId: userData._id };
            await couponData.redeemedUsers.push(obj);
            await couponData.save();
            coupon = couponData.discount;
        }

        // Calculate the delivery charge based on the total amount
        let deliveryCharge = 0;
        if (totalAmount < 1000) {
            deliveryCharge = 100;
        } else if (totalAmount >= 1000 && totalAmount <= 5000) {
            deliveryCharge = 50;
        }

        totalAmount += deliveryCharge;
        totalAmount = parseFloat(totalAmount.toFixed(2));

        console.log("length: " + userData.cart.length)

        // Fetch the address using the addressId
        const address = await Address.findById(addressId);

        if (address && userData.cart.length > 0) {
            const userCart = userData.cart;
            console.log("usercart: " + userCart)

            for (let i = 0; i < userCart.length; i++) {
                userCart[i].productId.quantity -= userCart[i].quantity;

                if (userCart[i].productId.quantity < 0) {
                    userCart[i].productId.quantity = 0;
                }

                await Product.findByIdAndUpdate(
                    { _id: userCart[i].productId._id },
                    { $set: { quantity: userCart[i].productId.quantity },
                    $inc: { popularity: userCart[i].quantity } }
                );
            }

            let arr = [];
            userCart.forEach((item) => {
                arr.push({
                    productId: item.productId._id,
                    quantity: item.quantity,
                    regularPrice: item.productId.regularPrice,
                    salePrice: item.productId.salePrice
                });
            });

            const randomid = randomId();
            async function randomId() {
                const min = 100000;
                const max = 999999;
                const randomSixDigitNumber = Math.floor(Math.random() * (max - min + 1)) + min;
                const orderData = await Order.findOne({ orderId: randomSixDigitNumber });
                if (orderData) {
                    return await randomId();
                } else {
                    return randomSixDigitNumber;
                }
            }
            const orderId = await randomid;

            const order = new Order({
                userId: userData._id,
                products: arr,
                shippingAddress: {
                    fname: address.fname,
                    lname: address.lname,
                    country: address.country,
                    housename: address.housename,
                    city: address.city,
                    state: address.state,
                    pincode: address.pincode,
                    phone: address.phone,
                    email: address.email
                },
                totalAmount: totalAmount,
                originalTotal: originalTotal,
                discountTotal: discountTotal,
                totalDiscountPercentage: totalDiscountPercentage,
                paymentMethod: paymentMethod,
                orderId: orderId,
                paymentStatus: 'Pending',
                coupon: coupon,
                adminTotal: totalAmount,
                shipping: deliveryCharge
            });
            const orderData = await order.save();

            if (orderData) {
                userData.cart = [];
                await userData.save();
                res.redirect('/userAccount');
            }
        }
    } catch (error) {
        console.log(error.message);
        res.redirect('/500');
    }
},








// ................................................


cancelProduct: async (req, res) => {
    try {
        const email = req.session.email;
        const orderId = req.query.orderId; // Ensure consistent extraction
        const productId = req.query.productId;

        const userData = await User.findOne({ email: email });
        if (!userData) {
            return res.status(404).send('User not found');
        }

        const orderData = await Order.findById(orderId).populate('products.productId').populate('userId');
        if (!orderData) {
            return res.status(404).send('Order not found');
        }

        if (orderData.userId._id.toString() === userData._id.toString()) {
            // Find the specific product in the order
            const productInOrder = orderData.products.find(item => item.productId._id.toString() === productId);
            if (!productInOrder) {
                return res.status(404).send('Product not found in order');
            }

            // Update product stock
            const productData = await Product.findById(productId);
            if (productData) {
                productData.quantity += productInOrder.quantity;
                await productData.save();
            }

            // Update user's wallet if payment was successful
            if (orderData.paymentStatus === 'Success') {
                userData.wallet += parseFloat(productInOrder.salePrice) * productInOrder.quantity;
                orderData.adminTotal -=  parseFloat(productInOrder.salePrice) * productInOrder.quantity;
                await userData.save();
            }

              // Handle deduction if payment method is "Cash On Delivery"
              if (orderData.paymentMethod === "Cash On Delivery") {
                orderData.totalAmount -= parseFloat(productInOrder.salePrice) * productInOrder.quantity;
                orderData.adminTotal -=  parseFloat(productInOrder.salePrice) * productInOrder.quantity;
            }

            // Update the product's status in the order to "Cancelled"
            productInOrder.status = 'Cancelled';
            await orderData.save();

            res.redirect('/orderDetails?id=' + orderId);
        } else {
            res.status(403).send('Unauthorized action');
        }
    } catch (error) {
        console.log(error.message);
        res.redirect('/500');
    }
},



    

returnProduct: async (req, res) => {
    try {
        console.log('Received Order ID:', req.body.orderId);
        console.log('Received Product ID:', req.body.productId);
        console.log('Received message:', req.body.returnReason);

        const email = req.session.email;
        const orderId = req.body.orderId;
        const productId = req.body.productId; // Ensure this is correctly taken from req.body
        const returnReason = req.body.returnReason;

        const userData = await User.findOne({ email: email });
      
        const orderData = await Order.findById(orderId).populate('products.productId').populate('userId');
      

        // Find the specific product in the order
        const productInOrder = orderData.products.find(item => item.productId._id.toString() === productId);
      
        if (!productInOrder) {
            return res.status(404).send('Product not found in order');
        }

        // Update the product's quantity in inventory
        const productData = await Product.findById(productId);
        if (productData && productInOrder.status === 'Returned') {
            productData.quantity += productInOrder.quantity;
            await productData.save();
        }

          // Optionally update the status of the product in the order to "Returned"
          productInOrder.status = 'Return requested';
          productInOrder.returnReason = returnReason; // Store the return reason
          await orderData.save();

        // Update the user's wallet if payment was successful
        if (orderData.paymentStatus === 'Success' && productInOrder.status === 'Returned') {
            userData.wallet += parseFloat(productInOrder.salePrice) * productInOrder.quantity;
            orderData.adminTotal -=  parseFloat(productInOrder.salePrice) * productInOrder.quantity;
            await userData.save();
        }

      

        res.redirect('/orderDetails?id=' + orderId);
    } catch (error) {
        console.log(error.message);
        res.redirect('/500');
    }
},


rePayment: async (req, res) => {
    const { orderId, paymentId, paymentStatus } = req.body;
    
    // Find the order by ID and update the payment status
    Order.updateOne({ _id: orderId }, { paymentStatus: paymentStatus, paymentId: paymentId }, (err, result) => {
        if (err) {
            return res.status(500).json({ success: false, message: 'Error updating payment status' });
        }
        res.json({ success: true });
    });
},


initiatePayment : async (req, res) => {
    const user = req.session.userName;
    const orderId = req.query.orderId;
    const orderData = await Order.findById({ _id: orderId }).populate('products.productId').populate('userId');

    const email = req.session.email;
    const brands = await Brand.find({ is_active: true });
    const userData = await User.findOne({ email: email }).populate('cart.productId');
    const coupon = await Coupon.find({ is_active: true, "redeemedUsers.userId": { $ne: userData._id } });
    const categories = await Category.find({ is_active: true });

    // Fetch user addresses
    const addresses = await Address.find({ userId: userData._id });

    if (orderData.products.length > 0) {
        let originalTotal = 0;
        let discountTotal = 0;
        let totalDiscountPercentage = 0;
        let isCodDisabled = false;
        let deliveryCharge = 0;

        orderData.products.forEach(item => {
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

        return res.render('payment', {
            user: userData,
            categories,
            brands,
            coupon,
            originalTotal: originalTotal.toFixed(2),
            discountTotal: discountTotal.toFixed(2),
            totalDiscountPercentage: totalDiscountPercentage.toFixed(2),
            isCodDisabled,
            deliveryCharge: deliveryCharge.toFixed(0),
            finalAmount: finalAmount.toFixed(2),
            orderId: orderId,
            totalAmount: finalAmount.toFixed(2),
            orderData,
            addresses // Pass the addresses to the template
        });
    }
},



   
walletRePayment: async (req, res) => {
    try {
        console.log("i reached here in wallet re payment")
        const email = req.session.email;
        const userData = await User.findOne({ email: email }).populate('cart.productId');
        const orderId = req.query.orderId;
        const orderData = await Order.findById({ _id: orderId }).populate('products.productId').populate('userId');

        const totalAmount = orderData.totalAmount;
        await Order.findByIdAndUpdate(
            { _id: orderId },
            { $set: { paymentStatus: "Success", paymentMethod: "Wallet" }}
        );

        // Update user's wallet
        userData.wallet -= totalAmount;
        await userData.save();

        res.redirect('/userAccount');
    } catch (error) {
        console.log(error.message);
        res.redirect('/500');
    }
},




onlineRePayment: async (req, res) => {
    try {
      
        let totalAmount = parseFloat(req.query.totalAmount);
        const couponCode = req.session.couponCode;
        const couponData = await Coupon.findOne({ couponCode: couponCode });
        const userData = await User.findOne({ email: req.session.email }).populate('cart.productId');
        let flag = 0;

        

        let coupon = null;
        if (couponData) {
            totalAmount -= couponData.discount;
            totalAmount = parseFloat(totalAmount.toFixed(2));
            coupon = couponData.discount;
        }

        // Calculate the delivery charge based on the total amount
        let deliveryCharge = 0;
        if (totalAmount < 1000) {
            deliveryCharge = 100;
        } else if (totalAmount >= 1000 && totalAmount <= 5000) {
            deliveryCharge = 50;
        }

        totalAmount += deliveryCharge;
        totalAmount = parseFloat(totalAmount.toFixed(2));

        var options = {
            amount: totalAmount * 100, // Amount in paisa
            currency: "INR",
            receipt: "order_rcptid_11"
        };

        if (flag == 0) {
            instance.orders.create(options, async function (err, razorOrder) {
                if (err) {
                    console.log(err.message);
                    res.status(500).json({ error: "Failed to create order" });
                } else {
                    res.status(200).json({
                        message: "Order placed successfully.",
                        razorOrder: razorOrder,
                        paymentStatus: "Successfull"
                    });
                }
            });
        } 
    } catch (error) {
        console.error(error);
        res.redirect('/500');
    }
},







rePaymentSuccess: async (req, res) => {
    try {
        console.log("repayment success: "+req.query)
        const email = req.session.email;
        const userData = await User.findOne({ email: email }).populate('cart.productId');
        const addressIndex = req.query.addressIndex;
        let totalAmount = parseFloat(req.query.totalAmount);
        const couponCode = req.query.couponCode;
        const paymentMethod = 'Razorpay';

        const orderId = req.query.orderId;
        const orderData = await Order.findById({ _id: orderId }).populate('products.productId').populate('userId')
        console.log(orderData)

    

        await Order.findByIdAndUpdate(
            { _id: orderId },
            { $set: { paymentStatus:"Success" } }
        );   
         res.redirect('/userAccount');

        
    } catch (error) {
        console.log(error.message);
        res.redirect('/500');
    }
},


placeReorder: async (req, res) => {
    try {
        console.log("hi i reached placeReOrder")
        const orderId = req.query.orderId;
        const orderData = await Order.findById({ _id: orderId }).populate('products.productId').populate('userId')
        const email = req.session.email;
        const userData = await User.findOne({ email: email }).populate('cart.productId');
        

                await Order.findByIdAndUpdate(
                    { _id: orderId },
                    { $set: { paymentMethod:"Cash On Delivery"} }
                );

                res.redirect('/userAccount');
         
    } catch (error) {
        console.log(error.message);
        res.redirect('/500');
    }
},

}
