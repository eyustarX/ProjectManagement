const express = require('express');
const cors = require('cors');
const { notFoundHandler, errorHandler } = require('./middleware/errorHandler');

const app = express();

// Middleware
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health Check Route
app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'CodeAlpha Collaborative Project Management API is healthy and running',
    timestamp: new Date().toISOString(),
  });
});

// Base API Welcome Route
app.get('/api/v1', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Welcome to CodeAlpha Collaborative Project Management API v1',
    version: '1.0.0',
  });
});

const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');

// Mount Routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/users', userRoutes);
// app.use('/api/v1/projects', projectRoutes);
// app.use('/api/v1/tasks', taskRoutes);
// app.use('/api/v1/comments', commentRoutes);

// Centralized Error Handlers (must be registered last)
app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
