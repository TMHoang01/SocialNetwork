const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const UserSchema = new Schema({
    name: {
        type: String,
    },
    phoneNumber: {
        type: String,
        required: true
    },
    passwordResetToken: String,
    passwordResetTokenExpiry: Date,
    password: {
        type: String,
        required: true,
    },
    register_date: {
        type: Date,
        default: Date.now
    },
    verify_code: {
        type: Number
    }
})

module.exports = User = mongoose.model('user', UserSchema);
