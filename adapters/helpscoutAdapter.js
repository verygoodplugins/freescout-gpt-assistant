/**
 * Help Scout Platform Adapter
 * Handles Help Scout-specific DOM interactions and data extraction
 * Includes MutationObserver for React/SPA support
 */

(function(global) {
  'use strict';
  
  // Wait for dependencies
  const PlatformAdapter = global.PlatformAdapter || window.PlatformAdapter;
  const HTMLSanitizer = global.HTMLSanitizer || window.HTMLSanitizer;
  
  class HelpScoutAdapter extends PlatformAdapter {
  constructor() {
    super();
    this.platform = 'helpscout';
    this.observer = null;
    this.initializationAttempts = 0;
    this.maxInitAttempts = 10;
    this.appDataCache = null;
    this.conversationCache = new Map();
    this.eventListeners = new Map(); // For event handling
    
    // Help Scout specific selectors - using stable attributes and semantic elements
    this.selectors = {
      // Conversation thread selectors - using data attributes and semantic HTML
      conversationContainer: '[data-testid="ThreadContainer"], ol[aria-label="Thread Items"], ol[role="list"]',
      threadItem: '.thread-item, div[id^="thread-"], div[aria-label*="response"], div[aria-label*="reply"], li[class*="ThreadListItem"] > div',
      threadContent: '.thread-content, div[class*="is-wide-layout"]:not([data-testid])',
      threadAuthor: 'span[data-nocollapse="true"], [class*="ThreadItem"] span:first-child',
      
      // Editor selectors - updated based on actual DOM
      editor: '[data-cy="ConvoEditor"], [data-testid="reply-editor"], .editor-container[contenteditable="true"], [role="textbox"][aria-label="Reply Editor"]',
      editorContainer: '.editor-container, [data-cy="ConvoEditor"], [data-testid="reply-editor"]',
      replyButton: '[data-testid="reply-button"], [data-cy="reply-button"], .reply-button, button[aria-label*="Reply"]',
      noteButton: '[data-testid="note-button"], .note-button',
      replyBar: '[data-testid="reply-bar"], .ReplyBarV2css__ReplyBarUI-sc-ccddjv-0',
      
      // Customer info selectors
      sidebar: '.c-conversation-sidebar, .sidebar-customer, [data-cy="customer-sidebar"]',
      customerProperty: '.c-customer-property, .customer-property, [data-cy="customer-property"]',
      propertyLabel: '.c-property-label, .property-label',
      propertyValue: '.c-property-value, .property-value',
      
      // User info selectors
      userAvatar: '.c-avatar__name, .user-name, [data-cy="user-name"]',
      currentUser: '.current-user, [data-cy="current-user"]',
      
      // Loading states
      loadingIndicator: '.loading, .spinner, [data-cy="loading"]',
      conversationLoaded: '[data-conversation-loaded="true"], .conversation-loaded'
    };
    
    // Initialize on construction
    this.initialize();
  }
  
  /**
   * Get platform name
   * Required by base class
   */
  getPlatformName() {
    return 'helpscout';
  }
  
  /**
   * Initialize Help Scout adapter with MutationObserver
   */
  async initialize() {
    console.log('Initializing Help Scout adapter...');
    
    // Wait for Help Scout app to be ready
    await this.waitForHelpScoutApp();
    
    // Set up MutationObserver for dynamic content
    this.setupMutationObserver();
    
    // Cache initial app data
    this.cacheAppData();
    
    // Set up event listeners for Help Scout-specific events
    this.setupEventListeners();
    
    console.log('Help Scout adapter initialized successfully');
  }
  
  /**
   * Wait for Help Scout React app to be ready
   */
  async waitForHelpScoutApp() {
    return new Promise((resolve) => {
      const checkApp = () => {
        this.initializationAttempts++;
        
        // Check for Help Scout app indicators
        const hasAppData = window.appData && window.appData.conversationView;
        const hasConversation = document.querySelector(this.selectors.conversationContainer);
        const hasEditor = document.querySelector(this.selectors.editor);
        const hasMainContent = document.querySelector('#wrap') || document.querySelector('#mailbox');
        
        // More lenient detection - any of these indicates Help Scout is present
        if ((hasAppData || hasConversation || hasEditor || hasMainContent) && this.initializationAttempts < this.maxInitAttempts) {
          console.log('Help Scout app detected');
          resolve();
        } else if (this.initializationAttempts >= this.maxInitAttempts) {
          console.warn('Help Scout app initialization timeout - continuing anyway');
          resolve(); // Resolve anyway to continue with fallback methods
        } else {
          setTimeout(checkApp, 500);
        }
      };
      
      checkApp();
    });
  }
  
  /**
   * Set up MutationObserver for React/SPA content changes
   */
  setupMutationObserver() {
    if (this.observer) {
      this.observer.disconnect();
    }
    
    this.observer = new MutationObserver((mutations) => {
      // Handle conversation changes
      const conversationChanged = mutations.some(mutation => {
        return mutation.type === 'childList' && 
               (mutation.target.matches?.(this.selectors.conversationContainer) ||
                mutation.target.querySelector?.(this.selectors.conversationContainer));
      });
      
      if (conversationChanged) {
        console.log('Conversation content changed, clearing cache');
        this.clearCache();
        this.cacheAppData();
      }
      
      // Handle editor changes
      const editorChanged = mutations.some(mutation => {
        return mutation.target.matches?.(this.selectors.editor) ||
               mutation.target.matches?.(this.selectors.editorContainer);
      });
      
      if (editorChanged) {
        this.emit('editorChanged');
      }
    });
    
    // Observe the entire document body for changes
    this.observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['data-conversation-id', 'data-customer-id', 'contenteditable']
    });
  }
  
  /**
   * Cache Help Scout app data for performance
   */
  cacheAppData() {
    if (window.appData) {
      // Try to get conversation data from multiple possible locations
      const conversation = window.appData.conversationView?.conversation || 
                          window.appData.conversation ||
                          window.appData.conversationView;
      
      this.appDataCache = {
        conversation: conversation,
        customer: window.appData.customer || window.appData.conversationView?.customer,
        user: window.appData.shared?.member || window.appData.user,
        mailbox: window.appData.mailbox,
        timestamp: Date.now()
      };
      
      console.log('GPT Assistant: Cached Help Scout app data', {
        hasConversation: !!conversation,
        hasThreads: !!(conversation?.threads || conversation?.thread)
      });
    }
  }
  
  /**
   * Set up Help Scout-specific event listeners
   */
  setupEventListeners() {
    // Listen for Help Scout navigation events
    window.addEventListener('helpscout:conversation:loaded', () => {
      this.clearCache();
      this.cacheAppData();
    });
    
    // Listen for reply button clicks
    document.addEventListener('click', (e) => {
      if (e.target.matches(this.selectors.replyButton)) {
        this.handleReplyButtonClick();
      }
    });
  }
  
  /**
   * Extract conversation thread from Help Scout
   */
  extractThread() {
    const messages = [];
    
    // Try to extract from cached appData first (most reliable)
    if (this.appDataCache?.conversation?.threads) {
      return this.extractFromAppData();
    }
    
    // Try to get from window.appData directly
    if (window.appData?.conversationView?.conversation?.threads) {
      this.appDataCache = window.appData.conversationView;
      return this.extractFromAppData();
    }
    
    // Fallback to DOM extraction - find the thread container
    let conversationContainer = this.querySelector(this.selectors.conversationContainer);
    
    // If no container found, try more specific selectors using stable attributes
    if (!conversationContainer) {
      conversationContainer = document.querySelector('[data-testid="ThreadContainer"]') ||
                             document.querySelector('ol[aria-label="Thread Items"]') ||
                             document.querySelector('ol[role="list"]') ||
                             document.querySelector('#convo-main');
    }
    
    if (!conversationContainer) {
      console.warn('GPT Assistant: No conversation container found');
      return messages;
    }
    
    // Get thread items - use stable selectors
    let threadItems = conversationContainer.querySelectorAll('li > div[id^="thread-"]');
    
    // If no items found with ID selector, try other stable approaches
    if (threadItems.length === 0) {
      threadItems = conversationContainer.querySelectorAll('div[aria-label*="response"], div[aria-label*="reply"]') ||
                   conversationContainer.querySelectorAll('li[class*="ThreadListItem"] > div');
    }
    
    console.log(`GPT Assistant: Found ${threadItems.length} thread items`);
    
    threadItems.forEach(item => {
      try {
        // Find content element - look for actual content divs
        // Look for divs that contain actual text content, avoiding wrapper divs
        let contentElement = null;
        const possibleContent = item.querySelectorAll('div[class*="is-wide-layout"]');
        
        for (let elem of possibleContent) {
          // Skip elements that are just containers (have data-testid or are wrappers)
          if (!elem.hasAttribute('data-testid') && 
              !elem.querySelector('[data-testid]') &&
              elem.textContent && 
              elem.textContent.trim().length > 0) {
            contentElement = elem;
            break;
          }
        }
        
        // If still no content, try looking for any div with substantial text
        if (!contentElement) {
          const divs = item.querySelectorAll('div');
          for (let div of divs) {
            // Look for divs that have text but aren't metadata
            if (div.textContent && 
                div.textContent.trim().length > 20 &&
                !div.querySelector('time') &&
                !div.querySelector('button') &&
                !div.hasAttribute('data-cy')) {
              contentElement = div;
              break;
            }
          }
        }
        
        // Find author element using stable selector
        let authorElement = item.querySelector('span[data-nocollapse="true"]');
        if (!authorElement) {
          // Look for first text span in the header area
          const headerArea = item.querySelector('div[class*="ThreadItem"]') || item;
          authorElement = headerArea.querySelector('span:not([aria-hidden]):not([data-cy])');
        }
        
        if (!contentElement) {
          console.log('GPT Assistant: No content element found for thread item');
          return;
        }
        
        // Extract text content
        const messageText = contentElement.innerText || contentElement.textContent || '';
        const authorName = authorElement ? (authorElement.innerText || authorElement.textContent || 'Unknown') : 'Unknown';
        
        // Determine role based on aria-label or classes
        const ariaLabel = item.getAttribute('aria-label') || '';
        const isCustomer = item.classList.contains('is-customer') ||
                          ariaLabel.toLowerCase().includes('customer');
        const isUserReply = ariaLabel.toLowerCase().includes('user reply') ||
                           authorName === 'You' ||
                           authorName.includes('Rafael') ||
                           authorName.includes('Zack');
        
        const role = isCustomer ? 'user' : 'assistant';
        
        if (messageText.trim()) {
          messages.push({
            role: role,
            content: messageText.trim()
          });
          
          console.log(`GPT Assistant: Extracted ${role} message from ${authorName}: ${messageText.substring(0, 50)}...`);
        }
      } catch (error) {
        console.error('GPT Assistant: Error extracting thread item:', error);
      }
    });
    
    console.log(`GPT Assistant: Total messages extracted: ${messages.length}`);
    return messages;
  }
  
  /**
   * Extract thread from Help Scout appData structure
   */
  extractFromAppData() {
    const messages = [];
    
    // Check multiple possible data structures
    const conversation = this.appDataCache?.conversation || 
                        window.appData?.conversationView?.conversation ||
                        window.appData?.conversation;
    
    if (!conversation) {
      console.log('GPT Assistant: No conversation data in appData');
      return messages;
    }
    
    // Get threads array - might be in different locations
    const threads = conversation.threads || 
                   conversation.thread ? [conversation.thread] : [];
    
    if (!threads || threads.length === 0) {
      console.log('GPT Assistant: No threads found in conversation data');
      return messages;
    }
    
    threads.forEach(thread => {
      // Skip internal notes unless specifically needed
      if (thread.type === 'note' && !this.includeNotes) {
        return;
      }
      
      // Skip drafts or deleted messages
      if (thread.state === 'draft' || thread.state === 'deleted') {
        return;
      }
      
      // Determine role based on multiple possible fields
      const role = (thread.createdBy?.type === 'customer' || 
                   thread.type === 'customer' ||
                   thread.customerEmail) ? 'user' : 'assistant';
      
      const authorName = thread.createdBy?.name || 
                        thread.from?.name || 
                        thread.author || 
                        'Unknown';
      
      const messageText = HTMLSanitizer?.sanitize ? 
// adapters/helpscoutAdapter.js

// …

- const messageText = HTMLSanitizer?.sanitize ? 
-   HTMLSanitizer.sanitize(thread.body || '') :
 const messageText = HTMLSanitizer?.sanitize ? 
   HTMLSanitizer.sanitize(thread.body || '') :
   this.basicSanitize(thread.body || ''); // Use fallback sanitization from base class

// …
      
      if (messageText) {
        messages.push({
          role: role,
          content: `${role === 'user' ? 'Customer' : 'Agent'} (${authorName}): ${messageText}`
        });
      }
    });
    
    console.log(`GPT Assistant: Extracted ${messages.length} messages from appData`);
    return messages;
  }
  
  /**
   * Get the reply editor element
   */
  async getReplyEditor() {
    // Try multiple selectors for Help Scout's editor
    const selectors = this.selectors.editor.split(', ');
    
    for (const selector of selectors) {
      const editor = document.querySelector(selector);
      if (editor) {
        return editor;
      }
    }
    
    // If no editor found, check if Reply button exists and click it
    const replyButton = document.querySelector(this.selectors.replyButton);
    if (replyButton && !replyButton.disabled) {
      console.log('GPT Assistant: No editor found, clicking Reply button to show editor');
      replyButton.click();
      
      // Wait for editor to appear
      await new Promise(resolve => setTimeout(resolve, 800));
      
      // Try to find the editor again
      for (const selector of selectors) {
        const editor = document.querySelector(selector);
        if (editor) {
          console.log('GPT Assistant: Editor found after clicking Reply button');
          return editor;
        }
      }
    }
    
    // Fallback: Look for any contenteditable element in editor container
    const container = document.querySelector(this.selectors.editorContainer);
    if (container) {
      return container.querySelector('[contenteditable="true"]');
    }
    
    return null;
  }
  
  /**
   * Inject reply into Help Scout editor
   */
  async injectReply(reply) {
    const editor = await this.getReplyEditor();
    
    if (!editor) {
      console.error('No Help Scout editor found');
      this.showNotification('Could not find reply editor. Please click Reply first.', 'error');
      return false;
    }
    
    // Check if this is a Slate.js editor (Help Scout uses Slate v0.47)
    if (editor.hasAttribute('data-slate-editor')) {
      // For Slate.js editor, inject content without sanitization (needs plain text)
      const success = await this.injectIntoSlateEditor(editor, reply);
      
      if (!success) {
        console.warn('GPT Assistant: Slate injection had issues, used fallback');
      }
      
      // Focus the editor after injection
      editor.focus();
      
    } else if (editor.contentEditable === 'true') {
      // Rich text editor (contenteditable)
      // Only sanitize for non-Slate editors
      const sanitizedReply = HTMLSanitizer.sanitize(reply);
      const formattedHTML = this.formatReplyHTML(sanitizedReply);
      editor.innerHTML = formattedHTML;
      
      // Trigger input events for React
      this.triggerReactChange(editor);
      
      // Focus the editor
      editor.focus();
      
      // Move cursor to end
      this.moveCursorToEnd(editor);
      
    } else if (editor.tagName === 'TEXTAREA') {
      // Plain text editor
      editor.value = reply;
      
      // Trigger change events
      editor.dispatchEvent(new Event('input', { bubbles: true }));
      editor.dispatchEvent(new Event('change', { bubbles: true }));
      
      // Focus the editor
      editor.focus();
    }
    
    // Show success notification
    this.showNotification('Reply generated successfully', 'success');
    return true;
  }
  
  /**
   * Trigger React change events for Help Scout
   */
  triggerReactChange(element) {
    // React 16+ uses a different event system
    const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
      window.HTMLElement.prototype,
      'innerHTML'
    );
    
    if (nativeInputValueSetter && nativeInputValueSetter.set) {
      nativeInputValueSetter.set.call(element, element.innerHTML);
    }
    
    // Trigger multiple events to ensure React detects the change
    const events = ['input', 'change', 'keyup', 'keydown', 'blur', 'focus'];
    events.forEach(eventType => {
      const event = new Event(eventType, { bubbles: true, cancelable: true });
      element.dispatchEvent(event);
    });
  }
  
  /**
   * Move cursor to end of contenteditable element
   */
  moveCursorToEnd(element) {
    const range = document.createRange();
    const selection = window.getSelection();
    range.selectNodeContents(element);
    range.collapse(false);
    selection.removeAllRanges();
    selection.addRange(range);
  }
  
  /**
   * Inject content into Slate.js editor with proper data model
   */
  async injectIntoSlateEditor(editor, reply) {
    try {
      // First approach: Try to use Slate's API directly through React
      const reactInternalKey = Object.keys(editor).find(key => key.startsWith('__reactInternalInstance'));
      const reactInstance = editor[reactInternalKey];
      
      if (reactInstance) {
        // Try to access the Slate editor through React's fiber tree
        let fiber = reactInstance;
        let slateEditor = null;
        
        // Walk up the fiber tree to find the Slate editor component
        while (fiber && !slateEditor) {
          if (fiber.memoizedProps?.editor) {
            slateEditor = fiber.memoizedProps.editor;
            break;
          }
          if (fiber.return) {
            fiber = fiber.return;
          } else {
            break;
          }
        }
        
        if (slateEditor && slateEditor.insertText) {
          // Use Slate's insertText method for proper data model handling
          // First, clear existing content if any
          slateEditor.selectAll();
          slateEditor.deleteBackward('block');
          
          // Insert the new text
          slateEditor.insertText(reply);
          
          // Trigger change events
          editor.dispatchEvent(new Event('input', { bubbles: true }));
          editor.dispatchEvent(new Event('change', { bubbles: true }));
          
          console.log('GPT Assistant: Successfully injected content using Slate.js API');
          return true;  // THIS RETURNS FROM THE FUNCTION - NO DUPLICATE
        }
      }
      
      // Second approach: Use paste event which Slate handles natively
      console.log('GPT Assistant: Using paste event for Slate-safe injection');
      
      try {
        // Focus the editor first
        editor.focus();
        
        // Wait a moment for focus to take effect
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Select all content first
        const selection = window.getSelection();
        const range = document.createRange();
        range.selectNodeContents(editor);
        selection.removeAllRanges();
        selection.addRange(range);
        
        // Create and dispatch a paste event
        // This is the most reliable way as Slate has built-in paste handling
        const clipboardData = new DataTransfer();
        clipboardData.setData('text/plain', reply);
        
        const pasteEvent = new ClipboardEvent('paste', {
          clipboardData: clipboardData,
          bubbles: true,
          cancelable: true
        });
        
        // Store current content to check if paste worked
        const beforeContent = editor.textContent || '';
        
        // Dispatch the paste event
        const pasted = editor.dispatchEvent(pasteEvent);
        
        // Wait a moment for paste to process
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Check if content actually changed
        const afterContent = editor.textContent || '';
        
        if (afterContent !== beforeContent && afterContent.includes(reply.substring(0, 20))) {
          // Content was successfully pasted
          console.log('GPT Assistant: Content successfully injected via paste event');
          return true;
        } else if (!pasted) {
          console.warn('GPT Assistant: Paste event was prevented, trying alternative');
        } else {
          console.warn('GPT Assistant: Paste event dispatched but content unchanged, trying alternative');
        }
      } catch (pasteError) {
        console.warn('GPT Assistant: Paste event failed:', pasteError);
      }
      
      // Third approach: Input simulation with proper Slate event sequence
      console.log('GPT Assistant: Using input simulation fallback');
      
      try {
        // Focus and clear
        editor.focus();
        await new Promise(resolve => setTimeout(resolve, 50));
        
        // Use keyboard shortcuts to select all (Cmd+A or Ctrl+A)
        const selectAllKey = new KeyboardEvent('keydown', {
          key: 'a',
          code: 'KeyA',
          ctrlKey: !navigator.platform.includes('Mac'),
          metaKey: navigator.platform.includes('Mac'),
          bubbles: true,
          cancelable: true
        });
        editor.dispatchEvent(selectAllKey);
        
        // Small delay for selection
        await new Promise(resolve => setTimeout(resolve, 50));
        
        // Create a single input event with the entire text
        // This is better than character-by-character for Slate
        const inputEvent = new InputEvent('beforeinput', {
          inputType: 'insertText',
          data: reply,
          bubbles: true,
          cancelable: true
        });
        
        const beforeInputHandled = editor.dispatchEvent(inputEvent);
        
        if (!beforeInputHandled) {
          // If beforeinput wasn't prevented, dispatch input event
          const afterInputEvent = new InputEvent('input', {
            inputType: 'insertText',
            data: reply,
            bubbles: true,
            cancelable: true
          });
          editor.dispatchEvent(afterInputEvent);
        }
        
        // Trigger React changes
        this.triggerReactChange(editor);
        
        console.log('GPT Assistant: Content injected via input simulation');
        return true;
      } catch (inputError) {
        console.warn('GPT Assistant: Input simulation failed:', inputError);
      }
      
    } catch (error) {
      console.error('GPT Assistant: Error injecting into Slate editor:', error);
      
      // Final fallback: Return false to indicate injection failed
      // We should NOT directly manipulate innerHTML as it breaks Slate's data model
      console.error('GPT Assistant: All Slate injection methods failed. The editor may be in an unexpected state.');
      return false;
    }
  }
  
  /**
   * Get current user information
   */
  getCurrentUser() {
    // Try appData first
    if (this.appDataCache?.user) {
      const user = this.appDataCache.user;
      return `${user.fname} ${user.lname}`;
    }
    
    // Try window.appData directly
    if (window.appData?.shared?.member) {
      const member = window.appData.shared.member;
      return `${member.fname} ${member.lname}`;
    }
    
    // Fallback to DOM
    const userElement = this.querySelector(this.selectors.userAvatar, true);
    return userElement ? HTMLSanitizer.sanitize(userElement.innerText.trim()) : null;
  }
  
  /**
   * Extract customer information from Help Scout
   */
  extractCustomerInfo() {
    const customerInfo = {};
    
    // Try appData first
    if (this.appDataCache?.customer) {
      const customer = this.appDataCache.customer;
      customerInfo.name = customer.name;
      customerInfo.email = customer.email;
      customerInfo.company = customer.company;
      
      // Add custom properties
      if (customer.properties) {
        customer.properties.forEach(prop => {
          customerInfo[prop.slug] = prop.value;
        });
      }
    }
    
    // Try window.appData directly
    if (window.appData?.conversationView?.customerProperties) {
      const properties = window.appData.conversationView.customerProperties;
      properties.forEach(prop => {
        customerInfo[prop.slug] = prop.value;
      });
    }
    
    // Fallback to DOM extraction from sidebar
    const sidebar = this.querySelector(this.selectors.sidebar);
    if (sidebar) {
      const properties = sidebar.querySelectorAll(this.selectors.customerProperty);
      
      properties.forEach(prop => {
        const label = prop.querySelector(this.selectors.propertyLabel);
        const value = prop.querySelector(this.selectors.propertyValue);
        
        if (label && value) {
          const key = label.innerText.trim().toLowerCase().replace(/\s+/g, '_');
          customerInfo[key] = HTMLSanitizer.sanitize(value.innerText.trim());
        }
      });
    }
    
    return Object.keys(customerInfo).length > 0 ? customerInfo : null;
  }
  
  /**
   * Show notification in Help Scout UI
   */
  showNotification(message, type = 'info') {
    // Help Scout uses a notification system we can hook into
    if (window.HS && window.HS.notify) {
      window.HS.notify(message, type);
      return;
    }
    
    // Fallback to custom notification
    const notification = document.createElement('div');
    notification.className = `gpt-assistant-notification ${type}`;
    notification.textContent = message;
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      padding: 12px 20px;
      background: ${type === 'error' ? '#dc3545' : type === 'success' ? '#28a745' : '#17a2b8'};
      color: white;
      border-radius: 4px;
      z-index: 9999;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      font-size: 14px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
      animation: slideIn 0.3s ease-out;
    `;
    
    document.body.appendChild(notification);
    
    // Remove after 3 seconds
    setTimeout(() => {
      notification.style.animation = 'slideOut 0.3s ease-out';
      setTimeout(() => notification.remove(), 300);
    }, 3000);
  }
  
  /**
   * Show generating status in Help Scout
   */
  async showGeneratingStatus() {
    const editor = await this.getReplyEditor();
    if (!editor) return;
    
    // Check if status already exists
    if (document.getElementById('gpt-generating-status')) {
      return;
    }
    
    // Create loading indicator
    const loader = document.createElement('div');
    loader.id = 'gpt-generating-status';
    loader.className = 'gpt-generating';
    loader.innerHTML = `
      <div style="display: flex; align-items: center; padding: 8px; background: #f0f8ff; border-radius: 4px; margin-bottom: 8px;">
        <div class="spinner" style="width: 16px; height: 16px; border: 2px solid #0066cc; border-top-color: transparent; border-radius: 50%; animation: spin 0.8s linear infinite; margin-right: 8px;"></div>
        <span style="color: #0066cc; font-size: 14px;">Generating AI response...</span>
      </div>
    `;
    
    // Find the best place to insert the loader
    try {
      // Try to find the editor container
      const container = editor.closest(this.selectors.editorContainer);
      
      if (container) {
        // If editor is a direct child, insert before it
        if (editor.parentElement === container) {
          container.insertBefore(loader, editor);
        } else {
          // Otherwise, find the closest parent that is a child of container
          let insertTarget = editor;
          while (insertTarget.parentElement && insertTarget.parentElement !== container) {
            insertTarget = insertTarget.parentElement;
          }
          
          if (insertTarget.parentElement === container) {
            container.insertBefore(loader, insertTarget);
          } else {
            // Fallback: insert at the beginning of container
            container.insertBefore(loader, container.firstChild);
          }
        }
      } else {
        // Fallback: insert before the editor's parent element
        const parent = editor.parentElement;
        if (parent && parent.parentElement) {
          parent.parentElement.insertBefore(loader, parent);
        } else {
          // Last resort: insert at the beginning of the parent
          parent.insertBefore(loader, parent.firstChild);
        }
      }
    } catch (error) {
      console.warn('GPT Assistant: Failed to insert generating status, using alternative method:', error);
      
      // Alternative approach: insert adjacent to editor
      try {
        editor.insertAdjacentElement('beforebegin', loader);
      } catch (e) {
        // Final fallback: append to editor's parent
        const parent = editor.parentElement;
        if (parent) {
          parent.insertBefore(loader, parent.firstChild);
        }
      }
    }
    
    // Add CSS animation if not exists
    if (!document.querySelector('#gpt-spinner-style')) {
      const style = document.createElement('style');
      style.id = 'gpt-spinner-style';
      style.textContent = `
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        @keyframes slideIn {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        @keyframes slideOut {
          from { transform: translateX(0); opacity: 1; }
          to { transform: translateX(100%); opacity: 0; }
        }
      `;
      document.head.appendChild(style);
    }
  }
  
  /**
   * Clear generating status
   */
  clearGeneratingStatus() {
    // Remove by ID
    const loader = document.getElementById('gpt-generating-status');
    if (loader) {
      loader.remove();
    }
    
    // Also remove by class in case there are duplicates
    const loaders = document.querySelectorAll('.gpt-generating');
    loaders.forEach(l => l.remove());
    
    console.log('GPT Assistant: Cleared generating status');
  }
  
  /**
   * Handle reply button click
   */
  async handleReplyButtonClick() {
    // Wait for editor to appear
    setTimeout(async () => {
      const editor = await this.getReplyEditor();
      if (editor) {
        this.emit('editorReady', { editor });
      }
    }, 500);
  }
  
  /**
   * Get keyboard shortcuts for Help Scout
   */
  getKeyboardShortcuts() {
    return {
      generateReply: 'ctrl+shift+g',
      regenerate: 'ctrl+shift+r',
      copyReply: 'ctrl+shift+c',
      clearReply: 'ctrl+shift+x'
    };
  }
  
  /**
   * Clean up resources
   */
  cleanup() {
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }
    
    this.clearCache();
    this.appDataCache = null;
    
    super.cleanup();
  }
  
  /**
   * Check if Help Scout is ready for operations
   */
  isReady() {
    // More lenient readiness check - Help Scout might be loading conversation
    // Check for any Help Scout indicators
    const hasHelpScoutDOM = !!(
      document.querySelector('#wrap') || 
      document.querySelector('#mailbox') ||
      document.querySelector('.c-conversation') ||
      document.querySelector(this.selectors.conversationContainer)
    );
    
    const hasAppData = !!(window.appData || this.appDataCache?.conversation);
    
    // Return true if we have any indication this is Help Scout
    return hasHelpScoutDOM || hasAppData;
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
   * Dispatch event (alias for emit)
   */
  dispatchEvent(event, data) {
    this.emit(event, data);
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
}
  
  // Export to global scope
  global.HelpScoutAdapter = HelpScoutAdapter;
})(window);