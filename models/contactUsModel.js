const mongoose =require('mongoose')
const ContactusSchema= new mongoose.Schema({
    name:{
        type:String,
        required:false
    },
    email:{
        type:String,
        requiered:false,
        validate: {
        validator: function (v) {
          return /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/.test(v);
        },
        message: (props) => `${props.value} is not a valid email!`,
      },
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