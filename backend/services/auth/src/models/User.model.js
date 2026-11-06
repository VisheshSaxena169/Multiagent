// const mongoose = require("mongoose");

// const userSchema = new mongoose.Schema(
//     {
//         name: {
//             type: String,
//             required: true,
//             trim: true,
//         },

//         email: {
//             type: String,
//             required: true,
//             unique: true,
//             lowercase: true,
//             trim: true,
//         },

//         password: {
//             type: String,
//             required: true,
//             minlength: 6,
//             select: false
//         },
//     },
//     {
//         timestamps: true,
//     }
// );

// const User = mongoose.model("User", userSchema);

// module.exports = User;

// src/models/user.model.js
const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    name: { 
        type: String, 
        required: true 
    },
    email: { 
        type: String, 
        required: true, 
        unique: true 
    },
    // Make password OPTIONAL by removing `required: true`
    password: { 
        type: String 
    },
    // Add Firebase UID for Google users
    firebaseUid: { 
        type: String, 
        unique: true, 
        sparse: true // Allows multiple null values for traditional users
    },
    // Optional but highly recommended: Track the account type
    authProvider: { 
        type: String, 
        enum: ['local', 'google'], 
        default: 'local' 
    },
    picture: { 
        type: String 
    }
}, { timestamps: true });

module.exports = mongoose.models.User || mongoose.model('User', userSchema);