const express = require('express');
const path = require('path');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const crypto = require('crypto');
const fs = require('fs');

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

// Helper function to generate ETag
const generateETag = (content) => {
  return crypto.createHash('md5').update(content).digest('hex');
};

// Enhanced cache headers middleware for Cloudflare testing
const setCacheHeaders = (req, res, next) => {
  const ext = path.extname(req.path).toLowerCase();
  const filename = path.basename(req.path);
  
  // Add Last-Modified header for all static files
  try {
    const stats = fs.statSync(path.join(__dirname, 'public', req.path));
    res.setHeader('Last-Modified', new Date(stats.mtime).toUTCString());
    
    // Generate ETag based on file stats
    const etag = `"${stats.size}-${stats.mtime.getTime()}"`;
    res.setHeader('ETag', etag);
    
    // Check if-none-match for ETag validation
    if (req.headers['if-none-match'] === etag) {
      return res.status(304).end();
    }
  } catch (err) {
    // File doesn't exist or can't be accessed, continue without ETag/Last-Modified
  }
  
  switch (ext) {
    case '.css':
    case '.js':
      // Use s-maxage for CDN-specific caching (Cloudflare respects this)
      res.setHeader('Cache-Control', 'public, max-age=31536000, s-maxage=31536000, immutable');
      res.setHeader('CDN-Cache-Control', 'public, max-age=31536000');
      break;
    case '.png':
    case '.jpg':
    case '.jpeg':
    case '.gif':
    case '.webp':
    case '.svg':
    case '.ico':
      res.setHeader('Cache-Control', 'public, max-age=2592000, s-maxage=7776000'); // 30 days origin, 90 days CDN
      res.setHeader('CDN-Cache-Control', 'public, max-age=2592000');
      break;
    case '.woff':
    case '.woff2':
    case '.ttf':
    case '.eot':
      res.setHeader('Cache-Control', 'public, max-age=31536000, s-maxage=31536000, immutable');
      res.setHeader('CDN-Cache-Control', 'public, max-age=31536000');
      // Add crossorigin for font files
      res.setHeader('Access-Control-Allow-Origin', '*');
      break;
    case '.pdf':
    case '.zip':
    case '.tar':
      res.setHeader('Cache-Control', 'public, max-age=86400, s-maxage=604800'); // 1 day origin, 7 days CDN
      break;
    case '.mp4':
    case '.webm':
    case '.avi':
      res.setHeader('Cache-Control', 'public, max-age=604800, s-maxage=2592000'); // 7 days origin, 30 days CDN
      res.setHeader('Accept-Ranges', 'bytes'); // Enable range requests for video
      break;
    case '.json':
      if (req.path.includes('manifest')) {
        res.setHeader('Cache-Control', 'public, max-age=86400, s-maxage=86400'); // 1 day
      } else {
        res.setHeader('Cache-Control', 'no-cache');
      }
      break;
    case '.txt':
      if (req.path.includes('robots')) {
        res.setHeader('Cache-Control', 'public, max-age=86400, s-maxage=604800'); // 1 day origin, 7 days CDN
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

// Enhanced cache test endpoints for Cloudflare
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
    case 's-maxage':
      // CDN-specific caching (Cloudflare prioritizes s-maxage)
      res.setHeader('Cache-Control', 'public, max-age=3600, s-maxage=86400');
      break;
    case 'vary-test':
      // Test Vary header with Cloudflare
      res.setHeader('Cache-Control', 'public, max-age=3600');
      res.setHeader('Vary', 'Accept-Encoding, User-Agent');
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
    case 'etag-test':
      const content = JSON.stringify({ test: type, timestamp });
      const etag = `"${generateETag(content)}"`;
      res.setHeader('ETag', etag);
      res.setHeader('Cache-Control', 'public, max-age=3600');
      
      if (req.headers['if-none-match'] === etag) {
        return res.status(304).end();
      }
      break;
    default:
      res.setHeader('Cache-Control', 'no-cache');
  }
  
  res.json({ 
    test: type, 
    timestamp: timestamp,
    cached: Math.random() > 0.5,
    server: 'express',
    queryString: req.query,
    headers: {
      'cache-control': res.getHeader('Cache-Control'),
      'cdn-cache-control': res.getHeader('CDN-Cache-Control'),
      'etag': res.getHeader('ETag'),
      'vary': res.getHeader('Vary')
    }
  });
});

// Cloudflare query string cache testing
app.get('/api/query-string-test', (req, res) => {
  const hasQuery = Object.keys(req.query).length > 0;
  
  if (hasQuery) {
    // With query strings - Cloudflare may not cache by default
    res.setHeader('Cache-Control', 'public, max-age=300');
    res.setHeader('X-Query-String-Present', 'true');
  } else {
    // Without query strings - Cloudflare will cache
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.setHeader('X-Query-String-Present', 'false');
  }
  
  res.json({
    queryStringPresent: hasQuery,
    queryParams: req.query,
    cacheBehavior: hasQuery ? 'May not cache due to query string' : 'Will cache normally',
    timestamp: new Date().toISOString()
  });
});

