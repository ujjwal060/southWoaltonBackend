const mongoose =require('mongoose')
const ContactusSchema= new mongoose.Schema({
    name:{
        type:String,
        required:false
    },
    email:{
        type:String,
        requiered:false
    },
    startDate:{
        type:Date,
        required:false

    },
    enddate:{
        type:Date,
        required:false
    },
    comments:{
        type:String,
        required:false
    }

});
module.exports =mongoose.model('Contactus',ContactusSchema)