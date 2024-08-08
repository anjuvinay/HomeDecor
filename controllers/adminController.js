
const User = require('../models/userModel')
const Category = require('../models/categoryModel')
const Brand = require('../models/brandModel')
const Product = require('../models/productModel')
const Order = require('../models/orderModel')
const bcrypt=require('bcrypt')
const session = require('express-session')
const path = require('path')
const sharp = require('sharp')
const fs = require('fs')
const PDFDocument = require('pdfkit');
const ExcelJS = require('exceljs');
const pdf = require('html-pdf-node');
const moment = require('moment');
const htmlToPdf = require('html-pdf-node');
const ejs = require('ejs');




const adminCredentials = {
    name: 'Admin',
    email: 'admin@gmail.com',
    password: "$2b$10$9CkMSdzD/pN6ezv/G0j7SukaR/H2fg6shoJfhr0HyeHqsB6qCxQIa", // This is a bcrypt hash of '123'
    
};





module.exports = {

loadLogin : async (req, res) => {
    try {
        console.log("The admin name IS: "+req.session.adminName)
    if(req.session.adminName){
        res.redirect('/admin/home')
    }
      else{
        const message = req.query.message || '';
        res.render('admin_login', { message: message})
    } 
}
catch (error) {
    console.log(error.message)
    res.redirect('/500')
}
},



verifyLogin: async (req, res) => {
    try {
        const { email, password } = req.body;

        // Check if the email matches the hardcoded admin email
        if (email === adminCredentials.email) {
            // Compare the provided password with the hashed admin password
            const passwordMatch = await bcrypt.compare(password, adminCredentials.password);

            if (passwordMatch) {
                // Set the session for the admin
                
                req.session.adminName = adminCredentials.name;
                res.redirect('/admin/home');
            } else {
                res.render('admin_login', { message: 'Invalid password' });
            }
        } else {
            res.render('admin_login', { message: 'Admin not found' });
        }
    } catch (error) {
        console.error('Error during admin login:', error.message);
        res.status(500).render('500', { message: 'Internal Server Error' });
    }
},



// verifyLogin : async (req, res) => {
//     try {
//         const { email } = req.body
//         const { password } = req.body
//         const userData = await User.findOne({ email: email })
       
//         if (userData) {
//             if (userData.is_admin === true) {
//                 const passwordMatch=await bcrypt.compare(password,userData.password)

//                 if (passwordMatch) {
//                     req.session.adminId = userData._id
//                     req.session.adminName=userData.name
//                     res.redirect('/admin/home')

//                 } else {
//                     res.render('admin_login', { message: 'Invalid password' })
                    
//                 }
//             } else {
//                 res.render('admin_login', { message: 'Admin not found' })
//             }
//         } else {
//             res.render('admin_login', { message: 'Admin not found' })
//         }

//     } catch (error) {
//         console.log(error.message)
//         res.redirect('/500')
//     }
// },


Logout : async (req, res) => {
    try {
        req.session.destroy()
        res.redirect('/admin')
    } catch (error) {
        console.log(error.message)
        res.redirect('/500')
    }
},





loadDashboard : async (req, res) => {
    try {
        let admin = req.session.adminName;
        const user = await User.find({});
        const order = await Order.find({}).sort({ orderDate: -1 }).populate('userId');
        const product = await Product.find({});
        let totalTransaction = 0;
        const orderData = await Order.aggregate([
            {
                $unwind: '$products' // Unwind the products array
            },
            {
                $group: {
                    _id: { month: { $month: '$orderDate' } },
                    totalOrders: { $sum: 1 },
                    totalProducts: { $sum: '$products.quantity' },
                }
            },
            {
                $sort: {
                    '_id.month': 1 // Sort by month
                }
            }
        ]);

        const userData = await User.aggregate([
            {
                $group: {
                    _id: { $month: '$date' },
                    totalRegister: { $sum: 1 },
                }
            },
            {
                $sort: {
                    '_id': 1 // Sort by month
                }
            }
        ]);

        const orderStats = await Order.aggregate([
            {
                $unwind: '$products'
            },
            {
                $lookup: {
                    from: 'products',
                    localField: 'products.productId',
                    foreignField: '_id',
                    as: 'productInfo'
                }
            },
            {
                $unwind: '$productInfo'
            },
            {
                $lookup: {
                    from: 'categories',
                    localField: 'productInfo.categoryId',
                    foreignField: '_id',
                    as: 'categoryInfo'
                }
            },
            {
                $group: {
                    _id: '$categoryInfo._id',
                    categoryName: { $first: '$categoryInfo.categoryName' },
                    orderCount: { $sum: 1 }
                }
            }
        ]);

        const categoryStats = await Order.aggregate([
            {
                $unwind: '$products'
            },
            {
                $lookup: {
                    from: 'products',
                    localField: 'products.productId',
                    foreignField: '_id',
                    as: 'productInfo'
                }
            },
            {
                $unwind: '$productInfo'
            },
            {
                $lookup: {
                    from: 'categories',
                    localField: 'productInfo.categoryId',
                    foreignField: '_id',
                    as: 'categoryInfo'
                }
            },
            {
                $group: {
                    _id: '$productInfo.categoryId',
                    categoryName: { $first: '$categoryInfo.categoryName' },
                    totalQuantitySold: { $sum: '$products.quantity' }
                }
            },
            {
                $sort: { totalQuantitySold: -1 }
            },
            { $limit: 10 }
        ]);

        const brandStats = await Order.aggregate([
            {
                $unwind: '$products'
            },
            {
                $lookup: {
                    from: 'products',
                    localField: 'products.productId',
                    foreignField: '_id',
                    as: 'productInfo'
                }
            },
            {
                $unwind: '$productInfo'
            },
            {
                $lookup: {
                    from: 'brands',
                    localField: 'productInfo.brandId',
                    foreignField: '_id',
                    as: 'brandInfo'
                }
            },
            {
                $group: {
                    _id: '$productInfo.brandId',
                    brandName: { $first: '$brandInfo.brandName' },
                    totalQuantitySold: { $sum: '$products.quantity' }
                }
            },
            {
                $sort: { totalQuantitySold: -1 }
            },
            { $limit: 10 }
        ]);

        const categoryNames = JSON.stringify(orderStats.map(stat => stat.categoryName).flat());
        const orderCounts = JSON.stringify(orderStats.map(stat => stat.orderCount));

        const monthlyData = Array.from({ length: 12 }, (_, index) => {
            const monthOrderData = orderData.find(item => item._id.month === index + 1) || { totalOrders: 0, totalProducts: 0 };
            const monthUserData = userData.find(item => item._id === index + 1) || { totalRegister: 0 };
            return {
                totalOrders: monthOrderData.totalOrders,
                totalProducts: monthOrderData.totalProducts,
                totalRegister: monthUserData.totalRegister
            };
        });

        const totalOrdersJson = JSON.stringify(monthlyData.map(item => item.totalOrders));
        const totalProductsJson = JSON.stringify(monthlyData.map(item => item.totalProducts));
        const totalRegisterJson = JSON.stringify(monthlyData.map(item => item.totalRegister));

        order.forEach((item) => {
            if (item.totalAmount !== undefined && item.totalAmount !== null) {
                totalTransaction += parseFloat(item.totalAmount);
            }
        });

        // Fetch top 10 best-selling products by popularity
        const topSellingProducts = await Product.find().sort({ popularity: -1 }).limit(10).exec();

        res.render('dashboard', {
            user,
            order,
            product,
            totalTransaction,
            totalRegisterJson,
            totalOrdersJson,
            totalProductsJson,
            categoryNames,
            orderCounts,
            admin,
            topSellingProducts,
            categoryStats,
            brandStats
        });
    } catch (error) {
        console.log(error.message);
        res.redirect('/500');
    }
},





getChartData : async (req, res) => {
    try {
        console.log(req.query);
        const filter = req.query.filter || 'yearly';
        const currentDate = new Date();
        let startDate, endDate;
        let groupStage;

       
        switch (filter) {
            case 'daily':
                startDate = new Date(currentDate.setHours(0, 0, 0, 0));
                endDate = new Date(startDate);
                endDate.setDate(startDate.getDate() + 1);
                groupStage = {
                    $group: {
                        _id: { day: { $dayOfMonth: '$orderDate' }, month: { $month: '$orderDate' }, year: { $year: '$orderDate' } },
                        totalOrders: { $sum: 1 }
                    }
                };
                break;
            case 'monthly':
                startDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
                endDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1);
                groupStage = {
                    $group: {
                        _id: { month: { $month: '$orderDate' }, year: { $year: '$orderDate' } },
                        totalOrders: { $sum: 1 }
                    }
                };
                break;
            case 'weekly':
                startDate = new Date(currentDate.setDate(currentDate.getDate() - currentDate.getDay()));
                startDate.setHours(0, 0, 0, 0);
                endDate = new Date(startDate);
                endDate.setDate(endDate.getDate() + 7);
                groupStage = {
                    $group: {
                        _id: { week: { $week: '$orderDate' }, year: { $year: '$orderDate' } },
                        totalOrders: { $sum: 1 }
                    }
                };
                break;
            default:
                startDate = new Date(currentDate.getFullYear(), 0, 1);
                endDate = new Date(currentDate.getFullYear() + 1, 0, 1);
                groupStage = {
                    $group: {
                        _id: { year: { $year: '$orderDate' } },
                        totalOrders: { $sum: 1 }
                    }
                };
        }

        // Match stage for filtering by date range
        const matchStage = { $match: { orderDate: { $gte: startDate, $lt: endDate } } };

        const orderStats = await Order.aggregate([
            matchStage,
            { $unwind: '$products' },
            {
                $lookup: {
                    from: 'products',
                    localField: 'products.productId',
                    foreignField: '_id',
                    as: 'productInfo'
                }
            },
            { $unwind: '$productInfo' },
            {
                $lookup: {
                    from: 'categories',
                    localField: 'productInfo.categoryId',
                    foreignField: '_id',
                    as: 'categoryInfo'
                }
            },
            { $unwind: '$categoryInfo' }, 
            {
                $group: {
                    _id: '$categoryInfo._id',
                    categoryName: { $first: '$categoryInfo.categoryName' },
                    orderCount: { $sum: 1 }
                }
            },
            { $sort: { orderCount: -1 } }
        ]);

        console.log("orderStats: ", orderStats);

        const categoryNames = orderStats.map(stat => stat.categoryName || "Unknown Category");
        const orderCounts = orderStats.map(stat => stat.orderCount || 0);
        console.log("orderCount is: ", orderCounts);
        console.log("catname is: ", categoryNames);

        res.json({ categoryNames, orderCounts });
    } catch (error) {
        console.error("Error in getChartData:", error.message);
        res.status(500).send({ error: 'Failed to fetch data' });
    }
},





