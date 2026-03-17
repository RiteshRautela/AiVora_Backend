const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema({
    role:{
        type:String,
        enum:["ai" , "user"],
        required:true,
    },

    content:{
        type:String,
        required:true
    }

},{timestamps:true})

const websiteSchema = new mongoose.Schema({
    user:{
        type: mongoose.Schema.Types.ObjectId,
        ref:"User",
        required:true
    },

    title:{
        type:String,
        default:"Untitled website"
    },

    latexcode:{
        type:String,
        reuired:true
    },

    conversations:[
        messageSchema
    ],

    deployed:{
        type:Boolean,
        default:false,
    },

    deployurl:{
        type:String,
        
    },

    slug:{
    type:String,
    unique:true,
    }




} ,{timestamps:true})


module.exports = mongoose.model("Website" , websiteSchema);