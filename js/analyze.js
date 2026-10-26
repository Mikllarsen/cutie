/*
 * Analyse: hvor "robot-agtig" lyder en tekst?
 *
 * Det er en tommelfingerregel bygget på de samme mønstre som regelmotoren
 * retter, ikke en AI-detektor. Den måler floskler, ensformig sætningslængde,
 * tankestreger, overgangsord, manglende sammentrækninger (engelsk) og lange sætninger.
 */
(function (root) {
  'use strict';
  const H = root.Humanizer;

  function sentences(text) {
    const out = [];
    text.split(/\n+/).forEach((line) => {
      if (!/\p{L}/u.test(line)) return;
      H.splitSentences(line).forEach((s) => {
        if (H.countWords(s) > 0) out.push(s.trim());
      });
    });
    return out;
  }

  function syllablesEn(word) {
    word = word.toLowerCase().replace(/[^a-z]/g, '');
    if (!word) return 0;
    if (word.length <= 3) return 1;
    word = word.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, '').replace(/^y/, '');
    const m = word.match(/[aeiouy]{1,2}/g);
    return Math.max(1, m ? m.length : 1);
  }

  function clamp(x, a, b) {
    return Math.max(a, Math.min(b, x));
  }

  function analyze(text, langCode) {
    text = String(text || '');
    const lang = langCode && langCode !== 'auto' ? langCode : H.detectLanguage(text);
    const words = text.match(/[\p{L}\p{N}]+(?:['’][\p{L}]+)?/gu) || [];
    const wc = words.length;
    const sents = sentences(text);
    const sc = Math.max(1, sents.length);
    const lens = sents.map((s) => H.countWords(s));
    const avg = wc / sc;
    const mean = lens.length ? lens.reduce((a, b) => a + b, 0) / lens.length : 0;
    const sd = lens.length ? Math.sqrt(lens.reduce((a, b) => a + (b - mean) * (b - mean), 0) / lens.length) : 0;
    const cv = mean ? sd / mean : 0;

    const { hits } = H.detect(text, lang);
    const transitions = hits.filter((x) => x.cat === 'transition').length;
    const emDashes = (text.match(/—|―|\s--\s/g) || []).length;
    const semicolons = (text.match(/;/g) || []).length;
    const exclaims = (text.match(/!/g) || []).length;

    let contractionRate = null;
    if (lang === 'en') {
      const contracted = (text.match(/\b\p{L}+['’](?:t|s|re|ve|ll|d|m)\b/giu) || []).length;
      const expandable = H.detect(text, lang, (r) => r.contraction).hits.length;
      if (contracted + expandable >= 2) contractionRate = contracted / (contracted + expandable);
    }

    const per100 = (n) => (wc ? (n * 100) / wc : 0);
    const parts = [];
    parts.push({ key: 'phrases', weight: 40, value: clamp(per100(hits.length) / 3, 0, 1) });
    parts.push({ key: 'rhythm', weight: 20, value: lens.length >= 3 ? clamp((0.6 - cv) / 0.45, 0, 1) : 0.3 });
    parts.push({ key: 'dashes', weight: 10, value: clamp(per100(emDashes) / 1.2, 0, 1) });
    parts.push({ key: 'transitions', weight: 10, value: clamp(transitions / sc / 0.2, 0, 1) });
    parts.push({ key: 'length', weight: 10, value: clamp((avg - 17) / 13, 0, 1) });
    if (contractionRate !== null) parts.push({ key: 'contractions', weight: 10, value: clamp(1 - contractionRate * 1.4, 0, 1) });
    const totalW = parts.reduce((a, p) => a + p.weight, 0);
    const score = wc < 5 ? 0 : Math.round((parts.reduce((a, p) => a + p.weight * p.value, 0) / totalW) * 100);

    let readability;
    if (lang === 'da') {
      const long = words.filter((w) => w.replace(/[^\p{L}]/gu, '').length > 6).length;
      const lix = wc ? wc / sc + (long * 100) / wc : 0;
      readability = { name: 'LIX', value: Math.round(lix), label: lixLabel(lix) };
    } else {
      const syl = words.reduce((a, w) => a + syllablesEn(w), 0);
      const fre = wc ? 206.835 - 1.015 * (wc / sc) - 84.6 * (syl / wc) : 0;
      readability = { name: 'Flesch', value: Math.round(fre), label: fleschLabel(fre) };
    }

    return {
      lang,
      score,
      words: wc,
      sentences: sents.length,
      avgSentence: Math.round(avg * 10) / 10,
      variation: Math.round(cv * 100) / 100,
      shortest: lens.length ? Math.min.apply(null, lens) : 0,
      longest: lens.length ? Math.max.apply(null, lens) : 0,
      phrases: hits.length,
      hits,
      transitions,
      emDashes,
      semicolons,
      exclaims,
      contractionRate,
      readability,
      parts,
    };
  }

  function lixLabel(l) {
    if (l < 25) return 'veryEasy';
    if (l < 35) return 'easy';
    if (l < 45) return 'medium';
    if (l < 55) return 'hard';
    return 'veryHard';
  }

  function fleschLabel(f) {
    if (f >= 80) return 'veryEasy';
    if (f >= 65) return 'easy';
    if (f >= 50) return 'medium';
    if (f >= 30) return 'hard';
    return 'veryHard';
  }

  function scoreBand(score) {
    if (score < 25) return 'human';
    if (score < 50) return 'stiff';
    if (score < 75) return 'robotic';
    return 'veryRobotic';
  }

  const api = { analyze, scoreBand, sentences };
  root.HumanizerAnalyze = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
