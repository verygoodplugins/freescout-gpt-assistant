/**
 * FreeScout Platform Adapter
 * Handles all FreeScout-specific operations
 * Extends PlatformAdapter with FreeScout implementation
 */

(function(global) {
  'use strict';
  
  // Wait for dependencies
  const PlatformAdapter = global.PlatformAdapter || window.PlatformAdapter;
  const HTMLSanitizer = global.HTMLSanitizer || window.HTMLSanitizer;
  
  class FreeScoutAdapter extends PlatformAdapter {
  constructor() {
    super();
    this.platformName = 'freescout';
  }

  /**
   * Get platform name
   */
  getPlatformName() {
    return this.platformName;
  }

  /**
   * Check if this adapter can handle the current page
   */
  static canHandle(url, document) {
    // Check for FreeScout-specific elements
    const hasThreadItems = document.querySelector('.thread-item') !== null;
    const hasNoteEditable = document.querySelector('.note-editable') !== null;
    const hasConversationId = document.querySelector('[data-conversation-id]') !== null;
    
    // Check URL patterns
    const isFreeScoutUrl = url.includes('conversation') || url.includes('mailbox');
    const isNotHelpScout = !url.includes('helpscout');
    
    return (hasThreadItems || hasNoteEditable || hasConversationId) && 
           isFreeScoutUrl && isNotHelpScout;
  }

  /**
   * Extract conversation thread messages
   */
  extractThread() {
    const messages = [];
    
    try {
      // Find all thread items
      const threadItems = this.querySelectorAll('.thread-item', false); // Don't cache as content changes
      
      threadItems.forEach(item => {
        const content = item.querySelector('.thread-content');
        const person = item.querySelector('.thread-person');
        
        if (!content) return;
        
        // Sanitize extracted text
        const messageText = this.sanitizeText(content.innerText.trim());
        const personName = person ? this.sanitizeText(person.innerText.trim()) : 'Unknown';
        
        // Determine message type and role
        if (item.classList.contains('thread-type-customer')) {
          messages.push({
            role: 'user',
            content: `Customer (${personName}): ${messageText}`
          });
        } else if (item.classList.contains('thread-type-message')) {
          messages.push({
            role: 'assistant',
            content: `Agent (${personName}): ${messageText}`
          });
        } else if (item.classList.contains('thread-type-note')) {
          // Include internal notes for context
          messages.push({
            role: 'system',
            content: `Internal Note from ${personName}: ${messageText}`
          });
        }
      });
      
      // Fallback if no structured messages found
      if (messages.length === 0) {
        const fallbackContent = this.extractFallbackContent();
        if (fallbackContent) {
          messages.push({
            role: 'user',
            content: fallbackContent
          });
        }
      }
      
      console.log(`GPT Assistant: Extracted ${messages.length} messages from FreeScout`);
      
    } catch (error) {
      this.logError('Failed to extract thread', error);
    }
    
    return messages;
  }

  /**
   * Extract fallback content if structured extraction fails
   */
  extractFallbackContent() {
    try {
      const contentDivs = document.querySelectorAll('div.thread-content');
      const content = Array.from(contentDivs)
        .map(el => this.sanitizeText(el.innerText.trim()))
        .filter(text => text.length > 0)
        .join("\n\n");
      
      return content || null;
    } catch (error) {
      this.logError('Failed to extract fallback content', error);
      return null;
    }
  }

  /**
   * Get the reply editor element
   */
  getReplyEditor() {
    // Try Summernote WYSIWYG editor first
    let editor = this.querySelector('.note-editable');
    
    // Fallback to textarea
    if (!editor) {
      editor = this.querySelector('textarea#body');
    }
    
    // Try alternative selectors
    if (!editor) {
      editor = this.querySelector('.reply-editor') || 
               this.querySelector('[name="body"]');
    }
    
    return editor;
  }

  /**
   * Get current user name from FreeScout UI
   */
  getCurrentUser() {
    try {
      // Try to get from nav bar
      const navUser = this.querySelector('span.nav-user');
      if (navUser) {
        return this.sanitizeText(navUser.textContent.trim());
      }
      
      // Try alternative selectors
      const userDropdown = this.querySelector('.user-dropdown .user-name');
      if (userDropdown) {
        return this.sanitizeText(userDropdown.textContent.trim());
      }
      
      // Try to get from current user's messages
      const currentUserMessage = this.querySelector('.thread-type-message.current-user .thread-person');
      if (currentUserMessage) {
        return this.sanitizeText(currentUserMessage.textContent.trim());
      }
      
    } catch (error) {
      this.logError('Failed to get current user', error);
    }
    
    return null;
  }

  /**
   * Extract WordPress/FreeScout customer information
   */
  extractPlatformCustomerInfo() {
    const customerInfo = {};
    
    try {
      // Check for WordPress FreeScout widget
      const wpWidget = this.querySelector('#wordpress-freescout');
      
      if (wpWidget) {
        // Extract WordPress customer data
        Object.assign(customerInfo, this.extractWordPressData(wpWidget));
      }
      
      // Extract native FreeScout customer data
      Object.assign(customerInfo, this.extractNativeFreeScoutData());
      
    } catch (error) {
      this.logError('Failed to extract customer info', error);
    }
    
    return Object.keys(customerInfo).length > 0 ? customerInfo : null;
  }

  /**
   * Extract WordPress integration data
   */
  extractWordPressData(wpWidget) {
    const data = {};
    
    try {
      // Extract customer name and basic info
      const userLink = wpWidget.querySelector('a[href*="user-edit.php"]');
      if (userLink) {
        data.name = userLink.textContent.trim();
      }

      // Extract basic customer details from the first list
      const basicInfoList = wpWidget.querySelector('.wordpress-orders-list');
      if (basicInfoList) {
        const listItems = basicInfoList.querySelectorAll('li');
        listItems.forEach(item => {
          const label = item.querySelector('label');
          if (label) {
            const labelText = label.textContent.trim();
            const value = item.textContent.replace(labelText, '').trim();
            
            switch (labelText) {
              case 'Registered':
                data.registered = value;
                break;
              case 'Active CRM':
              case 'Actve CRM': // Handle typo in source
                data.activeCRM = value;
                break;
              case 'Last License Check':
                data.lastLicenseCheck = value;
                break;
              case 'Version':
                const versionSpan = item.querySelector('.label');
                if (versionSpan) {
                  data.version = versionSpan.textContent.trim();
                  data.versionStatus = versionSpan.classList.contains('label-danger') ? 'outdated' : 'current';
                }
                break;
            }
          }
        });
      }

      // Extract active integrations
      data.activeIntegrations = this.extractLabelCloud(wpWidget, 'Active Integrations');
      
      // Extract CRM tags
      data.crmTags = this.extractLabelCloud(wpWidget, 'Tags');
      
      // Extract recent orders
      data.recentOrders = this.extractOrders(wpWidget);
      
      // Extract license information
      data.license = this.extractLicense(wpWidget);
      
    } catch (error) {
      this.logError('Failed to extract WordPress data', error);
    }
    
    return data;
  }

  /**
   * Extract label cloud data (integrations, tags)
   */
  extractLabelCloud(container, sectionTitle) {
    try {
      const section = Array.from(container.querySelectorAll('h5')).find(h5 => 
        h5.textContent.includes(sectionTitle)
      );
      
      if (section) {
        const labelContainer = section.nextElementSibling;
        if (labelContainer && labelContainer.classList.contains('label-cloud')) {
          return Array.from(labelContainer.querySelectorAll('.label'))
            .map(label => label.textContent.trim());
        }
      }
    } catch (error) {
      this.logError(`Failed to extract ${sectionTitle}`, error);
    }
    
    return [];
  }

  /**
   * Extract order information
   */
  extractOrders(container) {
    const orders = [];
    
    try {
      const ordersSection = Array.from(container.querySelectorAll('h5')).find(h5 => 
        h5.textContent.includes('EDD Orders')
      );
      
      if (ordersSection) {
        const ordersList = ordersSection.nextElementSibling;
        if (ordersList) {
          const orderItems = ordersList.querySelectorAll('.list-group-item');
          
          // Limit to 3 most recent orders
          Array.from(orderItems).slice(0, 3).forEach(orderItem => {
            const order = {};
            
            // Order status
            const statusLabel = orderItem.querySelector('.label');
            if (statusLabel) {
              order.status = statusLabel.textContent.trim();
            }
            
            // Order number and amount
            const orderLink = orderItem.querySelector('a[href*="edd-payment-history"]');
            if (orderLink) {
              order.number = orderLink.textContent.trim();
            }
            
            // Extract amount
            const amountMatch = orderItem.textContent.match(/\$[\d,]+\.?\d*/);
            if (amountMatch) {
              order.amount = amountMatch[0];
            }
            
            // Product name
            const productItem = orderItem.querySelector('.edd-order-items-list li');
            if (productItem) {
              order.product = productItem.textContent.trim().replace(/\s*-\s*\$[\d,]+\.?\d*/, '');
            }
            
            // Order date
            const orderMeta = orderItem.querySelector('.edd-order-meta');
            if (orderMeta) {
              const dateMatch = orderMeta.textContent.match(/\d{4}-\d{2}-\d{2}/);
              if (dateMatch) {
                order.date = dateMatch[0];
              }
            }
            
            if (Object.keys(order).length > 0) {
              orders.push(order);
            }
          });
        }
      }
    } catch (error) {
      this.logError('Failed to extract orders', error);
    }
    
    return orders;
  }

  /**
   * Extract license information
   */
  extractLicense(container) {
    const license = {};
    
    try {
      const licensesSection = Array.from(container.querySelectorAll('h5')).find(h5 => 
        h5.textContent.includes('EDD Licenses')
      );
      
      if (licensesSection) {
        const licensesList = licensesSection.nextElementSibling;
        if (licensesList) {
          const firstLicense = licensesList.querySelector('.list-group-item');
          
          if (firstLicense) {
            // License status
            const statusLabel = firstLicense.querySelector('.label');
            if (statusLabel) {
              license.status = statusLabel.textContent.trim();
            }
            
            // License number
            const licenseLink = firstLicense.querySelector('a[href*="edd-licenses"]');
            if (licenseLink) {
              license.number = licenseLink.textContent.trim();
            }
            
            // License key (be careful with sensitive data)
            const licenseKey = firstLicense.querySelector('code');
            if (licenseKey) {
              // Only store partial key for security
              const fullKey = licenseKey.textContent.trim();
              license.keyPartial = fullKey.substring(0, 8) + '...';
            }
            
            // Active sites count
            const sitesList = firstLicense.querySelector('.edd-order-items-list');
            if (sitesList) {
              const sites = sitesList.querySelectorAll('li');
              license.activeSites = sites.length;
              
              // Get first few site URLs for context
              license.sampleSites = Array.from(sites).slice(0, 3).map(site => {
                const link = site.querySelector('a');
                return link ? link.textContent.trim() : site.textContent.trim();
              });
            }
            
            // Expiration date
            const orderMeta = firstLicense.querySelector('.edd-order-meta');
            if (orderMeta && orderMeta.textContent.includes('Expires')) {
              const expirationMatch = orderMeta.textContent.match(/Expires (\d{2}\/\d{2}\/\d{4})/);
              if (expirationMatch) {
                license.expires = expirationMatch[1];
              }
            }
          }
        }
      }
    } catch (error) {
      this.logError('Failed to extract license', error);
    }
    
    return Object.keys(license).length > 0 ? license : null;
  }

  /**
   * Extract native FreeScout customer data
   */
  extractNativeFreeScoutData() {
    const data = {};
    
    try {
      // Try to get customer name from conversation header
      const customerName = this.querySelector('.conv-customer-name, .customer-name');
      if (customerName) {
        data.name = customerName.textContent.trim();
      }
      
      // Try to get customer email
      const customerEmail = this.querySelector('.conv-customer-email, .customer-email');
      if (customerEmail) {
        data.email = customerEmail.textContent.trim();
      }
      
      // Try to get conversation subject
      const subject = this.querySelector('.conv-subject, .conversation-subject');
      if (subject) {
        data.conversationSubject = subject.textContent.trim();
      }
      
      // Try to get conversation status
      const status = this.querySelector('.conv-status, .conversation-status');
      if (status) {
        data.conversationStatus = status.textContent.trim();
      }
      
      // Try to get assigned agent
      const assignee = this.querySelector('.conv-assignee, .assignee-name');
      if (assignee) {
        data.assignedTo = assignee.textContent.trim();
      }
      
    } catch (error) {
      this.logError('Failed to extract native FreeScout data', error);
    }
    
    return data;
  }

  /**
   * Analyze user tone from previous messages
   */
  analyzeUserTone(threadMessages, currentUser) {
    if (!currentUser || !threadMessages || threadMessages.length === 0) {
      return '';
    }
    
    try {
      // Find messages from the current user
      const userMessages = threadMessages.filter(msg => 
        msg.role === 'assistant' && 
        msg.content.includes(`Agent (${currentUser}):`)
      );
      
      if (userMessages.length === 0) {
        return '';
      }
      
      // Extract just the message content
      const userReplies = userMessages.map(msg => 
        msg.content.replace(`Agent (${currentUser}): `, '')
      );
      
      // Create tone analysis prompt
      const tonePrompt = `\n\nBased on ${currentUser}'s previous responses in this conversation, ` +
        `please match their communication style and tone. Here are their previous replies:\n` +
        userReplies.map((reply, i) => `${i + 1}. ${reply}`).join('\n');
      
      return tonePrompt;
      
    } catch (error) {
      this.logError('Failed to analyze user tone', error);
      return '';
    }
  }

  /**
   * Get existing context from the reply field
   */
  getExistingContext() {
    try {
      const editor = this.getReplyEditor();
      
      if (!editor) {
        return '';
      }
      
      let existingContext = '';
      
      if (editor.contentEditable === 'true' || editor.classList.contains('note-editable')) {
        existingContext = editor.innerText.trim();
      } else if (editor.tagName === 'TEXTAREA' || editor.tagName === 'INPUT') {
        existingContext = editor.value.trim();
      }
      
      // Only return if it's not the generating status message
      if (existingContext && !existingContext.includes('🤖 Generating AI response')) {
        return existingContext;
      }
      
    } catch (error) {
      this.logError('Failed to get existing context', error);
    }
    
    return '';
  }

  /**
   * Platform-specific initialization
   */
  async platformInitialize() {
    console.log('GPT Assistant: FreeScout adapter initialized');
    
    // Set up any FreeScout-specific event listeners or observers
    this.setupFreeScoutObservers();
  }

  /**
   * Set up FreeScout-specific observers
   */
  setupFreeScoutObservers() {
    // Watch for conversation changes (for SPAs or AJAX updates)
    const conversationContainer = this.querySelector('.conversation-body, .thread-list');
    
    if (conversationContainer) {
      // Use MutationObserver to detect when conversation changes
      const observer = new MutationObserver((mutations) => {
        // Clear cache when conversation content changes
        this.clearCache();
      });
      
      observer.observe(conversationContainer, {
        childList: true,
        subtree: true
      });
      
      console.log('GPT Assistant: FreeScout conversation observer set up');
    }
  }
}

  // Export to global scope
  global.FreeScoutAdapter = FreeScoutAdapter;
})(window);