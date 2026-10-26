/*
 * cutie. – regelmotoren der gør tekst mere menneskelig.
 *
 * Kører 100 % i browseren (og i Node til tests). Ingen tekst forlader enheden.
 * Reglerne ligger i rules-en.js og rules-da.js; denne fil indeholder selve
 * maskinrummet: maskering, regelkørsel, oprydning og sætningsrytme.
 */
(function (root) {
  'use strict';

  const WORD = '\\p{L}\\p{N}_';
  const START = '(?<![' + WORD + '])';
  const END = '(?![' + WORD + '])';
  const MARK = '\u0002'; // "gør næste bogstav stort"-markør efter en fjernet sætningsstart
  const MASK_OPEN = '\uE000';
  const MASK_CLOSE = '\uE001';
  const MASK_CAP = '\u0003'; // "gør næste bogstav stort" inde i rytme-trinnet

  const ABBREVIATIONS = new Set([
    'e.g', 'i.e', 'etc', 'vs', 'mr', 'mrs', 'ms', 'dr', 'prof', 'st', 'no', 'approx', 'inc', 'ltd', 'jr', 'sr',
    'fx', 'f.eks', 'bl.a', 'osv', 'mv', 'ca', 'jf', 'evt', 'inkl', 'ekskl', 'dvs', 'mht', 'pga', 'kr', 'nr', 'hhv', 'vedr', 'iflg', 'tlf',
  ]);

  // ---------- små hjælpere ----------

  function compile(src, word) {
    const body = src.replace(/ /g, '\\s+');
    return new RegExp(word === false ? body : START + '(?:' + body + ')' + END, 'giu');
  }

  function capFirst(s) {
    const i = s.search(/\p{L}/u);
    if (i < 0) return s;
    return s.slice(0, i) + s.charAt(i).toUpperCase() + s.slice(i + 1);
  }

  function isUpper(ch) {
    return ch !== ch.toLowerCase() && ch === ch.toUpperCase();
  }

  function matchCase(original, rep, atStart) {
    const letters = original.replace(/[^\p{L}]/gu, '');
    if (letters.length > 1 && isUpper(letters) && /\p{L}{2}/u.test(rep)) return rep.toUpperCase();
    const first = original.match(/\p{L}/u);
    if ((first && isUpper(first[0])) || atStart) return capFirst(rep);
    return rep;
  }

  function mulberry32(seed) {
    let a = seed >>> 0;
    return function () {
      a = (a + 0x6d2b79f5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function countWords(s) {
    const m = s.match(/[\p{L}\p{N}]+(?:['’][\p{L}]+)?/gu);
    return m ? m.length : 0;
  }

  function prevWordAt(str, offset) {
    const m = str.slice(Math.max(0, offset - 40), offset).match(/([\p{L}'’]+)[^\p{L}]*$/u);
    return m ? m[1].toLowerCase() : '';
  }

  function nextWordAt(str, offset) {
    const m = str.slice(offset, offset + 40).match(/^[^\p{L}\n]*([\p{L}'’]+)/u);
    return m ? m[1].toLowerCase() : '';
  }

  /** Står positionen i starten af en sætning (eller et listepunkt)? */
  function isSentenceStart(str, offset) {
    let i = offset - 1;
    while (i >= 0 && /[ \t"“”'‘(\[«»\u0002*_]/.test(str[i])) i--;
    if (i < 0) return true;
    const ch = str[i];
    if (ch === '\n') return true;
    if (ch === '.') {
      const before = str.slice(Math.max(0, i - 8), i).match(/([\p{L}.]+)$/u);
      if (before && ABBREVIATIONS.has(before[1].toLowerCase())) return false;
      return true;
    }
    if (/[!?…]/.test(ch)) return true;
    if (ch === '-' || ch === '•' || ch === '–') {
      let j = i - 1;
      while (j >= 0 && /[ \t]/.test(str[j])) j--;
      return j < 0 || str[j] === '\n';
    }
    return false;
  }

  /** a/an foran et nyt ord. */
  function article(art, word) {
    if (!art) return '';
    const an = /^(?:[aeio]|u(?!ni|se|s[aeiu]|ti|r[aeiou])|hour|honest|heir)/i.test(word);
    const out = an ? 'an' : 'a';
    return (isUpper(art.charAt(0)) ? capFirst(out) : out) + ' ';
  }

  // ---------- maskering: kode, links, mails og beskyttede ord røres ikke ----------

  function mask(text, protect, stripCodeTicks) {
    const store = [];
    const put = (orig) => {
      store.push(orig);
      return MASK_OPEN + (store.length - 1) + MASK_CLOSE;
    };
    text = text.replace(/```[\s\S]*?```/g, (m) => put(m));
    text = text.replace(/`[^`\n]+`/g, (m) => put(stripCodeTicks ? m.slice(1, -1) : m));
    text = text.replace(/\bhttps?:\/\/[^\s<>()]+[^\s<>().,;:!?'"”’]/gi, (m) => put(m));
    text = text.replace(/\bwww\.[^\s<>()]+[^\s<>().,;:!?'"”’]/gi, (m) => put(m));
    text = text.replace(/[\p{L}\p{N}._%+-]+@[\p{L}\p{N}.-]+\.\p{L}{2,}/gu, (m) => put(m));
    (protect || [])
      .map((w) => w.trim())
      .filter(Boolean)
      .sort((a, b) => b.length - a.length)
      .forEach((w) => {
        const re = new RegExp(START + w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + END, 'gu');
        text = text.replace(re, (m) => put(m));
      });
    return { text, store };
  }

  function unmask(text, store) {
    const re = new RegExp(MASK_OPEN + '(\\d+)' + MASK_CLOSE, 'g');
    let prev;
    do {
      prev = text;
      text = text.replace(re, (m, i) => store[Number(i)]);
    } while (text !== prev && re.test(text));
    return text;
  }

  // ---------- markdown & emojis ----------

  function stripMarkdown(text, changes) {
    const before = text;
    text = text.replace(/^[ \t]*(?:-{3,}|\*{3,}|_{3,})[ \t]*$/gm, '');
    text = text.replace(/^[ \t]*#{1,6}[ \t]+(.+?)[ \t]*#*[ \t]*$/gm, '$1');
    text = text.replace(/\*\*(?=\S)([\s\S]*?\S)\*\*/g, '$1');
    text = text.replace(/__(?=\S)([\s\S]*?\S)__/g, '$1');
    text = text.replace(/(^|[^\p{L}\p{N}*])\*(?=\S)([^*\n]*?\S)\*(?![\p{L}\p{N}*])/gu, '$1$2');
    text = text.replace(/(^|[^\p{L}\p{N}_])_(?=\S)([^_\n]*?\S)_(?![\p{L}\p{N}_])/gu, '$1$2');
    text = text.replace(/^([ \t]*)[*+][ \t]+/gm, '$1- ');
    text = text.replace(/\[([^\]\n]+)\]\((\uE000\d+\uE001)\)/g, '$1 ($2)');
    text = text.replace(/^[ \t]*>[ \t]?/gm, '');
    if (text !== before) changes.push({ cat: 'markdown', from: 'Markdown (#, **, *)', to: 'ren tekst' });
    return text;
  }

  function stripEmoji(text, changes) {
    const re = /[ \t]?(?:\p{Extended_Pictographic}|\p{Regional_Indicator})(?:️|‍|\p{Extended_Pictographic}|\p{Emoji_Modifier})*/gu;
    let n = 0;
    text = text.replace(re, () => {
      n++;
      return '';
    });
    if (n) changes.push({ cat: 'emoji', from: n + ' emoji' + (n > 1 ? 's' : ''), to: '' });
    return text;
  }

  // ---------- oprydning ----------

  function cleanup(text) {
    text = text.replace(/\u0002+[ \t,;:]*([\p{Ll}])?/gu, (m, ch) => (ch ? ch.toUpperCase() : ''));
    text = text.replace(/\u0002/g, '');
    text = text.replace(/[ \t]+([,.;:!?])(?!\))/g, '$1');
    text = text.replace(/,[ \t]*([,.;:!?])/g, '$1');
    text = text.replace(/([.!?])[ \t]*[,;]+/g, '$1');
    text = text.replace(/(\S)[ \t]{2,}/g, '$1 ');
    text = text.replace(/[ \t]+$/gm, '');
    text = text.replace(/^[ \t]+$/gm, '');
    text = text.replace(/\n{3,}/g, '\n\n');
    return text.replace(/^\s+|\s+$/g, '');
  }

  // ---------- regelkørsel ----------

  function pickFor(rule, tone) {
    const r = rule.r;
    if (r && typeof r === 'object' && !Array.isArray(r) && typeof r !== 'function') {
      return r[tone] !== undefined ? r[tone] : r.neutral !== undefined ? r.neutral : r.default;
    }
    return r;
  }

  function applyRule(text, rule, ctx) {
    rule.re.lastIndex = 0;
    return text.replace(rule.re, function () {
      const args = Array.prototype.slice.call(arguments);
      if (typeof args[args.length - 1] === 'object') args.pop();
      const str = args.pop();
      const offset = args.pop();
      const m = args[0];
      const groups = args.slice(1);
      const atStart = isSentenceStart(str, offset);
      if (rule.start && !atStart) return m;
      if (rule.textStart && str.slice(0, offset).replace(/[\s\u0002]/g, '') !== '') return m;
      ctx.atStart = atStart;
      ctx.prevWord = prevWordAt(str, offset);
      ctx.nextWord = nextWordAt(str, offset + m.length);
      ctx.str = str;
      ctx.offset = offset;
      let rep = pickFor(rule, ctx.tone);
      if (typeof rep === 'function') rep = rep(ctx, m, groups);
      else {
        if (Array.isArray(rep)) rep = ctx.pick(rep);
        if (typeof rep === 'string') rep = rep.replace(/'/g, ctx.apos);
      }
      if (rep == null || rep === m) return m;
      let out;
      if (rep === '') out = atStart ? MARK : '';
      else out = rule.keepCase ? rep : matchCase(m, rep, atStart);
      if (out === m) return m;
      ctx.changes.push({ cat: rule.cat, from: m.replace(/\s+/g, ' ').trim(), to: out.replace(/\u0002/g, '').replace(/\s+/g, ' ').trim() });
      return out;
    });
  }

  // ---------- sætningsrytme: del meget lange sætninger ----------

  function splitSentences(line) {
    const out = [];
    const re = /[^.!?…]*(?:[.!?…]+["”’)\]]*(?=\s|$)|$)\s*/gu;
    let m;
    while ((m = re.exec(line)) !== null) {
      if (m[0] === '') {
        re.lastIndex++;
        if (re.lastIndex > line.length) break;
        continue;
      }
      out.push(m[0]);
    }
    // saml stykker der blev delt ved en forkortelse (fx "e.g.")
    const merged = [];
    for (const s of out) {
      const prev = merged[merged.length - 1];
      if (prev) {
        const tail = prev.trimEnd().match(/([\p{L}.]+)\.$/u);
        if ((tail && ABBREVIATIONS.has(tail[1].toLowerCase())) || /^\s*[\p{Ll}\d]/u.test(s)) {
          merged[merged.length - 1] = prev + s;
          continue;
        }
      }
      merged.push(s);
    }
    return merged;
  }

  function splitOne(sentence, lang, ctx, limit) {
    const L = lang.rhythm;
    const candidates = [];
    let m;
    const conjRe = new RegExp('([,;])\\s+(' + L.conjunctions.join('|') + ')\\s+(\\S+)', 'giu');
    while ((m = conjRe.exec(sentence)) !== null) {
      const conj = m[2].toLowerCase();
      const firstWord = m[3].toLowerCase().replace(/[^\p{L}'’]/gu, '');
      if (!L.subjects.includes(firstWord)) continue;
      candidates.push({ at: m.index, len: m[0].length - m[3].length, conj, kind: 'conj' });
    }
    const semiRe = /;\s+/g;
    while ((m = semiRe.exec(sentence)) !== null) {
      candidates.push({ at: m.index, len: m[0].length, conj: ';', kind: 'semi' });
    }
    let best = null;
    for (const c of candidates) {
      const left = sentence.slice(0, c.at);
      const right = sentence.slice(c.at + c.len);
      const lw = countWords(left);
      const rw = countWords(right);
      const min = c.kind === 'semi' ? 4 : 6;
      if (lw < min || rw < min) continue;
      const score = Math.abs(lw - rw);
      if (!best || score < best.score) best = { c, left, right, score };
    }
    if (!best) return null;
    const { c, left, right } = best;
    let lead = '';
    if (c.kind === 'conj') {
      const opts = L.leads[c.conj] || {};
      const choice = opts[ctx.tone] !== undefined ? opts[ctx.tone] : opts.neutral;
      lead = Array.isArray(choice) ? ctx.pick(choice) : choice || '';
    }
    const rest = lead ? right : capFirst(right);
    const result = left.replace(/[\s,;]+$/, '') + '. ' + lead + rest;
    return { result, limitHit: countWords(result) > limit };
  }

  function rhythm(text, lang, ctx) {
    const limit = { 1: Infinity, 2: 30, 3: 22 }[ctx.level] + (ctx.tone === 'casual' ? -3 : ctx.tone === 'professional' ? 6 : 0);
    const lines = text.split('\n');
    for (let li = 0; li < lines.length; li++) {
      const line = lines[li];
      if (!/\p{L}/u.test(line)) continue;
      const parts = splitSentences(line);
      let changed = false;
      for (let pi = 0; pi < parts.length; pi++) {
        const s = parts[pi];
        const trailing = s.match(/\s*$/)[0];
        let body = s.slice(0, s.length - trailing.length);
        const words = countWords(body);
        // semikolon -> punktum når begge sider er hele sætninger
        if (ctx.level >= 2 && body.includes(';')) {
          body = body.replace(/;\s+(?=\S)/g, (mm, off) => {
            const l = countWords(body.slice(0, off).split(/[.;!?]/).pop());
            const r = countWords(body.slice(off + mm.length).split(/[.;!?]/)[0]);
            if (l >= 4 && r >= 4) {
              changed = true;
              ctx.changes.push({ cat: 'rhythm', from: ';', to: '.' });
              return '. ' + MASK_CAP;
            }
            return mm;
          });
          body = body.replace(new RegExp(MASK_CAP + '(\\P{L}*)(\\p{L})', 'gu'), (mm, pre, ch) => pre + ch.toUpperCase());
        }
        if (words > limit) {
          let res = splitOne(body, lang, ctx, limit);
          if (res) {
            let out = res.result;
            if (res.limitHit) {
              const pieces = splitSentences(out).map((p) => {
                if (countWords(p) <= limit) return p;
                const t = p.match(/\s*$/)[0];
                const r2 = splitOne(p.slice(0, p.length - t.length), lang, ctx, limit);
                return r2 ? r2.result + t : p;
              });
              out = pieces.join('');
            }
            ctx.changes.push({ cat: 'rhythm', from: shorten(body), to: shorten(out) });
            body = out;
            changed = true;
          }
        }
        parts[pi] = body + trailing;
      }
      if (changed) lines[li] = parts.join('');
    }
    return lines.join('\n');
  }
  function shorten(s) {
    s = s.replace(/\s+/g, ' ').trim();
    return s.length > 90 ? s.slice(0, 87) + '…' : s;
  }

  function tameExclamations(text, ctx) {
    const keep = ctx.tone === 'casual' ? 2 : 1;
    let seen = 0;
    let n = 0;
    text = text.replace(/!{2,}/g, '!');
    text = text.replace(/(?<=[\p{L}\p{N}"”)\uE001])!(?=[\s"”)]|$)/gu, () => {
      seen++;
      if (seen <= keep) return '!';
      n++;
      return '.';
    });
    if (n) ctx.changes.push({ cat: 'punct', from: n + ' × !', to: '.' });
    return text;
  }

  // ---------- sprogdetektion ----------

  const DA_WORDS = ['og', 'det', 'er', 'at', 'en', 'til', 'på', 'med', 'som', 'ikke', 'jeg', 'der', 'har', 'af', 'vi', 'kan', 'den', 'du', 'skal', 'også', 'eller', 'hvis', 'når', 'være', 'meget', 'man', 'nu', 'kun', 'efter', 'hvor'];
  const EN_WORDS = ['the', 'and', 'is', 'to', 'of', 'it', 'that', 'you', 'in', 'for', 'with', 'this', 'are', 'be', 'not', 'on', 'have', 'can', 'your', 'will', 'or', 'if', 'when', 'what', 'an', 'they', 'we', 'from', 'by', 'about'];

  function detectLanguage(text) {
    const words = (text.toLowerCase().match(/\p{L}+/gu) || []).slice(0, 4000);
    if (!words.length) return 'en';
    const da = new Set(DA_WORDS);
    const en = new Set(EN_WORDS);
    let d = 0;
    let e = 0;
    for (const w of words) {
      if (da.has(w)) d++;
      if (en.has(w)) e++;
      if (/[æøå]/.test(w)) d += 1.5;
    }
    return d > e ? 'da' : 'en';
  }

  // ---------- regelsæt ----------

  const helpers = { compile, capFirst, article, START, END };
  const compiled = {};

  function getLang(code) {
    if (compiled[code]) return compiled[code];
    const factory = root.HumanizerRules && root.HumanizerRules[code];
    if (!factory) throw new Error('Mangler regler for sprog: ' + code);
    const def = factory(helpers);
    def.rules.forEach((r, i) => {
      r.id = code + '-' + i;
      r.lvl = r.lvl || 1;
      r.re = compile(r.p, r.word);
      if (r.flag === undefined) {
        r.flag = ['chatbot', 'cliche', 'transition', 'filler'].includes(r.cat) || (r.cat === 'vocab' && r.lvl <= 2);
      }
    });
    compiled[code] = def;
    return def;
  }

  const CATEGORIES = ['chatbot', 'cliche', 'filler', 'transition', 'vocab', 'contraction', 'punct', 'rhythm', 'markdown', 'emoji'];
  const DEFAULT_CATS = { chatbot: true, cliche: true, filler: true, transition: true, vocab: true, contraction: true, punct: true, rhythm: true, markdown: true, emoji: false };

  function ruleActive(rule, opts) {
    if (rule.lvl > opts.level) return false;
    if (rule.tones && !rule.tones.includes(opts.tone)) return false;
    return opts.cats[rule.cat] !== false;
  }

  function makeCtx(text, opts, changes) {
    const rnd = mulberry32(opts.seed || 1);
    const curly = (text.match(/’/g) || []).length > (text.match(/'/g) || []).length;
    const ctx = {
      tone: opts.tone,
      level: opts.level,
      changes,
      apos: curly ? '’' : "'",
      rnd,
      used: new Set(),
      // vælg tilfældigt, men undgå at gentage en erstatning der allerede er brugt i teksten
      pick: (arr) => {
        const fresh = arr.filter((x) => x === '' || !ctx.used.has(x));
        const from = fresh.length ? fresh : arr;
        const choice = from[Math.floor(rnd() * from.length)];
        ctx.used.add(choice);
        return choice;
      },
      q: (s) => s.replace(/'/g, curly ? '’' : "'"),
      capFirst,
      article,
    };
    return ctx;
  }

  function normalizeOpts(opts) {
    opts = Object.assign({ lang: 'auto', tone: 'neutral', level: 2, seed: 1, protect: [], custom: [] }, opts || {});
    opts.cats = Object.assign({}, DEFAULT_CATS, opts.cats || {});
    opts.level = Math.max(1, Math.min(3, Number(opts.level) || 2));
    if (!['casual', 'neutral', 'professional'].includes(opts.tone)) opts.tone = 'neutral';
    return opts;
  }

  /**
   * Hovedfunktionen.
   * @returns {{text: string, changes: Array<{cat,from,to}>, lang: string}}
   */
  function humanize(input, options) {
    const opts = normalizeOpts(options);
    const source = String(input || '').replace(/\r\n?/g, '\n');
    const langCode = opts.lang === 'auto' ? detectLanguage(source) : opts.lang;
    const lang = getLang(langCode);
    const changes = [];
    if (!source.trim()) return { text: '', changes, lang: langCode };

    const masked = mask(source, opts.protect, opts.cats.markdown);
    let text = masked.text;
    const ctx = makeCtx(source, opts, changes);

    if (opts.cats.markdown) text = stripMarkdown(text, changes);
    if (opts.cats.emoji) text = stripEmoji(text, changes);

    (opts.custom || []).forEach((c) => {
      if (!c || !c.from || !c.from.trim()) return;
      const src = c.from.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      text = applyRule(text, { cat: 'custom', r: c.to || '', re: compile(src) }, ctx);
    });

    for (const rule of lang.rules) {
      if (!ruleActive(rule, opts)) continue;
      text = applyRule(text, rule, ctx);
    }
    text = cleanup(text);

    if (opts.cats.punct && opts.level >= 2) text = tameExclamations(text, ctx);
    if (opts.cats.rhythm && opts.level >= 2) text = rhythm(text, lang, ctx);

    text = cleanup(text);
    text = unmask(text, masked.store);
    return { text, changes, lang: langCode };
  }

  /** Find AI-signaler uden at ændre noget (bruges af analysen). */
  function detect(input, langCode, filter) {
    const source = String(input || '').replace(/\r\n?/g, '\n');
    const code = langCode && langCode !== 'auto' ? langCode : detectLanguage(source);
    const lang = getLang(code);
    const masked = mask(source, [], false);
    const hits = [];
    const want = filter || ((rule) => rule.flag);
    // Positionerne skal passe til den originale tekst, så vi arbejder på en kopi
    // hvor maskerne har samme længde som originalen.
    const padded = padMasks(source, masked);
    for (const rule of lang.rules) {
      if (!want(rule)) continue;
      rule.re.lastIndex = 0;
      let m;
      while ((m = rule.re.exec(padded)) !== null) {
        if (m[0] === '') {
          rule.re.lastIndex++;
          continue;
        }
        if (rule.start && !isSentenceStart(padded, m.index)) continue;
        if (rule.textStart && padded.slice(0, m.index).trim() !== '') continue;
        hits.push({ start: m.index, end: m.index + m[0].length, text: m[0], cat: rule.cat });
      }
    }
    hits.sort((a, b) => a.start - b.start || b.end - a.end);
    const merged = [];
    for (const h of hits) {
      const last = merged[merged.length - 1];
      if (last && h.start < last.end) {
        if (h.end > last.end) last.end = h.end;
        continue;
      }
      merged.push(Object.assign({}, h));
    }
    merged.forEach((h) => (h.text = source.slice(h.start, h.end)));
    return { hits: merged, lang: code };
  }

  function padMasks(source, masked) {
    // erstat kode/links med neutrale tegn af samme længde så regex ikke rammer dem
    let out = source;
    masked.store.forEach((orig) => {
      const idx = out.indexOf(orig);
      if (idx >= 0) out = out.slice(0, idx) + '\uE002'.repeat(orig.length) + out.slice(idx + orig.length);
    });
    return out;
  }

  const api = {
    humanize,
    detect,
    detectLanguage,
    countWords,
    splitSentences,
    isSentenceStart,
    CATEGORIES,
    DEFAULT_CATS,
    _helpers: helpers,
    _getLang: getLang,
  };

  root.Humanizer = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
