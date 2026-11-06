const userController = require('../controllers/user.controller');
const express = require('express')
const verifytoken = require('../middlewares/verifytoken');




const router = express.Router();

router.post('/signup', userController.signUp);
router.post('/login', userController.login);
router.get('/profile', verifytoken, userController.getProfile);


router.post('/logout', verifytoken, userController.logout);

router.post('/refresh-token', userController.refreshToken);
router.post('/change-password', userController.changePassword);

module.exports = router;
