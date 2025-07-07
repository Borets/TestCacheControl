const express = require('express');
const path = require('path');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const rateLimit = require('express-rate-limit');

const app = express();
const PORT = process.env.PORT || 3000;

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});

// Middleware
app.use(helmet({
  contentSecurityPolicy: false // Disable CSP for testing
}));
app.use(cors());
app.use(morgan('combined'));
app.use(compression());
app.use(express.json());
app.use(limiter);

// Custom middleware to add cache headers based on file type
const setCacheHeaders = (req, res, next) => {
  const ext = path.extname(req.path).toLowerCase();
  
  switch (ext) {
    case '.css':
    case '.js':
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      res.setHeader('CDN-Cache-Control', 'public, max-age=31536000');
      break;
    case '.png':
    case '.jpg':
    case '.jpeg':
    case '.gif':
    case '.svg':
    case '.ico':
      res.setHeader('Cache-Control', 'public, max-age=2592000'); // 30 days
      res.setHeader('CDN-Cache-Control', 'public, max-age=2592000');
      break;
    case '.woff':
    case '.woff2':
    case '.ttf':
    case '.eot':
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      res.setHeader('CDN-Cache-Control', 'public, max-age=31536000');
      break;
    case '.json':
      if (req.path.includes('manifest')) {
        res.setHeader('Cache-Control', 'public, max-age=86400'); // 1 day
      } else {
        res.setHeader('Cache-Control', 'no-cache');
      }
      break;
    case '.txt':
      if (req.path.includes('robots')) {
        res.setHeader('Cache-Control', 'public, max-age=86400'); // 1 day
      }
      break;
    default:
      res.setHeader('Cache-Control', 'no-cache');
  }
  
  next();
};

// Apply cache headers to static files
app.use(setCacheHeaders);

// Static file serving
app.use(express.static(path.join(__dirname, 'public')));

// API Routes

// Cache test endpoints
app.get('/api/cache-test/:type', (req, res) => {
  const { type } = req.params;
  const timestamp = new Date().toISOString();
  
  // Add custom headers for testing
  res.setHeader('X-Cache-Test', type);
  res.setHeader('X-Timestamp', timestamp);
  
  switch(type) {
    case 'max-age':
      res.setHeader('Cache-Control', 'public, max-age=31536000');
      res.setHeader('CDN-Cache-Control', 'public, max-age=31536000');
      break;
    case 'no-cache':
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('CDN-Cache-Control', 'no-cache');
      break;
    case 'private':
      res.setHeader('Cache-Control', 'private, max-age=3600');
      res.setHeader('CDN-Cache-Control', 'no-store');
      break;
    case 'public':
      res.setHeader('Cache-Control', 'public, max-age=3600');
      res.setHeader('CDN-Cache-Control', 'public, max-age=7200');
      break;
    case 'immutable':
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      res.setHeader('CDN-Cache-Control', 'public, max-age=31536000, immutable');
      break;
    case 'revalidate':
      res.setHeader('Cache-Control', 'public, max-age=0, must-revalidate');
      res.setHeader('CDN-Cache-Control', 'public, max-age=0, must-revalidate');
      break;
    case 'stale-while-revalidate':
      res.setHeader('Cache-Control', 'public, max-age=60, stale-while-revalidate=300');
      res.setHeader('CDN-Cache-Control', 'public, max-age=120, stale-while-revalidate=600');
      break;
    default:
      res.setHeader('Cache-Control', 'no-cache');
  }
  
  res.json({ 
    test: type, 
    timestamp: timestamp,
    cached: Math.random() > 0.5,
    server: 'express',
    headers: {
      'cache-control': res.getHeader('Cache-Control'),
      'cdn-cache-control': res.getHeader('CDN-Cache-Control')
    }
  });
});

// Analytics endpoint (simulate)
app.post('/api/analytics', (req, res) => {
  console.log('Analytics Event:', req.body);
  
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.json({ 
    status: 'received',
    timestamp: new Date().toISOString()
  });
});

// Ping endpoint for latency testing
app.head('/api/ping', (req, res) => {
  res.setHeader('Cache-Control', 'no-cache');
  res.status(200).end();
});

app.get('/api/ping', (req, res) => {
  res.setHeader('Cache-Control', 'no-cache');
  res.json({ 
    pong: true,
    timestamp: new Date().toISOString(),
    server: 'express'
  });
});

// Server info endpoint
app.get('/api/info', (req, res) => {
  res.setHeader('Cache-Control', 'public, max-age=300'); // 5 minutes
  
  res.json({
    server: 'express',
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    platform: process.platform,
    nodeVersion: process.version,
    headers: req.headers
  });
});

// Cache status endpoint
app.get('/api/cache-status', (req, res) => {
  res.setHeader('Cache-Control', 'no-cache');
  
  const cacheStatus = {
    timestamp: new Date().toISOString(),
    requests: {
      total: Math.floor(Math.random() * 10000),
      cached: Math.floor(Math.random() * 8000),
      missed: Math.floor(Math.random() * 2000)
    },
    performance: {
      avgResponseTime: Math.floor(Math.random() * 200) + 50,
      cacheHitRatio: (Math.random() * 0.3 + 0.7).toFixed(2)
    }
  };
  
  res.json(cacheStatus);
});

// Test different content types
app.get('/api/test-content/:type', (req, res) => {
  const { type } = req.params;
  
  switch(type) {
    case 'html':
      res.setHeader('Content-Type', 'text/html');
      res.setHeader('Cache-Control', 'public, max-age=3600');
      res.send('<h1>HTML Content</h1><p>This is cached HTML content.</p>');
      break;
    case 'xml':
      res.setHeader('Content-Type', 'application/xml');
      res.setHeader('Cache-Control', 'public, max-age=3600');
      res.send('<?xml version="1.0"?><root><message>Cached XML</message></root>');
      break;
    case 'text':
      res.setHeader('Content-Type', 'text/plain');
      res.setHeader('Cache-Control', 'public, max-age=3600');
      res.send('This is plain text content that can be cached.');
      break;
    case 'csv':
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Cache-Control', 'public, max-age=3600');
      res.send('name,value,timestamp\ntest1,100,' + Date.now() + '\ntest2,200,' + Date.now());
      break;
    default:
      res.setHeader('Cache-Control', 'no-cache');
      res.json({ error: 'Unknown content type' });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    error: 'Something went wrong!',
    timestamp: new Date().toISOString()
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ 
    error: 'Not Found',
    path: req.path,
    timestamp: new Date().toISOString()
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Cache Test App running on http://localhost:${PORT}`);
  console.log(`📊 Test endpoints available at /api/cache-test/:type`);
  console.log(`🔍 Available test types: max-age, no-cache, private, public, immutable, revalidate, stale-while-revalidate`);
});

module.exports = app;