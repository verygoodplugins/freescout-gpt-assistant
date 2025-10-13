/**
 * Platform Detection Module
 * Detects whether the current page is FreeScout or Help Scout
 * Includes caching and multiple fallback strategies
 */

(function(global) {
  'use strict';
  
  class PlatformDetector {
  // Cache platform detection result for performance
  static _cachedPlatform = null;
  static _cacheTimestamp = null;
  static CACHE_DURATION = 5 * 60 * 1000; // 5 minutes cache

  // Platform configuration
  static PLATFORM_PATTERNS = {
    freescout: {
      patterns: ['/conversation/*', '/mailbox/*'],
      urlIncludes: ['freescout', 'conversation'],
      // Add more specific patterns for self-hosted instances
      urlExcludes: ['helpscout.net', 'secure.helpscout.net']
    },
    helpscout: {
      patterns: ['/conversations/*', '/inboxes/*/views', '/conversation/*/'],
      urlIncludes: ['helpscout.net', 'secure.helpscout.net', 'helpscout.com']
    }
  };

  static DOM_MARKERS = {
    freescout: {
      selectors: [
        '.thread-item',
        '.note-editable',
        '#wordpress-freescout',
        '.thread-type-customer',
        '.thread-type-message'
      ],
      dataAttributes: ['data-conversation-id'],
      // Unique FreeScout identifiers
      uniqueMarkers: ['#conv-layout-main', '.conv-actions']
    },
    helpscout: {
      selectors: [
        '#mailbox',
        '.c-conversation',
        'section#wrap',
        '.c-thread-item',
        '.c-conversation-thread'
      ],
      dataAttributes: ['data-cy', 'data-bypass'],
      // Unique Help Scout identifiers
      uniqueMarkers: ['#AccountDropdown', '.c-nav-secondary']
    }
  };

  /**
   * Main detection method with caching
   * @returns {string|null} 'freescout', 'helpscout', or null
   */
  static detectPlatform() {
    // Check cache first
    if (this.isCacheValid()) {
      console.log('GPT Assistant: Using cached platform detection:', this._cachedPlatform);
      return this._cachedPlatform;
    }

    const url = window.location.href;
    const doc = document;
    
    console.log('GPT Assistant: Detecting platform for URL:', url);

    // Strategy 1: URL pattern detection (fastest)
    let urlDetection = this.detectByURL(url);
    
    // Strategy 2: DOM marker verification
    let domDetection = this.detectByDOM(doc);
    
    // Strategy 3: API/Global variable detection
    let apiDetection = this.detectByAPI();
    
    // Strategy 4: User configuration override (from storage)
    let userOverride = this.getUserOverride();

    // Combine detection strategies with confidence scoring
    let detectedPlatform = this.combineDetectionStrategies(
      urlDetection,
      domDetection,
      apiDetection,
      userOverride
    );

    // Cache the result
    this.cacheResult(detectedPlatform);
    
    return detectedPlatform;
  }

  /**
   * Check if cache is still valid
   */
  static isCacheValid() {
    if (!this._cachedPlatform || !this._cacheTimestamp) {
      return false;
    }
    
    const now = Date.now();
    return (now - this._cacheTimestamp) < this.CACHE_DURATION;
  }

  /**
   * Cache detection result
   */
  static cacheResult(platform) {
    this._cachedPlatform = platform;
    this._cacheTimestamp = Date.now();
  }

  /**
   * Clear cache (useful for testing or forced re-detection)
   */
  static clearCache() {
    this._cachedPlatform = null;
    this._cacheTimestamp = null;
  }

  /**
   * Detect platform by URL patterns
   */
  static detectByURL(url) {
    // Check for Help Scout first (more specific patterns)
    if (this.matchesPattern(url, this.PLATFORM_PATTERNS.helpscout)) {
      // Ensure it's not excluded
      if (!this.PLATFORM_PATTERNS.freescout.urlExcludes.some(exclude => url.includes(exclude))) {
        return null;
      }
      return 'helpscout';
    }
    
    // Check for FreeScout
    if (this.matchesPattern(url, this.PLATFORM_PATTERNS.freescout)) {
      // Ensure it's not a Help Scout URL
      if (!this.PLATFORM_PATTERNS.helpscout.urlIncludes.some(include => url.includes(include))) {
        return 'freescout';
      }
    }
    
    return null;
  }

  /**
   * Detect platform by DOM markers
   */
  static detectByDOM(doc) {
    // Check unique markers first for more accurate detection
    
    // Check Help Scout unique markers
    if (this.hasUniqueMarkers(doc, this.DOM_MARKERS.helpscout.uniqueMarkers)) {
      return 'helpscout';
    }
    
    // Check FreeScout unique markers
    if (this.hasUniqueMarkers(doc, this.DOM_MARKERS.freescout.uniqueMarkers)) {
      return 'freescout';
    }
    
    // Fall back to general markers with scoring
    const helpScoutScore = this.calculateDOMScore(doc, this.DOM_MARKERS.helpscout);
    const freeScoutScore = this.calculateDOMScore(doc, this.DOM_MARKERS.freescout);
    
    if (helpScoutScore > freeScoutScore && helpScoutScore > 0.5) {
      return 'helpscout';
    }
    
    if (freeScoutScore > helpScoutScore && freeScoutScore > 0.5) {
      return 'freescout';
    }
    
    return null;
  }

  /**
   * Detect platform by API/Global variables
   */
  static detectByAPI() {
    // Check for Help Scout specific globals
    if (window.hsGlobal || window.appData || window.HelpScout) {
      return 'helpscout';
    }
    
    // Check for FreeScout specific globals
    if (window.fsGlobal || window.FreeScout || window.Conversation) {
      return 'freescout';
    }
    
    // Check for platform-specific meta tags
    const metaTags = document.getElementsByTagName('meta');
    for (let meta of metaTags) {
      const content = meta.getAttribute('content') || '';
      const name = meta.getAttribute('name') || '';
      
      if (content.includes('Help Scout') || name.includes('helpscout')) {
        return 'helpscout';
      }
      
      if (content.includes('FreeScout') || name.includes('freescout')) {
        return 'freescout';
      }
    }
    
    return null;
  }

  /**
   * Get user override from storage (if configured)
   */
  static getUserOverride() {
    // This would be implemented to check chrome.storage for user preference
    // For now, return null to use auto-detection
    return null;
  }

  /**
   * Combine detection strategies with confidence scoring
   */
  static combineDetectionStrategies(urlDetection, domDetection, apiDetection, userOverride) {
    // User override takes precedence
    if (userOverride) {
      console.log('GPT Assistant: Using user override:', userOverride);
      return userOverride;
    }
    
    // Count votes for each platform
    const votes = {
      freescout: 0,
      helpscout: 0
    };
    
    if (urlDetection) votes[urlDetection]++;
    if (domDetection) votes[domDetection]++;
    if (apiDetection) votes[apiDetection]++;
    
    // API detection gets extra weight as it's most reliable
    if (apiDetection) votes[apiDetection]++;
    
    console.log('GPT Assistant: Detection votes:', votes);
    
    // Return platform with most votes
    if (votes.helpscout > votes.freescout) {
      return 'helpscout';
    }
    
    if (votes.freescout > votes.helpscout) {
      return 'freescout';
    }
    
    // If tied or no votes, return null
    return null;
  }

  /**
   * Match URL against patterns
   */
  static matchesPattern(url, patterns) {
    // Check URL includes
    const hasInclude = patterns.urlIncludes.some(pattern => url.includes(pattern));
    
    // Check URL patterns (with wildcards)
    const matchesPattern = patterns.patterns.some(pattern => {
      const regex = new RegExp(pattern.replace(/\*/g, '.*'));
      return regex.test(url);
    });
    
    return hasInclude || matchesPattern;
  }

  /**
   * Check for unique DOM markers
   */
  static hasUniqueMarkers(doc, markers) {
    return markers.some(selector => doc.querySelector(selector) !== null);
  }

  /**
   * Calculate DOM score based on markers
   */
  static calculateDOMScore(doc, markers) {
    let found = 0;
    let total = markers.selectors.length + markers.dataAttributes.length;
    
    // Check selectors
    markers.selectors.forEach(selector => {
      if (doc.querySelector(selector)) found++;
    });
    
    // Check data attributes
    markers.dataAttributes.forEach(attr => {
      if (doc.querySelector(`[${attr}]`)) found++;
    });
    
    return found / total;
  }

  /**
   * Wait for DOM to be ready for detection
   */
  static async waitForDOM() {
    return new Promise((resolve) => {
      if (document.readyState === 'complete' || document.readyState === 'interactive') {
        resolve();
      } else {
        document.addEventListener('DOMContentLoaded', resolve, { once: true });
      }
    });
  }

  /**
   * Detect platform with retry logic for SPAs
   */
  static async detectWithRetry(maxRetries = 3, delay = 1000) {
    await this.waitForDOM();
    
    for (let i = 0; i < maxRetries; i++) {
      const platform = this.detectPlatform();
      
      if (platform) {
        return platform;
      }
      
      // Wait before retry (DOM might still be loading in SPA)
      if (i < maxRetries - 1) {
        console.log(`GPT Assistant: Platform not detected, retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    console.warn('GPT Assistant: Could not detect platform after retries');
    return null;
  }
}

  // Export to global scope
  global.PlatformDetector = PlatformDetector;
})(window);