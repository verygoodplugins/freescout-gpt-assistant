# GPT Assistant for FreeScout & Help Scout

A powerful Chrome extension that integrates OpenAI's GPT models with both FreeScout and Help Scout platforms to generate intelligent, context-aware customer support responses. Features advanced documentation integration, customer data extraction, tone matching, and automatic platform detection for seamless multi-platform support.

## 🚀 Features

### Core AI Integration
- **Multiple Model Support**: GPT-5, GPT-5 Mini, GPT-4o Mini, GPT-4o, GPT-4 Turbo, and GPT-3.5 Turbo
- **Smart Context Building**: Automatically extracts conversation history and customer information
- **Tone Matching**: Analyzes your previous responses to maintain consistent communication style
- **Customizable System Prompts**: Define your support agent's personality and guidelines

### Documentation Integration
- **llms.txt Support**: Automatically fetch and include relevant documentation in AI responses
- **Smart Caching**: 24-hour cache with manual refresh capability
- **Cache Management**: Visual cache status indicators and manual clearing
- **Multiple Sources**: Support for any documentation URL following llms.txt format

### Customer Intelligence (WordPress Integration)
When used with the [WordPressFreeScout module](https://github.com/verygoodplugins/WordPressFreeScout), the extension automatically extracts and includes:

- **Customer Profile**: Name, registration date, CRM system
- **Product Information**: Current plugin version with update recommendations
- **License Details**: Status, expiration dates, active sites count
- **Purchase History**: Recent orders, amounts, and payment methods
- **Technical Context**: Active integrations, CRM tags, site URLs
- **Support Context**: Last license check, version status warnings

### Advanced Configuration
- **Temperature Control**: Adjust response creativity (0.1 = consistent, 0.9 = creative)
- **Token Limits**: Control response length and API costs (50-4000 tokens)
- **Custom Shortcuts**: Configurable keyboard shortcuts (default: Ctrl+Shift+G)
- **Model Selection**: Choose the best OpenAI model for your needs
- **Feedback System**: Optional response quality tracking (can be disabled)
- **Error Handling**: Detailed error messages for troubleshooting

### Multi-Platform Support
- **Automatic Platform Detection**: Works seamlessly with both FreeScout and Help Scout
- **FreeScout Features**: Full WordPress integration, Summernote editor support
- **Help Scout Features**: React/SPA support, dynamic content handling, appData integration
- **Security**: Comprehensive HTML sanitization and XSS prevention
- **Performance**: 5-minute detection caching, debounced operations

### User Experience
- **Visual Feedback**: "🤖 Generating AI response..." status indicator
- **Optional Context Input**: Type context/notes in the reply field before generation
- **Response Feedback System**: Rate responses and track improvement over time
- **Markdown Support**: Automatic conversion of links and bold text
- **Editor Integration**: Native support for both platforms' WYSIWYG editors
- **Personalized Signatures**: Automatic sign-offs using agent names

<img width="1504" alt="image" src="https://github.com/user-attachments/assets/2c64dc3d-bf49-4394-a684-e72252791e88" />


## 📦 Installation

1. **Download the Extension**
   - Clone this repository or download as ZIP
   - Extract to a local folder

2. **Load in Chrome**
   - Open Chrome and navigate to `chrome://extensions/`
   - Enable "Developer mode" (top right toggle)
   - Click "Load unpacked" and select the extension folder

3. **Get OpenAI API Key**
   - Visit [OpenAI API Keys](https://platform.openai.com/api-keys)
   - Create a new API key
   - Copy the key for configuration

## ⚙️ Configuration

### Basic Setup

1. **Click the extension icon** in your Chrome toolbar
2. **Configure required settings**:
   - **OpenAI API Key**: Your API key from OpenAI
   - **OpenAI Model**: Choose GPT-4o (recommended), GPT-4 Turbo, or GPT-3.5 Turbo
   - **System Prompt**: Customize the AI's behavior and tone
   - **Keyboard Shortcut**: Default is Ctrl+Shift+G (Cmd+Shift+G on Mac)

### Advanced Settings

- **Temperature**: Control response creativity
  - `0.1` = Very consistent, predictable responses
  - `0.7` = Balanced (default)
  - `0.9` = More creative, varied responses

- **Max Tokens**: Control response length (50-4000)
  - `500` = Short responses
  - `1000` = Medium responses (default)
  - `2000+` = Longer, detailed responses

- **Enable Feedback System**: Toggle response quality tracking
  - `Checked` = Show thumbs up/down buttons after responses (default)
  - `Unchecked` = Disable feedback collection for cleaner interface

## 💰 Cost Estimation

Based on OpenAI's current pricing (as of 2025) and assuming an average conversation thread of 6 messages with customer data and documentation:

### Typical Usage Scenario
- **Input**: ~2,000 tokens (conversation history + customer data + documentation)
- **Output**: ~300 tokens (generated response)
- **Total per response**: ~2,300 tokens

### Cost per Response by Model

| Model | Input Cost | Output Cost | Total Cost per Response |
|-------|------------|-------------|------------------------|
| **GPT-4o** | $0.0025 per 1K tokens | $0.01 per 1K tokens | **~$0.008** |
| **GPT-4 Turbo** | $0.01 per 1K tokens | $0.03 per 1K tokens | **~$0.029** |
| **GPT-3.5 Turbo** | $0.0005 per 1K tokens | $0.0015 per 1K tokens | **~$0.001** |

### Monthly Cost Examples

**Light Usage** (50 responses/month):
- GPT-4o: ~$0.40/month
- GPT-4 Turbo: ~$1.45/month
- GPT-3.5 Turbo: ~$0.05/month

**Medium Usage** (200 responses/month):
- GPT-4o: ~$1.60/month
- GPT-4 Turbo: ~$5.80/month
- GPT-3.5 Turbo: ~$0.20/month

**Heavy Usage** (500 responses/month):
- GPT-4o: ~$4.00/month
- GPT-4 Turbo: ~$14.50/month
- GPT-3.5 Turbo: ~$0.50/month

### Cost Optimization Tips

1. **Choose the Right Model**:
   - GPT-4o: Best balance of quality and cost (recommended)
   - GPT-4 Turbo: Highest quality, highest cost
   - GPT-3.5 Turbo: Most economical, good for simple responses

2. **Optimize Token Usage**:
   - Set appropriate max_tokens limits (500-1000 for most responses)
   - Use concise system prompts
   - Keep documentation focused and relevant

3. **Monitor Usage**:
   - Check your OpenAI usage dashboard regularly
   - Set up billing alerts in your OpenAI account
   - Track response quality vs. cost for your use case

4. **Leverage Prompt Caching** (Automatic):
   - The extension automatically implements OpenAI's Prompt Caching
   - Reduces latency by up to 80% and costs by up to 75%
   - No configuration needed - works automatically with GPT-4o and newer models
   - See "Prompt Caching" section below for details

*Note: Prices are subject to change. Check [OpenAI's pricing page](https://openai.com/pricing) for current rates.*

### Documentation Integration

1. **Prepare Documentation**
   - Create an `llms.txt` file with your documentation
   - Host it on a publicly accessible URL
   - Format: [llms.txt specification](https://llmstxt.org/)

2. **Configure Docs URL**
   - Add your documentation URL in the extension settings
   - The extension will automatically cache and include relevant docs

**Example llms.txt format:**
```
# Product Setup Guide
URL: https://example.com/setup

Step-by-step instructions for setting up the product...

# Troubleshooting Common Issues
URL: https://example.com/troubleshooting

Solutions for frequently encountered problems...
```

## 🔌 WordPress Integration

This extension works seamlessly with the [WordPressFreeScout module](https://github.com/verygoodplugins/WordPressFreeScout) by Very Good Plugins to provide enhanced customer intelligence.

### What the WordPress Module Provides

The WordPressFreeScout module displays customer information in FreeScout's sidebar, which this extension automatically extracts and includes in AI responses:

- **Customer Profile Data**
- **EDD (Easy Digital Downloads) Order History**
- **Software License Information**
- **Active Plugin Integrations**
- **CRM Tags and Segmentation**
- **Version Status and Update Recommendations**

### Installation Requirements

1. **Install WordPressFreeScout Module**
   - Follow instructions at [verygoodplugins/WordPressFreeScout](https://github.com/verygoodplugins/WordPressFreeScout)
   - Configure the WordPress connection in FreeScout

2. **Verify Integration**
   - Ensure customer data appears in FreeScout's conversation sidebar
   - The extension will automatically detect and extract this information

### Supported Data Extraction

The extension intelligently parses the WordPress widget to extract:

```html
<!-- Customer Basic Info -->
- Customer Name: Kyle Newton
- Registered: 04/18/2022
- Active CRM: Groundhogg (This Site)
- Current Version: 3.41.41 (with update warnings)

<!-- License Information -->
- License Status: Active
- Expires: 04/18/2026
- Active Sites: 150+ sites
- Sample Sites: my.tribepub.com, wellhealthcenters.com, etc.

<!-- Purchase History -->
- Recent Orders: Renewals, amounts, dates
- Product: WP Fusion — Professional
- Payment Method: Stripe

<!-- Technical Context -->
- Active Integrations: EDD, WooCommerce, Gravity Forms, etc.
- CRM Tags: Customer segments and status
```

## 🎯 Usage

### Generating Responses

1. **Open a FreeScout conversation**
2. **Optional: Add context** - Type any context or notes in the reply field (e.g., "this was a bug and we fixed it for today's 3.43.3 update")
3. **Press your configured shortcut** (default: Ctrl+Shift+G)
4. **Wait for generation** - you'll see "🤖 Generating AI response..."
5. **Review and edit** the generated response as needed
6. **Send the response** using FreeScout's normal send button

### Using Optional Context

You can provide additional context to help the AI generate more accurate responses:

**Example workflow:**
- **Type in reply field**: "this was a bug and we fixed it for today's 3.43.3 update"
- **Press Ctrl+Shift+G**
- **AI generates**: "Hi John, thanks for reporting this issue. This was indeed a bug that we've addressed in today's 3.43.3 update. Please update to the latest version and the issue should be resolved. Let me know if you need any help with the update process. Best, Sarah"

**Common context examples:**
- "offer 20% discount for renewal"
- "this feature will be available in next month's release"
- "customer is on legacy plan, needs migration"
- "escalate to development team"

### Providing Feedback on AI Responses

After each AI response is generated, you'll see feedback buttons:

**Rate the response:**
- **👍 Good** - Response was helpful and accurate
- **👎 Needs Work** - Response needs improvement

**For negative feedback:**
- Provide specific notes about what could be improved
- Common feedback areas: tone, accuracy, length, context usage

**Feedback Analytics:**
- View success rates and improvement trends in extension settings
- Get personalized suggestions based on your feedback patterns
- Export detailed feedback reports for analysis

## 📊 Response Feedback System

The extension includes an intelligent feedback system to help you track and improve AI response quality over time.

### How It Works

**After each AI response generation:**
1. **Feedback buttons appear** below the reply editor (👍 Good / 👎 Needs Work)
2. **Rate the response** with a single click
3. **Add improvement notes** (optional) for negative feedback
4. **Data is stored locally** in your browser for privacy

### Feedback Analytics Dashboard

**Available in extension settings:**
- **Success Rate**: Percentage of positive vs negative responses (last 30 days)
- **Response Volume**: Total number of rated responses
- **Smart Suggestions**: AI-powered recommendations based on feedback patterns
- **Trend Analysis**: Track improvement over time

### Common Feedback Patterns

The system automatically identifies issues and provides suggestions:

| **Issue Detected** | **Suggested Improvement** |
|-------------------|-------------------------|
| Too formal/robotic | Add "Use a friendly, conversational tone" to system prompt |
| Too casual | Add "Maintain a professional tone" to system prompt |
| Missing context | Provide more specific context before generation |
| Too long/verbose | Reduce max tokens or add "Be concise" to system prompt |
| Too short/incomplete | Increase max tokens or add "Provide detailed explanations" |
| Wrong tone | Review tone instructions and previous message analysis |

### Data Management

**Granular cleanup options in settings:**
- **Clear 30+ days old** - Remove outdated feedback entries
- **Clear 90+ days old** - More aggressive cleanup for storage management
- **Clear negative only** - Focus on positive patterns only
- **Clear all feedback** - Complete reset of feedback data

**Export and Analysis:**
- **View All Feedback Data** - Opens comprehensive HTML report
- **Individual entry details** - Response text, notes, customer context, timestamps
- **Bulk statistics** - Success rates, common issues, improvement trends

### Privacy and Storage

- **Local storage only** - All feedback data stays in your browser
- **No external servers** - Complete privacy and control
- **Automatic cleanup** - Configurable retention periods
- **Export capability** - Take your data with you anytime

### Best Practices

**For optimal feedback insights:**

1. **Rate consistently** - Try to rate most responses for accurate trends
2. **Be specific in notes** - Detailed feedback generates better suggestions
3. **Regular cleanup** - Remove old data monthly to keep insights current
4. **Act on suggestions** - Update system prompts based on recommendations
5. **Monitor trends** - Check analytics weekly to track improvement

**Feedback categories to consider:**
- **Accuracy**: Was the information correct?
- **Tone**: Did it match your communication style?
- **Completeness**: Did it address all customer concerns?
- **Context usage**: Did it incorporate provided context well?
- **Professional quality**: Would you send this response as-is?

### Disabling Feedback

**If you prefer a cleaner interface:**
1. Open extension settings
2. Uncheck "Enable response feedback system"
3. Save settings

The feedback system is **enabled by default** but can be completely disabled if you find it intrusive. All existing feedback data is preserved when disabled and will reappear if you re-enable the feature.

### Best Practices

**System Prompt Tips:**

The extension comes with a default system prompt that you can edit.

Here is the default system prompt:
```
You are a helpful customer support agent for [Company Name]. Please provide clear, concise, and friendly responses to customer inquiries.

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

When referencing documentation, format links as: [Link Text](URL)
```

**Documentation Organization:**
- Keep sections focused and specific
- Include URLs for each section
- Update regularly to maintain accuracy
- Test with common customer scenarios

**Customer Context Usage:**
- The extension automatically includes customer data in prompts
- AI responses will be personalized with customer names
- Version warnings and license status are automatically considered
- Purchase history provides context for renewal discussions

## 🛠️ Advanced Features

### Tone Matching

The extension analyzes your previous responses in conversations to maintain consistency:
- Extracts your communication style from past messages
- Matches formality level and language patterns
- Maintains your personal support voice across conversations

### Error Handling

Comprehensive error reporting helps with troubleshooting:
- API key validation before requests
- Detailed OpenAI API error messages
- Network and configuration issue detection
- Helpful suggestions for common problems

### Cache Management

Smart caching reduces API calls and improves performance:
- 24-hour cache for documentation
- Visual cache status indicators
- Manual cache clearing capability
- Automatic cache busting for fresh content

### Prompt Caching (OpenAI Feature)

The extension automatically implements OpenAI's Prompt Caching to dramatically improve performance and reduce costs:

**Automatic Benefits:**
- **Up to 80% faster response times** - Cached prompts are processed much faster
- **Up to 75% cost reduction** - Cached tokens cost significantly less
- **No configuration needed** - Works automatically with compatible models
- **No additional fees** - Prompt caching is free from OpenAI

**How It Works:**
- Static content (system prompt, documentation) is placed first for optimal caching
- Dynamic content (conversation, customer info) is placed last
- A unique cache key routes similar requests to the same servers
- Cache remains active for 5-10 minutes (up to 1 hour during off-peak)

**Monitoring Performance:**
Check the browser console for cache metrics:
```
GPT Assistant: Prompt caching active! 1920 tokens cached (78.3% hit rate, ~58.7% cost savings)
```

**Requirements:**
- Prompts must exceed 1024 tokens for caching to activate
- Works with GPT-4o and newer models
- Best results with consistent system prompts and documentation

**Optimization Tips:**
- Keep your system prompt and documentation URL consistent
- Make frequent requests to maintain cache warmth
- Longer, detailed documentation improves cache hit rates
- Monitor console logs to verify caching is working

## 🔧 Troubleshooting

### Common Issues

**"No OpenAI API key configured"**
- Ensure you've entered your API key in settings
- Check for extra spaces or formatting issues

**"API Error (401): Invalid API key"**
- Verify your OpenAI API key is correct
- Check that your OpenAI account has sufficient credits

**"API Error (429): Rate limit exceeded"**
- You've exceeded OpenAI's rate limits
- Wait a few minutes or upgrade your OpenAI plan

**No customer data appearing**
- Ensure WordPressFreeScout module is installed and configured
- Verify customer data appears in FreeScout's sidebar
- Check browser console for JavaScript errors

### Debug Information

Enable Chrome DevTools Console to see detailed logs:
1. Press F12 in FreeScout or Help Scout
2. Go to Console tab
3. Trigger the extension and review any error messages

**Useful debugging commands in console:**
```javascript
// Check if extension loaded
console.log(window.gptAssistant);

// Check detected platform
window.gptAssistant.platformManager.getPlatform()
// Should return: 'freescout' or 'helpscout'

// Check health status
await window.gptAssistant.getHealth()
// Should show: {status: 'healthy', ...}

// View performance metrics
window.gptAssistant.getMetrics()
```

## 📋 Requirements

- **Chrome Browser**: Version 88+ (Manifest V3 support)
- **FreeScout**: Any recent version
- **OpenAI Account**: With API access and credits
- **WordPressFreeScout Module**: Optional, for enhanced customer data

## 🤝 Contributing

Contributions are welcome! Please feel free to submit issues, feature requests, or pull requests.

### Development Setup

1. Clone the repository
2. Make your changes
3. Test thoroughly in a FreeScout environment
4. Submit a pull request with detailed description

## 📄 License

This project is open source. Please check the license file for details.

## 🙏 Acknowledgments

- **Very Good Plugins** for the [WordPressFreeScout module](https://github.com/verygoodplugins/WordPressFreeScout)
- **OpenAI** for providing the GPT API
- **FreeScout** for the excellent help desk platform

## 📝 Changelog

### Version 2.0.1 (Latest)
- ✅ **NEW: Help Scout Support** - Full compatibility with Help Scout platform
- ✅ **NEW: Prompt Caching** - Automatic OpenAI prompt caching for 80% faster responses and 75% cost reduction
- ✅ **FIXED: Duplicate Response Bug** - Fixed issue where responses were inserted twice in Help Scout
- ✅ **IMPROVED: Documentation Parsing** - Better handling of large documentation files
- Enhanced error handling and debugging capabilities
- Added comprehensive debug console commands

### Version 2.0.0
- Major rewrite for multi-platform support
- Added Help Scout platform detection and integration
- Improved React/SPA compatibility
- Enhanced Slate.js editor support

### Version 1.1
- ✅ **NEW: Optional Context Input** - Type context/notes in the reply field before generating AI responses
- ✅ **NEW: Response Feedback System** - Rate AI responses with thumbs up/down and provide improvement notes
- The AI will incorporate your context into the generated response
- Perfect for providing specific information like "this was fixed in today's update" or "offer 20% discount"
- Context text gets replaced with the full AI-generated response
- Feedback analytics help identify patterns and suggest improvements

### Version 1.0
- Initial release with GPT-4 integration for FreeScout
- WordPress customer data extraction
- Documentation integration with llms.txt support
- Tone matching and personalized signatures
- Smart caching and error handling

## 📞 Support

For issues with this extension:
- Open an issue on GitHub
- Include browser console errors
- Describe your FreeScout and WordPress setup

For issues with the WordPressFreeScout module:
- Visit [verygoodplugins/WordPressFreeScout](https://github.com/verygoodplugins/WordPressFreeScout)
- Follow their support guidelines

---

**Made with ❤️ for the FreeScout community**
