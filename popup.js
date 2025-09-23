const DEFAULT_SYSTEM_PROMPT = `You are a helpful customer support agent for [Company Name]. Please provide clear, concise, and friendly responses to customer inquiries.

Guidelines:
- Be authoritative yet approachable in your tone
- Keep responses concise but complete
- Always reference relevant documentation links when applicable
- Use a helpful, professional tone
- If you mention documentation, include the specific URL
- Structure your response clearly with bullet points or numbered lists when helpful
- Do not make use of markdown headings
- You can make tasteful use of emojis
- End with an offer to help further if needed

When referencing documentation, format links as: [Link Text](URL)`;

// Load saved settings when popup opens
chrome.storage.local.get(['systemPrompt', 'docsUrl', 'openaiKey', 'openaiModel', 'temperature', 'maxTokens', 'keyboardShortcut', 'enableFeedback'], (result) => {
  document.getElementById('systemPrompt').value = result.systemPrompt || DEFAULT_SYSTEM_PROMPT;
  document.getElementById('docsUrl').value = result.docsUrl || '';
  document.getElementById('openaiKey').value = result.openaiKey || '';
  document.getElementById('openaiModel').value = result.openaiModel || 'gpt-5';
  document.getElementById('temperature').value = result.temperature || 1;
  document.getElementById('maxTokens').value = result.maxTokens || 1000;
  document.getElementById('keyboardShortcut').value = result.keyboardShortcut || 'Ctrl+Shift+G';
  document.getElementById('enableFeedback').checked = result.enableFeedback !== false; // Default to true

  // Check cache status after loading settings
  checkCacheStatus(result.docsUrl);

  // Load feedback analytics (only if feedback is enabled)
  if (result.enableFeedback !== false) {
    loadFeedbackAnalytics();
  } else {
    // Hide feedback section if disabled
    document.querySelector('.feedback-section').style.display = 'none';
  }
});

// Add event listener to restore default prompt when cleared
document.getElementById('systemPrompt').addEventListener('blur', function() {
  if (this.value.trim() === '') {
    this.value = DEFAULT_SYSTEM_PROMPT;
    // Save the restored default
    chrome.storage.local.set({ systemPrompt: DEFAULT_SYSTEM_PROMPT });
  }
});

// Toggle feedback section visibility when checkbox changes
document.getElementById('enableFeedback').addEventListener('change', function() {
  const feedbackSection = document.querySelector('.feedback-section');
  if (this.checked) {
    feedbackSection.style.display = 'block';
    loadFeedbackAnalytics();
  } else {
    feedbackSection.style.display = 'none';
  }
});

// Check cache status for the docs URL
function checkCacheStatus(docsUrl) {
  const statusElement = document.getElementById('cacheStatus');

  if (!docsUrl) {
    statusElement.textContent = 'No docs URL configured';
    statusElement.className = 'cache-status cache-not-cached';
    return;
  }

  const cacheKey = `docs_cache_${docsUrl}`;
  const timestampKey = `docs_timestamp_${docsUrl}`;

  chrome.storage.local.get([cacheKey, timestampKey], (result) => {
    const cachedDocs = result[cacheKey];
    const cachedTimestamp = result[timestampKey];

    if (cachedDocs && cachedTimestamp) {
      const now = Date.now();
      const ageHours = Math.floor((now - cachedTimestamp) / (1000 * 60 * 60));
      const ageText = ageHours < 1 ? 'less than 1 hour' : `${ageHours} hour${ageHours > 1 ? 's' : ''}`;

      statusElement.textContent = `Documentation cached (${ageText} ago)`;
      statusElement.className = 'cache-status cache-cached';
    } else {
      statusElement.textContent = 'Documentation not cached';
      statusElement.className = 'cache-status cache-not-cached';
    }
  });
}

