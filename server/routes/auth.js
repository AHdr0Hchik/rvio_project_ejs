const express = require('express');
const authController = require('../controllers/authController');
//const {body} = require('express-validator');
//const authMiddleware = require('../middlewares/auth-middleware');

const router = express.Router();

router.get('/login', authController.login);

router.post('/login', authController.login_post);

router.post('/register', authController.register);

//router.get('/activate/:link', authController.activate);

router.post('/logout', authController.logout);

router.post('/refresh', authController.refresh);




module.exports = router;