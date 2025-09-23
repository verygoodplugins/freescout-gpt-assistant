/**
 * HTML Sanitization Utility
 * Provides secure HTML sanitization to prevent XSS attacks
 * Uses a whitelist approach for allowed tags and attributes
 */

(function(global) {
  'use strict';
  
  class HTMLSanitizer {
  // Configuration for allowed HTML elements and attributes
  static ALLOWED_TAGS = [
    'p', 'br', 'div', 'span',
    'strong', 'b', 'em', 'i', 'u',
    'a', 'ul', 'ol', 'li',
    'blockquote', 'code', 'pre',
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6'
  ];

  static ALLOWED_ATTRIBUTES = {
    'a': ['href', 'target', 'rel', 'title'],
    'div': ['class', 'id'],
    'span': ['class'],
    'code': ['class'],
    'pre': ['class']
  };

  // URL schemes that are safe for href attributes
  static ALLOWED_SCHEMES = ['http', 'https', 'mailto'];

  // Regex patterns for dangerous content
  static DANGEROUS_PATTERNS = [
    /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
    /on\w+\s*=/gi, // Event handlers like onclick, onmouseover
    /javascript:/gi,
    /data:text\/html/gi,
    /<iframe/gi,
    /<embed/gi,
    /<object/gi
  ];

  /**
   * Main sanitization method
   * @param {string} html - HTML string to sanitize
   * @param {Object} options - Optional configuration
   * @returns {string} Sanitized HTML
   */
  static sanitize(html, options = {}) {
    if (!html || typeof html !== 'string') {
      return '';
    }

    // Merge options with defaults
    const config = {
      allowedTags: options.allowedTags || this.ALLOWED_TAGS,
      allowedAttributes: options.allowedAttributes || this.ALLOWED_ATTRIBUTES,
      allowedSchemes: options.allowedSchemes || this.ALLOWED_SCHEMES,
      stripDangerous: options.stripDangerous !== false,
      convertLineBreaks: options.convertLineBreaks !== false
    };

    let sanitized = html;

    // Step 1: Remove obviously dangerous patterns
    if (config.stripDangerous) {
      sanitized = this.removeDangerousPatterns(sanitized);
    }

    // Step 2: Parse and rebuild HTML with whitelist
    sanitized = this.parseAndSanitize(sanitized, config);

    // Step 3: Convert markdown-style formatting if needed
    if (options.convertMarkdown !== false) {
      sanitized = this.convertMarkdownToHTML(sanitized);
    }

    // Step 4: Convert line breaks to <br> tags if needed
    if (config.convertLineBreaks) {
      sanitized = this.convertLineBreaks(sanitized);
    }

    // Step 5: Final validation
    sanitized = this.finalValidation(sanitized);

    return sanitized;
  }

  /**
   * Remove dangerous patterns using regex
   */
  static removeDangerousPatterns(html) {
    let cleaned = html;
    
static removeDangerousPatterns(html) {
  let cleaned = html;
  
  this.DANGEROUS_PATTERNS.forEach(pattern => {
    // Reset lastIndex to ensure consistent behavior
    pattern.lastIndex = 0;
    cleaned = cleaned.replace(pattern, '');
  });
  
  return cleaned;
}

    return cleaned;
  }

  /**
   * Parse HTML and rebuild with only allowed elements
   */
  static parseAndSanitize(html, config) {
    // Create a temporary container
    const temp = document.createElement('div');
    temp.innerHTML = html;

    // Recursively sanitize all elements
    this.sanitizeNode(temp, config);

    return temp.innerHTML;
  }

  /**
   * Recursively sanitize a DOM node
   */
  static sanitizeNode(node, config) {
    // Get all child elements (create array copy to avoid live collection issues)
    const children = Array.from(node.children);

    children.forEach(child => {
      const tagName = child.tagName.toLowerCase();

      // Remove element if not in whitelist
      if (!config.allowedTags.includes(tagName)) {
        // Keep the text content but remove the element
        const textContent = child.textContent;
        const textNode = document.createTextNode(textContent);
        child.parentNode.replaceChild(textNode, child);
        return;
      }

      // Sanitize attributes
      this.sanitizeAttributes(child, tagName, config);

      // Recursively sanitize children
      this.sanitizeNode(child, config);
    });
  }

  /**
   * Sanitize attributes of an element
   */
  static sanitizeAttributes(element, tagName, config) {
    const allowedAttrs = config.allowedAttributes[tagName] || [];
    const attributes = Array.from(element.attributes);

    attributes.forEach(attr => {
      const attrName = attr.name.toLowerCase();
      const attrValue = attr.value;

      // Remove if not in whitelist
      if (!allowedAttrs.includes(attrName)) {
        element.removeAttribute(attrName);
        return;
      }

      // Special handling for href attributes
      if (attrName === 'href') {
        const sanitizedHref = this.sanitizeURL(attrValue, config.allowedSchemes);
        if (sanitizedHref) {
          element.setAttribute('href', sanitizedHref);
          // Add security attributes for external links
          if (sanitizedHref.startsWith('http')) {
            element.setAttribute('rel', 'noopener noreferrer');
            if (!element.hasAttribute('target')) {
              element.setAttribute('target', '_blank');
            }
          }
        } else {
          element.removeAttribute('href');
        }
      }

      // Remove javascript: and data: protocols from any attribute
      if (attrValue.includes('javascript:') || attrValue.includes('data:')) {
        element.removeAttribute(attrName);
      }
    });
  }

  /**
   * Sanitize URLs
   */
  static sanitizeURL(url, allowedSchemes) {
    if (!url) return null;

    // Trim and lowercase for checking
    const trimmed = url.trim();
    const lower = trimmed.toLowerCase();

    // Check for dangerous protocols
    if (lower.startsWith('javascript:') || 
        lower.startsWith('data:') || 
        lower.startsWith('vbscript:')) {
      return null;
    }

    // Check if URL starts with allowed scheme
    const hasAllowedScheme = allowedSchemes.some(scheme => 
      lower.startsWith(scheme + ':')
    );

    // If no scheme, assume it's a relative URL (safe)
    if (!lower.match(/^[a-z]+:/)) {
      return trimmed;
    }

    // Return URL only if it has an allowed scheme
    return hasAllowedScheme ? trimmed : null;
  }

  /**
   * Convert markdown-style formatting to HTML
   */
  static convertMarkdownToHTML(text) {
    // Convert markdown links [text](url) to HTML
    text = text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (match, linkText, url) => {
      const sanitizedUrl = this.sanitizeURL(url, this.ALLOWED_SCHEMES);
      if (sanitizedUrl) {
        return `<a href="${this.escapeHtml(sanitizedUrl)}" target="_blank" rel="noopener noreferrer">${this.escapeHtml(linkText)}</a>`;
      }
      return linkText;
    });

    // Convert **bold** to <strong>
    text = text.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');

    // Convert *italic* to <em>
    text = text.replace(/\*([^*]+)\*/g, '<em>$1</em>');

    // Convert `code` to <code>
    text = text.replace(/`([^`]+)`/g, '<code>$1</code>');

    return text;
  }

  /**
   * Convert line breaks to <br> tags
   */
  static convertLineBreaks(text) {
    // Convert \n to <br> but not within <pre> tags
    const parts = text.split(/(<pre>[\s\S]*?<\/pre>)/);
    
    return parts.map((part, index) => {
      // Don't convert line breaks in <pre> tags (odd indices)
      if (index % 2 === 1) {
        return part;
      }
      return part.replace(/\n/g, '<br>');
    }).join('');
  }

  /**
   * Final validation pass
   */
  static finalValidation(html) {
    // Remove any remaining script tags that might have been injected
    html = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
    
    // Remove any remaining event handlers
    html = html.replace(/on\w+\s*=/gi, '');
    
    return html;
  }

  /**
   * Escape HTML special characters
   */
  static escapeHtml(text) {
    const map = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#x27;',
      '/': '&#x2F;'
    };
    
    return text.replace(/[&<>"'/]/g, char => map[char]);
  }

  /**
   * Sanitize for plain text display (no HTML)
   */
  static sanitizeText(text) {
    if (!text || typeof text !== 'string') {
      return '';
    }
    
    return this.escapeHtml(text);
  }

  /**
   * Create a safe HTML element from text
   */
  static createSafeElement(tagName, text, attributes = {}) {
    const element = document.createElement(tagName);
    
    // Set text content (automatically escaped)
    element.textContent = text;
    
    // Add safe attributes
    Object.keys(attributes).forEach(key => {
      const value = attributes[key];
      if (typeof value === 'string') {
        element.setAttribute(key, this.escapeHtml(value));
      }
    });
    
    return element;
  }

  /**
   * Validate that HTML string is safe (for testing)
   */
  static isSafe(html) {
    // Check for dangerous patterns
    for (let pattern of this.DANGEROUS_PATTERNS) {
      if (pattern.test(html)) {
        return false;
      }
    }
    
    // Parse and check for disallowed tags
    const temp = document.createElement('div');
    temp.innerHTML = html;
    
    const allElements = temp.getElementsByTagName('*');
    for (let element of allElements) {
      const tagName = element.tagName.toLowerCase();
      if (!this.ALLOWED_TAGS.includes(tagName)) {
        return false;
      }
    }
    
    return true;
  }
}

  // Export to global scope
  global.HTMLSanitizer = HTMLSanitizer;
})(window);