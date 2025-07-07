// Enhanced Cache Verification System
class EnhancedCacheVerifier {
  constructor() {
    this.cacheVerificationResults = new Map();
  }

  // True cache verification by making multiple requests
  async verifyActualCaching(url, testType = 'static-asset') {
    console.log(`🔍 Verifying actual caching for: ${url}`);
    
    try {
      // First request - fresh from server
      const firstRequest = await this.makeTimedRequest(url, { 
        cache: 'no-cache',
        headers: { 'Cache-Control': 'no-cache' }
      });
      
      // Small delay to ensure any cache writes complete
      await this.delay(200);
      
      // Second request - should be from cache if cacheable
      const secondRequest = await this.makeTimedRequest(url);
      
      // Third request with conditional headers (if ETags present)
      let conditionalRequest = null;
      if (firstRequest.etag) {
        conditionalRequest = await this.makeTimedRequest(url, {
          headers: { 'If-None-Match': firstRequest.etag }
        });
      }
      
      return this.analyzeCacheVerification(url, testType, {
        first: firstRequest,
        second: secondRequest,
        conditional: conditionalRequest
      });
      
    } catch (error) {
      return {
        url,
        testType,
        success: false,
        error: error.message,
        actualCaching: {
          verified: false,
          reason: 'Request failed'
        }
      };
    }
  }

  async makeTimedRequest(url, options = {}) {
    const startTime = performance.now();
    const requestStart = Date.now();
    
    try {
      const response = await fetch(url, options);
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      // Try to get response size
      let contentSize = 0;
      let content = null;
      
      try {
        if (response.headers.get('content-type')?.includes('application/json')) {
          content = await response.json();
          contentSize = JSON.stringify(content).length;
        } else {
          const blob = await response.blob();
          contentSize = blob.size;
        }
      } catch (e) {
        contentSize = parseInt(response.headers.get('content-length')) || 0;
      }
      
      return {
        success: true,
        status: response.status,
        duration,
        contentSize,
        content,
        headers: Object.fromEntries(response.headers.entries()),
        etag: response.headers.get('etag'),
        lastModified: response.headers.get('last-modified'),
        cacheControl: response.headers.get('cache-control'),
        cfCacheStatus: response.headers.get('cf-cache-status'),
        date: response.headers.get('date'),
        server: response.headers.get('server'),
        requestTimestamp: requestStart
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        duration: performance.now() - startTime
      };
    }
  }

