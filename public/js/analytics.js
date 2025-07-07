// Analytics and Performance Tracking - Cache Testing App

class CacheAnalytics {
  constructor() {
    this.events = [];
    this.sessionId = this.generateSessionId();
    this.startTime = Date.now();
    this.init();
  }

  init() {
    this.setupEventListeners();
    this.startPerformanceMonitoring();
    this.trackPageLoad();
  }

  generateSessionId() {
    return `cache_test_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  setupEventListeners() {
    // Track cache test events
    document.addEventListener('click', (e) => {
      if (e.target.classList.contains('test-cache-btn')) {
        this.trackEvent('cache_test_initiated', {
          testType: e.target.dataset.testType,
          timestamp: Date.now()
        });
      }
    });

    // Track page visibility changes
    document.addEventListener('visibilitychange', () => {
      this.trackEvent('page_visibility_change', {
        hidden: document.hidden,
        timestamp: Date.now()
      });
    });

    // Track network changes
    window.addEventListener('online', () => {
      this.trackEvent('network_online', { timestamp: Date.now() });
    });

    window.addEventListener('offline', () => {
      this.trackEvent('network_offline', { timestamp: Date.now() });
    });
  }

  trackEvent(eventName, eventData = {}) {
    const event = {
      id: this.generateEventId(),
      sessionId: this.sessionId,
      name: eventName,
      data: eventData,
      timestamp: Date.now(),
      url: window.location.href,
      userAgent: navigator.userAgent,
      referrer: document.referrer
    };

    this.events.push(event);
    this.sendEvent(event);
    console.log('Analytics Event:', event);
  }

  generateEventId() {
    return `event_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
  }

  async sendEvent(event) {
    try {
      // In a real app, this would send to your analytics service
      await fetch('/api/analytics', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache'
        },
        body: JSON.stringify(event)
      });
    } catch (error) {
      console.error('Failed to send analytics event:', error);
    }
  }

  trackPageLoad() {
    window.addEventListener('load', () => {
      const loadTime = Date.now() - this.startTime;
      this.trackEvent('page_load_complete', {
        loadTime,
        timestamp: Date.now(),
        performance: this.getPerformanceMetrics()
      });
    });
  }

  getPerformanceMetrics() {
    const navigation = performance.getEntriesByType('navigation')[0];
    const paint = performance.getEntriesByType('paint');
    
    return {
      domContentLoaded: navigation?.domContentLoadedEventEnd - navigation?.domContentLoadedEventStart,
      loadComplete: navigation?.loadEventEnd - navigation?.loadEventStart,
      firstPaint: paint.find(p => p.name === 'first-paint')?.startTime,
      firstContentfulPaint: paint.find(p => p.name === 'first-contentful-paint')?.startTime,
      resourceCount: performance.getEntriesByType('resource').length,
      cachedResourceCount: performance.getEntriesByType('resource').filter(r => 
        r.transferSize === 0 && r.encodedBodySize > 0
      ).length
    };
  }

  startPerformanceMonitoring() {
    // Monitor resource loading
    const resourceObserver = new PerformanceObserver((list) => {
      list.getEntries().forEach((entry) => {
        if (entry.entryType === 'resource') {
          this.trackResourceLoad(entry);
        }
      });
    });

    resourceObserver.observe({ entryTypes: ['resource'] });

    // Monitor long tasks
    if ('PerformanceObserver' in window) {
      const longTaskObserver = new PerformanceObserver((list) => {
        list.getEntries().forEach((entry) => {
          if (entry.duration > 50) {
            this.trackEvent('long_task', {
              duration: entry.duration,
              startTime: entry.startTime,
              name: entry.name
            });
          }
        });
      });

      try {
        longTaskObserver.observe({ entryTypes: ['longtask'] });
      } catch (e) {
        console.log('Long task monitoring not supported');
      }
    }
  }

  trackResourceLoad(entry) {
    const isCached = entry.transferSize === 0 && entry.encodedBodySize > 0;
    
    this.trackEvent('resource_load', {
      url: entry.name,
      duration: entry.duration,
      transferSize: entry.transferSize,
      encodedBodySize: entry.encodedBodySize,
      decodedBodySize: entry.decodedBodySize,
      cached: isCached,
      initiatorType: entry.initiatorType,
      responseStart: entry.responseStart,
      responseEnd: entry.responseEnd
    });
  }

  trackCacheTest(testType, result) {
    this.trackEvent('cache_test_result', {
      testType,
      success: result.success,
      duration: result.duration,
      cached: result.cached,
      status: result.status,
      headers: result.headers,
      errorMessage: result.error
    });
  }

  getSessionSummary() {
    const sessionDuration = Date.now() - this.startTime;
    const eventCounts = this.events.reduce((counts, event) => {
      counts[event.name] = (counts[event.name] || 0) + 1;
      return counts;
    }, {});

    return {
      sessionId: this.sessionId,
      duration: sessionDuration,
      eventCount: this.events.length,
      eventCounts,
      performance: this.getPerformanceMetrics(),
      userAgent: navigator.userAgent,
      timestamp: Date.now()
    };
  }

  exportData() {
    const data = {
      session: this.getSessionSummary(),
      events: this.events,
      performance: this.getPerformanceMetrics()
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cache-test-analytics-${this.sessionId}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }
}