salesReport: async (req, res) => {
    try {
        let admin = req.session.adminName;

        // Building the date range query if dates are provided
        const dateRangeQuery = req.query.startDate && req.query.endDate ? {
            orderDate: {
                $gte: new Date(req.query.startDate),
                $lte: new Date(req.query.endDate)
            }
        } : {};

        // Aggregation pipeline
        const aggregationPipeline = [
            { $match: dateRangeQuery },
            { $unwind: "$products" },
            { $match: { "products.status": "Delivered" } },
            {
                $group: {
                    _id: "$_id",
                    orderId: { $first: "$orderId" },
                    userId: { $first: "$userId" },
                    orderDate: { $first: "$orderDate" },
                    originalTotal: { $sum: { $multiply: ["$products.regularPrice", "$products.quantity"] } },
                    totalAmount: { $sum: { $multiply: ["$products.salePrice", "$products.quantity"] } },
                    discountAmount: {
                        $sum: {
                            $subtract: [
                                { $multiply: ["$products.regularPrice", "$products.quantity"] },
                                { $multiply: ["$products.salePrice", "$products.quantity"] }
                            ]
                        }
                    },
                    coupon: { $first: "$coupon" },
                    paymentMethod: { $first: "$paymentMethod" },
                    orderstatus: { $first: "$products.status" },
                    totalDiscountPercentage: {
                        $avg: {
                            $cond: {
                                if: { $gt: ["$products.regularPrice", 0] },
                                then: {
                                    $multiply: [
                                        { $divide: [{ $subtract: ["$products.regularPrice", "$products.salePrice"] }, "$products.regularPrice"] },
                                        100
                                    ]
                                },
                                else: 0
                            }
                        }
                    }
                }
            },
            { $sort: { orderDate: -1 } }
        ];

        const orderData = await Order.aggregate(aggregationPipeline).exec();
        
        // Populate user data for displaying user names
        const populatedOrderData = await Order.populate(orderData, { path: 'userId', select: 'name' });

        const userData = await Order.distinct('userId', dateRangeQuery);

        // Calculate summary data
        let totalTransaction = 0;
        let totalOrders = 0;
        let totalCustomers = userData.length;
        let onlinePayments = 0;
        let cashOnDelivery = 0;
        let orderCancelled = 0;
        let totalDiscounts = 0;
        let totalCoupons = 0;

        populatedOrderData.forEach((item) => {
            totalTransaction += item.totalAmount || 0;
            totalDiscounts += item.discountAmount || 0;
            totalCoupons += item.coupon || 0;
            totalOrders++;

            if (item.paymentMethod === 'Razorpay') {
                onlinePayments++;
            } else {
                cashOnDelivery++;
            }

            if (item.orderstatus === 'Cancelled') {
                orderCancelled++;
            }
        });

        res.render('salesReport', {
            orders: populatedOrderData,
            totalCustomers,
            totalOrders,
            totalTransaction,
            onlinePayments,
            cashOnDelivery,
            orderCancelled,
            totalDiscounts,
            totalCoupons,
            start: req.query.startDate,
            end: req.query.endDate,
            admin,
            moment // Pass moment to the view
        });
    } catch (error) {
        console.log(error.message);
        res.redirect('/500');
    }
},








