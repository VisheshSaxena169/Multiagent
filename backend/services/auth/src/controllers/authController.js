const authService = require('../services/authService');
const jwt = require('jsonwebtoken');

// const verifyGoogleAuth = async (req, res) => {
//     const { idToken } = req.body;

//     if (!idToken) {
//         return res.status(400).json({ success: false, message: "Token is missing" });
//     }

//     try {
//         // Pass the token to the service layer
//         const user = await authService.verifyGoogleToken(idToken);

//         res.status(200).json({ 
//             success: true, 
//             message: "Authentication successful", 
//             user: user 
//         });
//     } catch (error) {
//         console.error("Firebase Admin Error Details:", error);
//         res.status(401).json({ success: false, message: "Invalid or expired token" });
//     }
// };
const verifyGoogleAuth = async (req, res) => {
    const { idToken } = req.body;

    if (!idToken) {
        return res.status(400).json({ success: false, message: "Token is missing" });
    }

    try {
        // 1. Verify with Firebase and get/create MongoDB user
        const user = await authService.verifyGoogleToken(idToken);

        // 2. Generate your custom JWT for your microservices
        // We use the MongoDB _id as the primary identifier
        const customToken = jwt.sign(
            { 
                userId: user._id, 
                email: user.email,
                role: user.role || 'user' 
            },
            process.env.JWT_ACCESS_SECRET || 'fallback_secret_key', // Use .env in production
            { expiresIn: '7d' } // Token expires in 7 days
        );

        // 3. Return the custom token to the React frontend
        res.status(200).json({ 
            success: true, 
            message: "Authentication successful", 
            token: customToken,
            user: { 
                id: user._id, 
                name: user.name, 
                email: user.email, 
                picture: user.picture 
            } 
        });
    } catch (error) {
        console.error("Firebase Admin Error Details:", error);
        res.status(401).json({ success: false, message: "Invalid or expired token" });
    }
};


module.exports = {
    verifyGoogleAuth
};