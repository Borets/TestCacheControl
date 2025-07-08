// Comprehensive Cache Testing Suite
class ComprehensiveCacheTester {
  constructor() {
    this.testSuite = {
      basicCacheControls: [
        'max-age',
        's-maxage', 
        'no-cache',
        'public',
        'etag-test',
        'stale-while-revalidate'
      ],
      cloudflareBehaviors: [
        { type: 'query-string', tests: [
          { url: '/api/query-string-test', description: 'No query parameters' },
          { url: '/api/query-string-test?v=123', description: 'With query parameters' }
        ]},
        { type: 'file-sizes', tests: [
          { size: 'small', description: '1KB file' },
          { size: 'medium', description: '100KB file' },
          { size: 'large', description: '10MB file' }
        ]},
        { type: 'compression', tests: [
          { url: '/api/compression-test', description: 'Large payload compression' }
        ]},
        { type: 'range-requests', tests: [
          { url: '/api/range-test', headers: {}, description: 'Full content request' },
          { url: '/api/range-test', headers: { 'Range': 'bytes=0-1023' }, description: 'Partial content request' }
        ]}
      ],
      staticAssets: [
        { url: '/css/styles.css', type: 'CSS', description: 'Main stylesheet' },
        { url: '/js/app.js', type: 'JavaScript', description: 'Main application JS' },
        { url: '/images/logo.svg', type: 'Image', description: 'SVG logo' },
        { url: '/favicon.ico', type: 'Icon', description: 'Favicon' }
      ],
      contentTypes: [
        { url: '/api/test-content/html', type: 'HTML', description: 'HTML content type' },
        { url: '/api/test-content/xml', type: 'XML', description: 'XML content type' },
        { url: '/api/test-content/text', type: 'Text', description: 'Plain text content' },
        { url: '/api/test-content/csv', type: 'CSV', description: 'CSV file type' }
      ],
      edgeCases: [
        { url: '/api/cache-test/not-found', description: '404 Not Found response', expectError: true },
        { url: '/api/cache-test/server-error', description: '500 Server Error response', expectError: true },
        { url: '/api/info', description: 'Server info endpoint (should not be aggressively cached)' }
      ]
    };
    
    this.results = {
      summary: {},
      detailed: {},
      performance: {},
      recommendations: [],
      timestamp: null
    };
    
    this.isRunning = false;
    this.progress = 0;
    this.totalTests = this.calculateTotalTests();
  }

  calculateTotalTests() {
    let total = 0;
    total += this.testSuite.basicCacheControls.length;
    total += this.testSuite.cloudflareBehaviors.reduce((sum, category) => sum + category.tests.length, 0);
    total += this.testSuite.staticAssets.length;
    total += this.testSuite.contentTypes.length;
    total += this.testSuite.edgeCases.length;
    return total;
  }

  async runComprehensiveTest() {
    if (this.isRunning) {
      console.log('Comprehensive test already running...');
      return;
    }

    this.isRunning = true;
    this.progress = 0;
    this.results.timestamp = new Date().toISOString();
    this.results.detailed = {};
    this.results.performance = {};
    this.results.recommendations = [];

    console.log('🚀 Starting Comprehensive Cache Test Suite...');
    this.updateProgress('Starting comprehensive cache analysis...', 0);

    try {
      // 1. Test Basic Cache Controls
      await this.testBasicCacheControls();
      
      // 2. Test Cloudflare-Specific Behaviors
      await this.testCloudflareBehaviors();
      
      // 3. Test Static Assets
      await this.testStaticAssets();
      
      // 4. Test Content Types
      await this.testContentTypes();
      
      // 5. Test Edge Cases
      await this.testEdgeCases();
      
      // 6. Performance Analysis
      await this.performanceAnalysis();
      
      // 7. Generate Recommendations
      this.generateRecommendations();
      
      // 8. Create Summary
      this.createSummary();
      
      this.updateProgress('✅ Comprehensive cache analysis complete!', 100);
      this.displayResults();
      
    } catch (error) {
      console.error('Comprehensive test failed:', error);
      this.updateProgress('❌ Test failed: ' + error.message, this.progress);
    } finally {
      this.isRunning = false;
    }
  }

