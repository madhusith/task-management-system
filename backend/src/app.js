// Load environment variables first - must be at the top
require('dotenv').config();

const { connectDB } = require('./config/database');
const User = require('./models/User');
const authRoutes = require('./routes/authRoutes');
const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');

// Initialize express app
const app = express();

// Create HTTP server (needed for Socket.io to work alongside Express)
const server = http.createServer(app);

// Initialize Socket.io with CORS settings
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    methods: ['GET','POST']
  }
});

// ─── Middleware ───────────────────────────────────────────────
// Parse incoming JSON requests
app.use(express.json());

// Allow frontend (different port) to talk to backend
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));

// ─── Basic test route ─────────────────────────────────────────
app.get('/', (req, res) => {
  res.json({ message: 'Task Management System API is running!' });
});

app.use('/api/auth', authRoutes);

// ─── WebSocket connection ─────────────────────────────────────
io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

// ─── Start server ─────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

connectDB();

module.exports = { app, io };