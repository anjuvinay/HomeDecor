


// const { default:mongoose }=require("mongoose")

// const dbConnect= ()=>{
//     try{
//         const conn=mongoose.connect("mongodb+srv://mongodb:mongodb@cluster0.o1red.mongodb.net/")
//         console.log("Database connected successfully")
//     }
//     catch(error){
//         console.log("failed to connect")
//     }
    
// }


// module.exports=dbConnect



const mongoose = require("mongoose");

const dbConnect = async () => {
    try {
        await mongoose.connect("mongodb+srv://mongodb:mongodb@cluster0.o1red.mongodb.net/your-database-name", {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });
        console.log("Database connected successfully");
    } catch (error) {
        console.error("Failed to connect to the database:", error);
    }
};

module.exports = dbConnect;
