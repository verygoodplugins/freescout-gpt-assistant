// Background script placeholder
chrome.runtime.onInstalled.addListener(() => {
  console.log("FreeScout GPT Assistant installed.");
});

// Test function for debugging - can be called from console
globalThis.testFetchDocs = async function(url = 'https://docs.gravitykit.com/llms-full.txt') {
  console.log('=== TESTING DOCUMENTATION FETCH ===');
  console.log('URL:', url);
  
  try {
    // Try direct fetch first
    console.log('Step 1: Attempting direct fetch...');
    const response = await fetch(url);
    console.log('Step 2: Response status:', response.status, 'OK:', response.ok);
    console.log('Step 3: Response headers:', Object.fromEntries(response.headers.entries()));
    
    const text = await response.text();
    console.log('Step 4: Received text length:', text.length);
    console.log('Step 5: First 500 characters:', text.substring(0, 500));
    console.log('Step 6: Text starts with "# "?', text.startsWith('# '));
    console.log('Step 7: Contains any "# " headers?', text.includes('\n# '));
    
    // Now try the actual fetchDocs function
    console.log('Step 8: Testing fetchDocs function...');
    const docs = await fetchDocs(url);
    console.log('Step 9: Parsed documents:', docs.length);
    if (docs.length > 0) {
      console.log('Step 10: First document:', docs[0]);
    }
    
    return { success: true, textLength: text.length, docsCount: docs.length };
  } catch (error) {
    console.error('Test failed:', error);
    return { success: false, error: error.message };
  }
};

console.log('GPT Assistant: Background script loaded. Run testFetchDocs() in console to test.');

