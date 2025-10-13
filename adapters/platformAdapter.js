/**
 * Base Platform Adapter Class
 * Abstract base class that defines the interface for platform-specific adapters
 * Includes common functionality and security measures
 */

(function(global) {
  'use strict';
  
  class PlatformAdapter {
  constructor() {
    // Cache for DOM queries to improve performance
    this._elementCache = new Map();
    this._cacheTimeout = 5000; // 5 seconds cache
    
    // Debounce timers
    this._debounceTimers = new Map();
    
    // Error tracking
    this._errors = [];
    this._maxErrors = 10;
  }

  // ============= Abstract Methods (must be implemented by subclasses) =============

  /**
   * Get the platform name
   * @returns {string} Platform identifier ('freescout' or 'helpscout')
   */
  getPlatformName() {
    throw new Error('getPlatformName() must be implemented by subclass');
  }

  /**
   * Extract conversation thread messages
   * @returns {Array} Array of message objects with role and content
   */
  extractThread() {
    throw new Error('extractThread() must be implemented by subclass');
  }

  /**
   * Get the reply editor element
   * @returns {HTMLElement|null} Editor element or null if not found
   */
  getReplyEditor() {
    throw new Error('getReplyEditor() must be implemented by subclass');
  }

  /**
   * Platform-specific customer info extraction
   * @returns {Object|null} Customer information object
   */
  extractPlatformCustomerInfo() {
    throw new Error('extractPlatformCustomerInfo() must be implemented by subclass');
  }

  // ============= Common Methods (shared functionality) =============

  /**
   * Initialize the adapter
   * @returns {Promise<boolean>} Success status
   */
  async initialize() {
    try {
      console.log(`GPT Assistant: Initializing ${this.getPlatformName()} adapter`);
      
      // Clear caches
      this.clearCache();
      
      // Platform-specific initialization
      if (this.platformInitialize) {
        await this.platformInitialize();
      }
      
      return true;
    } catch (error) {
      this.logError('Initialization failed', error);
      return false;
    }
  }

  /**
   * Static method to check if adapter can handle current page
   * @param {string} url - Current page URL
   * @param {Document} document - Document object
   * @returns {boolean}
   */
  static canHandle(url, document) {
    throw new Error('canHandle() must be implemented by subclass');
  }

  /**
   * Inject reply into editor with sanitization
   * @param {string} reply - Reply text to inject
   */
  injectReply(reply) {
    try {
      const editor = this.getReplyEditor();
      
      if (!editor) {
        throw new Error('Reply editor not found');
      }

      // Sanitize the reply
      const sanitizedReply = this.formatReplyHTML(reply);

      // Check if it's a contentEditable element or textarea
      if (editor.contentEditable === 'true' || editor.classList.contains('note-editable')) {
        editor.innerHTML = sanitizedReply;
        this.triggerInputEvents(editor);
      } else if (editor.tagName === 'TEXTAREA' || editor.tagName === 'INPUT') {
        // For text inputs, convert HTML to plain text
        editor.value = this.htmlToPlainText(sanitizedReply);
        this.triggerInputEvents(editor);
      } else {
        throw new Error('Unknown editor type');
      }

      // Focus the editor
      editor.focus();
      
      // Scroll to editor if needed
      this.scrollToElement(editor);
      
      console.log('GPT Assistant: Reply injected successfully');
    } catch (error) {
      this.logError('Failed to inject reply', error);
      this.showUserError('Failed to insert reply. Please try again.');
    }
  }

  /**
   * Format and sanitize reply HTML
   * @param {string} reply - Raw reply text
   * @returns {string} Sanitized HTML
   */
  formatReplyHTML(reply) {
    // Use HTMLSanitizer if available
    if (typeof HTMLSanitizer !== 'undefined') {
      return HTMLSanitizer.sanitize(reply, {
        convertMarkdown: true,
        convertLineBreaks: true
      });
    }
    
    // Fallback sanitization (basic)
    return this.basicSanitize(reply);
  }

  /**
   * Basic HTML sanitization (fallback)
   */
  basicSanitize(html) {
    // Escape HTML entities
    let safe = html
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;');
    
    // Convert markdown links
    safe = safe.replace(
      /\[([^\]]+)\]\(([^)]+)\)/g,
      '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>'
    );
    
    // Convert markdown bold
    safe = safe.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    
    // Convert line breaks
    safe = safe.replace(/\n/g, '<br>');
    
    return safe;
  }

  /**
   * Convert HTML to plain text
   */
  htmlToPlainText(html) {
    const temp = document.createElement('div');
    temp.innerHTML = html;
    return temp.textContent || temp.innerText || '';
  }

  /**
   * Show generating status in editor
   */
  showGeneratingStatus() {
    try {
      const editor = this.getReplyEditor();
      
      if (!editor) {
        console.warn('GPT Assistant: Editor not found for status display');
        return;
      }

      const statusMessage = '🤖 Generating AI response...';
      
      if (editor.contentEditable === 'true' || editor.classList.contains('note-editable')) {
        editor.innerHTML = `<div style="color: #6c757d; font-style: italic;">${statusMessage}</div>`;
        editor.style.opacity = '0.7';
      } else if (editor.tagName === 'TEXTAREA' || editor.tagName === 'INPUT') {
        editor.value = statusMessage;
        editor.style.opacity = '0.7';
      }
    } catch (error) {
      this.logError('Failed to show generating status', error);
    }
  }

  /**
   * Clear generating status from editor
   */
  clearGeneratingStatus() {
    try {
      const editor = this.getReplyEditor();
      
      if (!editor) {
        return;
      }

      editor.style.opacity = '1';
      
      if (editor.contentEditable === 'true' || editor.classList.contains('note-editable')) {
        if (editor.innerHTML.includes('Generating AI response')) {
          editor.innerHTML = '';
        }
      } else if (editor.tagName === 'TEXTAREA' || editor.tagName === 'INPUT') {
        if (editor.value.includes('Generating AI response')) {
          editor.value = '';
        }
      }
    } catch (error) {
      this.logError('Failed to clear generating status', error);
    }
  }

  /**
   * Get current user name
   * @returns {string|null} User name or null
   */
  getCurrentUser() {
    // Default implementation - override in subclass for platform-specific logic
    return null;
  }

  /**
   * Extract customer information with sanitization
   * @returns {Object|null} Sanitized customer info
   */
  extractCustomerInfo() {
    try {
      const rawInfo = this.extractPlatformCustomerInfo();
      
      if (!rawInfo) {
        return null;
      }

      // Sanitize all string values in the customer info
      return this.sanitizeObject(rawInfo);
    } catch (error) {
      this.logError('Failed to extract customer info', error);
      return null;
    }
  }

  /**
   * Get keyboard shortcuts configuration
   * @returns {Object} Keyboard shortcuts config
   */
  getKeyboardShortcuts() {
    // Default shortcuts - can be overridden by platform
    return {
      generateReply: 'Ctrl+Shift+G',
      toggleFeedback: 'Ctrl+Shift+F',
      clearReply: 'Ctrl+Shift+C'
    };
  }

  /**
   * Attach feedback UI to the page
   * @param {string} generatedResponse - The generated response for feedback
   */
  attachFeedbackUI(generatedResponse) {
    // This will be implemented based on the existing feedback UI logic
    // For now, just log
    console.log('GPT Assistant: Feedback UI would be attached here');
  }

  // ============= Utility Methods =============

  /**
   * Cached querySelector with timeout
   */
  querySelector(selector, useCache = true) {
    const cacheKey = `qs_${selector}`;
    
    if (useCache && this._elementCache.has(cacheKey)) {
      const cached = this._elementCache.get(cacheKey);
      if (Date.now() - cached.timestamp < this._cacheTimeout) {
        return cached.element;
      }
    }
    
    const element = document.querySelector(selector);
    
    if (element && useCache) {
      this._elementCache.set(cacheKey, {
        element: element,
        timestamp: Date.now()
      });
    }
    
    return element;
  }

  /**
   * Cached querySelectorAll
   */
  querySelectorAll(selector, useCache = true) {
    const cacheKey = `qsa_${selector}`;
    
    if (useCache && this._elementCache.has(cacheKey)) {
      const cached = this._elementCache.get(cacheKey);
      if (Date.now() - cached.timestamp < this._cacheTimeout) {
        return cached.elements;
      }
    }
    
    const elements = document.querySelectorAll(selector);
    
    if (elements.length > 0 && useCache) {
      this._elementCache.set(cacheKey, {
        elements: elements,
        timestamp: Date.now()
      });
    }
    
    return elements;
  }

  /**
   * Clear element cache
   */
  clearCache() {
    this._elementCache.clear();
  }

  /**
   * Trigger input events on an element
   */
  triggerInputEvents(element) {
    const events = ['input', 'change', 'keyup'];
    
    events.forEach(eventType => {
      const event = new Event(eventType, {
        bubbles: true,
        cancelable: true
      });
      element.dispatchEvent(event);
    });
  }

  /**
   * Scroll element into view
   */
  scrollToElement(element) {
    if (element && element.scrollIntoView) {
      element.scrollIntoView({
        behavior: 'smooth',
        block: 'center'
      });
    }
  }

  /**
   * Debounce function execution
   */
  debounce(func, delay, key) {
    if (this._debounceTimers.has(key)) {
      clearTimeout(this._debounceTimers.get(key));
    }
    
    const timer = setTimeout(() => {
      func();
      this._debounceTimers.delete(key);
    }, delay);
    
    this._debounceTimers.set(key, timer);
  }

  /**
   * Sanitize object (recursively sanitize all string values)
   */
  sanitizeObject(obj) {
    if (!obj || typeof obj !== 'object') {
      return obj;
    }

    const sanitized = Array.isArray(obj) ? [] : {};

    for (let key in obj) {
      if (obj.hasOwnProperty(key)) {
        const value = obj[key];
        
        if (typeof value === 'string') {
          // Sanitize string values (escape HTML)
          sanitized[key] = this.sanitizeText(value);
        } else if (typeof value === 'object' && value !== null) {
          // Recursively sanitize nested objects
          sanitized[key] = this.sanitizeObject(value);
        } else {
          sanitized[key] = value;
        }
      }
    }

    return sanitized;
  }

  /**
   * Sanitize plain text (escape HTML entities)
   */
  sanitizeText(text) {
    if (!text || typeof text !== 'string') {
      return text;
    }

    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;');
  }

  /**
   * Wait for element to appear in DOM
   */
  async waitForElement(selector, timeout = 5000) {
    const startTime = Date.now();
    
    return new Promise((resolve, reject) => {
      const checkElement = () => {
        const element = document.querySelector(selector);
        
        if (element) {
          resolve(element);
        } else if (Date.now() - startTime > timeout) {
          reject(new Error(`Element ${selector} not found after ${timeout}ms`));
        } else {
          setTimeout(checkElement, 100);
        }
      };
      
      checkElement();
    });
  }

  /**
   * Log error with tracking
   */
  logError(message, error) {
    console.error(`GPT Assistant [${this.getPlatformName()}]: ${message}`, error);
    
    // Track errors
    this._errors.push({
      message: message,
      error: error,
      timestamp: Date.now()
    });
    
    // Keep only recent errors
    if (this._errors.length > this._maxErrors) {
      this._errors.shift();
    }
  }

  /**
   * Show user-friendly error message
   */
  showUserError(message) {
    // This could be implemented to show a toast/notification
    // For now, use console.warn to be less intrusive
    console.warn(`GPT Assistant: ${message}`);
    
    // Could also inject a temporary error message in the UI
    // This would be platform-specific
  }

  /**
   * Get recent errors for debugging
   */
  getRecentErrors() {
    return this._errors;
  }

  /**
   * Clean up resources
   */
  cleanup() {
    // Clear caches
    this.clearCache();
    
    // Clear debounce timers
    this._debounceTimers.forEach(timer => clearTimeout(timer));
    this._debounceTimers.clear();
    
    // Clear errors
    this._errors = [];
    
    console.log(`GPT Assistant: ${this.getPlatformName()} adapter cleaned up`);
  }
}

  // Export to global scope
  global.PlatformAdapter = PlatformAdapter;
})(window);