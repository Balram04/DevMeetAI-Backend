require('dotenv').config();
const express = require('express');
const http = require('http');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const connectDb = require('./config/db');
const HandleSocket = require('./src/routes/Socket');

const app = express();

// Middleware
if (process.env.NODE_ENV === 'production') {
  app.set('trust proxy', 1);
}

app.use(
  cors({
    origin: process.env.CORS_ORIGIN
      ? process.env.CORS_ORIGIN.split(',')
      : ['http://localhost:5173', 'http://localhost:5174'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Cookie'],
    exposedHeaders: ['Set-Cookie'],
    optionsSuccessStatus: 200,
  })
);

app.use(express.json());
app.use(cookieParser());

// Health & Root Routes
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    message: 'DevMeet Backend is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
  });
});

app.get('/', (req, res) => {
  res.status(200).json({
    message: 'DevMeet API Server',
    version: '1.0.0',
    status: 'Running',
  });
});

// Routes
const authRouter = require('./src/routes/auth');
const proRouter = require('./src/routes/profile');
const reqRouter = require('./src/routes/request');
const feedRouter = require('./src/routes/feed');
const userRouter = require('./src/routes/user');
const matchRouter = require('./src/routes/match');
const alumniRouter = require('./src/routes/alumni');
const chatbotRouter = require('./src/routes/chatbot');

app.use('/', authRouter);
app.use('/', proRouter);
app.use('/', reqRouter);
app.use('/', feedRouter);
app.use('/', userRouter);
app.use('/', matchRouter);
app.use('/', alumniRouter);
app.use('/', chatbotRouter);

// WebSocket
const server = http.createServer(app);
HandleSocket(server);

// Server Startup
const startServer = async () => {
  try {
    await connectDb();
    const PORT = process.env.PORT || 3000;
  
    server.listen(PORT, () => {
      // Server started successfully
    });
  } catch (err) {
    process.exit(1);
  }
};

startServer();