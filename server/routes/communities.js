const express = require('express');
const path = require('path');

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

router.delete('/delete_community/:communityId', communitiesController.delete_community);

router.post('/get_create_event_form', communitiesController.get_create_event_form);

const multer = require('multer');
// Configure storage
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, '../public/img/events');
    },
    filename: (req, file, cb) => {
      // Extract the original extension
      const ext = path.extname(file.originalname);
      // Construct the new filename
      const name = `${file.fieldname}-${Date.now()}${ext}`;
      cb(null, name);
    }
  });
  
  // Initialize multer with the storage configuration
  const upload = multer({ storage });

router.post('/create_event', upload.single('event_img'), communitiesController.create_event);

module.exports = router;
