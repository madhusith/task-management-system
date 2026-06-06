const { Sequelize } = require('sequelize');

// Create connection to PostgreSQL using .env values
const sequelize = new Sequelize(
  process.env.DB_NAME,     // taskmanagement
  process.env.DB_USER,     // postgres
  process.env.DB_PASSWORD, // empty for now
  {
    host: process.env.DB_HOST,
    dialect: 'postgres',
    logging: false, // hides SQL logs in terminal
  }
);

// Test the connection
const connectDB = async () => {
  try {
    await sequelize.authenticate();
    console.log('Database connected successfully!');
    
    // Auto-create tables from models
    await sequelize.sync({ alter: true });
    console.log('All models synced!');
  } catch (error) {
    console.error('Database connection failed:', error);
    process.exit(1); // stop server if DB fails
  }
};

module.exports = { sequelize, connectDB };