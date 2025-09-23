/**
 * GPT Assistant for FreeScout & Help Scout
 * Content script that works with both platforms using platform abstraction
 */

// Wait for all dependencies to be loaded
(function() {
  'use strict';

  // Get global dependencies
  const platformManager = window.platformManager;
  const HTMLSanitizer = window.HTMLSanitizer;

// Settings management with retry mechanism
async function loadSettings(retryCount = 0) {
  const maxRetries = 3;
  const retryDelay = 500;

  return new Promise(async (resolve) => {
    try {
      // Check if chrome.storage is available
      if (!chrome?.storage?.local) {
        if (retryCount < maxRetries) {
          console.log(`Chrome storage not ready, retrying... (${retryCount + 1}/${maxRetries})`);
          await new Promise(r => setTimeout(r, retryDelay));
          return resolve(await loadSettings(retryCount + 1));
        }

        console.warn('Chrome storage API not available after retries, using defaults');
        resolve({
          systemPrompt: '',
          docsUrl: '',
          openaiKey: '',
          openaiModel: 'gpt-5',
          temperature: 1,
          maxTokens: 1000,
          keyboardShortcut: 'Ctrl+Shift+G'
        });
        return;
      }

      chrome.storage.local.get(['systemPrompt', 'docsUrl', 'openaiKey', 'openaiModel', 'temperature', 'maxTokens', 'keyboardShortcut', 'enableFeedback'], (result) => {
        if (chrome.runtime.lastError) {
          console.error('Extension context error:', chrome.runtime.lastError);

          // Retry if we haven't exceeded retry count
          if (retryCount < maxRetries) {
            console.log(`Retrying due to runtime error... (${retryCount + 1}/${maxRetries})`);
            setTimeout(async () => {
              resolve(await loadSettings(retryCount + 1));
            }, retryDelay);
            return;
          }

          resolve({
            systemPrompt: '',
            docsUrl: '',
            openaiKey: '',
            openaiModel: 'gpt-5',
            temperature: 1,
            maxTokens: 1000,
            keyboardShortcut: 'Ctrl+Shift+G'
          });
          return;
        }
        resolve({
          ...result,
          temperature: result.temperature || 1,
          maxTokens: result.maxTokens || 1000
        });
      });
    } catch (error) {
      console.error('Extension context invalidated:', error);

      // Retry if we haven't exceeded retry count
      if (retryCount < maxRetries) {
        console.log(`Retrying after error... (${retryCount + 1}/${maxRetries})`);
        await new Promise(r => setTimeout(r, retryDelay));
        return resolve(await loadSettings(retryCount + 1));
      }

      resolve({
        systemPrompt: '',
        docsUrl: '',
        openaiKey: '',
        openaiModel: 'gpt-4o',
        temperature: 1,
        maxTokens: 1000,
        keyboardShortcut: 'Ctrl+Shift+G'
      });
    }
  });
}

// Documentation loading
async function loadDocs(url) {
  if (!url) return [];

  return new Promise((resolve) => {
    try {
      chrome.runtime.sendMessage(
        { action: 'fetchDocs', url },
        (response) => {
          if (chrome.runtime.lastError) {
            console.error('Extension context error in loadDocs:', chrome.runtime.lastError);
            resolve([]);
            return;
          }
          if (response && response.success) {
            resolve(response.docs);
          } else {
            console.error('Error loading docs:', response?.error);
            resolve([]);
          }
        }
      );
    } catch (error) {
      console.error('Extension context invalidated in loadDocs:', error);
      resolve([]);
    }
  });
}

// Feedback UI functions
function addFeedbackUI(generatedResponse) {
  // Remove any existing feedback UI
  const existingFeedback = document.querySelector('.ai-feedback-container');
  if (existingFeedback) {
    existingFeedback.remove();
  }

  // Generate unique ID for this response
  const responseId = 'response_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);

  // Create feedback container
  const feedbackContainer = document.createElement('div');
  feedbackContainer.className = 'ai-feedback-container';
  feedbackContainer.setAttribute('data-response-id', responseId);

  feedbackContainer.innerHTML = `
    <div style="
      background: #f8f9fa;
      border: 1px solid #dee2e6;
      border-radius: 6px;
      padding: 12px;
      margin: 10px 0;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 13px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    ">
      <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
        <span style="color: #6c757d; font-weight: 500;">How was this AI response?</span>
        <button class="feedback-btn feedback-positive" data-rating="positive" style="
          background: #28a745;
          color: white;
          border: none;
          border-radius: 4px;
          padding: 4px 8px;
          cursor: pointer;
          font-size: 12px;
          transition: all 0.2s;
        ">👍 Good</button>
        <button class="feedback-btn feedback-negative" data-rating="negative" style="
          background: #dc3545;
          color: white;
          border: none;
          border-radius: 4px;
          padding: 4px 8px;
          cursor: pointer;
          font-size: 12px;
          transition: all 0.2s;
        ">👎 Needs Work</button>
      </div>
      <div class="feedback-details" style="display: none;">
        <textarea class="feedback-notes" placeholder="What could be improved? (optional)" style="
          width: 100%;
          min-height: 60px;
          padding: 8px;
          border: 1px solid #ced4da;
          border-radius: 4px;
          font-size: 12px;
          font-family: inherit;
          resize: vertical;
          margin-bottom: 8px;
        "></textarea>
        <button class="feedback-submit" style="
          background: #007bff;
          color: white;
          border: none;
          border-radius: 4px;
          padding: 6px 12px;
          cursor: pointer;
          font-size: 12px;
          margin-right: 8px;
        ">Submit Feedback</button>
        <button class="feedback-cancel" style="
          background: #6c757d;
          color: white;
          border: none;
          border-radius: 4px;
          padding: 6px 12px;
          cursor: pointer;
          font-size: 12px;
        ">Cancel</button>
      </div>
      <div class="feedback-success" style="display: none; color: #28a745; font-weight: 500;">
        ✓ Thank you for your feedback!
      </div>
    </div>
  `;

  // Find the best place to insert feedback UI
  const editor = platformManager.getAdapter()?.getReplyEditor();
  if (editor && editor.parentElement) {
    editor.parentElement.appendChild(feedbackContainer);
  } else {
    // Fallback to conversation area
    const conversationArea = document.querySelector('.conversation-body') ||
                            document.querySelector('.thread-list') ||
                            document.querySelector('.c-conversation-thread');
    if (conversationArea) {
      conversationArea.appendChild(feedbackContainer);
    }
  }

  // Add event listeners
  setupFeedbackEventListeners(feedbackContainer, responseId, generatedResponse);
}

function setupFeedbackEventListeners(container, responseId, generatedResponse) {
  const positiveBtn = container.querySelector('.feedback-positive');
  const negativeBtn = container.querySelector('.feedback-negative');
  const detailsDiv = container.querySelector('.feedback-details');
  const submitBtn = container.querySelector('.feedback-submit');
  const cancelBtn = container.querySelector('.feedback-cancel');
  const successDiv = container.querySelector('.feedback-success');
  const notesTextarea = container.querySelector('.feedback-notes');

  // Handle positive feedback
  positiveBtn?.addEventListener('click', () => {
    handleFeedbackRating('positive', responseId, generatedResponse, container);
  });

  // Handle negative feedback
  negativeBtn?.addEventListener('click', () => {
    handleFeedbackRating('negative', responseId, generatedResponse, container);
    // Show details form for negative feedback
    detailsDiv.style.display = 'block';
    notesTextarea.focus();
  });

  // Handle submit
  submitBtn?.addEventListener('click', () => {
    const notes = notesTextarea.value.trim();
    submitFeedback(responseId, 'negative', notes, generatedResponse);
    detailsDiv.style.display = 'none';
    successDiv.style.display = 'block';
    positiveBtn.style.display = 'none';
    negativeBtn.style.display = 'none';
  });

  // Handle cancel
  cancelBtn?.addEventListener('click', () => {
    detailsDiv.style.display = 'none';
    notesTextarea.value = '';
  });

  // Auto-hide after 30 seconds if no interaction
  setTimeout(() => {
    if (container.parentNode && !container.querySelector('.feedback-success').style.display.includes('block')) {
      container.style.opacity = '0.5';
      container.style.transition = 'opacity 0.5s';
    }
  }, 30000);

  // Remove after 2 minutes
  setTimeout(() => {
    if (container.parentNode) {
      container.remove();
    }
  }, 120000);
}

function handleFeedbackRating(rating, responseId, generatedResponse, container) {
  if (rating === 'positive') {
    // For positive feedback, submit immediately
    submitFeedback(responseId, rating, '', generatedResponse);

    // Show success message
    const successDiv = container.querySelector('.feedback-success');
    successDiv.style.display = 'block';
    container.querySelector('.feedback-positive').style.display = 'none';
    container.querySelector('.feedback-negative').style.display = 'none';
  }
  // Negative feedback is handled in the event listener to show the form
}

async function submitFeedback(responseId, rating, notes, generatedResponse) {
  try {
    // Get current context for feedback
    const threadMessages = await platformManager.extractThread();
    const customerInfo = await platformManager.extractCustomerInfo();
    const platform = platformManager.getPlatform();

    const feedbackData = {
      id: responseId,
      timestamp: Date.now(),
      rating: rating,
      notes: notes,
      generatedResponse: generatedResponse,
      conversationContext: threadMessages.slice(-3), // Last 3 messages for context
      customerInfo: customerInfo,
      url: window.location.href,
      platform: platform
    };

    // Store feedback locally
    const storageKey = `feedback_${responseId}`;
    await chrome.storage.local.set({[storageKey]: feedbackData});

    console.log('Feedback submitted:', feedbackData);

    // Analyze patterns if we have enough feedback
    analyzeFeedbackPatterns();

  } catch (error) {
    console.error('Error submitting feedback:', error);
  }
}

async function analyzeFeedbackPatterns() {
  try {
    // Get all feedback data
    const allData = await chrome.storage.local.get(null);
    const feedbackEntries = Object.entries(allData)
      .filter(([key]) => key.startsWith('feedback_'))
      .map(([key, value]) => value)
      .sort((a, b) => b.timestamp - a.timestamp); // Most recent first

    if (feedbackEntries.length < 5) return; // Need at least 5 feedback entries

    // Analyze recent feedback (last 30 days)
    const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
    const recentFeedback = feedbackEntries.filter(f => f.timestamp > thirtyDaysAgo);

    if (recentFeedback.length === 0) return;

    // Calculate metrics
    const positiveCount = recentFeedback.filter(f => f.rating === 'positive').length;
    const negativeCount = recentFeedback.filter(f => f.rating === 'negative').length;
    const successRate = positiveCount / (positiveCount + negativeCount);

    // Extract common issues from negative feedback
    const negativeNotes = recentFeedback
      .filter(f => f.rating === 'negative' && f.notes)
      .map(f => f.notes.toLowerCase());

    const commonIssues = extractCommonIssues(negativeNotes);

    // Store analysis results
    const analysisData = {
      timestamp: Date.now(),
      totalFeedback: recentFeedback.length,
      successRate: successRate,
      commonIssues: commonIssues,
      suggestions: generateSuggestions(commonIssues, successRate)
    };

    await chrome.storage.local.set({feedbackAnalysis: analysisData});

    console.log('Feedback analysis updated:', analysisData);

  } catch (error) {
    console.error('Error analyzing feedback patterns:', error);
  }
}

function extractCommonIssues(negativeNotes) {
  const issuePatterns = {
    'too_formal': ['too formal', 'stiff', 'robotic', 'cold'],
    'too_casual': ['too casual', 'unprofessional', 'informal'],
    'missing_context': ['missing context', 'generic', 'not specific', 'context'],
    'too_long': ['too long', 'verbose', 'wordy', 'lengthy'],
    'too_short': ['too short', 'brief', 'not enough detail', 'incomplete'],
    'wrong_tone': ['wrong tone', 'tone', 'attitude'],
    'technical_errors': ['wrong information', 'incorrect', 'error', 'mistake'],
    'missing_greeting': ['no greeting', 'abrupt', 'starts too quickly'],
    'missing_signature': ['no signature', 'no sign-off', 'no closing']
  };

  const issues = {};

  negativeNotes.forEach(note => {
    Object.entries(issuePatterns).forEach(([issue, patterns]) => {
      if (patterns.some(pattern => note.includes(pattern))) {
        issues[issue] = (issues[issue] || 0) + 1;
      }
    });
  });

  // Return issues sorted by frequency
  return Object.entries(issues)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 5) // Top 5 issues
    .map(([issue, count]) => ({issue, count}));
}

function generateSuggestions(commonIssues, successRate) {
  const suggestions = [];

  if (successRate < 1) {
    suggestions.push('Consider reviewing and adjusting your system prompt for better response quality.');
  }

  commonIssues.forEach(({issue, count}) => {
    switch(issue) {
      case 'too_formal':
        suggestions.push('Try adding "Use a friendly, conversational tone" to your system prompt.');
        break;
      case 'too_casual':
        suggestions.push('Consider adding "Maintain a professional tone" to your system prompt.');
        break;
      case 'missing_context':
        suggestions.push('The AI might need more specific context. Try providing more details before generation.');
        break;
      case 'too_long':
        suggestions.push('Consider reducing the max tokens setting or adding "Be concise" to your system prompt.');
        break;
      case 'too_short':
        suggestions.push('Try increasing max tokens or adding "Provide detailed explanations" to your system prompt.');
        break;
      case 'wrong_tone':
        suggestions.push('Review your system prompt tone instructions and previous message analysis.');
        break;
    }
  });

  return suggestions.slice(0, 3); // Top 3 suggestions
}

// Keyboard shortcut parsing
function parseKeyboardShortcut(shortcutString) {
  const defaultShortcut = 'Ctrl+Shift+G';
  const shortcut = shortcutString || defaultShortcut;
  const parts = shortcut.toLowerCase().split('+').map(s => s.trim());

  return {
    ctrl: parts.includes('ctrl'),
    meta: parts.includes('cmd') || parts.includes('meta'),
    shift: parts.includes('shift'),
    alt: parts.includes('alt'),
    key: parts[parts.length - 1].toUpperCase()
  };
}

// Tone analysis for personalization
function analyzeUserTone(threadMessages, currentUser) {
  if (!currentUser || !threadMessages) return '';

  // Find messages from the current user
  const userMessages = threadMessages.filter(msg =>
    msg.role === 'assistant' &&
    msg.content.includes(`Agent (${currentUser}):`)
  );

  if (userMessages.length === 0) return '';

  // Extract just the message content without the "Agent (Name):" prefix
  const userReplies = userMessages.map(msg =>
    msg.content.replace(`Agent (${currentUser}): `, '')
  );

  if (userReplies.length === 0) return '';

  return `\n\nBased on ${currentUser}'s previous responses in this conversation, please match their communication style and tone. Here are their previous replies:\n${userReplies.map((reply, i) => `${i + 1}. ${reply}`).join('\n')}`;
}

// Format customer info for prompt
function formatCustomerInfoForPrompt(customerInfo) {
  if (!customerInfo) return '';

  let customerContext = '\n\n--- CUSTOMER INFORMATION ---\n';

  // Handle both FreeScout and Help Scout formats
  if (customerInfo.name) {
    customerContext += `Customer Name: ${customerInfo.name}\n`;
  }

  if (customerInfo.email) {
    customerContext += `Email: ${customerInfo.email}\n`;
  }

  if (customerInfo.company) {
    customerContext += `Company: ${customerInfo.company}\n`;
  }

  if (customerInfo.registered) {
    customerContext += `Registered: ${customerInfo.registered}\n`;
  }

  if (customerInfo.activeCRM) {
    customerContext += `CRM: ${customerInfo.activeCRM}\n`;
  }

  if (customerInfo.version) {
    customerContext += `Current Version: ${customerInfo.version}`;
    if (customerInfo.versionStatus === 'outdated') {
      customerContext += ' (OUTDATED - recommend updating)';
    }
    customerContext += '\n';
  }

  if (customerInfo.lastLicenseCheck) {
    customerContext += `Last License Check: ${customerInfo.lastLicenseCheck}\n`;
  }

  if (customerInfo.activeIntegrations && customerInfo.activeIntegrations.length > 0) {
    customerContext += `Active Integrations: ${customerInfo.activeIntegrations.join(', ')}\n`;
  }

  if (customerInfo.crmTags && customerInfo.crmTags.length > 0) {
    customerContext += `CRM Tags: ${customerInfo.crmTags.join(', ')}\n`;
  }

  if (customerInfo.license) {
    customerContext += `\nLicense Information:\n`;
    customerContext += `- Status: ${customerInfo.license.status || 'Unknown'}\n`;
    if (customerInfo.license.expires) {
      customerContext += `- Expires: ${customerInfo.license.expires}\n`;
    }
    if (customerInfo.license.activeSites) {
      customerContext += `- Active Sites: ${customerInfo.license.activeSites}\n`;
    }
    if (customerInfo.license.sampleSites && customerInfo.license.sampleSites.length > 0) {
      customerContext += `- Sample Sites: ${customerInfo.license.sampleSites.join(', ')}\n`;
    }
  }

  if (customerInfo.recentOrders && customerInfo.recentOrders.length > 0) {
    customerContext += `\nRecent Orders:\n`;
    customerInfo.recentOrders.forEach((order, index) => {
      customerContext += `${index + 1}. ${order.status || 'Unknown'} - ${order.number || 'N/A'} - ${order.amount || 'N/A'}`;
      if (order.product) {
        customerContext += ` - ${order.product}`;
      }
      if (order.date) {
        customerContext += ` (${order.date})`;
      }
      customerContext += '\n';
    });
  }

  // Handle custom properties (Help Scout format)
  const knownProperties = ['name', 'email', 'company', 'registered', 'activeCRM', 'version', 'versionStatus', 'lastLicenseCheck', 'activeIntegrations', 'crmTags', 'license', 'recentOrders'];
  const customProperties = Object.keys(customerInfo).filter(key => !knownProperties.includes(key));

  if (customProperties.length > 0) {
    customerContext += `\nAdditional Information:\n`;
    customProperties.forEach(key => {
      const value = customerInfo[key];
      const formattedKey = key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
      customerContext += `- ${formattedKey}: ${value}\n`;
    });
  }

  customerContext += '\nUse this customer information to provide personalized support and relevant recommendations.\n';

  return customerContext;
}

// Extract existing context from editor
function extractExistingContext() {
  const adapter = platformManager.getAdapter();
  if (!adapter) return '';

  const editor = adapter.getReplyEditor();
  if (!editor) return '';

  let existingContext = '';

  if (editor.contentEditable === 'true') {
    // Extract text content from contenteditable
    existingContext = editor.innerText?.trim() || '';
  } else if (editor.tagName === 'TEXTAREA') {
    // Extract from textarea
    existingContext = editor.value?.trim() || '';
  }

  // Only return context if it's not empty and not the generating status message
  if (existingContext && !existingContext.includes('🤖 Generating AI response...')) {
    return existingContext;
  }

  return '';
}

// Main AI generation function
async function generateAIResponse(e) {
  const settings = await loadSettings();
  const { systemPrompt, docsUrl, openaiKey, openaiModel, temperature, maxTokens } = settings;

  try {
    // Validate API key first
    if (!openaiKey || openaiKey.trim() === '') {
      await platformManager.injectReply('Error: No OpenAI API key configured. Please set your API key in the extension settings.');
      return;
    }

    // Extract any existing context from the editor before showing generating status
    const existingContext = extractExistingContext();

    // Show generating status
    await platformManager.showGeneratingStatus();

    // Load documentation
    const docs = await loadDocs(docsUrl);

    // Debug: Log documentation loading results
    console.log('GPT Assistant: Documentation loading:', {
      url: docsUrl,
      docsLoaded: docs?.length || 0,
      totalChars: docs?.reduce((sum, doc) => sum + (doc.content?.length || 0), 0) || 0
    });

    // Extract conversation and user info
    const threadMessages = await platformManager.extractThread();
    const currentUser = await platformManager.getCurrentUser();
    const customerInfo = await platformManager.extractCustomerInfo();

    // Build documentation context from actual content
    let docsContext = '';
    if (docs && docs.length > 0) {
      docsContext = docs.map(doc => {
        let docText = `## ${doc.title}\n`;
        if (doc.url) docText += `URL: ${doc.url}\n`;
        if (doc.content) docText += `${doc.content.trim()}\n`;
        return docText;
      }).join('\n---\n');
    }

    // Build the system message with static content first for optimal caching
    // STATIC CONTENT (placed first for prompt caching optimization)
    let systemMessage = systemPrompt || 'You are a helpful customer support agent.';

    // Add documentation context early (static, cacheable content)
    if (docsContext) {
      systemMessage += `\n\n--- DOCUMENTATION ---\n${docsContext}`;
    }

    // Add general instructions (static, cacheable)
    systemMessage += '\n\n--- INSTRUCTIONS ---\nRespond concisely and helpfully to the customer based on the conversation history.';

    // Add user name instruction if available (semi-static)
    if (currentUser) {
      systemMessage += `\n\nYour name is ${currentUser}. End your response with an appropriate brief sign-off using your name (e.g., "Best, ${currentUser}" or "Cheers, ${currentUser}"). Do not include any company signature as it will be automatically appended.`;
    }

    // DYNAMIC CONTENT (placed last for prompt caching optimization)
    // Add customer information (changes per customer)
    const customerContext = formatCustomerInfoForPrompt(customerInfo);
    if (customerContext) {
      systemMessage += customerContext;
    }

    // Add existing context if available (highly dynamic)
    if (existingContext) {
      systemMessage += `\n\n--- ADDITIONAL CONTEXT ---\nThe agent has provided the following context/notes to consider when generating the response:\n${existingContext}\n\nPlease incorporate this context appropriately into your response.`;
    }

    // Analyze and match user's tone from previous messages (dynamic)
    const toneAnalysis = analyzeUserTone(threadMessages, currentUser);
    if (toneAnalysis) {
      systemMessage += toneAnalysis;
    }

    // Build the messages array
    const messages = [
      { role: 'system', content: systemMessage }
    ];

    // Add all conversation messages (dynamic content)
    messages.push(...threadMessages);

    // Add a final instruction if we have conversation history
    if (threadMessages.length > 0) {
      messages.push({
        role: 'user',
        content: 'Please provide a helpful response to continue this conversation.'
      });
    }

    // Generate a prompt_cache_key based on static content for better cache routing
    // Use a combination of model, system prompt hash, and docs URL
    const generateCacheKey = () => {
      // Create a simple hash of the system prompt for consistency
      const promptHash = systemPrompt ?
        systemPrompt.split('').reduce((a, b) => {
          a = ((a << 5) - a) + b.charCodeAt(0);
          return a & a;
        }, 0).toString(36) : 'default';

      // Include docs URL domain for cache key segmentation
      let docsDomain = 'nodocs';
      if (docsUrl) {
        try {
          docsDomain = new URL(docsUrl).hostname.replace(/\./g, '-');
        } catch (e) {
          // If URL is invalid, use a hash of the URL string
          docsDomain = 'invalid-' + docsUrl.split('').reduce((a, b) => {
            a = ((a << 5) - a) + b.charCodeAt(0);
            return a & a;
          }, 0).toString(36);
        }
      }

      // Combine into cache key (keep under 64 chars as recommended)
      const cacheKey = `${openaiModel}-${promptHash}-${docsDomain}`.substring(0, 64);
      return cacheKey;
    };

    // Prepare request body with prompt caching optimization
    const requestBody = {
      model: openaiModel,
      messages: messages,
      temperature: temperature,
      // Add prompt_cache_key for optimal cache routing
      prompt_cache_key: generateCacheKey()
    };

    // GPT-5 Mini uses max_completion_tokens instead of max_tokens
    if (openaiModel === 'gpt-5-mini' || openaiModel === 'gpt-5') {
      requestBody.max_completion_tokens = maxTokens;
    } else {
      requestBody.max_tokens = maxTokens;
    }

    // Create an AbortController for timeout
    const controller = new AbortController();
    const timeoutMs = 60000; // 60 seconds timeout (increased from default)

    const timeout = setTimeout(() => {
      controller.abort();
    }, timeoutMs);

    try {
      // Make API call to OpenAI with timeout
      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${openaiKey.trim()}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal
      });

      clearTimeout(timeout);

      const data = await res.json();

      // Log the full API response including cache metrics
      const cacheMetrics = {
        cached_tokens: data.usage?.prompt_tokens_details?.cached_tokens || 0,
        total_prompt_tokens: data.usage?.prompt_tokens || 0,
        cache_hit_rate: data.usage?.prompt_tokens_details?.cached_tokens ?
          ((data.usage.prompt_tokens_details.cached_tokens / data.usage.prompt_tokens) * 100).toFixed(1) + '%' : '0%',
        potential_cost_savings: data.usage?.prompt_tokens_details?.cached_tokens ?
          ((data.usage.prompt_tokens_details.cached_tokens / data.usage.prompt_tokens) * 0.75 * 100).toFixed(1) + '%' : '0%'
      };

      console.log('GPT Assistant: API Response:', {
        status: res.status,
        model: data.model,
        usage: data.usage,
        cache_metrics: cacheMetrics,
        prompt_cache_key: requestBody.prompt_cache_key,
        choices: data.choices?.length || 0,
        content_length: data.choices?.[0]?.message?.content?.length || 0,
        finish_reason: data.choices?.[0]?.finish_reason
      });

      // Log cache performance if caching occurred
      if (cacheMetrics.cached_tokens > 0) {
        console.log(`GPT Assistant: Prompt caching active! ${cacheMetrics.cached_tokens} tokens cached (${cacheMetrics.cache_hit_rate} hit rate, ~${cacheMetrics.potential_cost_savings} cost savings)`);
      }

      // Check for API errors
      if (!res.ok) {
        console.error('GPT Assistant: API Error Response:', data);
        let errorMessage = `API Error (${res.status}): `;
        if (data.error) {
          errorMessage += data.error.message || data.error.type || 'Unknown error';
        } else {
          errorMessage += res.statusText || 'Request failed';
        }
        throw new Error(errorMessage);
      }

      const reply = data.choices?.[0]?.message?.content;
      if (!reply) {
        // Don't throw error for empty response, just log and show gentle message
        console.warn('GPT Assistant: Empty response received from OpenAI API');
        await platformManager.clearGeneratingStatus();

        const message = 'The AI generated an empty response. This might happen if:\n' +
                       '• The conversation context is unclear\n' +
                       '• The request is too complex\n' +
                       '• There was a temporary API issue\n\n' +
                       'Please try rephrasing your request or providing more context.';
        await platformManager.injectReply(message);
        return;
      }

      // Clear the generating status first
      await platformManager.clearGeneratingStatus();

      // Inject the reply
      await platformManager.injectReply(reply);

      // Add feedback UI if enabled
      if (settings.enableFeedback !== false) {
        addFeedbackUI(reply);
      }

    } catch (abortError) {
      // Handle timeout separately
      if (abortError.name === 'AbortError') {
        console.error('GPT Assistant: Request timed out after 60 seconds');
        await platformManager.clearGeneratingStatus();

        const timeoutMessage = 'The request timed out after 60 seconds. This might be due to:\n' +
                               '• OpenAI service being slow or unavailable\n' +
                               '• Network connectivity issues\n' +
                               '• Very long conversation context\n\n' +
                               'Please try again or reduce the conversation length.';
        await platformManager.injectReply(timeoutMessage);
        return;
      }

      // Re-throw for other errors
      throw abortError;
    }

  } catch (error) {
    console.error('GPT Assistant: Error generating response:', error);
    await platformManager.clearGeneratingStatus();

    // Handle different types of errors more gracefully
    let userMessage = '';

    if (error.message?.includes('Failed to fetch')) {
      // Network errors
      userMessage = 'Network error: Unable to reach OpenAI API.\n\n' +
                   'Please check your internet connection and try again.';
    } else if (error.message?.includes('401')) {
      // Authentication error
      userMessage = 'Authentication failed. Please check your OpenAI API key in the extension settings.';
    } else if (error.message?.includes('429')) {
      // Rate limit error
      userMessage = 'Rate limit exceeded. Please wait a moment and try again.';
    } else if (error.message?.includes('API Error')) {
      // API errors - show the actual error
      userMessage = error.message.replace('Error generating AI response: ', '');
    } else {
      // Generic error - but don't show technical details
      userMessage = 'Unable to generate AI response at this time.\n\n' +
                   'Please try again in a moment. If the issue persists, check:\n' +
                   '• Your OpenAI API key in settings\n' +
                   '• Your internet connection\n' +
                   '• OpenAI service status';
    }

    // Only inject error message if we have one
    if (userMessage) {
      await platformManager.injectReply(userMessage);
    }
  }
}

