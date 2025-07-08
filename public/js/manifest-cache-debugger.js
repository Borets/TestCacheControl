// Manifest.json Cache Debugger
class ManifestCacheDebugger {
  constructor() {
    this.debugResults = {};
  }

  async debugManifestCaching() {
    console.log('🔍 Debugging manifest.json caching...');
    
    const results = {
      timestamp: new Date().toISOString(),
      tests: {}
    };

    try {
      // Test 1: Check server headers for manifest.json
      console.log('📋 Test 1: Checking server headers...');
      results.tests.serverHeaders = await this.checkServerHeaders();
      
      // Test 2: Test actual caching behavior
      console.log('📋 Test 2: Testing caching behavior...');
      results.tests.cachingBehavior = await this.testCachingBehavior();
      
      // Test 3: Check browser-specific manifest handling
      console.log('📋 Test 3: Checking browser manifest handling...');
      results.tests.browserHandling = await this.checkBrowserHandling();
      
      // Test 4: Test path matching
      console.log('📋 Test 4: Testing server path matching...');
      results.tests.pathMatching = await this.testPathMatching();
      
      this.debugResults = results;
      this.displayResults(results);
      
      return results;
      
    } catch (error) {
      console.error('Manifest debugging failed:', error);
      return { error: error.message };
    }
  }

