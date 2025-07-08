// Main Application JavaScript - Cache Testing App
class CacheTestApp {
  constructor() {
    this.init();
  }

  init() {
    this.bindEvents();
    this.loadCacheTests();
    this.setupPerformanceObserver();
  }

  bindEvents() {
    document.addEventListener('DOMContentLoaded', () => {
      this.setupUI();
    });

    // Test button clicks - unified handler for new layout
    document.addEventListener('click', (e) => {
      if (e.target.classList.contains('test-btn')) {
        this.handleTestClick(e.target);
      }
    });

    // Clear cache button
    document.addEventListener('click', (e) => {
      if (e.target.classList.contains('clear-cache-btn')) {
        this.clearCache();
      }
    });
  }

  handleTestClick(button) {
    const testType = button.dataset.testType;
    const testUrl = button.dataset.testUrl;
    const testSize = button.dataset.testSize;
    const testRange = button.dataset.testRange;

    if (testType) {
      this.runCacheTest(testType);
    } else if (testUrl) {
      this.runSpecialTest(testUrl);
    } else if (testSize) {
      this.runFileSizeTest(testSize);
    } else if (testRange) {
      this.runRangeRequestTest();
    }
  }

  setupUI() {
    this.displayCacheInfo();
    this.setupRealTimeUpdates();
  }

  async runCacheTest(testType) {
    const startTime = performance.now();
    const testUrl = `/api/cache-test/${testType}`;
    
    try {
      const response = await fetch(testUrl);
      const data = await response.json();
      const endTime = performance.now();
      
      const result = {
        type: `${testType} cache test`,
        url: testUrl,
        duration: endTime - startTime,
        headers: Object.fromEntries(response.headers.entries()),
        cached: this.determineCacheStatus(response),
        status: response.status,
        data: data,
        timestamp: new Date().toISOString()
      };
      
      this.logCacheTest(result);
      this.storeTestResult(result);
    } catch (error) {
      console.error('Cache test failed:', error);
      const result = {
        type: `${testType} cache test`,
        url: testUrl,
        error: error.message,
        cached: false,
        timestamp: new Date().toISOString()
      };
      this.logCacheTest(result);
      this.storeTestResult(result);
    }
  }

  async runSpecialTest(testUrl) {
    const startTime = performance.now();
    
    try {
      const response = await fetch(testUrl);
      const data = await response.json();
      const endTime = performance.now();
      
      const result = {
        type: this.getTestTypeFromUrl(testUrl),
        url: testUrl,
        duration: endTime - startTime,
        headers: Object.fromEntries(response.headers.entries()),
        cached: this.determineCacheStatus(response),
        status: response.status,
        data: data,
        timestamp: new Date().toISOString()
      };
      
      this.logCacheTest(result);
      this.storeTestResult(result);
    } catch (error) {
      console.error('Special test failed:', error);
      const result = {
        type: this.getTestTypeFromUrl(testUrl),
        url: testUrl,
        error: error.message,
        cached: false,
        timestamp: new Date().toISOString()
      };
      this.logCacheTest(result);
      this.storeTestResult(result);
    }
  }

  async runFileSizeTest(size) {
    const testUrl = `/api/file-size-test/${size}`;
    const startTime = performance.now();
    
    try {
      const response = await fetch(testUrl);
      const blob = await response.blob();
      const endTime = performance.now();
      
      const result = {
        type: `File size test (${size})`,
        url: testUrl,
        duration: endTime - startTime,
        headers: Object.fromEntries(response.headers.entries()),
        cached: this.determineCacheStatus(response),
        status: response.status,
        fileSize: blob.size,
        timestamp: new Date().toISOString()
      };
      
      this.logCacheTest(result);
      this.storeTestResult(result);
    } catch (error) {
      console.error('File size test failed:', error);
      const result = {
        type: `File size test (${size})`,
        url: testUrl,
        error: error.message,
        cached: false,
        timestamp: new Date().toISOString()
      };
      this.logCacheTest(result);
      this.storeTestResult(result);
    }
  }

