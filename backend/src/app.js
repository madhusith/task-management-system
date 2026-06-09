require('dotenv').config();

const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');

const { connectDB } = require('./config/database');
const User = require('./models/User');
const Task = require('./models/Task');
const Comment = require('./models/Comment');

// Define relationships
User.hasMany(Task, { foreignKey: 'assignedTo', as: 'assignedTasks' });
User.hasMany(Task, { foreignKey: 'createdBy', as: 'createdTasks' });
Task.belongsTo(User, { foreignKey: 'assignedTo', as: 'assignedUser' });
Task.belongsTo(User, { foreignKey: 'createdBy', as: 'creator' });
Task.hasMany(Comment, { foreignKey: 'taskId', as: 'comments' });
Comment.belongsTo(Task, { foreignKey: 'taskId' });
Comment.belongsTo(User, { foreignKey: 'userId', as: 'author' });

const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const taskRoutes = require('./routes/taskRoutes');
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./config/swagger');

// Initialize express app
const app = express();
const server = http.createServer(app);

// Initialize Socket.io
let io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    methods: ['GET', 'POST']
  }
});

// Middleware
app.use(express.json());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));

// Basic test route
app.get('/', (req, res) => {
  res.json({ message: 'Task Management System API is running!' });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// WebSocket connection
io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);

  // Join personal room using user ID
  socket.on('join', (userId) => {
    socket.join(userId);
    console.log(`User ${userId} joined their room`);
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

// Start server
const PORT = process.env.PORT || 5001;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

connectDB();

const { setIO } = require('./socket');
setIO(io);
module.exports = { app };