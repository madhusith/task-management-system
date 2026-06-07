const express = require('express');
const router = express.Router();
const { getAllUsers, createUser, updateUser, deactivateUser } = require('../controllers/userController');
const { protect, restrictTo } = require('../middleware/auth');
const { body } = require('express-validator');

// Validation rules for creating a user
const createUserValidation = [
  body('name')
    .notEmpty()
    .withMessage('Name is required'),
  body('email')
    .isEmail()
    .withMessage('Please provide a valid email'),
  body('role')
    .isIn(['admin', 'project_manager', 'collaborator'])
    .withMessage('Invalid role')
];

// All routes below require login + admin role
router.use(protect);
router.use(restrictTo('admin'));

// GET /api/users
router.get('/', getAllUsers);

// POST /api/users
router.post('/', createUserValidation, createUser);

// PUT /api/users/:id
router.put('/:id', updateUser);

// PUT /api/users/:id/deactivate
router.put('/:id/deactivate', deactivateUser);

module.exports = router;