// Handle messages from content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('GPT Assistant: Received message:', request.action, request.url || '');
  
  if (request.action === 'fetchDocs') {
    console.log('GPT Assistant: Processing fetchDocs request for:', request.url);
    fetchDocsWithCache(request.url)
      .then(docs => {
        console.log('GPT Assistant: fetchDocs completed, returning', docs?.length || 0, 'docs');
        sendResponse({ success: true, docs });
      })
      .catch(error => {
        console.error('GPT Assistant: fetchDocs error:', error);
        sendResponse({ success: false, error: error.message });
      });
    return true; // Keep the message channel open for async response
  } else if (request.action === 'clearDocsCache') {
    clearDocsCache()
      .then(() => sendResponse({ success: true }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true;
  } else if (request.action === 'deleteFeedbackEntry') {
    deleteFeedbackEntry(request.entryId)
      .then(() => sendResponse({ success: true }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true;
  } else if (request.action === 'deleteOldFeedbackEntries') {
    deleteOldFeedbackEntries(request.cutoffDate)
      .then(deletedCount => sendResponse({ success: true, deletedCount }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true;
  } else if (request.action === 'deleteNegativeFeedbackEntries') {
    deleteNegativeFeedbackEntries()
      .then(deletedCount => sendResponse({ success: true, deletedCount }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true;
  }
});

async function fetchDocsWithCache(url) {
  if (!url) {
    console.log('GPT Assistant: No documentation URL provided');
    return [];
  }
  
  // Check cache first
  const cacheKey = `docs_cache_${url}`;
  const timestampKey = `docs_timestamp_${url}`;
  
  try {
    const result = await chrome.storage.local.get([cacheKey, timestampKey]);
    const cachedDocs = result[cacheKey];
    const cachedTimestamp = result[timestampKey];
    
    // Check if cache is valid (less than 24 hours old)
    const oneDayInMs = 24 * 60 * 60 * 1000;
    const now = Date.now();
    
    if (cachedDocs && cachedTimestamp && (now - cachedTimestamp) < oneDayInMs) {
      console.log('GPT Assistant: Using cached docs for:', url, 'Count:', cachedDocs.length);
      return cachedDocs;
    }
    
    // Cache is invalid or doesn't exist, fetch fresh data
    console.log('GPT Assistant: Fetching fresh docs for:', url);
    const docs = await fetchDocs(url);
    
    // Only cache if we got valid docs
    if (docs && docs.length > 0) {
      // Store in cache with timestamp
      await chrome.storage.local.set({
        [cacheKey]: docs,
        [timestampKey]: now
      });
      console.log('GPT Assistant: Cached', docs.length, 'documents');
    } else {
      console.warn('GPT Assistant: No documents to cache for:', url);
    }
    
    return docs;
  } catch (error) {
    console.error('GPT Assistant: Error with docs cache:', error);
    // Fallback to direct fetch if cache fails
    return await fetchDocs(url);
  }
}

async function clearDocsCache() {
  try {
    // Get all storage keys
    const allItems = await chrome.storage.local.get(null);
    const keysToRemove = Object.keys(allItems).filter(key => 
      key.startsWith('docs_cache_') || key.startsWith('docs_timestamp_')
    );
    
    if (keysToRemove.length > 0) {
      await chrome.storage.local.remove(keysToRemove);
      console.log('Cleared docs cache:', keysToRemove.length, 'items');
    }
  } catch (error) {
    console.error('Error clearing docs cache:', error);
  }
}

async function fetchDocs(url) {
  if (!url) {
    console.log('GPT Assistant: fetchDocs called with no URL');
    return [];
  }
  
  console.log('GPT Assistant: Starting fetch for:', url);
  
  try {
    // Add cache-busting query parameter
    const urlWithCacheBuster = url + (url.includes('?') ? '&' : '?') + `cb=${Date.now()}`;
    
    console.log('GPT Assistant: Fetching URL:', urlWithCacheBuster);
    
    const response = await fetch(urlWithCacheBuster, {
      cache: 'no-cache',
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });
    
    console.log('GPT Assistant: Fetch response status:', response.status, 'OK:', response.ok);
    
    if (!response.ok) {
      // Handle 404 and other errors more gracefully
      if (response.status === 404) {
        console.warn(`GPT Assistant: Documentation URL not found (404): ${url}`);
        // Return empty array instead of throwing
        return [];
      }
      // For other errors, log but don't throw
      console.warn(`GPT Assistant: Failed to fetch docs (HTTP ${response.status}): ${url}`);
      return [];
    }
    
    const text = await response.text();
    console.log('GPT Assistant: Fetched text length:', text.length);
    
    // Debug: Log raw text size
    console.log('GPT Assistant: Fetched documentation:', {
      url: url,
      textLength: text.length,
      firstChars: text.substring(0, 200) // Log first 200 chars to see format
    });
    
    const docs = [];
    const lines = text.split('\n');
    let currentDoc = null;
    
    // Check if the text follows the expected format (has # headers)
    const hasHeaders = lines.some(line => line.startsWith('# '));
    
    if (hasHeaders) {
      // Parse structured format with headers
      for (const line of lines) {
        if (line.startsWith('# ')) {
          if (currentDoc) docs.push(currentDoc);
          currentDoc = { title: line.slice(2).trim(), content: '', url: '' };
        } else if (line.startsWith('URL: ') && currentDoc) {
          currentDoc.url = line.slice(5).trim();
        } else if (currentDoc && line.trim()) {
          currentDoc.content += line + '\n';
        }
      }
      
      if (currentDoc) docs.push(currentDoc);
    } else if (text.trim()) {
      // Fallback: Treat entire text as one document if no headers found
      console.log('GPT Assistant: No headers found in documentation, using entire text as one document');
      
      // Split into chunks if text is very large (>10000 chars per chunk)
      const chunkSize = 10000;
      if (text.length > chunkSize) {
        // Split by paragraphs or sections
        const sections = text.split(/\n\n+/);
        let currentChunk = '';
        let chunkIndex = 1;
        
        for (const section of sections) {
          if ((currentChunk + section).length > chunkSize && currentChunk) {
            docs.push({
              title: `Documentation Part ${chunkIndex}`,
              content: currentChunk.trim(),
              url: url
            });
            currentChunk = section;
            chunkIndex++;
          } else {
            currentChunk += (currentChunk ? '\n\n' : '') + section;
          }
        }
        
        // Add remaining chunk
        if (currentChunk.trim()) {
          docs.push({
            title: `Documentation Part ${chunkIndex}`,
            content: currentChunk.trim(),
            url: url
          });
        }
      } else {
        // Small enough to use as single document
        docs.push({
          title: 'Documentation',
          content: text.trim(),
          url: url
        });
      }
    }
    
    // Debug: Log parsed results
    console.log('GPT Assistant: Parsed documentation:', {
      docsCount: docs.length,
      totalContentLength: docs.reduce((sum, doc) => sum + (doc.content?.length || 0), 0),
      titles: docs.map(d => d.title)
    });
    
    return docs;
  } catch (error) {
    // Log detailed error information
    console.error('GPT Assistant: Error fetching docs:', {
      url: url,
      errorMessage: error.message,
      errorStack: error.stack,
      errorType: error.name
    });
    
    // Don't log network errors as errors, just warnings
    if (error.message?.includes('Failed to fetch')) {
      console.warn('GPT Assistant: Documentation fetch failed (network issue). This might be a CORS issue or network problem:', url);
    } else {
      console.warn('GPT Assistant: Error fetching docs:', error.message || error);
    }
    return [];
  }
}

// Feedback deletion functions
async function deleteFeedbackEntry(entryId) {
  try {
    const storageKey = `feedback_${entryId}`;
    await chrome.storage.local.remove([storageKey]);
    console.log('Deleted feedback entry:', entryId);
    
    // Reanalyze patterns after deletion
    await reanalyzeFeedbackPatterns();
  } catch (error) {
    console.error('Error deleting feedback entry:', error);
    throw error;
  }
}

async function deleteOldFeedbackEntries(cutoffDate) {
  try {
    const allData = await chrome.storage.local.get(null);
    const feedbackKeys = Object.keys(allData).filter(key => key.startsWith('feedback_'));
    const keysToDelete = [];
    
    for (const key of feedbackKeys) {
      const entry = allData[key];
      if (entry && entry.timestamp < cutoffDate) {
        keysToDelete.push(key);
      }
    }
    
    if (keysToDelete.length > 0) {
      await chrome.storage.local.remove(keysToDelete);
      console.log('Deleted old feedback entries:', keysToDelete.length);
      
      // Reanalyze patterns after deletion
      await reanalyzeFeedbackPatterns();
    }
    
    return keysToDelete.length;
  } catch (error) {
    console.error('Error deleting old feedback entries:', error);
    throw error;
  }
}

async function deleteNegativeFeedbackEntries() {
  try {
    const allData = await chrome.storage.local.get(null);
    const feedbackKeys = Object.keys(allData).filter(key => key.startsWith('feedback_'));
    const keysToDelete = [];
    
    for (const key of feedbackKeys) {
      const entry = allData[key];
      if (entry && entry.rating === 'negative') {
        keysToDelete.push(key);
      }
    }
    
    if (keysToDelete.length > 0) {
      await chrome.storage.local.remove(keysToDelete);
      console.log('Deleted negative feedback entries:', keysToDelete.length);
      
      // Reanalyze patterns after deletion
      await reanalyzeFeedbackPatterns();
    }
    
    return keysToDelete.length;
  } catch (error) {
    console.error('Error deleting negative feedback entries:', error);
    throw error;
  }
}

async function reanalyzeFeedbackPatterns() {
  try {
    // Get remaining feedback data
    const allData = await chrome.storage.local.get(null);
    const feedbackEntries = Object.entries(allData)
      .filter(([key]) => key.startsWith('feedback_'))
      .map(([key, value]) => value)
      .sort((a, b) => b.timestamp - a.timestamp);
    
    if (feedbackEntries.length < 5) {
      // Remove analysis if not enough data
      await chrome.storage.local.remove(['feedbackAnalysis']);
      return;
    }
    
    // Analyze recent feedback (last 30 days)
    const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
    const recentFeedback = feedbackEntries.filter(f => f.timestamp > thirtyDaysAgo);
    
    if (recentFeedback.length === 0) {
      await chrome.storage.local.remove(['feedbackAnalysis']);
      return;
    }
    
    // Calculate metrics
    const positiveCount = recentFeedback.filter(f => f.rating === 'positive').length;
    const negativeCount = recentFeedback.filter(f => f.rating === 'negative').length;
    const successRate = positiveCount / (positiveCount + negativeCount);
    
    // Extract common issues from negative feedback
    const negativeNotes = recentFeedback
      .filter(f => f.rating === 'negative' && f.notes)
      .map(f => f.notes.toLowerCase());
    
    const commonIssues = extractCommonIssues(negativeNotes);
    
    // Store updated analysis
    const analysisData = {
      timestamp: Date.now(),
      totalFeedback: recentFeedback.length,
      successRate: successRate,
      commonIssues: commonIssues,
      suggestions: generateSuggestions(commonIssues, successRate)
    };
    
    await chrome.storage.local.set({feedbackAnalysis: analysisData});
    console.log('Feedback analysis updated after deletion');
    
  } catch (error) {
    console.error('Error reanalyzing feedback patterns:', error);
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
  
  if (successRate < 0.7) {
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