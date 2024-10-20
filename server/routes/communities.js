const express = require('express');
const communitiesController = require('../controllers/communitiesController');
//const authMiddleware = require('../middlewares/auth-middleware');

const router = express.Router();

//main pages
router.post('/create_community', communitiesController.create_community);

router.post('/get_communities', communitiesController.get_communities);

router.post('/render_communities', communitiesController.render_communities);

router.post('/:communityId/join', communitiesController.join_community);

router.put('/:communityId/members/:userId/role', communitiesController.update_role);

router.delete('/:communityId/members/:userId', communitiesController.delete_user);

router.post('/get_members', communitiesController.get_members);

router.put('/update_community/:communityId', communitiesController.update_community);

router.delete('/delete_community/:communityId', communitiesController.delete_community)

module.exports = router;
