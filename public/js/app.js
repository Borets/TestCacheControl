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

    // Test cache buttons
    document.addEventListener('click', (e) => {
      if (e.target.classList.contains('test-cache-btn')) {
        this.runCacheTest(e.target.dataset.testType);
      }
    });

    // Clear cache button
    document.addEventListener('click', (e) => {
      if (e.target.classList.contains('clear-cache-btn')) {
        this.clearCache();
      }
    });
  }

  setupUI() {
    this.addTestButtons();
    this.displayCacheInfo();
    this.setupRealTimeUpdates();
  }

  addTestButtons() {
    const testContainer = document.querySelector('.test-container');
    if (!testContainer) return;

    const testTypes = [
      { type: 'max-age', label: 'Test Max-Age Cache' },
      { type: 'no-cache', label: 'Test No-Cache' },
      { type: 'public', label: 'Test Public Cache' },
      { type: 'private', label: 'Test Private Cache' },
      { type: 'immutable', label: 'Test Immutable Cache' }
    ];

    testTypes.forEach(test => {
      const button = document.createElement('button');
      button.className = 'btn test-cache-btn';
      button.dataset.testType = test.type;
      button.textContent = test.label;
      testContainer.appendChild(button);
    });
  }

  async runCacheTest(testType) {
    const startTime = performance.now();
    const testUrl = `/api/cache-test/${testType}`;
    
    try {
      const response = await fetch(testUrl);
      const data = await response.json();
      const endTime = performance.now();
      
      this.logCacheTest({
        type: testType,
        url: testUrl,
        duration: endTime - startTime,
        headers: Object.fromEntries(response.headers.entries()),
        cached: response.headers.get('x-cache') === 'HIT',
        status: response.status,
        data: data
      });
    } catch (error) {
      console.error('Cache test failed:', error);
      this.logCacheTest({
        type: testType,
        url: testUrl,
        error: error.message,
        cached: false
      });
    }
  }

  logCacheTest(result) {
    const testResults = document.querySelector('.test-results');
    if (!testResults) return;

    const testItem = document.createElement('div');
    testItem.className = 'test-item';
    testItem.innerHTML = `
      <div class="test-info">
        <div class="test-name">${result.type} Test</div>
        <div class="test-details">
          <span>Duration: ${result.duration?.toFixed(2)}ms</span>
          <span>Status: ${result.status || 'Error'}</span>
          <span>Cached: ${result.cached ? 'Yes' : 'No'}</span>
        </div>
      </div>
      <div class="test-result ${result.cached ? 'passed' : 'failed'}">
        ${result.cached ? 'CACHED' : 'NOT CACHED'}
      </div>
    `;

    testResults.insertBefore(testItem, testResults.firstChild);
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

    const infoContainer = document.querySelector('.cache-info');
    if (infoContainer) {
      infoContainer.innerHTML = `
        <h3>Browser Cache Information</h3>
        <pre>${JSON.stringify(cacheInfo, null, 2)}</pre>
      `;
    }
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
    const tests = [
      '/api/cache-test/max-age',
      '/api/cache-test/no-cache',
      '/api/cache-test/public',
      '/api/cache-test/private'
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
const app = new CacheTestApp();

// Export for testing
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { CacheTestApp, AnimationUtils, CacheUtils };
}