  async runStaticAssetTest(assetUrl) {
    const startTime = performance.now();
    
    try {
      const response = await fetch(assetUrl);
      const blob = await response.blob();
      const endTime = performance.now();
      
      const result = {
        type: `Static asset test`,
        url: assetUrl,
        duration: endTime - startTime,
        headers: Object.fromEntries(response.headers.entries()),
        cached: this.determineCacheStatus(response),
        status: response.status,
        fileSize: blob.size,
        contentType: response.headers.get('content-type'),
        timestamp: new Date().toISOString()
      };
      
      this.logCacheTest(result);
      this.storeTestResult(result);
    } catch (error) {
      console.error('Static asset test failed:', error);
      const result = {
        type: `Static asset test`,
        url: assetUrl,
        error: error.message,
        cached: false,
        timestamp: new Date().toISOString()
      };
      this.logCacheTest(result);
      this.storeTestResult(result);
    }
  }

  async runRangeRequestTest() {
    const testUrl = '/api/range-test';
    const startTime = performance.now();
    
    try {
      // Test with range header
      const response = await fetch(testUrl, {
        headers: {
          'Range': 'bytes=0-1023'
        }
      });
      const blob = await response.blob();
      const endTime = performance.now();
      
      const result = {
        type: 'Range request test',
        url: testUrl,
        duration: endTime - startTime,
        headers: Object.fromEntries(response.headers.entries()),
        cached: this.determineCacheStatus(response),
        status: response.status,
        fileSize: blob.size,
        isPartialContent: response.status === 206,
        timestamp: new Date().toISOString()
      };
      
      this.logCacheTest(result);
      this.storeTestResult(result);
    } catch (error) {
      console.error('Range request test failed:', error);
      const result = {
        type: 'Range request test',
        url: testUrl,
        error: error.message,
        cached: false,
        timestamp: new Date().toISOString()
      };
      this.logCacheTest(result);
      this.storeTestResult(result);
    }
  }

  determineCacheStatus(response) {
    // Check for various cache indicators
    const cacheControl = response.headers.get('cache-control');
    const cfCacheStatus = response.headers.get('cf-cache-status');
    const etag = response.headers.get('etag');
    const lastModified = response.headers.get('last-modified');
    
    // Cloudflare cache status (if present)
    if (cfCacheStatus) {
      return cfCacheStatus === 'HIT';
    }
    
    // Browser cache indicators
    if (cacheControl && !cacheControl.includes('no-cache') && !cacheControl.includes('no-store')) {
      return true;
    }
    
    // ETag or Last-Modified presence suggests cacheable
    if (etag || lastModified) {
      return true;
    }
    
    return false;
  }

  getTestTypeFromUrl(url) {
    if (url.includes('query-string-test')) {
      return 'Query string test';
    } else if (url.includes('compression-test')) {
      return 'Compression test';
    } else if (url.includes('range-test')) {
      return 'Range request test';
    }
    return 'Special test';
  }

  storeTestResult(result) {
    if (!window.testResults) {
      window.testResults = [];
    }
    window.testResults.push(result);
  }

  logCacheTest(result) {
    // Use the new layout's addTestResultToHistory function if available
    if (window.addTestResultToHistory) {
      window.addTestResultToHistory(result);
      return;
    }

    // Fallback for older layout (shouldn't be needed but kept for safety)
    console.log('Test result:', result);
  }

  formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  displayCacheInfo() {
    const cacheInfo = {
      userAgent: navigator.userAgent,
      cookiesEnabled: navigator.cookieEnabled,
      onLine: navigator.onLine,
      connection: navigator.connection || {},
      memory: navigator.deviceMemory || 'Unknown',
      hardwareConcurrency: navigator.hardwareConcurrency || 'Unknown'
    };

    console.log('Browser Cache Information:', cacheInfo);
  }

