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

router.post('/get_cards', pageController.get_cards)

router.post('/to_participate', pageController.to_participate);

router.post('/create_test', pageController.create_test);

router.post('/get_test', pageController.get_test);

router.post('/get_tests', pageController.get_tests);

router.post('/submit_test', pageController.submit_test);

router.post('/get_user_result', pageController.get_user_result);

router.put('/edit_test/:id', pageController.edit_test);

router.delete('/delete_test/:id', pageController.delete_test);

router.post('/start_test', pageController.start_test);

router.post('/get_user', pageController.get_user);



module.exports = router;
