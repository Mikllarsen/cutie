/*
 * Valgfri Claude-tilstand. Bruger det officielle Anthropic-SDK direkte fra
 * browseren med brugerens egen API-nøgle. Nøglen sendes kun til Anthropic.
 */
(function (root) {
  'use strict';

  const SDK_URL = 'https://cdn.jsdelivr.net/npm/@anthropic-ai/sdk@0.133.0/+esm';
  const MODELS = {
    'claude-opus-5-5': 'Claude Opus 5.5',
    'claude-sonnet-5-5': 'Claude Sonnet 5.5',
    'claude-haiku-5-5': 'Claude Haiku 5.5',
  };
  // Modeller hvor Anthropic selv kan prøve en anden model, hvis sikkerhedsfiltre afviser forespørgslen.
  const SERVER_FALLBACK = new Set(['claude-opus-5-5', 'claude-sonnet-5-5']);

  let sdkPromise = null;
  function loadSdk() {
    if (!sdkPromise) {
      sdkPromise = import(SDK_URL).catch((err) => {
        sdkPromise = null;
        const e = new Error('sdk-load');
        e.code = 'load';
        e.cause = err;
        throw e;
      });
    }
    return sdkPromise;
  }

  const TONES = {
    casual: 'Casual and warm, like a message to a friend or a relaxed blog post. Contractions, everyday words, the occasional short punchy sentence.',
    neutral: 'Natural and clear, like a thoughtful person writing for a general audience.',
    professional: 'Professional but human, like a competent colleague writing a good email or report. No slang, no corporate filler.',
  };
  const LEVELS = {
    1: 'Light touch: keep the structure and most wording. Only fix the parts that clearly sound machine-written.',
    2: 'Medium: rewrite sentences freely where it helps, but keep the paragraph structure and all the content.',
    3: 'Strong: rewrite thoroughly in your own words. You may merge, split or reorder sentences, as long as every point survives.',
  };

  function systemPrompt(opts) {
    const lines = [
      'You are an editor who turns text that reads as machine-written into text that reads like a real person wrote it.',
      '',
      'What to do:',
      '- Keep the meaning, facts, names, numbers, links and any code exactly. Never add new claims, examples or opinions.',
      '- Write in the same language as the input. Danish stays Danish and English stays English. Write Danish the way Danes actually write today, not like translated English, and keep correct Danish word order.',
      '- Vary the rhythm: mix short and longer sentences instead of many sentences of the same length.',
      '- Cut stock phrases, filler and hedging, e.g. "delve into", "in today\'s fast-paced world", "it is important to note that", "plays a crucial role", "Furthermore,", "Derudover,", "Det er vigtigt at bemærke, at", "spiller en afgørende rolle".',
      '- Prefer plain, concrete words over corporate or academic ones. Avoid em dashes; use commas or full stops.',
      '- In English, use contractions where a person naturally would.',
      '- Keep the paragraph breaks. Keep lists as lists, but drop markdown bold and heading markers unless the input clearly needs them.',
      '- No chatbot framing: no greeting, no "Here is the rewritten text", no closing offer to help.',
      '',
      'Tone: ' + (TONES[opts.tone] || TONES.neutral),
      'How much to change: ' + (LEVELS[opts.level] || LEVELS[2]),
    ];
    if (opts.protect && opts.protect.length) {
      lines.push('Keep these words and names exactly as written: ' + opts.protect.join(', ') + '.');
    }
    lines.push('', 'Reply with the rewritten text only, without tags or comments.');
    return lines.join('\n');
  }

  /**
   * Omskriv tekst med Claude og stream resultatet.
   * @param {object} p { apiKey, model, text, tone, level, protect, onText(fullText), signal }
   * @returns {Promise<{text: string, model: string, truncated: boolean}>}
   */
  async function rewrite(p) {
    const mod = await loadSdk();
    const Anthropic = mod.default || mod.Anthropic;
    const client = new Anthropic({ apiKey: p.apiKey, dangerouslyAllowBrowser: true });
    const model = MODELS[p.model] ? p.model : 'claude-opus-5-5';
    const params = {
      model,
      max_tokens: 64000,
      output_config: { effort: 'medium' },
      system: systemPrompt(p),
      messages: [{ role: 'user', content: 'Rewrite the text inside the <text> tags.\n\n<text>\n' + p.text + '\n</text>' }],
    };

    const stream = SERVER_FALLBACK.has(model)
      ? client.beta.messages.stream(Object.assign({}, params, { betas: ['server-side-fallback-2026-07-01'], fallbacks: 'default' }))
      : client.messages.stream(params);

    if (p.signal) {
      if (p.signal.aborted) stream.abort();
      p.signal.addEventListener('abort', () => stream.abort(), { once: true });
    }

    let full = '';
    stream.on('text', (delta) => {
      full += delta;
      if (p.onText) p.onText(cleanTags(full));
    });

    let message;
    try {
      message = await stream.finalMessage();
    } catch (err) {
      throw classify(err, mod, Anthropic, cleanTags(full));
    }

    if (message.stop_reason === 'refusal') {
      const e = new Error('refusal');
      e.code = 'refusal';
      throw e;
    }
    const text = cleanTags(
      message.content
        .filter((b) => b.type === 'text')
        .map((b) => b.text)
        .join('')
    );
    return { text, model: MODELS[message.model] || message.model || MODELS[model], truncated: message.stop_reason === 'max_tokens' };
  }

  function cleanTags(s) {
    return s.replace(/^\s*<text>\s*/i, '').replace(/\s*<\/text>\s*$/i, '');
  }

  function classify(err, mod, Anthropic, partial) {
    const E = (name) => mod[name] || (Anthropic && Anthropic[name]);
    const is = (name) => {
      const C = E(name);
      return C && err instanceof C;
    };
    const e = new Error(err && err.message ? err.message : String(err));
    e.partial = partial;
    if (is('APIUserAbortError')) e.code = 'aborted';
    else if (is('AuthenticationError')) e.code = 'auth';
    else if (is('PermissionDeniedError') || is('NotFoundError')) e.code = 'permission';
    else if (is('RateLimitError')) e.code = 'rate';
    else if (is('APIConnectionError')) e.code = 'network';
    else e.code = 'other';
    return e;
  }

  root.HumanizerAI = { rewrite, MODELS, systemPrompt, preload: () => loadSdk().catch(() => {}) };
})(typeof globalThis !== 'undefined' ? globalThis : this);