  setupPerformanceObserver() {
    if ('PerformanceObserver' in window) {
      const observer = new PerformanceObserver((list) => {
        list.getEntries().forEach((entry) => {
          if (entry.entryType === 'resource' || entry.entryType === 'navigation') {
            this.logResourceTiming(entry);
          }
        });
      });

      observer.observe({ entryTypes: ['resource', 'navigation'] });
    }
  }

  logResourceTiming(entry) {
    const timing = {
      name: entry.name,
      type: entry.entryType,
      duration: entry.duration,
      transferSize: entry.transferSize,
      encodedBodySize: entry.encodedBodySize,
      decodedBodySize: entry.decodedBodySize,
      cached: entry.transferSize === 0 && entry.encodedBodySize > 0
    };

    console.log('Resource Timing:', timing);
  }

  async loadCacheTests() {
    // Pre-load basic tests
    const tests = [
      '/api/cache-test/max-age',
      '/api/cache-test/s-maxage',
      '/api/cache-test/no-cache',
      '/api/cache-test/public'
    ];

    const results = await Promise.allSettled(
      tests.map(url => fetch(url).then(r => r.json()))
    );

    console.log('Initial cache test results:', results);
  }

  setupRealTimeUpdates() {
    // Update cache status every 5 seconds
    setInterval(() => {
      this.updateCacheStatus();
    }, 5000);
  }

  updateCacheStatus() {
    const statusElements = document.querySelectorAll('.cache-status');
    statusElements.forEach(element => {
      const randomStatus = Math.random() > 0.5;
      element.classList.toggle('cached', randomStatus);
      element.classList.toggle('not-cached', !randomStatus);
    });
  }

  clearCache() {
    if ('caches' in window) {
      caches.keys().then(names => {
        names.forEach(name => {
          caches.delete(name);
        });
      });
    }
    
    // Clear localStorage
    localStorage.clear();
    
    // Clear sessionStorage
    sessionStorage.clear();
    
    console.log('Cache cleared');
    location.reload();
  }
}

// Animation utilities
class AnimationUtils {
  static fadeIn(element, duration = 300) {
    element.style.opacity = '0';
    element.style.transition = `opacity ${duration}ms ease-in-out`;
    
    setTimeout(() => {
      element.style.opacity = '1';
    }, 10);
  }

  static slideIn(element, direction = 'left', duration = 300) {
    const transform = direction === 'left' ? 'translateX(-100%)' : 'translateY(-100%)';
    element.style.transform = transform;
    element.style.transition = `transform ${duration}ms ease-in-out`;
    
    setTimeout(() => {
      element.style.transform = 'translate(0)';
    }, 10);
  }

  static pulse(element, duration = 200) {
    element.style.transform = 'scale(1.1)';
    element.style.transition = `transform ${duration}ms ease-in-out`;
    
    setTimeout(() => {
      element.style.transform = 'scale(1)';
    }, duration);
  }
}

// Cache utilities
class CacheUtils {
  static async getCacheSize() {
    if ('storage' in navigator && 'estimate' in navigator.storage) {
      const estimate = await navigator.storage.estimate();
      return {
        usage: estimate.usage,
        quota: estimate.quota,
        usageDetails: estimate.usageDetails
      };
    }
    return null;
  }

  static formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  static async displayCacheUsage() {
    const cacheSize = await this.getCacheSize();
    if (cacheSize) {
      const usageElement = document.querySelector('.cache-usage');
      if (usageElement) {
        usageElement.innerHTML = `
          <div>Cache Usage: ${this.formatBytes(cacheSize.usage)}</div>
          <div>Cache Quota: ${this.formatBytes(cacheSize.quota)}</div>
          <div>Usage Percentage: ${((cacheSize.usage / cacheSize.quota) * 100).toFixed(2)}%</div>
        `;
      }
    }
  }
}

// Initialize the app
const cacheTestApp = new CacheTestApp();
window.cacheTestApp = cacheTestApp;

