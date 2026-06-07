const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const bcrypt = require('bcryptjs');

const User = sequelize.define('User', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    validate: {
      isEmail: true
    }
  },
  password: {
    type: DataTypes.STRING,
    allowNull: false
  },
  role: {
    type: DataTypes.ENUM('admin', 'project_manager', 'collaborator'),
    defaultValue: 'collaborator'
  },
  isFirstLogin: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  }
});

// Hash password before saving to database
User.beforeCreate(async (user) => {
  user.password = await bcrypt.hash(user.password, 10);
});

User.beforeUpdate(async (user) => {
  if (user.changed('password')) {
    user.password = await bcrypt.hash(user.password, 10);
  }
});

// Method to check password on login
User.prototype.validatePassword = async function(password) {
  return await bcrypt.compare(password, this.password);
};

module.exports = User;