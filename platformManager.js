/**
 * Platform Manager
 * Coordinates platform detection and adapter management
 * Provides unified interface for Chrome extension
 */

(function(global) {
  'use strict';
  
  class PlatformManager {
  constructor() {
    this.adapter = null;
    this.platform = null;
    this.initialized = false;
    this.initPromise = null;
    this.errorCount = 0;
    this.maxErrors = 3;
    this.retryDelay = 1000;
    
    // Event listeners
    this.eventListeners = new Map();
    
    // Performance metrics
    this.metrics = {
      initTime: 0,
      detectionTime: 0,
      adapterLoadTime: 0,
      operationCounts: {},
      errorCounts: {}
    };
  }
  
  /**
   * Initialize platform manager
   */
  async initialize() {
    // Return existing promise if initialization is in progress
    if (this.initPromise) {
      return this.initPromise;
    }
    
    // Return immediately if already initialized
    if (this.initialized && this.adapter) {
      return true;
    }
    
    this.initPromise = this._performInitialization();
    return this.initPromise;
  }
  
  /**
   * Perform actual initialization
   */
  async _performInitialization() {
    const startTime = performance.now();
    
    try {
      // Detect platform
      console.log('GPT Assistant: Detecting platform...');
      const detectionStart = performance.now();
      const PlatformDetector = global.PlatformDetector || window.PlatformDetector;
      if (!PlatformDetector) {
        throw new Error('PlatformDetector not loaded');
      }
      this.platform = await PlatformDetector.detectPlatform();
      this.metrics.detectionTime = performance.now() - detectionStart;
      
      if (!this.platform) {
        console.warn('GPT Assistant: Platform not supported on this page');
        return false;
      }
      
      console.log(`GPT Assistant: Detected platform - ${this.platform}`);
      
      // Load appropriate adapter
      const adapterStart = performance.now();
      const success = await this.loadAdapter();
      this.metrics.adapterLoadTime = performance.now() - adapterStart;
      
      if (!success) {
        throw new Error(`Failed to load adapter for ${this.platform}`);
      }
      
      // Mark as initialized
      this.initialized = true;
      this.metrics.initTime = performance.now() - startTime;
      
      console.log(`GPT Assistant: Initialized for ${this.platform} (${Math.round(this.metrics.initTime)}ms)`);
      
      // Emit initialization event
      this.emit('initialized', {
        platform: this.platform,
        metrics: this.metrics
      });
      
      return true;
      
    } catch (error) {
      console.error('GPT Assistant: Initialization error:', error);
      this.handleError('initialization', error);
      
      // Retry if under error threshold
      if (this.errorCount < this.maxErrors) {
        console.log(`GPT Assistant: Retrying initialization (attempt ${this.errorCount + 1}/${this.maxErrors})...`);
        await this.delay(this.retryDelay * this.errorCount);
        this.initPromise = null;
        return this.initialize();
      }
      
      return false;
    }
  }
  
  /**
   * Load platform-specific adapter
   */
  async loadAdapter() {
    try {
      // Get adapter classes from global scope
      const FreeScoutAdapter = global.FreeScoutAdapter || window.FreeScoutAdapter;
      const HelpScoutAdapter = global.HelpScoutAdapter || window.HelpScoutAdapter;
      
      switch (this.platform) {
        case 'freescout':
          if (!FreeScoutAdapter) {
            throw new Error('FreeScoutAdapter not loaded');
          }
          this.adapter = new FreeScoutAdapter();
          break;
          
        case 'helpscout':
          if (!HelpScoutAdapter) {
            throw new Error('HelpScoutAdapter not loaded');
          }
          this.adapter = new HelpScoutAdapter();
          break;
          
        default:
          throw new Error(`Unknown platform: ${this.platform}`);
      }
      
      // Set up adapter event forwarding
      this.setupAdapterEvents();
      
      // Wait for adapter to be ready
      if (this.adapter.initialize) {
        await this.adapter.initialize();
      }
      
      // Verify adapter is ready (optional check - don't fail if method doesn't exist)
      if (this.adapter.isReady && typeof this.adapter.isReady === 'function') {
        const isReady = this.adapter.isReady();
        if (!isReady) {
          console.warn(`GPT Assistant: ${this.platform} adapter not fully ready, but continuing initialization`);
          // Don't throw error - adapter may become ready later
        }
      }
      
      return true;
      
    } catch (error) {
      console.error(`GPT Assistant: Failed to load ${this.platform} adapter:`, error);
      this.adapter = null;
      return false;
    }
  }
  
  /**
   * Set up event forwarding from adapter
   */
  setupAdapterEvents() {
    if (!this.adapter) return;
    
    // Common events to forward
    const eventsToForward = [
      'editorChanged',
      'editorReady',
      'conversationLoaded',
      'replyGenerated',
      'error'
    ];
    
    eventsToForward.forEach(eventName => {
      if (this.adapter.addEventListener) {
        this.adapter.addEventListener(eventName, (data) => {
          this.emit(eventName, data);
        });
      }
    });
  }
  
  /**
   * Get current adapter
   */
  getAdapter() {
    if (!this.initialized || !this.adapter) {
      console.warn('GPT Assistant: Platform manager not initialized');
      return null;
    }
    return this.adapter;
  }
  
  /**
   * Get current platform
   */
  getPlatform() {
    return this.platform;
  }
  
  /**
   * Check if manager is initialized
   */
  isInitialized() {
    return this.initialized && this.adapter !== null;
  }
  
  /**
   * Extract conversation thread
   */
  async extractThread() {
    return this.executeAdapterMethod('extractThread', []);
  }
  
  /**
   * Inject reply into editor
   */
  async injectReply(reply) {
    return this.executeAdapterMethod('injectReply', [reply]);
  }
  
  /**
   * Extract customer information
   */
  async extractCustomerInfo() {
    return this.executeAdapterMethod('extractCustomerInfo', []);
  }
  
  /**
   * Get current user
   */
  async getCurrentUser() {
    return this.executeAdapterMethod('getCurrentUser', []);
  }
  
  /**
   * Get reply editor element
   */
  async getReplyEditor() {
    return this.executeAdapterMethod('getReplyEditor', []);
  }
  
  /**
   * Show generating status
   */
  async showGeneratingStatus() {
    return this.executeAdapterMethod('showGeneratingStatus', []);
  }
  
  /**
   * Clear generating status
   */
  async clearGeneratingStatus() {
    return this.executeAdapterMethod('clearGeneratingStatus', []);
  }
  
  /**
   * Get keyboard shortcuts
   */
  getKeyboardShortcuts() {
    if (!this.adapter) {
      return {
        generateReply: 'ctrl+shift+g',
        regenerate: 'ctrl+shift+r',
        copyReply: 'ctrl+shift+c',
        clearReply: 'ctrl+shift+x'
      };
    }
    
    return this.adapter.getKeyboardShortcuts ? 
           this.adapter.getKeyboardShortcuts() : 
           this.getKeyboardShortcuts();
  }
  
  /**
   * Execute adapter method with error handling
   */
  async executeAdapterMethod(methodName, args = []) {
    try {
      // Ensure initialization
      if (!this.initialized) {
        const success = await this.initialize();
        if (!success) {
          throw new Error('Failed to initialize platform manager');
        }
      }
      
      if (!this.adapter) {
        throw new Error('No adapter available');
      }
      
      if (typeof this.adapter[methodName] !== 'function') {
        throw new Error(`Method ${methodName} not available on ${this.platform} adapter`);
      }
      
      // Track operation metrics
      this.trackOperation(methodName);
      
      // Execute method
      const result = await this.adapter[methodName](...args);
      
      // Reset error count on success
      if (this.errorCount > 0) {
        this.errorCount = 0;
      }
      
      return result;
      
    } catch (error) {
      console.error(`GPT Assistant: Error executing ${methodName}:`, error);
      this.handleError(methodName, error);
      
      // Return sensible defaults based on method
      switch (methodName) {
        case 'extractThread':
          return [];
        case 'extractCustomerInfo':
        case 'getCurrentUser':
        case 'getReplyEditor':
          return null;
        case 'injectReply':
        case 'showGeneratingStatus':
        case 'clearGeneratingStatus':
          return false;
        default:
          return null;
      }
    }
  }
  
  /**
   * Track operation metrics
   */
  trackOperation(operation) {
    if (!this.metrics.operationCounts[operation]) {
      this.metrics.operationCounts[operation] = 0;
    }
    this.metrics.operationCounts[operation]++;
  }
  
  /**
   * Handle errors with tracking
   */
  handleError(operation, error) {
    this.errorCount++;
    
    if (!this.metrics.errorCounts[operation]) {
      this.metrics.errorCounts[operation] = 0;
    }
    this.metrics.errorCounts[operation]++;
    
    // Emit error event
    this.emit('error', {
      operation,
      error: error.message,
      errorCount: this.errorCount,
      platform: this.platform
    });
    
    // Log to Chrome extension error reporting if available
    if (chrome?.runtime?.sendMessage) {
      chrome.runtime.sendMessage({
        type: 'error',
        data: {
          operation,
          error: error.message,
          platform: this.platform,
          url: window.location.href
        }
      }).catch(() => {
        // Ignore messaging errors
      });
    }
  }
  
  /**
   * Add event listener
   */
  addEventListener(event, callback) {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, new Set());
    }
    this.eventListeners.get(event).add(callback);
  }
  
  /**
   * Remove event listener
   */
  removeEventListener(event, callback) {
    if (this.eventListeners.has(event)) {
      this.eventListeners.get(event).delete(callback);
    }
  }
  
  /**
   * Emit event
   */
  emit(event, data) {
    if (this.eventListeners.has(event)) {
      this.eventListeners.get(event).forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in event listener for ${event}:`, error);
        }
      });
    }
  }
  
  /**
   * Delay helper
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  
  /**
   * Reset platform manager
   */
  async reset() {
    console.log('GPT Assistant: Resetting platform manager...');
    
    // Clean up adapter
    if (this.adapter && this.adapter.cleanup) {
      this.adapter.cleanup();
    }
    
    // Reset state
    this.adapter = null;
    this.platform = null;
    this.initialized = false;
    this.initPromise = null;
    this.errorCount = 0;
    
    // Clear metrics
    this.metrics = {
      initTime: 0,
      detectionTime: 0,
      adapterLoadTime: 0,
      operationCounts: {},
      errorCounts: {}
    };
    
    // Clear cache in detector
    const PlatformDetector = global.PlatformDetector || window.PlatformDetector;
    if (PlatformDetector) {
      PlatformDetector.clearCache();
    }
    
    // Re-initialize
    return this.initialize();
  }
  
  /**
   * Get metrics
   */
  getMetrics() {
    return {
      ...this.metrics,
      platform: this.platform,
      initialized: this.initialized,
      errorCount: this.errorCount
    };
  }
  
  /**
   * Health check
   */
  async healthCheck() {
    const health = {
      status: 'unknown',
      platform: this.platform,
      initialized: this.initialized,
      adapterReady: false,
      canExtractThread: false,
      canInjectReply: false,
      errors: this.errorCount
    };
    
    try {
      if (!this.initialized) {
        health.status = 'not_initialized';
        return health;
      }
      
      if (!this.adapter) {
        health.status = 'no_adapter';
        return health;
      }
      
      // Check adapter readiness
      health.adapterReady = this.adapter.isReady ? this.adapter.isReady() : true;
      
      // Check core capabilities
      const editor = await this.getReplyEditor();
      health.canInjectReply = editor !== null;
      
      const thread = await this.extractThread();
      health.canExtractThread = Array.isArray(thread) && thread.length > 0;
      
      // Determine overall status
      if (health.adapterReady && (health.canExtractThread || health.canInjectReply)) {
        health.status = 'healthy';
      } else if (health.adapterReady) {
        health.status = 'partial';
      } else {
        health.status = 'unhealthy';
      }
      
    } catch (error) {
      health.status = 'error';
      health.error = error.message;
    }
    
    return health;
  }
}

  // Export singleton instance
  const platformManager = new PlatformManager();
  
  // Export to global scope
  global.platformManager = platformManager;
  global.PlatformManager = PlatformManager;
})(window);