// Load and display feedback analytics
async function loadFeedbackAnalytics() {
  try {
    const allData = await new Promise(resolve => {
      chrome.storage.local.get(null, resolve);
    });

    // Get feedback entries
    const feedbackEntries = Object.entries(allData)
      .filter(([key]) => key.startsWith('feedback_'))
      .map(([key, value]) => value)
      .sort((a, b) => b.timestamp - a.timestamp);

    const statsElement = document.getElementById('feedbackStats');
    const suggestionsElement = document.getElementById('feedbackSuggestions');
    const suggestionsList = document.getElementById('suggestionsList');

    if (feedbackEntries.length === 0) {
      statsElement.innerHTML = '<div class="feedback-stat"><span>No feedback data yet</span></div>';
      return;
    }

    // Calculate recent stats (last 30 days)
    const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
    const recentFeedback = feedbackEntries.filter(f => f.timestamp > thirtyDaysAgo);

    if (recentFeedback.length === 0) {
      statsElement.innerHTML = '<div class="feedback-stat"><span>No recent feedback (30 days)</span></div>';
      return;
    }

    // Calculate metrics
    const positiveCount = recentFeedback.filter(f => f.rating === 'positive').length;
    const negativeCount = recentFeedback.filter(f => f.rating === 'negative').length;
    const total = positiveCount + negativeCount;
    const successRate = total > 0 ? Math.round((positiveCount / total) * 100) : 0;

    // Display stats
    statsElement.innerHTML = `
      <div class="feedback-stat">
        <span>Last 30 days:</span>
        <span>${total} responses</span>
      </div>
      <div class="feedback-stat">
        <span>Success rate:</span>
        <span style="color: ${successRate >= 80 ? '#28a745' : successRate >= 60 ? '#ffc107' : '#dc3545'}">${successRate}% (${positiveCount}&#x1F44D; ${negativeCount}&#x1F44E;)</span>
      </div>
      <div class="feedback-stat">
        <span>Total feedback:</span>
        <span>${feedbackEntries.length} entries</span>
      </div>
    `;

    // Show suggestions if available
    const analysisData = allData.feedbackAnalysis;
    if (analysisData && analysisData.suggestions && analysisData.suggestions.length > 0) {
      suggestionsList.innerHTML = analysisData.suggestions
        .map(suggestion => `<li>${suggestion}</li>`)
        .join('');
      suggestionsElement.style.display = 'block';
    } else {
      suggestionsElement.style.display = 'none';
    }

  } catch (error) {
    console.error('Error loading feedback analytics:', error);
    document.getElementById('feedbackStats').innerHTML =
      '<div class="feedback-stat"><span>Error loading feedback data</span></div>';
  }
}

// View feedback data in a new tab
document.getElementById('viewFeedback').addEventListener('click', async () => {
  try {
    const allData = await new Promise(resolve => {
      chrome.storage.local.get(null, resolve);
    });

    const feedbackEntries = Object.entries(allData)
      .filter(([key]) => key.startsWith('feedback_'))
      .map(([key, value]) => value)
      .sort((a, b) => b.timestamp - a.timestamp);

    const analysisData = allData.feedbackAnalysis;

    // Create HTML page with feedback data
    const html = generateFeedbackReportHTML(feedbackEntries, analysisData);

    // Create blob and open in new tab
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    chrome.tabs.create({ url: url });

  } catch (error) {
    console.error('Error viewing feedback:', error);
    alert('Error loading feedback data');
  }
});

