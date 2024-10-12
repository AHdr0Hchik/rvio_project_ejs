const express = require('express');
const pageController = require('../controllers/pageController')
//const authMiddleware = require('../middlewares/auth-middleware');

const router = express.Router();

//main pages
router.get('/', pageController.index);

router.post('/scan', pageController.scan);

router.post('/claim_card', pageController.claim_card);

router.post('/get_events', pageController.get_events);

router.post('/get_reward', pageController.get_reward);

router.post('/to_participate', pageController.to_participate);


module.exports = router;