  async testBasicCacheControls() {
    this.updateProgress('Testing basic cache controls...', this.progress);
    this.results.detailed.basicCacheControls = {};
    
    for (const testType of this.testSuite.basicCacheControls) {
      const result = await this.runSingleTest(`/api/cache-test/${testType}`, 'Basic Cache Control', testType);
      this.results.detailed.basicCacheControls[testType] = result;
      this.incrementProgress();
      await this.delay(500); // Small delay to prevent overwhelming the server
    }
  }

  async testCloudflareBehaviors() {
    this.updateProgress('Testing Cloudflare-specific behaviors...', this.progress);
    this.results.detailed.cloudflareBehaviors = {};
    
    for (const category of this.testSuite.cloudflareBehaviors) {
      this.results.detailed.cloudflareBehaviors[category.type] = {};
      
      for (const test of category.tests) {
        let result;
        
        if (category.type === 'file-sizes') {
          result = await this.runFileSizeTest(test.size, test.description);
        } else if (category.type === 'range-requests') {
          result = await this.runRangeTest(test.url, test.headers, test.description);
        } else {
          result = await this.runSingleTest(test.url, 'Cloudflare Behavior', test.description);
        }
        
        this.results.detailed.cloudflareBehaviors[category.type][test.description || test.size] = result;
        this.incrementProgress();
        await this.delay(500);
      }
    }
  }

  async testStaticAssets() {
    this.updateProgress('Testing static asset caching...', this.progress);
    this.results.detailed.staticAssets = {};
    
    for (const asset of this.testSuite.staticAssets) {
      const result = await this.runStaticAssetTest(asset.url, asset.type, asset.description);
      this.results.detailed.staticAssets[asset.url] = result;
      this.incrementProgress();
      await this.delay(300);
    }
  }

  async testContentTypes() {
    this.updateProgress('Testing different content types...', this.progress);
    this.results.detailed.contentTypes = {};
    
    for (const test of this.testSuite.contentTypes) {
      const result = await this.runSingleTest(test.url, 'Content Type', test.description);
      this.results.detailed.contentTypes[test.type] = result;
      this.incrementProgress();
      await this.delay(300);
    }
  }

  async testEdgeCases() {
    this.updateProgress('Testing edge cases and error handling...', this.progress);
    this.results.detailed.edgeCases = {};
    
    for (const test of this.testSuite.edgeCases) {
      const result = await this.runSingleTest(test.url, 'Edge Case', test.description, test.expectError);
      this.results.detailed.edgeCases[test.description] = result;
      this.incrementProgress();
      await this.delay(300);
    }
  }

