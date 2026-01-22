require('dotenv').config();

const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const verifyToken = require('./middleware/auth');
const app = express();

const corsOptions = {
  origin: process.env.FRONTEND_URL || "http://localhost:3000",
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
};

app.use(cors(corsOptions));
app.use(express.json({ limit: '10mb' }));

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api/', limiter);

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: 'Too many authentication attempts, please try again later.',
  skipSuccessfulRequests: true,
});

app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);

if (process.env.NODE_ENV === 'development') {
  app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
  });
}

const authRoutes = require("./routes/authRoutes");
const productRoutes = require("./routes/productRoutes");
const paymentRoutes = require("./routes/paymentRoutes");
const orderRoutes = require("./routes/orderRoutes");
const ratingRoutes = require("./routes/ratingRoutes");
const invoiceRoutes = require("./routes/invoiceRoutes");
const wishlistRoutes = require("./routes/wishlistRoutes");
const discountRoutes = require('./routes/discountRoutes');
const revenueRoutes = require('./routes/revenueRoutes');
const refundRoutes = require('./routes/refundRoutes');
const notificationRoutes = require('./routes/notificationRoutes');

if (process.env.NODE_ENV === 'development') {
  app.get('/api/debug/routes', (req, res) => {
  const routes = [];
  
  app._router.stack.forEach((middleware) => {
    if (middleware.route) {
      routes.push({
        path: middleware.route.path,
        methods: Object.keys(middleware.route.methods).join(', ')
      });
    } else if (middleware.name === 'router') {
      middleware.handle.stack.forEach((handler) => {
        if (handler.route) {
          const path = handler.route.path;
          const baseUrl = middleware.regexp.toString()
            .replace('\\^', '')
            .replace('\\/?(?=\\/|$)', '')
            .replace(/\\\//g, '/');
          
          const routePath = baseUrl.replace(/\(\?:\(\[\^\\\/]\+\?\)\)/g, ':id');
          
          routes.push({
            path: routePath + path,
            methods: Object.keys(handler.route.methods).join(', ')
          });
        }
      });
    }
  });
  
  console.log('All registered routes:');
  routes.forEach(route => {
    console.log(`${route.methods.toUpperCase()} ${route.path}`);
  });
  
  res.json({
    routeCount: routes.length,
    routes: routes
  });
  });
}

if (process.env.NODE_ENV === 'development') {
  app.get('/api/test-auth', verifyToken, (req, res) => {
    res.json({ 
    success: true, 
    message: 'Token is valid', 
    user: req.user 
  });
  });
}

app.use("/api/auth", authRoutes);
app.use("/api/products", productRoutes);

app.use("/api/payment", verifyToken, paymentRoutes);
app.use("/api/orders", verifyToken, orderRoutes);
app.use("/api/ratings", ratingRoutes);
app.use("/api/wishlist", verifyToken, wishlistRoutes);
app.use("/api/invoices", verifyToken, invoiceRoutes);
app.use("/api/discounts", verifyToken, discountRoutes);
app.use("/api/revenue", verifyToken, revenueRoutes);
app.use("/api/refunds", verifyToken, refundRoutes);
app.use("/api/notifications", verifyToken, notificationRoutes);

app.use((req, res, next) => {
  if (process.env.NODE_ENV === 'development') {
    console.log(`404 Not Found: ${req.method} ${req.url}`);
  }
  res.status(404).json({ error: 'Route not found' });
});

app.use((err, req, res, next) => {
  console.error('Global error handler:', err.stack);
  res.status(500).json({ error: 'Something went wrong!', details: err.message });
});

module.exports = app; 