# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

FreeScout GPT Assistant is a Chrome extension (Manifest V3) that integrates OpenAI's GPT models with the FreeScout helpdesk platform. It generates AI-powered customer support responses with context from conversation history, customer data (via WordPress integration), and documentation (llms.txt format).

## Architecture

The extension consists of three main components:

- **manifest.json** - Chrome extension configuration (Manifest V3)
- **background.js** (318 lines) - Service worker handling API calls, caching, and message passing
- **content.js** (1030 lines) - Injected into FreeScout pages, handles UI interaction and response generation
- **popup.js/popup.html** (478 lines) - Extension settings and configuration interface

### Message Flow
1. User triggers generation via keyboard shortcut in FreeScout (default: Ctrl+Shift+G)
2. content.js extracts conversation context and sends to OpenAI
3. background.js handles documentation fetching with 24-hour caching
4. Response is injected into FreeScout's reply editor (Summernote WYSIWYG)

## Development Workflow

### Loading the Extension
```bash
# No build step required - pure JavaScript
1. Open Chrome and navigate to chrome://extensions/
2. Enable "Developer mode" (top right toggle)
3. Click "Load unpacked" and select this directory
4. Extension icon appears in Chrome toolbar
```

### Testing Changes
```bash
# After modifying any file:
1. Go to chrome://extensions/
2. Click the refresh icon on the extension card
3. Reload the FreeScout tab to get updated content script
```

### Debugging
```bash
# View console logs:
- Background script: chrome://extensions/ → "Service Worker" → click "Inspect"
- Content script: Open DevTools on FreeScout page (F12)
- Popup: Right-click extension icon → "Inspect popup"
```

## Key Functionality

### OpenAI Integration (content.js:589-1103)
- Supports both GPT-5 (/v1/responses API) and legacy models (/v1/chat/completions API)
- Builds conversation context from thread history
- Extracts customer data from WordPress sidebar widget
- Includes documentation from llms.txt source
- Handles API errors with user-friendly messages
- GPT-5 currently uses non-streaming responses for stability
- Configured with low reasoning effort and verbosity for fast responses

### Documentation Caching (background.js:36-91)
- 24-hour cache for llms.txt documentation
- Cache stored in chrome.storage.local with keys: `docsCache_<url>` and `docsTimestamp_<url>`
- Manual cache clearing available in popup

### Customer Data Extraction (content.js:504-587)
- Parses WordPress sidebar widget (`#conv-sidebar .card`)
- Extracts: name, registration date, CRM, licenses, orders, tags
- Automatically included in AI prompt context

### Feedback System (content.js:224-477)
- Stores feedback in chrome.storage.local with pattern: `feedback_<timestamp>`
- Analytics calculation in background.js:205-257
- Cleanup functions for old/negative feedback

## Common Development Tasks

### Adding a New OpenAI Model
1. Update model options in popup.html (select dropdown)
2. Ensure model name matches OpenAI's API expectations
3. For GPT-5 models: Uses /v1/responses API (non-streaming)
4. For legacy models: Uses /v1/chat/completions API
5. Check isGPT5 logic in content.js if adding new model families

### Modifying System Prompt
- Default prompt stored in popup.js:6-19
- User customizations saved to chrome.storage.local

### Changing Keyboard Shortcut
- Currently configurable via popup settings
- Stored as string like "Ctrl+Shift+G" in chrome.storage.local
- Parsed in content.js:898-922

### Adjusting Documentation Cache Duration
- Update CACHE_DURATION in background.js:34 (currently 24 hours)

### Testing with FreeScout
- Extension only activates on URLs matching `*://*/conversation/*`
- Requires active FreeScout conversation page
- WordPress data extraction requires WordPressFreeScout module

### Adding New Customer Data Fields
1. Identify new data in WordPress sidebar HTML
2. Add extraction logic in content.js:504-587
3. Include in prompt building at content.js:673-687

## Storage Keys Reference

Chrome storage keys used by the extension:
- `systemPrompt` - Custom AI instructions
- `docsUrl` - llms.txt documentation URL
- `openaiKey` - API key (encrypted)
- `openaiModel` - Selected GPT model
- `temperature` - Response creativity (0.1-0.9)
- `maxTokens` - Response length limit (50-4000)
- `keyboardShortcut` - Trigger combination
- `enableFeedback` - Toggle feedback UI
- `docsCache_<url>` - Cached documentation
- `docsTimestamp_<url>` - Cache timestamp
- `feedback_<timestamp>` - Individual feedback entries
- `feedbackAnalysis` - Aggregated feedback insights

## Error Handling

Common errors and their locations:
- API key validation: content.js:597-601
- Network errors: content.js:702-706
- Rate limiting: Check for 429 status in API response
- Extension context invalidation: Handled with try-catch throughout

## Important Notes

- No build process or npm dependencies - vanilla JavaScript
- Uses Chrome Extension Manifest V3 (service workers, not background pages)
- Summernote editor integration requires specific DOM manipulation
- WYSIWYG requires replacing text content while preserving formatting
