const mongoose = require('mongoose');

const orderSchema = mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    products: [{
        productId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Product',
            required: true
        },
        regularPrice: {
            type: Number,
            required: true
        },
        salePrice: {
            type: Number,
            required: true
        },
        quantity: {
            type: Number,
            required: true
        },
        status: {
            type: String,
            enum: ['Order Placed', 'Shipped', 'Delivered', 'Cancelled', 'Returned','Return requested'],
            default: 'Order Placed'
          },
        returnReason: {
            type: String,
            default:""
          }
    }],
    shippingAddress: {
        fname:{
            type:String
        },
        lname:{
            type:String
        },
        country:{
            type:String
        },
        housename:{
            type:String,               
        },
        city:{
            type:String
        },
        state:{
            type:String
        },
        pincode:{
            type:Number
        },
        phone:{
            type:Number
        },
        email:{
            type:String
        }
    },
    orderDate: {
        type: Date,
        default: Date.now,
        get: (timestamp) => {
            return new Date(timestamp).toLocaleDateString('en-US');
        },
    },
    totalAmount: {
        type: Number,
        required: true
    },
    originalTotal: {
        type: Number,
        required: true
    },
    discountTotal: {
        type: Number,
        required: true
    },
    totalDiscountPercentage: {
        type: Number,
        required: true
    },
    orderstatus: {
        type: String,
        enum: ['Order Placed', 'Shipped', 'Delivered', 'Cancelled', 'Returned','Return requested'],
        default: 'Order Placed'
    },
    paymentStatus: {
        type: String,
        enum: ['Pending', 'Success', 'Failed'],
        default: 'Pending'
    },
    paymentMethod: {
        type: String,
        required: true
    },
    orderId: {
        type: String
    },
    coupon: {
        type: Number,
        default: null
    },
    adminTotal:{
        type: Number 
    },
    shipping:{
        type: Number ,
        default: 0
    }
});

module.exports = mongoose.model('Order', orderSchema);