// File size cache testing (Cloudflare has different behavior for large files)
app.get('/api/file-size-test/:size', (req, res) => {
  const size = req.params.size;
  let dataSize, cacheStrategy, contentType, fileExtension;
  
  switch(size) {
    case 'small':
      dataSize = 1024; // 1KB
      cacheStrategy = 'public, max-age=31536000, s-maxage=31536000';
      contentType = 'text/plain'; // Cloudflare caches text files
      fileExtension = '.txt';
      break;
    case 'medium':
      dataSize = 1024 * 100; // 100KB
      cacheStrategy = 'public, max-age=2592000, s-maxage=2592000';
      contentType = 'text/plain';
      fileExtension = '.txt';
      break;
    case 'large':
      dataSize = 1024 * 1024 * 10; // 10MB
      cacheStrategy = 'public, max-age=86400, s-maxage=86400';
      contentType = 'text/plain';
      fileExtension = '.txt';
      break;
    case 'xlarge':
      dataSize = 1024 * 1024 * 100; // 100MB - Cloudflare Enterprise limit
      cacheStrategy = 'public, max-age=3600, s-maxage=3600';
      contentType = 'text/plain';
      fileExtension = '.txt';
      break;
    default:
      dataSize = 1024;
      cacheStrategy = 'no-cache';
      contentType = 'application/octet-stream';
      fileExtension = '';
  }
  
  // Add Cloudflare-friendly headers
  res.setHeader('Cache-Control', cacheStrategy);
  res.setHeader('Content-Type', contentType);
  res.setHeader('X-File-Size', dataSize);
  res.setHeader('X-Test-Type', 'file-size-test');
  
  // Add Content-Disposition to make it look like a file download
  res.setHeader('Content-Disposition', `inline; filename="test-${size}${fileExtension}"`);
  
  // Add ETag for better caching
  const etag = `"filesize-${size}-${dataSize}"`;
  res.setHeader('ETag', etag);
  
  // Check if client has cached version
  if (req.headers['if-none-match'] === etag) {
    return res.status(304).end();
  }
  
  // Generate dummy data of specified size (text content for better Cloudflare caching)
  const dummyData = size === 'xlarge' ? 
    Buffer.alloc(dataSize, 'X') : // Keep binary for very large files
    'A'.repeat(dataSize); // Text for smaller files that Cloudflare will cache
  
  res.send(dummyData);
});

// Static file size testing - These will definitely be cached by Cloudflare
app.get('/static-files/:size', (req, res) => {
  const size = req.params.size;
  const filePath = path.join(__dirname, 'public', 'test-files', `test-${size}.txt`);
  
  // Set cache headers based on file size
  let cacheControl;
  switch(size) {
    case '1kb':
      cacheControl = 'public, max-age=31536000, s-maxage=31536000, immutable';
      break;
    case '100kb':
      cacheControl = 'public, max-age=2592000, s-maxage=2592000';
      break;
    case '10mb':
      cacheControl = 'public, max-age=86400, s-maxage=86400';
      break;
    case '100mb':
      cacheControl = 'public, max-age=3600, s-maxage=3600';
      break;
    default:
      cacheControl = 'no-cache';
  }
  
  res.setHeader('Cache-Control', cacheControl);
  res.setHeader('X-Static-File-Test', 'true');
  res.sendFile(filePath, (err) => {
    if (err) {
      res.status(404).json({ error: `Test file ${size} not found` });
    }
  });
});

// Range request testing (important for video/large files with Cloudflare)
app.get('/api/range-test', (req, res) => {
  const fileSize = 1024 * 1024; // 1MB dummy file
  const range = req.headers.range;
  
  res.setHeader('Accept-Ranges', 'bytes');
  res.setHeader('Cache-Control', 'public, max-age=3600');
  res.setHeader('Content-Type', 'application/octet-stream');
  
  if (range) {
    const parts = range.replace(/bytes=/, "").split("-");
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
    const chunksize = (end - start) + 1;
    
    res.status(206);
    res.setHeader('Content-Range', `bytes ${start}-${end}/${fileSize}`);
    res.setHeader('Content-Length', chunksize);
    
    // Generate dummy chunk
    const chunk = Buffer.alloc(chunksize, 'R');
    res.send(chunk);
  } else {
    res.setHeader('Content-Length', fileSize);
    const fullFile = Buffer.alloc(fileSize, 'F');
    res.send(fullFile);
  }
});

// Compression test (Cloudflare handles compression)
app.get('/api/compression-test', (req, res) => {
  const acceptEncoding = req.headers['accept-encoding'] || '';
  
  res.setHeader('Cache-Control', 'public, max-age=3600');
  res.setHeader('Vary', 'Accept-Encoding');
  
  // Large JSON for compression testing
  const largeData = {
    message: 'This is a large response for compression testing '.repeat(100),
    timestamp: new Date().toISOString(),
    compression: {
      gzipSupported: acceptEncoding.includes('gzip'),
      brotliSupported: acceptEncoding.includes('br'),
      deflateSupported: acceptEncoding.includes('deflate')
    },
    data: Array.from({length: 100}, (_, i) => ({
      id: i,
      value: `Item ${i} with repeated text `.repeat(10)
    }))
  };
  
  res.json(largeData);
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

// Health check endpoint for Render.com
app.get('/health', (req, res) => {
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.status(200).json({ 
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    version: '1.0.0'
  });
});

// Readiness check endpoint
app.get('/ready', (req, res) => {
  // Simple readiness check - server is ready if it can respond
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.status(200).json({ 
    ready: true,
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
  console.log(`🔍 Available test types: max-age, s-maxage, vary-test, no-cache, private, public, immutable, revalidate, stale-while-revalidate, etag-test`);
  console.log(`🌐 Cloudflare-specific tests:`);
  console.log(`   - Query string: /api/query-string-test`);
  console.log(`   - File sizes: /api/file-size-test/:size (small|medium|large|xlarge)`);
  console.log(`   - Range requests: /api/range-test`);
  console.log(`   - Compression: /api/compression-test`);
});

module.exports = app;