



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