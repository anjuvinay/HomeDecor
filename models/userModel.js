const mongoose=require('mongoose')
const userSchema=mongoose.Schema({
    
    name:{
        type:String,
        required:true
    },
    email:{
        type:String,
        unique:true,
        required:true
    },
    mobile:{
        type:Number,
        required:false
    },
    password:{
        type:String,
        required:false
    },
    is_admin:{
        type:Boolean,
        default:false
    },
    is_active:{
        type:Boolean,
        default:true
    },
    otp:{
        type:Number,
        default:null
    },
 
    cart:[
        {
            productId:{
                type:mongoose.Schema.Types.ObjectId,
                ref:'Product'
            },
            quantity:{
                type:Number,
                default:1
            }
        }
    ],
    wallet:{
        type:Number,
        default:0
    },
    referralCode:{
        type:String
    }
})




module.exports=mongoose.model('User',userSchema) 