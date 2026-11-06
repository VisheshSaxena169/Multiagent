const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

// Define the route and attach the controller
router.post('/google-verify', authController.verifyGoogleAuth);

module.exports = router;