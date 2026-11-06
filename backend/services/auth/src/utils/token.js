 
const jwt =require( 'jsonwebtoken');


const generateaccestoken=(payload)=>{
 const Token=jwt.sign(payload,process.env.JWT_ACCESS_SECRET,{ expiresIn: '1h'})
 return Token;
}

const generateRefreshtoken=(payload)=>{
    const Token=jwt.sign(payload,process.env.JWT_REFRESH_SECRET,{ expiresIn: '7d'})
    return Token;   
}


const verifyRefreshToken = (token) => {
    return new Promise((resolve, reject) => {
        // Use your actual refresh token secret from your environment variables
        jwt.verify(token, process.env.JWT_REFRESH_SECRET, (err, payload) => {
            if (err) return reject(err);
            resolve(payload);
        });
    });
};


module.exports={generateaccestoken,generateRefreshtoken,verifyRefreshToken}    