// Generate HTML report for feedback data
function generateFeedbackReportHTML(feedbackEntries, analysisData) {
  const formatDate = (timestamp) => new Date(timestamp).toLocaleString();

  return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>FreeScout GPT Assistant - Feedback Report</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 20px; }
        .header { border-bottom: 2px solid #dee2e6; padding-bottom: 20px; margin-bottom: 20px; }
        .stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin-bottom: 30px; }
        .stat-card { background: #f8f9fa; padding: 15px; border-radius: 8px; border: 1px solid #dee2e6; }
        .stat-value { font-size: 24px; font-weight: bold; color: #007bff; }
        .feedback-entry { background: white; border: 1px solid #dee2e6; border-radius: 8px; padding: 15px; margin-bottom: 15px; position: relative; }
        .feedback-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }
        .rating-positive { color: #28a745; font-weight: bold; }
        .rating-negative { color: #dc3545; font-weight: bold; }
        .response-text { background: #f8f9fa; padding: 10px; border-radius: 4px; margin: 10px 0; font-size: 14px; }
        .notes { background: #fff3cd; padding: 10px; border-radius: 4px; margin: 10px 0; }
        .suggestions { background: #d1ecf1; padding: 15px; border-radius: 8px; margin: 20px 0; }
        .customer-info { font-size: 12px; color: #6c757d; margin-top: 10px; }
        table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        th, td { padding: 8px; text-align: left; border-bottom: 1px solid #ddd; }
        th { background-color: #f8f9fa; }
        .delete-btn {
          background: #dc3545;
          color: white;
          border: none;
          border-radius: 4px;
          padding: 4px 8px;
          cursor: pointer;
          font-size: 11px;
          transition: background 0.2s;
        }
        .delete-btn:hover { background: #c82333; }
        .entry-actions { display: flex; gap: 8px; align-items: center; }
        .entry-deleted { opacity: 0.5; background: #f8f9fa !important; }
        .bulk-actions { margin: 20px 0; padding: 15px; background: #f8f9fa; border-radius: 8px; }
        .bulk-actions button { margin-right: 10px; }
    </style>
</head>
<body>
    <div class="header">
        <h1>FreeScout GPT Assistant - Feedback Report</h1>
        <p>Generated on ${formatDate(Date.now())}</p>
    </div>

    ${analysisData ? `
    <div class="stats">
        <div class="stat-card">
            <div>Success Rate</div>
            <div class="stat-value">${Math.round(analysisData.successRate * 100)}%</div>
        </div>
        <div class="stat-card">
            <div>Total Feedback</div>
            <div class="stat-value">${analysisData.totalFeedback}</div>
        </div>
        <div class="stat-card">
            <div>Analysis Date</div>
            <div style="font-size: 14px;">${formatDate(analysisData.timestamp)}</div>
        </div>
    </div>

         ${analysisData.suggestions && analysisData.suggestions.length > 0 ? `
     <div class="suggestions">
         <h3>&#x1F50D; Improvement Suggestions</h3>
        <ul>
            ${analysisData.suggestions.map(suggestion => `<li>${suggestion}</li>`).join('')}
        </ul>
    </div>
    ` : ''}

    ${analysisData.commonIssues && analysisData.commonIssues.length > 0 ? `
         <div style="margin: 20px 0;">
         <h3>&#x1F4CA; Common Issues</h3>
        <table>
            <tr><th>Issue</th><th>Frequency</th></tr>
            ${analysisData.commonIssues.map(({issue, count}) =>
              `<tr><td>${issue.replace('_', ' ')}</td><td>${count}</td></tr>`
            ).join('')}
        </table>
    </div>
    ` : ''}
    ` : ''}

         <h2>&#x1F4DD; Individual Feedback Entries</h2>



    ${feedbackEntries.length === 0 ? '<p>No feedback entries found.</p>' :
      feedbackEntries.map(entry => `
                <div class="feedback-entry" data-entry-id="${entry.id}">
            <div class="feedback-header">
                <div>
                    <span class="rating-${entry.rating}">${entry.rating === 'positive' ? '&#x1F44D; Positive' : '&#x1F44E; Negative'}</span>
                    <span style="margin-left: 15px; color: #6c757d;">${formatDate(entry.timestamp)}</span>
                </div>
            </div>

            <div class="response-text">
                <strong>Generated Response:</strong><br>
                ${entry.generatedResponse.substring(0, 300)}${entry.generatedResponse.length > 300 ? '...' : ''}
            </div>

            ${entry.notes ? `
            <div class="notes">
                <strong>Feedback Notes:</strong><br>
                ${entry.notes}
            </div>
            ` : ''}

            ${entry.customerInfo ? `
            <div class="customer-info">
                <strong>Customer Context:</strong>
                ${entry.customerInfo.name || 'Unknown'} |
                Version: ${entry.customerInfo.version || 'Unknown'} |
                Status: ${entry.customerInfo.versionStatus || 'Unknown'}
            </div>
            ` : ''}
        </div>
      `).join('')
    }

    <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #dee2e6; color: #6c757d; font-size: 12px;">
        <p>This report contains ${feedbackEntries.length} feedback entries. Data is stored locally in your browser.</p>
    </div>

    <div style="margin-top: 20px; padding: 15px; background: #e9ecef; border-radius: 8px;">
        <p><strong>Note:</strong> Delete functionality is not available in this static report view due to browser security restrictions. To delete feedback entries, please use the "Clear Feedback" button in the extension settings.</p>
    </div>
</body>
</html>
  `;
}

// Clear old feedback (30 days)
document.getElementById('clearOld30').addEventListener('click', async () => {
  if (confirm('Are you sure you want to clear feedback entries older than 30 days?')) {
    try {
      const response = await new Promise(resolve => {
        chrome.runtime.sendMessage({
          action: 'deleteOldFeedbackEntries',
          cutoffDate: Date.now() - (30 * 24 * 60 * 60 * 1000)
        }, resolve);
      });

      if (response && response.success) {
        loadFeedbackAnalytics();
        alert(`Cleared ${response.deletedCount} entries older than 30 days.`);
      } else {
        alert('Error clearing old feedback entries.');
      }
    } catch (error) {
      console.error('Error clearing old feedback:', error);
      alert('Error clearing old feedback entries.');
    }
  }
});

// Clear old feedback (90 days)
document.getElementById('clearOld90').addEventListener('click', async () => {
  if (confirm('Are you sure you want to clear feedback entries older than 90 days?')) {
    try {
      const response = await new Promise(resolve => {
        chrome.runtime.sendMessage({
          action: 'deleteOldFeedbackEntries',
          cutoffDate: Date.now() - (90 * 24 * 60 * 60 * 1000)
        }, resolve);
      });

      if (response && response.success) {
        loadFeedbackAnalytics();
        alert(`Cleared ${response.deletedCount} entries older than 90 days.`);
      } else {
        alert('Error clearing old feedback entries.');
      }
    } catch (error) {
      console.error('Error clearing old feedback:', error);
      alert('Error clearing old feedback entries.');
    }
  }
});

// Clear negative feedback
document.getElementById('clearNegative').addEventListener('click', async () => {
  if (confirm('Are you sure you want to clear all negative feedback entries?')) {
    try {
      const response = await new Promise(resolve => {
        chrome.runtime.sendMessage({
          action: 'deleteNegativeFeedbackEntries'
        }, resolve);
      });

      if (response && response.success) {
        loadFeedbackAnalytics();
        alert(`Cleared ${response.deletedCount} negative feedback entries.`);
      } else {
        alert('Error clearing negative feedback entries.');
      }
    } catch (error) {
      console.error('Error clearing negative feedback:', error);
      alert('Error clearing negative feedback entries.');
    }
  }
});

// Clear all feedback data
document.getElementById('clearFeedback').addEventListener('click', async () => {
  if (confirm('Are you sure you want to clear all feedback data? This cannot be undone.')) {
    try {
      const allData = await new Promise(resolve => {
        chrome.storage.local.get(null, resolve);
      });

      // Find all feedback keys
      const feedbackKeys = Object.keys(allData).filter(key =>
        key.startsWith('feedback_') || key === 'feedbackAnalysis'
      );

      if (feedbackKeys.length > 0) {
        await new Promise(resolve => {
          chrome.storage.local.remove(feedbackKeys, resolve);
        });

        // Refresh the display
        loadFeedbackAnalytics();
        alert(`Cleared ${feedbackKeys.length} feedback entries.`);
      } else {
        alert('No feedback data to clear.');
      }

    } catch (error) {
      console.error('Error clearing feedback:', error);
      alert('Error clearing feedback data.');
    }
  }
});

// Clear cache button handler
document.getElementById('clearCache').onclick = () => {
  chrome.runtime.sendMessage({ action: 'clearDocsCache' }, (response) => {
    if (response && response.success) {
      const statusElement = document.getElementById('cacheStatus');
      statusElement.textContent = 'Cache cleared successfully';
      statusElement.className = 'cache-status cache-not-cached';

      // Refresh cache status after a brief delay
      setTimeout(() => {
        const docsUrl = document.getElementById('docsUrl').value;
        checkCacheStatus(docsUrl);
      }, 500);
    } else {
      const statusElement = document.getElementById('cacheStatus');
      statusElement.textContent = 'Error clearing cache';
      statusElement.className = 'cache-status cache-error';
    }
  });
};

// Test fetch button handler
document.getElementById('testFetch').onclick = () => {
  const docsUrl = document.getElementById('docsUrl').value;
  const statusElement = document.getElementById('cacheStatus');

  if (!docsUrl) {
    statusElement.textContent = 'Please enter a documentation URL first';
    statusElement.className = 'cache-status cache-not-cached';
    return;
  }

  statusElement.textContent = 'Testing documentation fetch...';
  statusElement.className = 'cache-status';

  // First clear the cache to force a fresh fetch
  chrome.runtime.sendMessage({ action: 'clearDocsCache' }, (clearResponse) => {
    // Then fetch the docs
    chrome.runtime.sendMessage({ action: 'fetchDocs', url: docsUrl }, (response) => {
      console.log('Test fetch response:', response);

      if (response && response.success) {
        const docsCount = response.docs?.length || 0;
        const totalChars = response.docs?.reduce((sum, doc) => sum + (doc.content?.length || 0), 0) || 0;

        if (docsCount > 0) {
          statusElement.textContent = `Success! Loaded ${docsCount} documents (${totalChars.toLocaleString()} characters)`;
          statusElement.className = 'cache-status cache-cached';

          // Log first document as sample
          if (response.docs[0]) {
            console.log('Sample document:', {
              title: response.docs[0].title,
              contentLength: response.docs[0].content?.length || 0,
              firstChars: response.docs[0].content?.substring(0, 200)
            });
          }
        } else {
          statusElement.textContent = 'Fetch succeeded but no documents were parsed. Check the Service Worker console for details.';
          statusElement.className = 'cache-status cache-not-cached';
        }
      } else {
        statusElement.textContent = `Fetch failed: ${response?.error || 'Unknown error'}. Check Service Worker console.`;
        statusElement.className = 'cache-status cache-not-cached';
      }
    });
  });
};

// Update cache status when docs URL changes
document.getElementById('docsUrl').addEventListener('blur', function() {
  checkCacheStatus(this.value);
});

document.getElementById('save').onclick = () => {
  const systemPrompt = document.getElementById('systemPrompt').value.trim() || DEFAULT_SYSTEM_PROMPT;
  const docsUrl = document.getElementById('docsUrl').value;
  const openaiKey = document.getElementById('openaiKey').value;
  const openaiModel = document.getElementById('openaiModel').value;
  const temperature = parseFloat(document.getElementById('temperature').value) || 0.7;
  const maxTokens = parseInt(document.getElementById('maxTokens').value) || 1000;
  const keyboardShortcut = document.getElementById('keyboardShortcut').value || 'Ctrl+Shift+G';
  const enableFeedback = document.getElementById('enableFeedback').checked;

  chrome.storage.local.set({ systemPrompt, docsUrl, openaiKey, openaiModel, temperature, maxTokens, keyboardShortcut, enableFeedback }, () => {
    // Clear docs cache when settings are saved
    chrome.runtime.sendMessage({ action: 'clearDocsCache' }, (response) => {
      if (response && response.success) {
        console.log('Docs cache cleared');
      }
      alert('Settings saved!');

      // Update cache status after saving
      checkCacheStatus(docsUrl);
    });
  });
};