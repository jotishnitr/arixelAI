const mongoose = require('mongoose')

const UserSchema = mongoose.Schema({
    userId: { type: String, required: true },
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: false },
    age: { type: Number },
    country: { type: String },
    mobile: { type: String },
    timestamp: { type: Date, default: Date.now },
})

module.exports = mongoose.model('User', UserSchema)