
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
    },
    aiMemory: {
    type: [String], // Array of strings is easiest to manage
    default: []
  }
}, { timestamps: true });

module.exports = mongoose.models.User || mongoose.model('User', userSchema);