  async runSingleTest(url, category, description, expectError = false) {
    const startTime = performance.now();
    
    try {
      const response = await fetch(url);
      const endTime = performance.now();
      
      let data = null;
      let contentSize = 0;
      
      try {
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          data = await response.json();
        } else {
          const blob = await response.blob();
          contentSize = blob.size;
        }
      } catch (e) {
        // Handle non-JSON responses
        contentSize = 0;
      }
      
      return {
        success: expectError ? false : response.ok,
        status: response.status,
        duration: endTime - startTime,
        headers: Object.fromEntries(response.headers.entries()),
        cached: this.determineCacheStatus(response),
        contentSize: contentSize,
        data: data,
        category: category,
        description: description,
        url: url,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        success: expectError,
        error: error.message,
        duration: performance.now() - startTime,
        cached: false,
        category: category,
        description: description,
        url: url,
        timestamp: new Date().toISOString()
      };
    }
  }

  async runFileSizeTest(size, description) {
    return await this.runSingleTest(`/api/file-size-test/${size}`, 'File Size Test', description);
  }

  async runRangeTest(url, headers, description) {
    const startTime = performance.now();
    
    try {
      const response = await fetch(url, { headers });
      const blob = await response.blob();
      const endTime = performance.now();
      
      return {
        success: true,
        status: response.status,
        duration: endTime - startTime,
        headers: Object.fromEntries(response.headers.entries()),
        cached: this.determineCacheStatus(response),
        contentSize: blob.size,
        isPartialContent: response.status === 206,
        rangeSupported: response.headers.has('accept-ranges'),
        category: 'Range Request',
        description: description,
        url: url,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        duration: performance.now() - startTime,
        category: 'Range Request',
        description: description,
        url: url,
        timestamp: new Date().toISOString()
      };
    }
  }

  async runStaticAssetTest(url, type, description) {
    const result = await this.runSingleTest(url, 'Static Asset', description);
    result.assetType = type;
    return result;
  }

  determineCacheStatus(response) {
    const cacheControl = response.headers.get('cache-control');
    const cfCacheStatus = response.headers.get('cf-cache-status');
    const etag = response.headers.get('etag');
    const lastModified = response.headers.get('last-modified');
    
    // Cloudflare cache status (highest priority)
    if (cfCacheStatus) {
      return {
        status: cfCacheStatus,
        cloudflare: true,
        cacheable: cfCacheStatus === 'HIT' || cfCacheStatus === 'MISS'
      };
    }
    
    // Analyze cache-control directives
    if (cacheControl) {
      const noCachePattern = /(no-cache|no-store|private)/i;
      const maxAgeMatch = cacheControl.match(/max-age=(\d+)/i);
      const sMaxAgeMatch = cacheControl.match(/s-maxage=(\d+)/i);
      
      return {
        status: noCachePattern.test(cacheControl) ? 'NO_CACHE' : 'CACHEABLE',
        cloudflare: false,
        cacheable: !noCachePattern.test(cacheControl),
        maxAge: maxAgeMatch ? parseInt(maxAgeMatch[1]) : null,
        sMaxAge: sMaxAgeMatch ? parseInt(sMaxAgeMatch[1]) : null,
        cacheControl: cacheControl
      };
    }
    
    // ETag/Last-Modified based caching
    if (etag || lastModified) {
      return {
        status: 'CONDITIONAL',
        cloudflare: false,
        cacheable: true,
        conditional: true
      };
    }
    
    return {
      status: 'UNKNOWN',
      cloudflare: false,
      cacheable: false
    };
  }

  async performanceAnalysis() {
    this.updateProgress('Analyzing performance metrics...', this.progress);
    
    const allResults = this.getAllResults();
    const performanceMetrics = {
      averageResponseTime: 0,
      cacheHitRatio: 0,
      totalRequests: 0,
      cachedRequests: 0,
      fastestResponse: Infinity,
      slowestResponse: 0,
      largestFile: 0,
      compressionRatio: 0,
      errorRate: 0
    };
    
    let totalDuration = 0;
    let errors = 0;
    let totalSize = 0;
    let compressedSize = 0;
    
    for (const result of allResults) {
      if (result.duration) {
        totalDuration += result.duration;
        performanceMetrics.fastestResponse = Math.min(performanceMetrics.fastestResponse, result.duration);
        performanceMetrics.slowestResponse = Math.max(performanceMetrics.slowestResponse, result.duration);
      }
      
      if (result.contentSize) {
        performanceMetrics.largestFile = Math.max(performanceMetrics.largestFile, result.contentSize);
        totalSize += result.contentSize;
        
        // Estimate compressed size from headers
        const contentEncoding = result.headers?.['content-encoding'];
        if (contentEncoding) {
          compressedSize += result.contentSize * 0.7; // Rough compression estimate
        } else {
          compressedSize += result.contentSize;
        }
      }
      
      if (result.cached && result.cached.cacheable) {
        performanceMetrics.cachedRequests++;
      }
      
      if (!result.success) {
        errors++;
      }
      
      performanceMetrics.totalRequests++;
    }
    
    performanceMetrics.averageResponseTime = totalDuration / performanceMetrics.totalRequests;
    performanceMetrics.cacheHitRatio = (performanceMetrics.cachedRequests / performanceMetrics.totalRequests) * 100;
    performanceMetrics.errorRate = (errors / performanceMetrics.totalRequests) * 100;
    performanceMetrics.compressionRatio = totalSize > 0 ? ((totalSize - compressedSize) / totalSize) * 100 : 0;
    
    this.results.performance = performanceMetrics;
  }

  generateRecommendations() {
    const recommendations = [];
    const performance = this.results.performance;
    const basicTests = this.results.detailed.basicCacheControls;
    
    // Cache hit ratio recommendations
    if (performance.cacheHitRatio < 70) {
      recommendations.push({
        type: 'warning',
        category: 'Cache Efficiency',
        message: `Low cache hit ratio (${performance.cacheHitRatio.toFixed(1)}%). Consider implementing better caching strategies.`,
        priority: 'high'
      });
    }
    
    // Response time recommendations
    if (performance.averageResponseTime > 1000) {
      recommendations.push({
        type: 'warning',
        category: 'Performance',
        message: `High average response time (${performance.averageResponseTime.toFixed(0)}ms). Consider optimizing server response times.`,
        priority: 'medium'
      });
    }
    
    // S-maxage usage
    if (basicTests['s-maxage'] && !basicTests['s-maxage'].cached?.sMaxAge) {
      recommendations.push({
        type: 'info',
        category: 'Cloudflare Optimization',
        message: 'Consider using s-maxage directive for better CDN cache control with Cloudflare.',
        priority: 'low'
      });
    }
    
    // Static asset caching
    const staticAssets = this.results.detailed.staticAssets;
    let uncachedAssets = 0;
    for (const [url, result] of Object.entries(staticAssets)) {
      if (!result.cached?.cacheable) {
        uncachedAssets++;
      }
    }
    
    if (uncachedAssets > 0) {
      recommendations.push({
        type: 'warning',
        category: 'Static Assets',
        message: `${uncachedAssets} static assets are not properly cached. This could impact performance.`,
        priority: 'high'
      });
    }
    
    // Compression recommendations
    if (performance.compressionRatio < 30) {
      recommendations.push({
        type: 'info',
        category: 'Compression',
        message: 'Consider enabling better compression for text-based assets to reduce bandwidth usage.',
        priority: 'medium'
      });
    }
    
    this.results.recommendations = recommendations;
  }

  createSummary() {
    const allResults = this.getAllResults();
    const summary = {
      totalTests: allResults.length,
      passedTests: allResults.filter(r => r.success).length,
      failedTests: allResults.filter(r => !r.success).length,
      cacheableResources: allResults.filter(r => r.cached?.cacheable).length,
      averageResponseTime: this.results.performance.averageResponseTime,
      cacheHitRatio: this.results.performance.cacheHitRatio,
      criticalIssues: this.results.recommendations.filter(r => r.priority === 'high').length,
      testDuration: new Date() - new Date(this.results.timestamp)
    };
    
    this.results.summary = summary;
  }

  getAllResults() {
    const results = [];
    
    // Flatten all test results
    Object.values(this.results.detailed.basicCacheControls || {}).forEach(r => results.push(r));
    
    Object.values(this.results.detailed.cloudflareBehaviors || {}).forEach(category => {
      Object.values(category).forEach(r => results.push(r));
    });
    
    Object.values(this.results.detailed.staticAssets || {}).forEach(r => results.push(r));
    
    Object.values(this.results.detailed.contentTypes || {}).forEach(r => results.push(r));
    
    Object.values(this.results.detailed.edgeCases || {}).forEach(r => results.push(r));

    return results;
  }

  displayResults() {
    this.createResultsDisplay();
    this.exportResults();
  }

  createResultsDisplay() {
    const container = document.getElementById('comprehensive-results') || this.createResultsContainer();
    
    container.innerHTML = `
      <div class="comprehensive-results">
        <h3>🎯 Comprehensive Cache Analysis Report</h3>
        
        <div class="summary-cards">
          <div class="summary-card">
            <div class="card-value">${this.results.summary.totalTests}</div>
            <div class="card-label">Total Tests</div>
          </div>
          <div class="summary-card ${this.results.summary.passedTests === this.results.summary.totalTests ? 'success' : 'warning'}">
            <div class="card-value">${this.results.summary.passedTests}</div>
            <div class="card-label">Passed</div>
          </div>
          <div class="summary-card ${this.results.summary.cacheHitRatio > 80 ? 'success' : 'warning'}">
            <div class="card-value">${this.results.summary.cacheHitRatio.toFixed(1)}%</div>
            <div class="card-label">Cache Hit Ratio</div>
          </div>
          <div class="summary-card ${this.results.summary.averageResponseTime < 500 ? 'success' : 'warning'}">
            <div class="card-value">${this.results.summary.averageResponseTime.toFixed(0)}ms</div>
            <div class="card-label">Avg Response Time</div>
          </div>
        </div>
        
        <div class="recommendations">
          <h4>📋 Recommendations</h4>
          ${this.results.recommendations.length === 0 ? 
            '<p class="no-issues">✅ No critical issues found. Your caching configuration looks good!</p>' :
            this.results.recommendations.map(rec => `
              <div class="recommendation ${rec.priority}">
                <span class="rec-icon">${rec.type === 'warning' ? '⚠️' : 'ℹ️'}</span>
                <div class="rec-content">
                  <strong>${rec.category}</strong>: ${rec.message}
                </div>
              </div>
            `).join('')
          }
        </div>
        
        <div class="detailed-results">
          <h4>📊 Detailed Results</h4>
          <div class="results-tabs">
            <button class="tab-btn active" onclick="showTab('basic')">Essential Cache Tests</button>
            <button class="tab-btn" onclick="showTab('cloudflare')">Cloudflare Tests</button>
            <button class="tab-btn" onclick="showTab('static')">Static Assets</button>
            <button class="tab-btn" onclick="showTab('performance')">Performance</button>
          </div>
          
          <div id="basic-tab" class="tab-content active">
            ${this.renderBasicResults()}
          </div>
          
          <div id="cloudflare-tab" class="tab-content">
            ${this.renderCloudflareResults()}
          </div>
          
          <div id="static-tab" class="tab-content">
            ${this.renderStaticResults()}
          </div>
          
          <div id="performance-tab" class="tab-content">
            ${this.renderPerformanceResults()}
          </div>
        </div>
        
        <div class="actions">
          <button class="btn" onclick="comprehensiveTester.exportDetailedReport()">📄 Export Detailed Report</button>
          <button class="btn" onclick="comprehensiveTester.runComprehensiveTest()">🔄 Run Again</button>
        </div>
      </div>
    `;
  }

  createResultsContainer() {
    const container = document.createElement('div');
    container.id = 'comprehensive-results';
    container.className = 'comprehensive-results-container';
    
    // Insert into the right panel
    const resultsContent = document.querySelector('.right-panel .results-content');
    if (resultsContent) {
      resultsContent.innerHTML = ''; // Clear previous results
      resultsContent.appendChild(container);
    } else {
      document.querySelector('main').appendChild(container);
    }
    
    return container;
  }

  renderBasicResults() {
    const results = this.results.detailed.basicCacheControls || {};
    return Object.entries(results).map(([test, result]) => `
      <div class="result-item ${result.success ? 'success' : 'error'}">
        <div class="result-header">
          <span class="result-name">${test}</span>
          <span class="result-status">${result.cached?.status || 'UNKNOWN'}</span>
        </div>
        <div class="result-details">
          <span>Duration: ${result.duration?.toFixed(2) || 'N/A'}ms</span>
          <span>Status: ${result.status || 'Error'}</span>
          <span>Cacheable: ${result.cached?.cacheable ? 'Yes' : 'No'}</span>
        </div>
      </div>
    `).join('');
  }

  renderCloudflareResults() {
    const results = this.results.detailed.cloudflareBehaviors || {};
    return Object.entries(results).map(([category, tests]) => `
      <div class="category-results">
        <h5>${category.replace('-', ' ').toUpperCase()}</h5>
        ${Object.entries(tests).map(([testName, result]) => `
          <div class="result-item ${result.success ? 'success' : 'error'}">
            <div class="result-header">
              <span class="result-name">${testName}</span>
              <span class="result-status">${result.cached?.status || 'UNKNOWN'}</span>
            </div>
            <div class="result-details">
              <span>Duration: ${result.duration?.toFixed(2) || 'N/A'}ms</span>
              ${result.contentSize ? `<span>Size: ${this.formatBytes(result.contentSize)}</span>` : ''}
              ${result.isPartialContent ? '<span>Partial: Yes</span>' : ''}
            </div>
          </div>
        `).join('')}
      </div>
    `).join('');
  }

  renderStaticResults() {
    const results = this.results.detailed.staticAssets || {};
    return Object.entries(results).map(([url, result]) => `
      <div class="result-item ${result.success ? 'success' : 'error'}">
        <div class="result-header">
          <span class="result-name">${url.split('/').pop()}</span>
          <span class="result-type">${result.assetType}</span>
          <span class="result-status">${result.cached?.status || 'UNKNOWN'}</span>
        </div>
        <div class="result-details">
          <span>Duration: ${result.duration?.toFixed(2) || 'N/A'}ms</span>
          <span>Size: ${this.formatBytes(result.contentSize || 0)}</span>
          <span>Cacheable: ${result.cached?.cacheable ? 'Yes' : 'No'}</span>
        </div>
      </div>
    `).join('');
  }

  renderPerformanceResults() {
    const perf = this.results.performance;
    return `
      <div class="performance-metrics">
        <div class="metric">
          <label>Average Response Time:</label>
          <span class="${perf.averageResponseTime < 500 ? 'good' : 'warning'}">${perf.averageResponseTime.toFixed(2)}ms</span>
        </div>
        <div class="metric">
          <label>Cache Hit Ratio:</label>
          <span class="${perf.cacheHitRatio > 80 ? 'good' : 'warning'}">${perf.cacheHitRatio.toFixed(1)}%</span>
        </div>
        <div class="metric">
          <label>Fastest Response:</label>
          <span class="good">${perf.fastestResponse.toFixed(2)}ms</span>
        </div>
        <div class="metric">
          <label>Slowest Response:</label>
          <span class="${perf.slowestResponse > 2000 ? 'warning' : 'neutral'}">${perf.slowestResponse.toFixed(2)}ms</span>
        </div>
        <div class="metric">
          <label>Error Rate:</label>
          <span class="${perf.errorRate > 5 ? 'warning' : 'good'}">${perf.errorRate.toFixed(1)}%</span>
        </div>
        <div class="metric">
          <label>Largest File:</label>
          <span class="neutral">${this.formatBytes(perf.largestFile)}</span>
        </div>
      </div>
    `;
  }

  formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  exportDetailedReport() {
    const report = {
      meta: {
        testSuite: 'Comprehensive Cache Analysis',
        timestamp: this.results.timestamp,
        duration: this.results.summary.testDuration,
        userAgent: navigator.userAgent,
        url: window.location.href
      },
      summary: this.results.summary,
      performance: this.results.performance,
      recommendations: this.results.recommendations,
      detailedResults: this.results.detailed
    };

    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `comprehensive-cache-report-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  exportResults() {
    // Store results in global scope for access
    window.comprehensiveTestResults = this.results;
  }

  updateProgress(message, percentage) {
    const progressElement = document.getElementById('comprehensive-progress');
    if (progressElement) {
      progressElement.innerHTML = `
        <div class="progress-message">${message}</div>
        <div class="progress-bar">
          <div class="progress-fill" style="width: ${percentage}%"></div>
        </div>
        <div class="progress-percentage">${percentage.toFixed(0)}%</div>
      `;
    } else {
      console.log(`${percentage.toFixed(0)}% - ${message}`);
    }
  }

  incrementProgress() {
    this.progress = Math.min(95, (++this.progress / this.totalTests) * 95);
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Global function for tab switching
window.showTab = function(tabName) {
  // Hide all tabs
  document.querySelectorAll('.tab-content').forEach(tab => {
    tab.classList.remove('active');
  });
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.classList.remove('active');
  });
  
  // Show selected tab
  document.getElementById(`${tabName}-tab`).classList.add('active');
  event.target.classList.add('active');
};

// Initialize comprehensive tester
const comprehensiveTester = new ComprehensiveCacheTester();
window.comprehensiveTester = comprehensiveTester; 