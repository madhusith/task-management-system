const Task = require('../models/Task');
const User = require('../models/User');
const Comment = require('../models/Comment');
const { Op } = require('sequelize');
const { getIO } = require('../socket');

// GET /api/tasks
const getAllTasks = async (req, res) => {
  try {
    const { status, priority, assignedTo } = req.query;
    const where = {};

    if (status) where.status = status;
    if (priority) where.priority = priority;
    if (assignedTo) where.assignedTo = assignedTo;

    if (req.user.role === 'collaborator') {
      where.assignedTo = req.user.id;
    }

    const tasks = await Task.findAll({
      where,
      include: [
        { model: User, as: 'assignedUser', attributes: ['id', 'name', 'email'] },
        { model: User, as: 'creator', attributes: ['id', 'name', 'email'] },
        { model: Comment, as: 'comments', include: [
          { model: User, as: 'author', attributes: ['id', 'name'] }
        ]}
      ],
      order: [['createdAt', 'DESC']]
    });

    res.json({ message: 'Tasks retrieved successfully', tasks });
  } catch (error) {
    console.error('Get tasks error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Something went wrong'
    });
  }
};

// POST /api/tasks
const createTask = async (req, res) => {
  try {
    const { title, description, assignedTo, dueDate, priority } = req.body;

    if (!title) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Title is required'
      });
    }

    if (assignedTo) {
      const assignedUser = await User.findByPk(assignedTo);
      if (!assignedUser) {
        return res.status(400).json({
          error: 'Bad Request',
          message: 'Assigned user does not exist'
        });
      }
    }

    if (dueDate && new Date(dueDate) < new Date()) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Due date cannot be in the past'
      });
    }

    const task = await Task.create({
      title,
      description,
      assignedTo,
      dueDate,
      priority: priority || 'medium',
      createdBy: req.user.id
    });

    // Notify assigned user in real-time
    if (assignedTo) {
      getIO().to(assignedTo).emit('notification', {
        type: 'TASK_ASSIGNED',
        message: `You have been assigned a new task: ${title}`,
        taskId: task.id
      });
    }

    res.status(201).json({
      message: 'Task created successfully',
      task
    });
  } catch (error) {
    console.error('Create task error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Something went wrong'
    });
  }
};

// PUT /api/tasks/:id
const updateTask = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, status, priority, dueDate, assignedTo } = req.body;

    const task = await Task.findByPk(id);
    if (!task) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Task not found'
      });
    }

    const oldStatus = task.status;

    if (req.user.role === 'collaborator') {
      if (task.assignedTo !== req.user.id) {
        return res.status(403).json({
          error: 'Forbidden',
          message: 'You can only update your assigned tasks'
        });
      }
      await task.update({ status });
    } else {
      await task.update({ title, description, status, priority, dueDate, assignedTo });
    }

    // Notify creator when status changes
    if (status && status !== oldStatus) {
      getIO().to(task.createdBy).emit('notification', {
        type: 'STATUS_CHANGED',
        message: `Task "${task.title}" status changed to ${status}`,
        taskId: task.id
      });
    }

    res.json({ message: 'Task updated successfully', task });
  } catch (error) {
    console.error('Update task error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Something went wrong'
    });
  }
};

// DELETE /api/tasks/:id
const deleteTask = async (req, res) => {
  try {
    const { id } = req.params;

    const task = await Task.findByPk(id);
    if (!task) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Task not found'
      });
    }

    await task.destroy();
    res.json({ message: 'Task deleted successfully' });
  } catch (error) {
    console.error('Delete task error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Something went wrong'
    });
  }
};

// POST /api/tasks/:id/comments
const addComment = async (req, res) => {
  try {
    const { id } = req.params;
    const { content } = req.body;

    if (!content) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Comment content is required'
      });
    }

    const task = await Task.findByPk(id);
    if (!task) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Task not found'
      });
    }

    const comment = await Comment.create({
      content,
      taskId: id,
      userId: req.user.id
    });

    // Notify assigned user about new comment
    if (task.assignedTo) {
      getIO().to(task.assignedTo).emit('notification', {
        type: 'NEW_COMMENT',
        message: `New comment on task: ${task.title}`,
        taskId: task.id
      });
    }

    res.status(201).json({
      message: 'Comment added successfully',
      comment
    });
  } catch (error) {
    console.error('Add comment error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Something went wrong'
    });
  }
};

module.exports = { getAllTasks, createTask, updateTask, deleteTask, addComment };