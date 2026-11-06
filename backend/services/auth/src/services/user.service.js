const bcrypt = require('bcrypt')
const { generateaccestoken, generateRefreshtoken } = require('../utils/token')
const userRepository = require('../repositories/user.repository')
const { verifyRefreshToken } = require('../utils/token');

const Salt_Round = 10;


const signUp = async ({ name, email, password }) => {
    const user = await userRepository.findByEmail(email)
    if (user) {
        throw new Error("User already exists")
    }
    const hashpassword = await bcrypt.hash(password, Salt_Round)
    const createduser = await userRepository.createUser({ name, email, password: hashpassword })
    const token = await generateaccestoken({ userId: createduser.id })
    const refreshtoken = await generateRefreshtoken({ userID: createduser.id })
    const safeUser = {
        id: createduser.id,
        email: createduser.email,
        name: createduser.name
    }
    return { user: safeUser, token, refreshtoken }
}

const login = async ({ email, password }) => {
    const user = await userRepository.findByEmail(email);
    if (!user) {
        throw new Error("User not found")
    }
    console.log("user", user)
    const isPasswordValid = await bcrypt.compare(password, user.password)
    if (!isPasswordValid) {
        throw new Error("Invalid password")
    }
    const payload = {
        userId: user._id,
        userName: user.name,
        userEmail: user.email
    }
    const token = await generateaccestoken(payload)
    const refreshtoken = await generateRefreshtoken(payload)
    const safeUser = {
        id: user.id,
        email: user.email,
        name: user.name
    }
    return { user: safeUser, token, refreshtoken }

}

const changePassword = async ({ email, password }) => {

    let user;
    if (email) {
        user = await userRepository.findByEmail(email);
    } else {
        throw new Error("User identifier (userId or email) is required");
    }

    if (!user) {
        throw new Error("User not found");
    }

    // const isPasswordValid = await bcrypt.compare(prevPassword, user.password);
    // if (!isPasswordValid) {
    //     throw new Error("Invalid current password");
    // }

    const hashedNewPassword = await bcrypt.hash(password, Salt_Round);
    await userRepository.updatePassword(user._id, hashedNewPassword);

    const payload = {
        userId: user._id,
        userName: user.name,
        userEmail: user.email
    };
    const token = await generateaccestoken(payload);
    const refreshtoken = await generateRefreshtoken(payload);

    const safeUser = {
        id: user._id,
        email: user.email,
        name: user.name
    };

    return {
        message: "Password changed successfully",
        user: safeUser,
        token,
        refreshtoken
    };
};



const getProfile = async (userId) => {
    const user = await userRepository.findById(userId);

    if (!user) {
        throw new Error("User not found");
    }

    return user;
}


const logout = async (userId) => {
    // Note: If you are storing Refresh Tokens in your database (e.g., to prevent token theft),
    // this is where you would call your repository to delete or invalidate that user's token.
    // Example: await userRepository.deleteRefreshToken(userId);

    // For purely stateless JWTs, logout is handled client-side (deleting the token from local storage/cookies),
    // so we can just return true to acknowledge the request was processed.
    return true;
};


const refreshToken = async (incomingRefreshToken) => {
    // 1. Verify the refresh token (this should throw an error if expired or invalid)
    // Make sure you have this function in your '../utils/token' file!
    const decoded = await verifyRefreshToken(incomingRefreshToken);

    // 2. Fetch the user to ensure they still exist in the database
    // Your previous login payload used 'userId', so we extract it from decoded
    const user = await userRepository.findById(decoded.userId);

    if (!user) {
        throw new Error("User not found or has been deleted");
    }

    // 3. Create a new payload
    const payload = {
        userId: user._id,

    };

    // 4. Generate a new Access Token
    const newAccessToken = await generateaccestoken(payload);

    // Optional: Implement "Refresh Token Rotation" by generating a new refresh token as well
    // const newRefreshToken = await generateRefreshtoken(payload);

    return {
        token: newAccessToken,
        // refreshtoken: newRefreshToken // Uncomment if you are doing token rotation
    };
};




module.exports = {
    signUp,
    login,
    changePassword,
    getProfile,
    logout,
    refreshToken
};

