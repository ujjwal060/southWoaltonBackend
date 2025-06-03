const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const userTokenSchema = mongoose.Schema(
    {
        userId: {
            type: Schema.Types.ObjectId,
            required: true,
            ref:"User"
        },
        token: {
            type: String,
            required: false
        },
        createdAt:{
            type: Date,
            default: Date.now,
            expires: 300
        }
    }
);

module.exports = mongoose.model('UserToken', userTokenSchema); 