import React, { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { useAuth } from '../context/AuthContext';
import { getTasks, updateTask, createTask, deleteTask, getUsers } from '../services/api';
import toast from 'react-hot-toast';

const COLUMNS = {
  todo: { title: 'To Do', color: 'bg-gray-100' },
  in_progress: { title: 'In Progress', color: 'bg-blue-50' },
  completed: { title: 'Done', color: 'bg-green-50' }
};

const Dashboard = () => {
  const { user, logout } = useAuth();
  const socketRef = useRef(null);
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [tasks, setTasks] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    priority: 'medium',
    dueDate: '',
    assignedTo: ''
  });

  useEffect(() => {
    fetchTasks();
    fetchUsers();
    socketRef.current = io('http://localhost:5001');
    socketRef.current.emit('join', user.id);
    socketRef.current.on('notification', (data) => {
      setNotifications(prev => [data, ...prev]);
      toast(data.message, { icon: '🔔' });
    });
    return () => {
      socketRef.current.disconnect();
    };
  }, [user.id]);

  const fetchTasks = async () => {
    try {
      const response = await getTasks();
      setTasks(response.data.tasks);
    } catch (error) {
      toast.error('Failed to fetch tasks');
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const response = await getUsers();
      setUsers(response.data.users);
    } catch (error) {
      console.log('Could not fetch users');
    }
  };

  const getTasksByStatus = (status) => tasks.filter(t => t.status === status);

  const onDragEnd = async (result) => {
    if (!result.destination) return;
    const { draggableId, destination } = result;
    const newStatus = destination.droppableId;
    try {
      await updateTask(draggableId, { status: newStatus });
      setTasks(tasks.map(t => t.id === draggableId ? { ...t, status: newStatus } : t));
      toast.success('Task updated!');
    } catch (error) {
      toast.error('Failed to update task');
    }
  };

  const handleCreateTask = async (e) => {
    e.preventDefault();
    try {
      const taskData = { ...newTask };
      if (!taskData.assignedTo) delete taskData.assignedTo;
      if (!taskData.dueDate) delete taskData.dueDate;
      const response = await createTask(taskData);
      setTasks([...tasks, response.data.task]);
      setNewTask({ title: '', description: '', priority: 'medium', dueDate: '', assignedTo: '' });
      setShowForm(false);
      toast.success('Task created!');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to create task');
    }
  };

  const handleDeleteTask = async (id) => {
    try {
      await deleteTask(id);
      setTasks(tasks.filter(t => t.id !== id));
      toast.success('Task deleted!');
    } catch (error) {
      toast.error('Failed to delete task');
    }
  };

  const priorityColor = (priority) => {
    if (priority === 'high') return 'bg-red-100 text-red-700';
    if (priority === 'medium') return 'bg-yellow-100 text-yellow-700';
    return 'bg-green-100 text-green-700';
  };

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen">
      Loading...
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">

      {/* Navbar */}
      <nav className="bg-white shadow px-6 py-4 flex justify-between items-center">
        <h1 className="text-xl font-bold text-gray-800">Task Manager</h1>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-600">
            {user?.name}
            <span className="ml-2 bg-blue-100 text-blue-700 px-2 py-1 rounded text-xs font-medium">
              {user?.role}
            </span>
          </span>

          {(user?.role === 'admin' || user?.role === 'project_manager') && (
            <button
              onClick={() => setShowForm(true)}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700"
            >
              + New Task
            </button>
          )}

          {/* Notification Bell */}
          <div className="relative">
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="relative text-gray-500 hover:text-blue-500 text-xl"
            >
              🔔
              {notifications.length > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
                  {notifications.length}
                </span>
              )}
            </button>
            {showNotifications && (
              <div className="absolute right-0 mt-2 w-72 bg-white rounded-lg shadow-lg border z-50">
                <div className="p-3 border-b flex justify-between items-center">
                  <span className="font-medium text-sm">Notifications</span>
                  <button
                    onClick={() => setNotifications([])}
                    className="text-xs text-gray-400"
                  >
                    Clear all
                  </button>
                </div>
                {notifications.length === 0 ? (
                  <p className="p-4 text-sm text-gray-400 text-center">No notifications</p>
                ) : (
                  notifications.map((n, i) => (
                    <div key={i} className="p-3 border-b hover:bg-gray-50">
                      <p className="text-sm text-gray-700">{n.message}</p>
                      <p className="text-xs text-gray-400 mt-1">{n.type}</p>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          <button
            onClick={logout}
            className="text-gray-500 hover:text-red-500 text-sm"
          >
            Logout
          </button>
        </div>
      </nav>

      {/* Kanban Board */}
      <div className="p-6">
        <DragDropContext onDragEnd={onDragEnd}>
          <div className="grid grid-cols-3 gap-6">
            {Object.entries(COLUMNS).map(([status, col]) => (
              <div key={status} className={`${col.color} rounded-lg p-4`}>
                <h2 className="font-semibold text-gray-700 mb-4 flex justify-between">
                  {col.title}
                  <span className="bg-white text-gray-500 px-2 py-1 rounded text-xs">
                    {getTasksByStatus(status).length}
                  </span>
                </h2>
                <Droppable droppableId={status}>
                  {(provided) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className="min-h-32 space-y-3"
                    >
                      {getTasksByStatus(status).map((task, index) => (
                        <Draggable key={task.id} draggableId={task.id} index={index}>
                          {(provided) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              className="bg-white rounded-lg p-4 shadow-sm border border-gray-100"
                            >
                              <div className="flex justify-between items-start mb-2">
                                <h3 className="font-medium text-gray-800 text-sm">{task.title}</h3>
                                {(user?.role === 'admin' || user?.role === 'project_manager') && (
                                  <button
                                    onClick={() => handleDeleteTask(task.id)}
                                    className="text-red-400 hover:text-red-600 text-xs ml-2"
                                  >
                                    ✕
                                  </button>
                                )}
                              </div>
                              {task.description && (
                                <p className="text-gray-500 text-xs mb-2">{task.description}</p>
                              )}
                              <div className="flex justify-between items-center">
                                <span className={`text-xs px-2 py-1 rounded ${priorityColor(task.priority)}`}>
                                  {task.priority}
                                </span>
                                {task.dueDate && (
                                  <span className="text-xs text-gray-400">
                                    {new Date(task.dueDate).toLocaleDateString()}
                                  </span>
                                )}
                              </div>
                              {task.assignedUser && (
                                <p className="text-xs text-gray-400 mt-2">
                                  👤 {task.assignedUser.name}
                                </p>
                              )}
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </div>
            ))}
          </div>
        </DragDropContext>
      </div>

      {/* Create Task Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-lg font-bold mb-4">Create New Task</h2>
            <form onSubmit={handleCreateTask}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
                <input
                  type="text"
                  value={newTask.title}
                  onChange={(e) => setNewTask({...newTask, title: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={newTask.description}
                  onChange={(e) => setNewTask({...newTask, description: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows="3"
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                <select
                  value={newTask.priority}
                  onChange={(e) => setNewTask({...newTask, priority: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Due Date</label>
                <input
                  type="date"
                  value={newTask.dueDate}
                  onChange={(e) => setNewTask({...newTask, dueDate: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-1">Assign To</label>
                <select
                  value={newTask.assignedTo}
                  onChange={(e) => setNewTask({...newTask, assignedTo: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Unassigned</option>
                  {users.map(u => (
                    <option key={u.id} value={u.id}>{u.name} ({u.role})</option>
                  ))}
                </select>
              </div>
              <div className="flex gap-3">
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 text-white py-2 rounded-lg text-sm hover:bg-blue-700"
                >
                  Create Task
                </button>
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="flex-1 bg-gray-100 text-gray-700 py-2 rounded-lg text-sm hover:bg-gray-200"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;