  analyzeCacheVerification(url, testType, requests) {
    const { first, second, conditional } = requests;
    const analysis = {
      url,
      testType,
      requests: { first, second, conditional },
      actualCaching: {
        verified: false,
        browserCached: false,
        cdnCached: false,
        conditionalWorks: false,
        evidence: [],
        performance: {}
      }
    };

    // 1. CDN Cache Verification (Cloudflare)
    if (first.cfCacheStatus && second.cfCacheStatus) {
      analysis.actualCaching.cdnCached = second.cfCacheStatus === 'HIT';
      analysis.actualCaching.evidence.push({
        type: 'cdn-headers',
        result: `First: ${first.cfCacheStatus}, Second: ${second.cfCacheStatus}`,
        cached: analysis.actualCaching.cdnCached
      });
    }

    // 2. Response Time Analysis
    const timeDifference = first.duration - second.duration;
    const percentageSpeedup = (timeDifference / first.duration) * 100;
    
    analysis.actualCaching.performance = {
      firstRequestTime: first.duration,
      secondRequestTime: second.duration,
      timeDifference: timeDifference,
      percentageSpeedup: percentageSpeedup,
      significantlyFaster: timeDifference > 50 && percentageSpeedup > 20
    };

    if (analysis.actualCaching.performance.significantlyFaster) {
      analysis.actualCaching.browserCached = true;
      analysis.actualCaching.evidence.push({
        type: 'performance',
        result: `Second request ${percentageSpeedup.toFixed(1)}% faster (${timeDifference.toFixed(0)}ms)`,
        cached: true
      });
    }

    // 3. Content Freshness Analysis
    if (first.date && second.date) {
      const firstDate = new Date(first.date);
      const secondDate = new Date(second.date);
      const sameDate = Math.abs(firstDate - secondDate) < 2000; // Within 2 seconds
      
      if (sameDate && first.duration > 100 && second.duration < 50) {
        analysis.actualCaching.evidence.push({
          type: 'content-freshness',
          result: 'Same server date but much faster response suggests caching',
          cached: true
        });
      }
    }

    // 4. ETag/Conditional Request Verification
    if (conditional && conditional.status === 304) {
      analysis.actualCaching.conditionalWorks = true;
      analysis.actualCaching.evidence.push({
        type: 'conditional-request',
        result: 'ETag validation returned 304 Not Modified',
        cached: true
      });
    }

    // 5. Header Consistency Analysis
    if (first.cacheControl && second.cacheControl) {
      const hasPositiveCacheControl = !/(no-cache|no-store|private)/i.test(first.cacheControl);
      if (hasPositiveCacheControl) {
        analysis.actualCaching.evidence.push({
          type: 'cache-headers',
          result: `Positive cache-control: ${first.cacheControl}`,
          cached: hasPositiveCacheControl
        });
      }
    }

    // 6. Overall Verification
    const positiveEvidence = analysis.actualCaching.evidence.filter(e => e.cached).length;
    const strongEvidence = analysis.actualCaching.cdnCached || 
                          analysis.actualCaching.performance.significantlyFaster ||
                          analysis.actualCaching.conditionalWorks;

    analysis.actualCaching.verified = positiveEvidence >= 2 || strongEvidence;

    // 7. Detailed Assessment
    if (analysis.actualCaching.cdnCached) {
      analysis.actualCaching.level = 'CDN_CACHED';
      analysis.actualCaching.confidence = 'high';
    } else if (analysis.actualCaching.performance.significantlyFaster) {
      analysis.actualCaching.level = 'BROWSER_CACHED';
      analysis.actualCaching.confidence = 'medium';
    } else if (analysis.actualCaching.conditionalWorks) {
      analysis.actualCaching.level = 'CONDITIONAL_CACHED';
      analysis.actualCaching.confidence = 'medium';
    } else if (positiveEvidence > 0) {
      analysis.actualCaching.level = 'POSSIBLY_CACHED';
      analysis.actualCaching.confidence = 'low';
    } else {
      analysis.actualCaching.level = 'NOT_CACHED';
      analysis.actualCaching.confidence = 'high';
    }

    return analysis;
  }

  // Batch verification for multiple URLs
  async verifyMultipleResources(urls, testType = 'batch') {
    const results = [];
    
    for (let i = 0; i < urls.length; i++) {
      const url = urls[i];
      console.log(`🔍 Verifying ${i + 1}/${urls.length}: ${url}`);
      
      const result = await this.verifyActualCaching(url, testType);
      results.push(result);
      
      // Small delay between tests to avoid overwhelming server
      if (i < urls.length - 1) {
        await this.delay(300);
      }
    }
    
    return results;
  }

  // Generate enhanced cache report
  generateCacheVerificationReport(results) {
    const summary = {
      totalTests: results.length,
      actuallySeached: results.filter(r => r.actualCaching?.verified).length,
      cdnCached: results.filter(r => r.actualCaching?.cdnCached).length,
      browserCached: results.filter(r => r.actualCaching?.browserCached).length,
      conditionalCaching: results.filter(r => r.actualCaching?.conditionalWorks).length,
      notCached: results.filter(r => !r.actualCaching?.verified).length
    };

    const performanceStats = {
      averageFirstRequest: 0,
      averageSecondRequest: 0,
      averageSpeedup: 0,
      maxSpeedup: 0
    };

    let totalFirstTime = 0;
    let totalSecondTime = 0;
    let totalSpeedup = 0;
    let validPerfTests = 0;

    results.forEach(result => {
      if (result.actualCaching?.performance) {
        const perf = result.actualCaching.performance;
        totalFirstTime += perf.firstRequestTime || 0;
        totalSecondTime += perf.secondRequestTime || 0;
        totalSpeedup += perf.percentageSpeedup || 0;
        performanceStats.maxSpeedup = Math.max(performanceStats.maxSpeedup, perf.percentageSpeedup || 0);
        validPerfTests++;
      }
    });

    if (validPerfTests > 0) {
      performanceStats.averageFirstRequest = totalFirstTime / validPerfTests;
      performanceStats.averageSecondRequest = totalSecondTime / validPerfTests;
      performanceStats.averageSpeedup = totalSpeedup / validPerfTests;
    }

    return {
      summary,
      performanceStats,
      detailedResults: results,
      recommendations: this.generateEnhancedRecommendations(summary, performanceStats, results)
    };
  }

