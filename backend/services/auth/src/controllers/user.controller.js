const userService=require('../services/user.service')
const redisClient = require('../../../../shared/redisClient');


const signUp=async(req,res)=>{

    try {
        const {name,email,password}= req.body;

        if(!name || !email || !password) {
            return res.status(400).json({
                success:false,
                message:"All fields are required",
                error:"Validation Error"
            })
        }
        console.log(req.body)
        const createdUser=await userService.signUp({name,email,password});
        res.status(201).json({
            success:true,
            message:"User created successfully",
            data:createdUser
        })

    } catch (error) {
        res.status(500).json({
            success:false,
            message:"User creation failed",
            error:error.message
        })
    }

}

const login=async(req,res)=>{
    try {
        const {email,password}=req.body;
        if(!email || !password) {
            return res.status(400).json({
                success:false,
                message:"All fields are required",
                error:"Validation Error"
            })
        }
        const loggedInUser=await userService.login({email,password});
        res.status(200).json({
            success:true,
            message:"User logged in successfully",
            data:loggedInUser
        })
    } catch (error) {
        res.status(500).json({
            success:false,
            message:"User login failed",
            error:error.message
        })
    }
}

const getProfile = async (req, res) => {
  try {
    // We use req.user.userId because your login payload was { userId: user._id }
    const userId = req.user.userId; 
    
    // Call the service layer
    const user = await userService.getProfile(userId);

    // Send the user profile back to the client
    res.status(200).json(user);
    
  } catch (error) {
    console.error(error);
    
    // Handle the specific error thrown from the service
    if (error.message === "User not found") {
        return res.status(404).json({ error: error.message });
    }
    
    res.status(500).json({ error: 'Server error' });
  }
};



// const logout = async (req, res) => {
//     try {
//         const userId = req.user.userId;
        
//         // Call the service layer (useful if you need to delete refresh tokens from a DB)
//         await userService.logout(userId);

//         // Optional: If you are sending tokens via HTTP-only cookies in your login route, 
//         // you must clear them here. Uncomment if applicable:
//         // res.clearCookie('accessToken');
//         // res.clearCookie('refreshToken');

//         res.status(200).json({
//             success: true,
//             message: "User logged out successfully"
//         });
//     } catch (error) {
//         res.status(500).json({
//             success: false,
//             message: "User logout failed",
//             error: error.message
//         });
//     }
// };



const logout = async (req, res) => {
    try {
        // 1. Extract token from header
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(400).json({ success: false, message: "No token provided" });
        }
        
        const token = authHeader.split(' ')[1];
        const userId = req.user.userId;
        
        // 2. Execute existing DB logic
        await userService.logout(userId);

        // 3. Blacklist token in Redis for 7 days (604800 seconds)
        await redisClient.setEx(`blacklist_${token}`, 604800, "revoked");

        res.status(200).json({
            success: true,
            message: "User logged out successfully"
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "User logout failed",
            error: error.message
        });
    }
};


const refreshToken = async (req, res) => {
    try {
        // Assuming the client sends the refresh token in the request body
        const { refreshToken } = req.body; 

        if (!refreshToken) {
            return res.status(400).json({
                success: false,
                message: "Refresh token is required"
            });
        }

        // Call the service layer to get a new access token
        const newTokens = await userService.refreshToken(refreshToken);

        res.status(200).json({
            success: true,
            message: "Token refreshed successfully",
            data: newTokens
        });

    } catch (error) {
        res.status(401).json({
            success: false,
            message: "Invalid or expired refresh token",
            error: error.message
        });
    }
};







const changePassword = async (req, res) => {
    try {
        const { password, email } = req.body;

        if (!password || !email) {
            return res.status(400).json({
                success: false,
                message: "Both current password and new password are required",
                error: "Validation Error"
            });
        }

        const result = await userService.changePassword({
            email,
            password
        });

        res.status(200).json({
            success: true,
            message: "Password changed successfully",
            data: result
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message || "Failed to change password",
            error: error.message
        });
    }
};

module.exports = {
    signUp,
    login,
    changePassword,
    getProfile,
    logout,
    refreshToken
};