  async checkServerHeaders() {
    try {
      const response = await fetch('/manifest.json', {
        method: 'HEAD',
        cache: 'no-cache'
      });
      
      const headers = Object.fromEntries(response.headers.entries());
      
      return {
        success: true,
        status: response.status,
        headers: headers,
        cacheControl: headers['cache-control'],
        sMaxAge: this.extractSMaxAge(headers['cache-control']),
        etag: headers['etag'],
        lastModified: headers['last-modified'],
        cfCacheStatus: headers['cf-cache-status'],
        analysis: this.analyzeHeaders(headers)
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  async testCachingBehavior() {
    try {
      // First request
      const start1 = performance.now();
      const response1 = await fetch('/manifest.json', { cache: 'no-cache' });
      const end1 = performance.now();
      const manifest1 = await response1.json();
      
      // Wait a bit
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Second request
      const start2 = performance.now();
      const response2 = await fetch('/manifest.json');
      const end2 = performance.now();
      const manifest2 = await response2.json();
      
      const timeDiff = (end1 - start1) - (end2 - start2);
      const speedup = ((end1 - start1) / (end2 - start2)) - 1;
      
      return {
        success: true,
        firstRequest: {
          duration: end1 - start1,
          headers: Object.fromEntries(response1.headers.entries()),
          cfCacheStatus: response1.headers.get('cf-cache-status')
        },
        secondRequest: {
          duration: end2 - start2,
          headers: Object.fromEntries(response2.headers.entries()),
          cfCacheStatus: response2.headers.get('cf-cache-status')
        },
        performance: {
          timeDifference: timeDiff,
          speedupPercentage: speedup * 100,
          significantlyFaster: timeDiff > 10 && speedup > 0.2
        },
        contentMatches: JSON.stringify(manifest1) === JSON.stringify(manifest2)
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  async checkBrowserHandling() {
    const browserInfo = {
      userAgent: navigator.userAgent,
      browser: this.detectBrowser(),
      platform: navigator.platform,
      cookiesEnabled: navigator.cookieEnabled,
      onLine: navigator.onLine
    };

    // Check if this is a PWA context
    const isPWA = window.matchMedia('(display-mode: standalone)').matches ||
                  window.navigator.standalone ||
                  document.referrer.includes('android-app://');

    // Check service worker registration
    let serviceWorkerInfo = null;
    if ('serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.getRegistration();
        serviceWorkerInfo = {
          registered: !!registration,
          active: !!registration?.active,
          scope: registration?.scope
        };
      } catch (e) {
        serviceWorkerInfo = { error: e.message };
      }
    }

    return {
      success: true,
      browser: browserInfo,
      isPWA: isPWA,
      serviceWorker: serviceWorkerInfo,
      manifestSpecialHandling: this.getManifestSpecialHandling(browserInfo.browser)
    };
  }

  async testPathMatching() {
    // Test different path variations to see if server path matching works correctly
    const pathVariations = [
      '/manifest.json',
      '/MANIFEST.JSON',
      '/manifest.JSON',
      '/Manifest.json'
    ];

    const results = {};
    
    for (const path of pathVariations) {
      try {
        const response = await fetch(path, { method: 'HEAD' });
        results[path] = {
          status: response.status,
          cacheControl: response.headers.get('cache-control'),
          found: response.status === 200
        };
      } catch (error) {
        results[path] = {
          error: error.message,
          found: false
        };
      }
    }

    return {
      success: true,
      pathTests: results,
      analysis: this.analyzePathMatching(results)
    };
  }

  extractSMaxAge(cacheControl) {
    if (!cacheControl) return null;
    const match = cacheControl.match(/s-maxage=(\d+)/i);
    return match ? parseInt(match[1]) : null;
  }

  analyzeHeaders(headers) {
    const cacheControl = headers['cache-control'];
    const analysis = {
      hasPositiveCaching: false,
      reasons: []
    };

    if (!cacheControl) {
      analysis.reasons.push('❌ No Cache-Control header');
      return analysis;
    }

    if (cacheControl.includes('no-cache')) {
      analysis.reasons.push('❌ Contains no-cache directive');
    } else if (cacheControl.includes('no-store')) {
      analysis.reasons.push('❌ Contains no-store directive');
    } else if (cacheControl.includes('private')) {
      analysis.reasons.push('⚠️ Contains private directive (CDN won\'t cache)');
    } else if (cacheControl.includes('public')) {
      analysis.hasPositiveCaching = true;
      analysis.reasons.push('✅ Contains public directive');
      
      const maxAge = cacheControl.match(/max-age=(\d+)/);
      if (maxAge) {
        const seconds = parseInt(maxAge[1]);
        const hours = Math.round(seconds / 3600);
        analysis.reasons.push(`✅ max-age: ${seconds}s (${hours} hours)`);
      }
      
      const sMaxAge = cacheControl.match(/s-maxage=(\d+)/);
      if (sMaxAge) {
        const seconds = parseInt(sMaxAge[1]);
        const hours = Math.round(seconds / 3600);
        analysis.reasons.push(`✅ s-maxage: ${seconds}s (${hours} hours)`);
      }
    }

    if (headers['etag']) {
      analysis.reasons.push('✅ Has ETag for conditional requests');
    }

    if (headers['last-modified']) {
      analysis.reasons.push('✅ Has Last-Modified for conditional requests');
    }

    return analysis;
  }

  analyzePathMatching(results) {
    const working = Object.entries(results).filter(([path, result]) => result.found);
    const notWorking = Object.entries(results).filter(([path, result]) => !result.found);
    
    return {
      workingPaths: working.length,
      totalPaths: Object.keys(results).length,
      caseSensitive: working.length < Object.keys(results).length,
      workingVariations: working.map(([path]) => path),
      issues: notWorking.length > 0 ? 'Some path variations not working' : 'All paths working'
    };
  }

  detectBrowser() {
    const ua = navigator.userAgent;
    if (ua.includes('Chrome')) return 'Chrome';
    if (ua.includes('Firefox')) return 'Firefox';
    if (ua.includes('Safari')) return 'Safari';
    if (ua.includes('Edge')) return 'Edge';
    return 'Unknown';
  }

  getManifestSpecialHandling(browser) {
    const specialHandling = {
      'Chrome': 'Chrome may bypass manifest cache when checking for PWA updates',
      'Firefox': 'Firefox caches manifest normally but may revalidate for PWA context',
      'Safari': 'Safari has limited PWA support, may not cache manifest aggressively',
      'Edge': 'Edge follows Chrome behavior for manifest caching'
    };
    
    return specialHandling[browser] || 'Unknown browser behavior';
  }

  displayResults(results) {
    const container = this.createResultsContainer();
    
    container.innerHTML = `
      <div class="manifest-debug-results">
        <h3>🔍 Manifest.json Cache Debug Report</h3>
        
        <div class="debug-summary">
          ${this.renderServerHeadersResults(results.tests.serverHeaders)}
          ${this.renderCachingBehaviorResults(results.tests.cachingBehavior)}
          ${this.renderBrowserHandlingResults(results.tests.browserHandling)}
          ${this.renderPathMatchingResults(results.tests.pathMatching)}
        </div>
        
        <div class="debug-recommendations">
          <h4>🛠️ Recommendations</h4>
          ${this.generateRecommendations(results)}
        </div>
        
        <div class="debug-actions">
          <button class="btn" onclick="manifestDebugger.debugManifestCaching()">🔄 Run Again</button>
          <button class="btn" onclick="manifestDebugger.exportResults()">📄 Export Report</button>
        </div>
      </div>
    `;
  }

  renderServerHeadersResults(result) {
    if (!result.success) {
      return `<div class="debug-section error">
        <h4>❌ Server Headers Test Failed</h4>
        <p>Error: ${result.error}</p>
      </div>`;
    }

    return `<div class="debug-section ${result.analysis.hasPositiveCaching ? 'success' : 'warning'}">
      <h4>📋 Server Headers Analysis</h4>
      <div class="header-details">
        <div><strong>Status:</strong> ${result.status}</div>
        <div><strong>Cache-Control:</strong> <code>${result.cacheControl || 'Not set'}</code></div>
        <div><strong>ETag:</strong> <code>${result.etag || 'Not set'}</code></div>
        <div><strong>CF-Cache-Status:</strong> <code>${result.cfCacheStatus || 'Not present'}</code></div>
      </div>
      <div class="analysis-results">
        ${result.analysis.reasons.map(reason => `<div>${reason}</div>`).join('')}
      </div>
    </div>`;
  }

  renderCachingBehaviorResults(result) {
    if (!result.success) {
      return `<div class="debug-section error">
        <h4>❌ Caching Behavior Test Failed</h4>
        <p>Error: ${result.error}</p>
      </div>`;
    }

    const isCached = result.performance.significantlyFaster || 
                    (result.secondRequest.cfCacheStatus === 'HIT');

    return `<div class="debug-section ${isCached ? 'success' : 'warning'}">
      <h4>⚡ Caching Behavior Analysis</h4>
      <div class="performance-comparison">
        <div><strong>First Request:</strong> ${result.firstRequest.duration.toFixed(2)}ms</div>
        <div><strong>Second Request:</strong> ${result.secondRequest.duration.toFixed(2)}ms</div>
        <div><strong>Speed Difference:</strong> ${result.performance.speedupPercentage.toFixed(1)}%</div>
        <div><strong>Cloudflare Status:</strong> ${result.firstRequest.cfCacheStatus || 'N/A'} → ${result.secondRequest.cfCacheStatus || 'N/A'}</div>
      </div>
      <div class="caching-verdict">
        ${isCached ? '✅ Manifest appears to be cached' : '⚠️ Manifest may not be cached effectively'}
      </div>
    </div>`;
  }

  renderBrowserHandlingResults(result) {
    return `<div class="debug-section info">
      <h4>🌐 Browser Handling Analysis</h4>
      <div class="browser-details">
        <div><strong>Browser:</strong> ${result.browser.browser}</div>
        <div><strong>PWA Context:</strong> ${result.isPWA ? 'Yes' : 'No'}</div>
        <div><strong>Service Worker:</strong> ${result.serviceWorker?.registered ? 'Registered' : 'Not registered'}</div>
      </div>
      <div class="special-handling">
        <strong>Special Handling:</strong> ${result.manifestSpecialHandling}
      </div>
    </div>`;
  }

  renderPathMatchingResults(result) {
    const allWorking = result.analysis.workingPaths === result.analysis.totalPaths;
    
    return `<div class="debug-section ${allWorking ? 'success' : 'warning'}">
      <h4>🛤️ Path Matching Analysis</h4>
      <div class="path-results">
        <div><strong>Working Paths:</strong> ${result.analysis.workingPaths}/${result.analysis.totalPaths}</div>
        <div><strong>Case Sensitive:</strong> ${result.analysis.caseSensitive ? 'Yes' : 'No'}</div>
      </div>
      ${!allWorking ? '<div class="path-issue">⚠️ Some path variations not working - check server case sensitivity</div>' : ''}
    </div>`;
  }

  generateRecommendations(results) {
    const recommendations = [];
    
    // Check server headers
    if (!results.tests.serverHeaders?.analysis?.hasPositiveCaching) {
      recommendations.push('🔧 Fix server cache headers - manifest.json should have positive caching directives');
    }
    
    // Check caching effectiveness
    if (!results.tests.cachingBehavior?.performance?.significantlyFaster) {
      recommendations.push('⚡ Manifest is not being cached effectively - check Cloudflare configuration');
    }
    
    // Check browser-specific issues
    if (results.tests.browserHandling?.browser?.browser === 'Chrome') {
      recommendations.push('🌐 Chrome may bypass manifest cache for PWA updates - this might be expected behavior');
    }
    
    // Check path matching
    if (results.tests.pathMatching?.analysis?.caseSensitive) {
      recommendations.push('🛤️ Server path matching is case sensitive - ensure consistent casing');
    }
    
    if (recommendations.length === 0) {
      recommendations.push('✅ No issues detected - manifest caching appears to be configured correctly');
    }
    
    return recommendations.map(rec => `<div class="recommendation">${rec}</div>`).join('');
  }

  createResultsContainer() {
    let container = document.getElementById('manifest-debug-results');
    if (!container) {
      container = document.createElement('div');
      container.id = 'manifest-debug-results';
      container.className = 'manifest-debug-container';
      
      const resultsSection = document.getElementById('results');
      if (resultsSection) {
        resultsSection.parentNode.insertBefore(container, resultsSection.nextSibling);
      } else {
        document.querySelector('main').appendChild(container);
      }
    }
    return container;
  }

  exportResults() {
    const blob = new Blob([JSON.stringify(this.debugResults, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `manifest-cache-debug-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }
}

// Initialize the debugger
const manifestDebugger = new ManifestCacheDebugger();
window.manifestDebugger = manifestDebugger; 