  generateEnhancedRecommendations(summary, performance, results) {
    const recommendations = [];

    // Cache verification rate
    const verificationRate = (summary.actuallySeached / summary.totalTests) * 100;
    if (verificationRate < 60) {
      recommendations.push({
        type: 'critical',
        category: 'Cache Verification',
        message: `Only ${verificationRate.toFixed(1)}% of resources are actually being cached. Review cache headers and configuration.`,
        priority: 'high'
      });
    }

    // CDN vs Browser caching
    if (summary.cdnCached === 0 && summary.browserCached > 0) {
      recommendations.push({
        type: 'warning',
        category: 'CDN Configuration',
        message: 'Resources are only browser-cached, not CDN-cached. Check Cloudflare configuration.',
        priority: 'medium'
      });
    }

    // Performance impact
    if (performance.averageSpeedup < 30) {
      recommendations.push({
        type: 'info',
        category: 'Performance Impact',
        message: `Cache speedup is only ${performance.averageSpeedup.toFixed(1)}%. Consider optimizing cache strategies.`,
        priority: 'medium'
      });
    }

    // Conditional caching
    if (summary.conditionalCaching === 0) {
      recommendations.push({
        type: 'info',
        category: 'Conditional Caching',
        message: 'No conditional caching detected. Consider implementing ETags for better cache validation.',
        priority: 'low'
      });
    }

    return recommendations;
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Integration with existing comprehensive tester
if (window.comprehensiveTester) {
  // Add enhanced verification to the existing tester
  window.comprehensiveTester.enhancedVerifier = new EnhancedCacheVerifier();
  
  // Add method to run enhanced verification
  window.comprehensiveTester.runEnhancedVerification = async function() {
    console.log('🚀 Starting Enhanced Cache Verification...');
    
    // Test a subset of critical resources
    const criticalResources = [
      '/css/styles.css',
      '/js/app.js',
      '/images/logo.svg',
      '/api/cache-test/max-age',
      '/api/cache-test/s-maxage'
    ];
    
    const results = await this.enhancedVerifier.verifyMultipleResources(criticalResources, 'critical');
    const report = this.enhancedVerifier.generateCacheVerificationReport(results);
    
    // Store results
    this.enhancedVerificationResults = report;
    
    // Display results
    this.displayEnhancedResults(report);
    
    return report;
  };
  
  window.comprehensiveTester.displayEnhancedResults = function(report) {
    const container = document.getElementById('comprehensive-results');
    if (!container) return;
    
    const enhancedSection = document.createElement('div');
    enhancedSection.className = 'enhanced-verification-results';
    enhancedSection.innerHTML = `
      <div class="enhanced-header">
        <h4>🔍 Enhanced Cache Verification Results</h4>
        <p>Actual cache behavior analysis through dual-request testing</p>
      </div>
      
      <div class="verification-summary">
        <div class="verification-card">
          <div class="card-value">${report.summary.actuallySeached}</div>
          <div class="card-label">Actually Cached</div>
        </div>
        <div class="verification-card">
          <div class="card-value">${report.summary.cdnCached}</div>
          <div class="card-label">CDN Cached</div>
        </div>
        <div class="verification-card">
          <div class="card-value">${report.performanceStats.averageSpeedup.toFixed(1)}%</div>
          <div class="card-label">Avg Speedup</div>
        </div>
      </div>
      
      <div class="verification-details">
        ${report.detailedResults.map(result => `
          <div class="verification-item ${result.actualCaching.verified ? 'verified' : 'not-verified'}">
            <div class="verification-header">
              <span class="resource-name">${result.url.split('/').pop()}</span>
              <span class="verification-status">${result.actualCaching.level}</span>
            </div>
            <div class="verification-evidence">
              ${result.actualCaching.evidence.map(evidence => `
                <span class="evidence ${evidence.cached ? 'positive' : 'negative'}">${evidence.result}</span>
              `).join('')}
            </div>
          </div>
        `).join('')}
      </div>
    `;
    
    container.appendChild(enhancedSection);
  };
}

// Export for standalone use
window.EnhancedCacheVerifier = EnhancedCacheVerifier; 