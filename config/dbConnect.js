


const { default:mongoose }=require("mongoose")

const dbConnect= ()=>{
    try{
        const conn=mongoose.connect("mongodb://localhost:27017/decorDB")
        //const conn=mongoose.connect("mongodb+srv://mongodb:mongodb@cluster0.o1red.mongodb.net/decorDB")
        console.log("Database connected successfully")
    }
    catch(error){
        console.log("failed to connect")
    }
    
}


module.exports=dbConnect




