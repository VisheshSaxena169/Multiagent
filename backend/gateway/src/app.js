// const express = require("express");

// const app = express();

// const { createProxyMiddleware } = require('http-proxy-middleware');
// const cors = require('cors');


// // app.use(cors({
// //     origin: [process.env.FRONTEND_URL, 'http://127.0.0.1:5173'], // Must match your Vite frontend exactly
// //     credentials: true,               // Required when frontend uses withCredentials: true
// //     methods: ['GET', 'POST', 'PUT', 'DELETE','PATCH' ,'OPTIONS']
// // }));


// // 1. THE BULLETPROOF CORS INTERCEPTOR
// // This MUST be placed before the proxies!
// app.use((req, res, next) => {
//     const origin = req.headers.origin;
//     // Accept both localhost and 127.0.0.1
//     if (origin === process.env.FRONTEND_URL || origin === process.env.FRONTEND_URL_LOCAL) {
//         res.header('Access-Control-Allow-Origin', origin);
//     }
//     res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
//     res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
//     res.header('Access-Control-Allow-Credentials', 'true');

//     // If this is a preflight request, answer it instantly and stop here!
//     if (req.method === 'OPTIONS') {
//         return res.status(200).end();
//     }
//     next();
// });

// // 2. FORCE Express to answer all preflight requests instantly

// // Proxy route: Forward all /auth requests to the Auth Service
// app.use('/auth', createProxyMiddleware({ 
//     target: process.env.AUTH_SERVICE_URL, // The exact URL of your Auth Service
//     changeOrigin: true,
//     pathRewrite: {
//         '^/auth': '', // Optional: Strips '/auth' from the URL before forwarding
//     },
// }));

// app.use('/ai', createProxyMiddleware({ 
//     target: process.env.AI_SERVICE_URL, 
//     changeOrigin: true,
//     pathRewrite: { '^/ai': '' },
// }));

// // Test route
// app.get("/", (req, res) => {
//     res.send(" gateway Server is running successfully!");
// });

// module.exports = app;







require("dotenv").config(); // CRITICAL: Load environment variables first
const express = require("express");
const cors = require('cors');
const { createProxyMiddleware } = require('http-proxy-middleware');

const app = express();

// 1. STANDARD CORS PACKAGE
// This automatically answers 'OPTIONS' preflight requests and injects the correct headers.
app.use(cors({
    // Explicitly allow both local URL variations along with your production URL
    origin: ['http://localhost:5173', 'http://127.0.0.1:5173', process.env.FRONTEND_URL], 
    credentials: true, 
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// 2. Proxy route for Auth Service
app.use('/auth', createProxyMiddleware({ 
    target: process.env.AUTH_SERVICE_URL || 'http://localhost:3001', 
    changeOrigin: true,
    pathRewrite: {
        '^/auth': '', 
    },
}));

// 3. Proxy route for AI Service
app.use('/ai', createProxyMiddleware({ 
    target: process.env.AI_SERVICE_URL || 'http://localhost:3002', 
    changeOrigin: true,
    pathRewrite: { '^/ai': '' },
}));

// Test route
app.get("/", (req, res) => {
    res.send("Gateway Server is running successfully!");
});

module.exports = app;