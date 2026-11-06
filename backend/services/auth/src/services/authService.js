const admin = require('firebase-admin');
// Note: Ensure admin is initialized in your main server file or a separate config file
const { getAuth } = require('firebase-admin/auth');
// const verifyGoogleToken = async (idToken) => {
//     // Verify the token validity and signature with Google
//     const decodedToken = await admin.auth().verifyIdToken(idToken);

//     // Extract the authenticated user's details
//     const { uid, email, name, picture } = decodedToken;

//     // TODO: Implement Mongoose logic here to check if the user exists in your MongoDB Atlas database.
//     // If they do not exist, create a new user document.

//     // Return the user data to the controller
//     return { uid, email, name, picture };
// };

const User = require('../models/user.model'); 

const verifyGoogleToken = async (idToken) => {
// 2. Use getAuth() instead of admin.auth()
    const decodedToken = await getAuth().verifyIdToken(idToken);    const { uid, email, name, picture } = decodedToken;

    // 1. Check if user already exists by EMAIL
    let user = await User.findOne({ email: email });

    if (user) {
        // 2a. User exists! Did they sign up manually before? 
        // If so, link their Firebase UID to their existing account so they don't get locked out.
        if (!user.firebaseUid) {
            user.firebaseUid = uid;
            user.authProvider = 'google'; // Or keep as 'local' if you prefer
            await user.save();
        }
        console.log("Existing user logged in via Google");
    } else {
        // 2b. User completely new. Create a new document without a password.
        user = new User({
            firebaseUid: uid,
            email: email,
            name: name,
            picture: picture,
            authProvider: 'google'
        });
        await user.save();
        console.log("New Google user created in MongoDB");
    }

    return user;
};

module.exports = {
    verifyGoogleToken
};