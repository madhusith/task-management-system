const express = require('express');
const router = express.Router();
const { login, resetPassword } = require('../controllers/authController');
const { protect } = require('../middleware/auth');
const { body } = require('express-validator');

// Validation rules for login
const loginValidation = [
  body('email')
    .isEmail()
    .withMessage('Please provide a valid email'),
  body('password')
    .notEmpty()
    .withMessage('Password is required')
];

// POST /api/auth/login
router.post('/login', loginValidation, login);

// POST /api/auth/reset-password (protected - must be logged in)
router.post('/reset-password', protect, resetPassword);

module.exports = router;