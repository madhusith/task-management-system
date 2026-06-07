const User = require('../models/User');
const bcrypt = require('bcryptjs');
const nodemailer = require('nodemailer');

// Generate random temporary password
const generateTempPassword = () => {
  return Math.random().toString(36).slice(-8) + 'A1!';
};

// Send email with temporary password
const sendWelcomeEmail = async (email, name, tempPassword) => {
  try {
    const transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: process.env.EMAIL_PORT,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });

    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'Welcome to Task Management System',
      html: `
        <h2>Welcome ${name}!</h2>
        <p>Your account has been created.</p>
        <p>Your temporary password is: <strong>${tempPassword}</strong></p>
        <p>Please login and reset your password immediately.</p>
      `
    });
  } catch (error) {
    console.error('Email sending failed:', error);
  }
};

// GET /api/users - Get all users
const getAllUsers = async (req, res) => {
  try {
    const { search, role } = req.query;
    const where = {};

    if (role) where.role = role;
    if (search) {
      const { Op } = require('sequelize');
      where[Op.or] = [
        { name: { [Op.iLike]: `%${search}%` } },
        { email: { [Op.iLike]: `%${search}%` } }
      ];
    }

    const users = await User.findAll({
      where,
      attributes: { exclude: ['password'] }
    });

    res.json({ message: 'Users retrieved successfully', users });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Something went wrong'
    });
  }
};

// POST /api/users - Create new user (Admin only)
const createUser = async (req, res) => {
  try {
    const { name, email, role } = req.body;

    // Check if email already exists
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Email already exists'
      });
    }

    // Generate temporary password
    const tempPassword = generateTempPassword();

    // Create user
    const user = await User.create({
      name,
      email,
      password: tempPassword,
      role: role || 'collaborator'
    });

    // Send welcome email
    await sendWelcomeEmail(email, name, tempPassword);

    res.status(201).json({
      message: 'User created successfully',
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Something went wrong'
    });
  }
};

// PUT /api/users/:id - Update user (Admin only)
const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, role } = req.body;

    const user = await User.findByPk(id);
    if (!user) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'User not found'
      });
    }

    await user.update({ name, role });

    res.json({
      message: 'User updated successfully',
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Something went wrong'
    });
  }
};

// PUT /api/users/:id/deactivate - Deactivate user (Admin only)
const deactivateUser = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findByPk(id);
    if (!user) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'User not found'
      });
    }

    // Prevent admin from deactivating themselves
    if (user.id === req.user.id) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'You cannot deactivate yourself'
      });
    }

    await user.update({ isActive: false });

    res.json({ message: 'User deactivated successfully' });
  } catch (error) {
    console.error('Deactivate user error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Something went wrong'
    });
  }
};

module.exports = { getAllUsers, createUser, updateUser, deactivateUser };