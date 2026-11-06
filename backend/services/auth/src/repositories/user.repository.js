const User = require("../models/User.model");

const findByEmail = async (email) => {
    return await User.findOne({ email }).select('+password');
};


const findById = async (id) => {
    return await User.findById(id).select('-password');
};

const findByIdWithPassword = async (id) => {
    return await User.findById(id).select('+password');
};

const updatePassword = async (id, hashedPassword) => {
    return await User.findByIdAndUpdate(id, { password: hashedPassword }, { new: true });
};

const createUser = async ({ name, email, password }) => {
    const user = await User.create({
        name: name,
        email: email,
        password: password
    })
    return {
        id: user._id,
        email: user.email,
        name: user.name
    }
}


module.exports = {
    findByEmail,
    createUser,
    findById,
    findByIdWithPassword,
    updatePassword
}   
