# Changelog

## [2.0.0] - 2024-09-08

### 🎉 Major Release: Dual-Platform Support

#### Added
- **Help Scout Support**: Full integration with Help Scout platform
  - Automatic platform detection with 5-minute caching
  - React/SPA support with MutationObserver
  - Dynamic content handling for Help Scout's interface
  - window.appData integration for customer information
  - Customer property extraction from Help Scout sidebar

- **Platform Abstraction Layer**
  - Base adapter class for consistent interface
  - Platform-specific adapters for FreeScout and Help Scout
  - Centralized platform manager for coordination
  - Event-driven architecture for platform-specific features

- **Security Enhancements**
  - Comprehensive HTML sanitization utility
  - XSS prevention through whitelist-based filtering
  - Safe DOM manipulation methods
  - Content validation before injection

- **Performance Optimizations**
  - Platform detection caching (5-minute TTL)
  - Debounced DOM operations
  - Lazy adapter loading
  - Cached querySelector operations
  - Retry mechanism with exponential backoff

- **Developer Tools**
  - Health check system (`window.gptAssistant.getHealth()`)
  - Performance metrics tracking (`window.gptAssistant.getMetrics()`)
  - Debug utilities for platform detection
  - Build script for easy deployment

- **GPT-5 Support**:
  - Pre-configured option for future GPT-5  (set as recommended) and GPT-5 Mini models

#### Changed
- Extension name to "GPT Assistant for FreeScout & Help Scout"
- Manifest version to 2.0.0
- Content script architecture to use platform abstraction
- Host permissions to include Help Scout domains
- README to reflect dual-platform capabilities

#### Maintained
- All existing FreeScout features
- WordPress customer data extraction
- Tone analysis and matching
- Feedback system
- Documentation integration
- Keyboard shortcuts (Ctrl+Shift+G)
- OpenAI GPT integration
- Custom system prompts

### Technical Details

#### New Files Created
- `platformDetection.js` - Intelligent platform detection
- `platformManager.js` - Central coordination layer
- `adapters/platformAdapter.js` - Base adapter class
- `adapters/freescoutAdapter.js` - FreeScout implementation
- `adapters/helpscoutAdapter.js` - Help Scout implementation
- `utils/htmlSanitizer.js` - Security utility

#### Architecture
- **Adapter Pattern**: Clean separation between platforms
- **Event-Driven**: Platform-specific event handling
- **Singleton Manager**: Centralized platform management
- **Defensive Programming**: Comprehensive error handling

#### Browser Compatibility
- Chrome/Chromium 88+
- Edge 88+
- Requires Manifest V3 support

#### Migration Notes
- Existing users: No action required, full backward compatibility
- New users: Automatic platform detection on first use
- Settings: All existing settings preserved
- API Keys: No changes required

---

## [1.1.0] - 2024-01-15

### Added
- Feedback system for response quality tracking
- Customer data extraction from WordPress
- Tone analysis from previous messages
- Documentation caching with 24-hour TTL

### Changed
- Improved error handling and user feedback
- Enhanced Summernote editor integration
- Updated to support GPT-4o model

### Fixed
- Context extraction from reply editor
- Keyboard shortcut handling on Mac
- API error message clarity

---

## [1.0.0] - 2023-12-01

### Initial Release
- Core GPT integration with FreeScout
- Customizable system prompts
- Keyboard shortcuts
- Temperature and token controls
- Basic conversation extraction
- OpenAI API integration