// Real User Monitoring (RUM) utilities
class RUMCollector {
  constructor() {
    this.metrics = new Map();
    this.init();
  }

  init() {
    this.collectVitals();
    this.setupObservers();
  }

  collectVitals() {
    // Collect Web Vitals
    this.observePerformance('largest-contentful-paint', (entries) => {
      const lcp = entries[entries.length - 1];
      this.metrics.set('LCP', lcp.startTime);
    });

    this.observePerformance('first-input', (entries) => {
      const fid = entries[0];
      this.metrics.set('FID', fid.processingStart - fid.startTime);
    });

    this.observePerformance('layout-shift', (entries) => {
      let cls = 0;
      entries.forEach(entry => {
        if (!entry.hadRecentInput) {
          cls += entry.value;
        }
      });
      this.metrics.set('CLS', cls);
    });
  }

  observePerformance(entryType, callback) {
    try {
      const observer = new PerformanceObserver((list) => {
        callback(list.getEntries());
      });
      observer.observe({ entryTypes: [entryType] });
    } catch (e) {
      console.log(`Performance observer for ${entryType} not supported`);
    }
  }

  setupObservers() {
    // Memory usage monitoring
    if ('memory' in performance) {
      setInterval(() => {
        this.metrics.set('memory', {
          usedJSHeapSize: performance.memory.usedJSHeapSize,
          totalJSHeapSize: performance.memory.totalJSHeapSize,
          jsHeapSizeLimit: performance.memory.jsHeapSizeLimit
        });
      }, 10000);
    }

    // Connection monitoring
    if ('connection' in navigator) {
      this.metrics.set('connection', {
        effectiveType: navigator.connection.effectiveType,
        downlink: navigator.connection.downlink,
        rtt: navigator.connection.rtt
      });
    }
  }

  getMetrics() {
    return Object.fromEntries(this.metrics);
  }
}

// Error tracking
class ErrorTracker {
  constructor() {
    this.errors = [];
    this.init();
  }

  init() {
    window.addEventListener('error', (e) => {
      this.trackError({
        type: 'javascript',
        message: e.message,
        filename: e.filename,
        lineno: e.lineno,
        colno: e.colno,
        stack: e.error?.stack,
        timestamp: Date.now()
      });
    });

    window.addEventListener('unhandledrejection', (e) => {
      this.trackError({
        type: 'promise',
        message: e.reason?.message || 'Unhandled Promise Rejection',
        stack: e.reason?.stack,
        timestamp: Date.now()
      });
    });
  }

  trackError(error) {
    this.errors.push(error);
    console.error('Error tracked:', error);
    
    // Send to analytics
    if (window.cacheAnalytics) {
      window.cacheAnalytics.trackEvent('error', error);
    }
  }

  getErrors() {
    return this.errors;
  }
}

// Initialize analytics
const cacheAnalytics = new CacheAnalytics();
const rumCollector = new RUMCollector();
const errorTracker = new ErrorTracker();

// Make available globally
window.cacheAnalytics = cacheAnalytics;
window.rumCollector = rumCollector;
window.errorTracker = errorTracker;

// Export for testing
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    CacheAnalytics,
    RUMCollector,
    ErrorTracker
  };
}