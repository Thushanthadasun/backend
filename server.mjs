import express from "express";
import cors from "cors";
import { fileURLToPath } from 'url';
import path from "path";
import dotenv from "dotenv";
import adminRouter from "./src/admin/routes.mjs";
import userRouter from "./src/user/routes.mjs";
import cookieParser from "cookie-parser";
import paymentsRouter from "./src/payments/routes.mjs";

// Load environment variables first
dotenv.config();

// Get __dirname equivalent for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000; // Vercel uses PORT 3000 by default
const HOST = process.env.HOST || '0.0.0.0';

// Request logging middleware for debugging
app.use((req, res, next) => {
    const timestamp = new Date().toISOString();
    console.log(`${timestamp} - ${req.method} ${req.url}`);
    console.log(`From IP: ${req.ip || req.connection.remoteAddress}`);
    console.log(`User-Agent: ${req.get('User-Agent') || 'Not provided'}`);
    console.log('---');
    next();
});

// Enhanced CORS configuration for production and development
app.use(
  cors({
    origin: function (origin, callback) {
      // Allow requests with no origin (mobile apps, Postman, etc.)
      if (!origin) return callback(null, true);
      
      const allowedOrigins = [
        // Production Vercel domain
        "https://backend-u11q.vercel.app",
        
        // Localhost variations for development
        /^http:\/\/localhost:\d+$/,
        /^http:\/\/127\.0\.0\.1:\d+$/,
        /^https:\/\/localhost:\d+$/,
        /^https:\/\/127\.0\.0\.1:\d+$/,
        
        // Specific development ports
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:8080",
        "http://127.0.0.1:8080",
        
        // Your network IP variations (for local development)
        "http://10.116.44.203:3000",
        "http://10.116.44.203:5000",
        "http://10.116.44.203:5173",
        "http://10.116.44.203:8080",
        
        // Allow any device on your local network
        /^http:\/\/10\.116\.44\.\d+:\d+$/,
        /^https:\/\/10\.116\.44\.\d+:\d+$/,
        
        // Allow other common local network ranges
        /^http:\/\/192\.168\.\d+\.\d+:\d+$/,
        /^https:\/\/192\.168\.\d+\.\d+:\d+$/,
        /^http:\/\/172\.16\.\d+\.\d+:\d+$/,
        /^https:\/\/172\.16\.\d+\.\d+:\d+$/,
        
        // Add your frontend domain if you have one
        // "https://yourfrontend.vercel.app",
      ];
      
      const isAllowed = allowedOrigins.some((allowedOrigin) => {
        if (typeof allowedOrigin === "string") {
          return allowedOrigin === origin;
        } else {
          return allowedOrigin.test(origin);
        }
      });
      
      if (isAllowed) {
        callback(null, true);
      } else {
        console.log(`CORS blocked origin: ${origin}`);
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: [
      'Content-Type', 
      'Authorization', 
      'X-Requested-With',
      'Accept',
      'Origin',
      'Access-Control-Request-Method',
      'Access-Control-Request-Headers'
    ],
  })
);

// Additional middleware for mobile app compatibility
app.use((req, res, next) => {
    // Set additional CORS headers for mobile apps
    res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
    res.header('Access-Control-Allow-Credentials', 'true');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin');
    res.header('Access-Control-Max-Age', '3600');
    
    // Handle preflight OPTIONS requests
    if (req.method === 'OPTIONS') {
        console.log('Handling preflight request');
        return res.status(200).end();
    }
    
    next();
});

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'OK', 
    message: 'Server is running successfully on Vercel',
    timestamp: new Date().toISOString(),
    server: {
      host: 'Vercel Serverless',
      port: PORT,
      environment: process.env.NODE_ENV || 'production'
    },
    deployment: {
      url: 'https://backend-u11q.vercel.app',
      vercel: true
    }
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'Service Center API is running on Vercel',
    endpoints: {
      health: '/health',
      user: '/api/v1/user/',
      admin: '/api/v1/admin/',
      payments: '/api/v1/payments'
    },
    deployment: {
      url: 'https://backend-u11q.vercel.app',
      version: '1.0.0'
    }
  });
});

// API Routes
app.use("/api/v1/user/", userRouter);
app.use("/api/v1/admin/", adminRouter);
app.use("/api/v1/payments", paymentsRouter);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Route not found',
    method: req.method,
    url: req.originalUrl,
    message: 'The requested endpoint does not exist'
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Global error handler:', err);
  
  // CORS error
  if (err.message && err.message.includes('CORS')) {
    return res.status(403).json({
      error: 'CORS Error',
      message: 'Cross-origin request blocked',
      origin: req.headers.origin
    });
  }
  
  // Generic error
  res.status(500).json({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

// For Vercel, we need to export the app
export default app;

// For local development
if (process.env.NODE_ENV !== 'production') {
  const server = app.listen(PORT, HOST, () => {
    console.log(`🚀 Server is running on ${HOST}:${PORT}`);
    console.log(`📱 Server accessible at:`);
    console.log(`   - Local: http://localhost:${PORT}`);
    console.log(`   - Network: http://10.116.44.203:${PORT}`);
    console.log(`   - Health check: http://10.116.44.203:${PORT}/health`);
    console.log(`🔧 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`⏰ Started at: ${new Date().toISOString()}`);
    console.log('---');
  });

  // Graceful shutdown
  process.on('SIGTERM', () => {
    console.log('SIGTERM received, shutting down gracefully');
    server.close(() => {
      process.exit(0);
    });
  });

  process.on('SIGINT', () => {
    console.log('SIGINT received, shutting down gracefully');
    server.close(() => {
      process.exit(0);
    });
  });
}