dateFilter : async (req, res) => {
    try {
        // console.log(req.query.startDate)
        const startDate = req.body.startDate
        const endDate = req.body.endDate
        res.redirect(`/admin/salesReport?startDate=${startDate}&endDate=${endDate}`)
    } catch (error) {
        console.log(error.message)
        res.redirect('/500')
    }
},




downloadPdfReport: async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        console.log('startDate:', startDate, 'endDate:', endDate); // Debug log

        const query = startDate && endDate ? {
            orderDate: {
                $gte: moment(startDate, 'YYYY-MM-DD').toDate(),
                $lte: moment(endDate, 'YYYY-MM-DD').toDate()
            }
        } : {};

        const orderData = await Order.find(query).populate('userId').sort({ orderDate: -1 });
        console.log('orderData:', orderData); // Debug log

        const orders = orderData.map(order => ({
            orderId: order.orderId,
            userId: order.userId ? order.userId.name : 'N/A',
            originalTotal: order.originalTotal ? order.originalTotal.toFixed(2) : 'N/A',
            totalAmount: order.totalAmount ? order.totalAmount.toFixed(2) : 'N/A',
            discountAmount: order.discountTotal ? order.discountTotal.toFixed(2) : 'N/A',
            totalDiscountPercentage: order.totalDiscountPercentage ? order.totalDiscountPercentage.toFixed(2) + '%' : 'N/A',
            coupon: order.coupon ? '₹' + order.coupon.toFixed(2) : 'N/A',
            orderstatus: order.orderstatus,
            orderDate: moment(order.orderDate).format('YYYY-MM-DD')
        }));

        const totalOrders = orders.length;
        const totalCustomers = await Order.distinct('userId', query).length;
        const totalTransaction = orders.reduce((acc, order) => acc + (parseFloat(order.totalAmount) || 0), 0);
        const onlinePayments = orders.filter(order => order.paymentMethod === 'Razorpay').length;
        const cashOnDelivery = orders.filter(order => order.paymentMethod !== 'Razorpay').length;
        const orderCancelled = orders.filter(order => order.orderstatus === 'Cancelled').length;
        const totalDiscounts = orders.reduce((acc, order) => acc + (parseFloat(order.discountAmount) || 0), 0);
        const totalCoupons = orders.reduce((acc, order) => acc + (parseFloat(order.coupon) || 0), 0);
        const templatePath = path.join(__dirname, '../../../views/admin/salesReportTemplate.ejs'); // Adjusted path
        console.log('templatePath:', templatePath); // Debug log
        
        
        const html = await ejs.renderFile(templatePath, {
            orders,
            totalOrders,
            totalCustomers,
            totalTransaction,
            onlinePayments,
            cashOnDelivery,
            orderCancelled,
            totalDiscounts,
            totalCoupons,
            moment // Pass moment to the view
        });

        const file = { content: html };
        const options = { format: 'A4' };

        htmlToPdf.generatePdf(file, options).then(pdfBuffer => {
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', 'attachment; filename=Sales_Report.pdf');
            res.send(pdfBuffer);
        }).catch(error => {
            console.error('PDF Generation Error:', error.message); // Debug log
            res.redirect('/500');
        });
    } catch (error) {
        console.error('Error in downloadPdfReport:', error.message); // Debug log
        res.redirect('/500');
    }
},