// Keyboard shortcut handler
function setupKeyboardShortcuts() {
  document.addEventListener('keydown', async (e) => {
    const settings = await loadSettings();
    const shortcut = parseKeyboardShortcut(settings.keyboardShortcut);

    const matchesShortcut =
      ((shortcut.ctrl && e.ctrlKey) || (shortcut.meta && e.metaKey)) &&
      (shortcut.shift === e.shiftKey) &&
      (shortcut.alt === e.altKey) &&
      e.key.toUpperCase() === shortcut.key;

    if (matchesShortcut) {
      e.preventDefault();
      await generateAIResponse(e);
    }
  });
}

// Initialize extension
async function initializeExtension() {
  console.log('GPT Assistant: Starting initialization...');

  // Wait a bit for Chrome APIs to be available
  let apiCheckAttempts = 0;
  const maxApiChecks = 5;
  const apiCheckDelay = 200;

  while (!chrome?.runtime?.id && apiCheckAttempts < maxApiChecks) {
    console.log(`Waiting for Chrome APIs... (${apiCheckAttempts + 1}/${maxApiChecks})`);
    await new Promise(resolve => setTimeout(resolve, apiCheckDelay));
    apiCheckAttempts++;
  }

  if (!chrome?.runtime?.id) {
    console.warn('GPT Assistant: Chrome APIs not available, running in limited mode');
  } else {
    console.log('GPT Assistant: Chrome APIs available');
  }

  // Initialize platform manager
  const initialized = await platformManager.initialize();

  if (!initialized) {
    console.log('GPT Assistant: Platform not supported on this page');
    return;
  }

  const platform = platformManager.getPlatform();
  console.log(`GPT Assistant: Successfully initialized for ${platform}`);

  // Setup keyboard shortcuts
  setupKeyboardShortcuts();

  // Setup platform-specific event listeners
  platformManager.addEventListener('error', (data) => {
    console.error('GPT Assistant Error:', data);
  });

  platformManager.addEventListener('editorReady', async () => {
    console.log('GPT Assistant: Editor ready');
  });

  // Perform health check
  const health = await platformManager.healthCheck();
  console.log('GPT Assistant Health Check:', health);

  // Show ready notification
  const adapter = platformManager.getAdapter();
  if (adapter && adapter.showNotification) {
    adapter.showNotification('GPT Assistant ready', 'success');
  }
}

// Handle page navigation (for SPAs)
let lastUrl = location.href;
new MutationObserver(() => {
  const url = location.href;
  if (url !== lastUrl) {
    lastUrl = url;
    console.log('GPT Assistant: Page navigation detected, resetting...');
    platformManager.reset().then(() => {
      console.log('GPT Assistant: Reset complete');
    });
  }
}).observe(document, { subtree: true, childList: true });

// Initialize when DOM is ready with a small delay for extension context
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    // Small delay to ensure extension context is ready
    setTimeout(initializeExtension, 100);
  });
} else {
  // If DOM is already loaded, still add a small delay
  setTimeout(initializeExtension, 100);
}

  // Export for debugging
  window.gptAssistant = {
    platformManager,
    generateAIResponse,
    getHealth: () => platformManager.healthCheck(),
    getMetrics: () => platformManager.getMetrics(),
    reset: () => platformManager.reset()
  };
})();