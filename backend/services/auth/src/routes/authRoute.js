const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const getMemory = require('../controllers/authController')
const addMemory =require('../controllers/authController')

// Define the route and attach the controller
router.post('/google-verify', authController.verifyGoogleAuth);

router.get('/memory/:userId',authController.getMemory);
router.post('/memory/:userId', authController.addMemory);

module.exports = router;