// --- New Event Listener Logic ---
document.addEventListener('DOMContentLoaded', () => {
    console.log("DOM fully loaded and parsed");

    const runAllButton = document.getElementById('run-all-tests-btn');
    const clearHistoryButton = document.getElementById('clear-history-btn');

    if (runAllButton) {
        console.log("Found 'Run All Tests' button");
        runAllButton.addEventListener('click', () => {
            console.log("'Run All Tests' button clicked");
            if (window.comprehensiveTester) {
                window.comprehensiveTester.runComprehensiveTest();
            } else {
                console.error("comprehensiveTester is not available on the window object.");
            }
        });
    } else {
        console.error("'Run All Tests' button not found!");
    }

    if (clearHistoryButton) {
        console.log("Found 'Clear History' button");
        clearHistoryButton.addEventListener('click', () => {
            console.log("'Clear History' button clicked");
            if (window.clearAllResults) {
                window.clearAllResults();
            } else {
              // Fallback if the function isn't on window
              const testResults = document.getElementById('test-results');
              if(testResults) {
                testResults.innerHTML = `
                  <div class="empty-state">
                      <div class="empty-icon">🧪</div>
                      <div class="empty-title">No tests run yet</div>
                      <div class="empty-description">Click any test button to start analyzing cache behavior</div>
                  </div>
                `;
              }
            }
        });
    } else {
        console.error("'Clear History' button not found!");
    }

    // Connect the original logger to the new UI
    if (window.cacheTestApp) {
        const originalLogCacheTest = window.cacheTestApp.logCacheTest;
        window.cacheTestApp.logCacheTest = function(result) {
            addTestResultToHistory(result);
        };
    }
});

// Function to add results to the new UI, moved from index.html
function addTestResultToHistory(result) {
    const testResults = document.getElementById('test-results');
    if (!testResults) return;
    
    const emptyState = testResults.querySelector('.empty-state');
    if (emptyState) {
        emptyState.remove();
    }
    
    const resultItem = document.createElement('div');
    resultItem.className = 'test-result-item';
    
    // Check nested cached property
    const isCached = result.cached && (result.cached === true || result.cached.status === 'HIT' || result.cached.cacheable === true);
    const statusClass = isCached ? 'cached' : 'not-cached';
    const statusText = isCached ? 'CACHED' : 'NOT CACHED';
    const duration = result.duration ? result.duration.toFixed(2) : 'N/A';
    
    resultItem.innerHTML = `
        <div class="result-header">
            <div class="result-title">${result.type}</div>
            <div class="result-timestamp">${new Date(result.timestamp).toLocaleTimeString()}</div>
        </div>
        <div class="result-details">
            <span class="result-url">${result.url}</span>
            <div class="result-metrics">
                <span class="metric">Duration: ${duration}ms</span>
                <span class="metric">Status: ${result.status || 'Error'}</span>
                <span class="metric status ${statusClass}">${statusText}</span>
                ${result.fileSize ? `<span class="metric">Size: ${formatBytes(result.fileSize)}</span>` : ''}
            </div>
        </div>
    `;
    
    testResults.insertBefore(resultItem, testResults.firstChild);
    
    const items = testResults.querySelectorAll('.test-result-item');
    if (items.length > 50) {
        items[items.length - 1].remove();
    }
    
    if (window.testResults) {
      window.testResults.unshift(result);
      if (window.testResults.length > 50) {
          window.testResults.pop();
      }
    }
}

// Utility function moved from index.html
function formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

window.clearAllResults = function() {
  const testResults = document.getElementById('test-results');
  if (!testResults) return;
  testResults.innerHTML = `
      <div class="empty-state">
          <div class="empty-icon">🧪</div>
          <div class="empty-title">No tests run yet</div>
          <div class="empty-description">Click any test button to start analyzing cache behavior</div>
      </div>
  `;
  window.testResults = [];
}

// Export for testing
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { CacheTestApp, AnimationUtils, CacheUtils };
}