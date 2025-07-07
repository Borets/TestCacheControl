// Utility Functions - Cache Testing App

// HTTP Cache Utilities
const CacheHeaders = {
  /**
   * Parse Cache-Control header string into object
   * @param {string} cacheControl - Cache-Control header value
   * @returns {Object} Parsed cache control directives
   */
  parseCacheControl(cacheControl) {
    if (!cacheControl) return {};
    
    const directives = {};
    const parts = cacheControl.split(',').map(part => part.trim());
    
    parts.forEach(part => {
      const [key, value] = part.split('=').map(s => s.trim());
      if (value) {
        directives[key] = isNaN(value) ? value : parseInt(value);
      } else {
        directives[key] = true;
      }
    });
    
    return directives;
  },

  /**
   * Check if resource is cacheable based on headers
   * @param {Headers} headers - Response headers
   * @returns {boolean} Whether resource is cacheable
   */
  isCacheable(headers) {
    const cacheControl = headers.get('cache-control');
    if (!cacheControl) return false;
    
    const directives = this.parseCacheControl(cacheControl);
    
    // Not cacheable if no-store or private
    if (directives['no-store'] || directives['private']) {
      return false;
    }
    
    // Cacheable if public or has max-age
    return directives['public'] || directives['max-age'] > 0;
  },

  /**
   * Get cache expiration time
   * @param {Headers} headers - Response headers
   * @returns {Date|null} Expiration date or null if not cacheable
   */
  getCacheExpiration(headers) {
    const cacheControl = headers.get('cache-control');
    if (!cacheControl) return null;
    
    const directives = this.parseCacheControl(cacheControl);
    
    if (directives['max-age']) {
      return new Date(Date.now() + directives['max-age'] * 1000);
    }
    
    const expires = headers.get('expires');
    if (expires) {
      return new Date(expires);
    }
    
    return null;
  }
};

// Performance Monitoring Utilities
const PerformanceUtils = {
  /**
   * Measure function execution time
   * @param {Function} fn - Function to measure
   * @param {string} name - Name for the measurement
   * @returns {Promise} Function result with timing
   */
  async measureAsync(fn, name = 'operation') {
    const start = performance.now();
    try {
      const result = await fn();
      const end = performance.now();
      console.log(`${name} took ${(end - start).toFixed(2)}ms`);
      return result;
    } catch (error) {
      const end = performance.now();
      console.error(`${name} failed after ${(end - start).toFixed(2)}ms:`, error);
      throw error;
    }
  },

  /**
   * Get resource timing information
   * @param {string} resourceUrl - URL of the resource
   * @returns {PerformanceResourceTiming|null} Timing information
   */
  getResourceTiming(resourceUrl) {
    const entries = performance.getEntriesByType('resource');
    return entries.find(entry => entry.name === resourceUrl) || null;
  },

  /**
   * Check if resource was served from cache
   * @param {string} resourceUrl - URL of the resource
   * @returns {boolean} Whether resource was cached
   */
  wasResourceCached(resourceUrl) {
    const timing = this.getResourceTiming(resourceUrl);
    if (!timing) return false;
    
    // If transferSize is 0 but encodedBodySize > 0, it was served from cache
    return timing.transferSize === 0 && timing.encodedBodySize > 0;
  },

  /**
   * Get all cached resources
   * @returns {Array} List of cached resources
   */
  getCachedResources() {
    const entries = performance.getEntriesByType('resource');
    return entries.filter(entry => 
      entry.transferSize === 0 && entry.encodedBodySize > 0
    );
  }
};

// DOM Utilities
const DOMUtils = {
  /**
   * Create element with attributes and content
   * @param {string} tag - HTML tag name
   * @param {Object} attributes - Element attributes
   * @param {string|Node} content - Element content
   * @returns {Element} Created element
   */
  createElement(tag, attributes = {}, content = '') {
    const element = document.createElement(tag);
    
    Object.entries(attributes).forEach(([key, value]) => {
      if (key === 'className') {
        element.className = value;
      } else if (key === 'dataset') {
        Object.entries(value).forEach(([dataKey, dataValue]) => {
          element.dataset[dataKey] = dataValue;
        });
      } else {
        element.setAttribute(key, value);
      }
    });
    
    if (typeof content === 'string') {
      element.innerHTML = content;
    } else if (content instanceof Node) {
      element.appendChild(content);
    }
    
    return element;
  },

  /**
   * Toggle class on element
   * @param {Element} element - Target element
   * @param {string} className - Class name to toggle
   * @param {boolean} force - Force add/remove
   */
  toggleClass(element, className, force) {
    if (force !== undefined) {
      element.classList.toggle(className, force);
    } else {
      element.classList.toggle(className);
    }
  },

  /**
   * Wait for element to be available
   * @param {string} selector - CSS selector
   * @param {number} timeout - Timeout in milliseconds
   * @returns {Promise<Element>} Promise resolving to element
   */
  waitForElement(selector, timeout = 5000) {
    return new Promise((resolve, reject) => {
      const element = document.querySelector(selector);
      if (element) {
        resolve(element);
        return;
      }
      
      const observer = new MutationObserver((mutations, obs) => {
        const element = document.querySelector(selector);
        if (element) {
          obs.disconnect();
          resolve(element);
        }
      });
      
      observer.observe(document.body, {
        childList: true,
        subtree: true
      });
      
      setTimeout(() => {
        observer.disconnect();
        reject(new Error(`Element ${selector} not found within ${timeout}ms`));
      }, timeout);
    });
  }
};

