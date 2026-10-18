const express = require('express');
const router = express.Router();
const commentController = require('../controllers/commentController');
const { authenticate } = require('../middleware/authMiddleware');

router.use(authenticate);

// Comments
router.post('/tasks/:taskId/comments', commentController.addComment);
router.get('/tasks/:taskId/comments', commentController.getComments);
router.delete('/comments/:id', commentController.deleteComment);

// Project Activities
router.get('/projects/:projectId/activities', commentController.getActivities);

module.exports = router;