downloadExcelReport: async (req, res) => {
    try {
        const query = req.query.startDate && req.query.endDate ? {
            orderDate: {
                $gte: new Date(req.query.startDate),
                $lte: new Date(req.query.endDate)
            }
        } : {};

        const orderData = await Order.find(query).populate('userId').sort({ orderDate: -1 });

        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Sales Report');

        worksheet.columns = [
            { header: 'Order ID', key: 'orderId', width: 20 },
            { header: 'Customer Name', key: 'customerName', width: 30 },
            { header: 'Original Price', key: 'originalTotal', width: 20 },
            { header: 'Sale Price', key: 'totalAmount', width: 20 },
            { header: 'Discount Amount', key: 'discountTotal', width: 20 },
            { header: 'Discount %', key: 'totalDiscountPercentage', width: 20 },
            { header: 'Coupon', key: 'coupon', width: 20 },
            { header: 'Status', key: 'orderstatus', width: 20 },
            { header: 'Date', key: 'orderDate', width: 20 },
        ];

        orderData.forEach(order => {
            worksheet.addRow({
                orderId: order.orderId ? 'ORD#' + order.orderId : 'N/A',
                customerName: order.userId.name,
                originalTotal: order.originalTotal.toFixed(2),
                totalAmount: order.totalAmount.toFixed(2),
                discountTotal: order.discountTotal.toFixed(2),
                totalDiscountPercentage: order.totalDiscountPercentage + '%',
                coupon: order.coupon ? '₹' + order.coupon.toFixed(2) : 'N/A',
                orderstatus: order.orderstatus,
                orderDate: order.orderDate,
            });
        });

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename=Sales_Report.xlsx');

        await workbook.xlsx.write(res);
        res.end();
    } catch (error) {
        console.log(error.message);
        res.redirect('/500');
    }
},



}
