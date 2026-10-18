const express = require('express');
const router = express.Router();
const taskController = require('../controllers/taskController');
const { authenticate } = require('../middleware/authMiddleware');

router.use(authenticate);

// Tasks
router.post('/projects/:projectId/tasks', taskController.createTask);
router.get('/tasks/:id', taskController.getTask);
router.patch('/tasks/:id', taskController.updateTask);
router.delete('/tasks/:id', taskController.deleteTask);

// Lists / Columns
router.post('/projects/:projectId/lists', taskController.createList);
router.patch('/lists/:id', taskController.updateList);
router.delete('/lists/:id', taskController.deleteList);

module.exports = router;
