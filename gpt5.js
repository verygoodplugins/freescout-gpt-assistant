// GPT-5 (Responses API) integration helpers
// Isolated here so we can tweak behavior without touching legacy paths.

(function () {
  const DEFAULTS = Object.freeze({
    // Ensure visible text output
    textFormat: 'text', // 'text' | other future types
    textVerbosity: 'medium',

    // Reasoning controls (gpt-5 only)
    reasoningEffort: 'high', // 'minimal' | 'low' | 'medium' | 'high'

    // Token and tool behavior
    maxOutputTokens: null, // null = no explicit cap; caps both reasoning + visible
    toolChoice: 'auto',
    parallelToolCalls: true,

    // Processing tier and storage
    serviceTier: null, // 'auto' | 'default' | 'flex' | 'priority' | null
    store: true,
    stream: false,

    // Extra includes for debugging (e.g., reasoning.encrypted_content)
    include: null, // e.g., ['message.output_text.logprobs']

    // Structured outputs (JSON Schema)
    responseFormatJSONSchema: null, // e.g., { type: 'object', properties: {...}, required: [...] }

    // Prompt caching
    promptCacheKey: null,
  });

  let config = { ...DEFAULTS };

  function buildRequest({ model, input, overrides }) {
    const cfg = { ...config, ...(overrides || {}) };

    const body = { model, input };

    // Text output configuration (skip if using structured outputs)
    if (!cfg.responseFormatJSONSchema && cfg.textFormat) {
      body.text = { format: { type: cfg.textFormat } };
      if (cfg.textVerbosity) body.text.verbosity = cfg.textVerbosity;
    }

    // Reasoning configuration (gpt-5 only)
    if (cfg.reasoningEffort) {
      body.reasoning = { effort: cfg.reasoningEffort };
    }

    // Optional caps and flags
    if (typeof cfg.maxOutputTokens === 'number') {
      body.max_output_tokens = cfg.maxOutputTokens;
    }
    if (typeof cfg.parallelToolCalls === 'boolean') {
      body.parallel_tool_calls = cfg.parallelToolCalls;
    }
    if (cfg.toolChoice) body.tool_choice = cfg.toolChoice;
    if (cfg.serviceTier) body.service_tier = cfg.serviceTier;
    if (typeof cfg.store === 'boolean') body.store = cfg.store;
    if (cfg.stream) body.stream = true;
    if (Array.isArray(cfg.include) && cfg.include.length) body.include = cfg.include;

    // Structured outputs via text.format
    if (cfg.responseFormatJSONSchema) {
      const js = cfg.responseFormatJSONSchema;
      const name = js.name || 'structured_output';
      // Accept either {name, schema, strict} or a raw schema object
      const schema = js.schema ? js.schema : js;
      const strict = js.schema ? js.strict : undefined;
      body.text = { format: { type: 'json_schema', name, schema } };
      if (typeof strict !== 'undefined') body.text.format.strict = !!strict;
      if (cfg.textVerbosity) body.text.verbosity = cfg.textVerbosity;
    }

    // Prompt cache key
    if (cfg.promptCacheKey) {
      body.prompt_cache_key = cfg.promptCacheKey;
    }

    return body;
  }

  function extractReply(data) {
    try {
      if (!data) return '';

      // Prefer aggregated text if present
      if (typeof data.output_text === 'string' && data.output_text.trim()) {
        return data.output_text;
      }

      // Responses API: output is an array of items (reasoning, message, etc.)
      if (Array.isArray(data.output)) {
        const parts = [];

        // Prioritize message items
        for (const item of data.output) {
          if (!item || item.type !== 'message') continue;
          const contentArray = Array.isArray(item.content) ? item.content : [];
          for (const c of contentArray) {
            if (typeof c === 'string') parts.push(c);
            else if (c && typeof c.text === 'string') parts.push(c.text);
            else if (c && typeof c.content === 'string') parts.push(c.content);
          }
        }
        if (parts.length) return parts.join('');

        // Fallback: collect any text-like content from all items
        const fallback = [];
        for (const item of data.output) {
          const contentArray = Array.isArray(item && item.content) ? item.content : [];
          for (const c of contentArray) {
            if (typeof c === 'string') fallback.push(c);
            else if (c && typeof c.text === 'string') fallback.push(c.text);
            else if (c && typeof c.content === 'string') fallback.push(c.content);
          }
        }
        if (fallback.length) return fallback.join('');
      }

      // Some responses may put text directly in output
      if (typeof data.output === 'string') return data.output;
    } catch (e) {
      console.warn('GPT5.extractReply failed, returning empty string:', e);
    }
    return '';
  }

  function setConfig(overrides) {
    config = { ...config, ...(overrides || {}) };
  }

  function getConfig() {
    return { ...config };
  }

  // Expose helpers in the content script world
  window.GPT5 = {
    buildRequest,
    extractReply,
    setConfig,
    getConfig,
    DEFAULTS,
  };
})();
