const express = require("express");
const connectDB = require("./config/db");
const userRoutes= require("./routes/user.route")

const authRoutes = require('./routes/authRoute');


// const cors = require('cors');

// Require the JSON file you downloaded in Step 1

const app = express();

// 2. Add this BEFORE any routes or other middleware
// app.use(cors({
//     origin: 'http://localhost:5173', // Your Vite frontend
//     methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
//     allowedHeaders: ['Content-Type', 'Authorization'],
//     credentials: true
// }));

// 1. Allow multiple local origins
// const corsOptions = {
//     origin: ['http://localhost:5173', 'http://127.0.0.1:5173'],
//     methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
//     allowedHeaders: ['Content-Type', 'Authorization'],
//     credentials: true
// };

// app.use(cors(corsOptions));

// 2. FORCE Express to answer all preflight requests instantly

app.use(express.json());





connectDB()
// Test route

app.use('/', authRoutes);

app.use('/api/user', userRoutes);

app.get("/", (req, res) => {
    res.send("Auth Server is running successfully!");
});

module.exports = app;