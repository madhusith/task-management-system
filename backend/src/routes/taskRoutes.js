const express = require('express');
const router = express.Router();
const {
  getAllTasks,
  createTask,
  updateTask,
  deleteTask,
  addComment
} = require('../controllers/taskController');
const { protect, restrictTo } = require('../middleware/auth');

// All routes require login
router.use(protect);

// GET /api/tasks - all roles can view
router.get('/', getAllTasks);

// POST /api/tasks - only admin and project_manager
router.post('/', restrictTo('admin', 'project_manager'), createTask);

// PUT /api/tasks/:id - all roles (collaborator restricted inside controller)
router.put('/:id', updateTask);

// DELETE /api/tasks/:id - only admin and project_manager
router.delete('/:id', restrictTo('admin', 'project_manager'), deleteTask);

// POST /api/tasks/:id/comments - all roles can comment
router.post('/:id/comments', addComment);

module.exports = router;