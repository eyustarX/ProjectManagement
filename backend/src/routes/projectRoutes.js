const express = require('express');
const router = express.Router();
const projectController = require('../controllers/projectController');
const { authenticate } = require('../middleware/authMiddleware');

// All project routes require authentication
router.use(authenticate);

// Project CRUD
router.post('/', projectController.createProject);
router.get('/', projectController.getUserProjects);
router.get('/:id', projectController.getProject);
router.put('/:id', projectController.updateProject);
router.delete('/:id', projectController.deleteProject);

// Member Management
router.post('/:id/members', projectController.addMember);
router.delete('/:id/members/:memberId', projectController.removeMember);
router.patch('/:id/members/:memberId/role', projectController.updateMemberRole);

module.exports = router;