// Network Utilities
const NetworkUtils = {
  /**
   * Check network connection status
   * @returns {Object} Network information
   */
  getNetworkInfo() {
    return {
      online: navigator.onLine,
      connection: navigator.connection || navigator.mozConnection || navigator.webkitConnection,
      effectiveType: navigator.connection?.effectiveType || 'unknown',
      downlink: navigator.connection?.downlink || 'unknown',
      rtt: navigator.connection?.rtt || 'unknown'
    };
  },

  /**
   * Test network latency
   * @param {string} url - URL to test against
   * @returns {Promise<number>} Latency in milliseconds
   */
  async testLatency(url = '/api/ping') {
    const start = performance.now();
    try {
      await fetch(url, { method: 'HEAD' });
      return performance.now() - start;
    } catch (error) {
      throw new Error(`Latency test failed: ${error.message}`);
    }
  },

  /**
   * Monitor network changes
   * @param {Function} callback - Callback for network changes
   */
  onNetworkChange(callback) {
    window.addEventListener('online', () => callback({ online: true }));
    window.addEventListener('offline', () => callback({ online: false }));
    
    if (navigator.connection) {
      navigator.connection.addEventListener('change', () => {
        callback(this.getNetworkInfo());
      });
    }
  }
};

// Storage Utilities
const StorageUtils = {
  /**
   * Safe localStorage operations
   */
  local: {
    set(key, value) {
      try {
        localStorage.setItem(key, JSON.stringify(value));
        return true;
      } catch (error) {
        console.error('localStorage.setItem failed:', error);
        return false;
      }
    },

    get(key) {
      try {
        const item = localStorage.getItem(key);
        return item ? JSON.parse(item) : null;
      } catch (error) {
        console.error('localStorage.getItem failed:', error);
        return null;
      }
    },

    remove(key) {
      try {
        localStorage.removeItem(key);
        return true;
      } catch (error) {
        console.error('localStorage.removeItem failed:', error);
        return false;
      }
    },

    clear() {
      try {
        localStorage.clear();
        return true;
      } catch (error) {
        console.error('localStorage.clear failed:', error);
        return false;
      }
    }
  },

  /**
   * Safe sessionStorage operations
   */
  session: {
    set(key, value) {
      try {
        sessionStorage.setItem(key, JSON.stringify(value));
        return true;
      } catch (error) {
        console.error('sessionStorage.setItem failed:', error);
        return false;
      }
    },

    get(key) {
      try {
        const item = sessionStorage.getItem(key);
        return item ? JSON.parse(item) : null;
      } catch (error) {
        console.error('sessionStorage.getItem failed:', error);
        return null;
      }
    },

    remove(key) {
      try {
        sessionStorage.removeItem(key);
        return true;
      } catch (error) {
        console.error('sessionStorage.removeItem failed:', error);
        return false;
      }
    },

    clear() {
      try {
        sessionStorage.clear();
        return true;
      } catch (error) {
        console.error('sessionStorage.clear failed:', error);
        return false;
      }
    }
  }
};

// Date/Time Utilities
const DateUtils = {
  /**
   * Format date for cache headers
   * @param {Date} date - Date to format
   * @returns {string} Formatted date string
   */
  formatHTTPDate(date) {
    return date.toUTCString();
  },

  /**
   * Parse HTTP date string
   * @param {string} dateString - HTTP date string
   * @returns {Date} Parsed date
   */
  parseHTTPDate(dateString) {
    return new Date(dateString);
  },

  /**
   * Check if date is in the past
   * @param {Date} date - Date to check
   * @returns {boolean} Whether date is in the past
   */
  isPast(date) {
    return date < new Date();
  },

  /**
   * Get seconds until date
   * @param {Date} date - Target date
   * @returns {number} Seconds until date
   */
  getSecondsUntil(date) {
    return Math.max(0, Math.floor((date - new Date()) / 1000));
  }
};

// Export utilities
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    CacheHeaders,
    PerformanceUtils,
    DOMUtils,
    NetworkUtils,
    StorageUtils,
    DateUtils
  };
}