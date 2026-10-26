/*
 * Ord-for-ord diff mellem original og resultat.
 * Først sammenlignes afsnit, derefter ord inden for de afsnit der er ændret,
 * så store tekster ikke bliver tunge at sammenligne.
 */
(function (root) {
  'use strict';

  function tokenize(s) {
    return s.match(/\s+|[\p{L}\p{N}]+(?:['’][\p{L}]+)*|[^\s\p{L}\p{N}]/gu) || [];
  }

  // klassisk LCS på to arrays; returnerer [{type:'eq'|'del'|'ins', value}] eller null hvis det bliver for tungt
  function lcsDiff(a, b, eq, limit) {
    eq = eq || ((x, y) => x === y);
    let start = 0;
    while (start < a.length && start < b.length && eq(a[start], b[start])) start++;
    let endA = a.length;
    let endB = b.length;
    while (endA > start && endB > start && eq(a[endA - 1], b[endB - 1])) {
      endA--;
      endB--;
    }
    const midA = a.slice(start, endA);
    const midB = b.slice(start, endB);
    const n = midA.length;
    const m = midB.length;
    if (limit && n * m > limit) return null;
    const out = [];
    for (let i = 0; i < start; i++) out.push({ type: 'eq', value: a[i], other: b[i] });
    if (n || m) {
      const w = m + 1;
      const dp = new Uint32Array((n + 1) * w);
      for (let i = n - 1; i >= 0; i--) {
        for (let j = m - 1; j >= 0; j--) {
          dp[i * w + j] = eq(midA[i], midB[j]) ? dp[(i + 1) * w + j + 1] + 1 : Math.max(dp[(i + 1) * w + j], dp[i * w + j + 1]);
        }
      }
      let i = 0;
      let j = 0;
      while (i < n && j < m) {
        if (eq(midA[i], midB[j])) {
          out.push({ type: 'eq', value: midA[i], other: midB[j] });
          i++;
          j++;
        } else if (dp[(i + 1) * w + j] >= dp[i * w + j + 1]) {
          out.push({ type: 'del', value: midA[i++] });
        } else {
          out.push({ type: 'ins', value: midB[j++] });
        }
      }
      while (i < n) out.push({ type: 'del', value: midA[i++] });
      while (j < m) out.push({ type: 'ins', value: midB[j++] });
    }
    for (let i = endA; i < a.length; i++) out.push({ type: 'eq', value: a[i], other: b[i - endA + endB] });
    return out;
  }

  const LIMIT = 4e6;

  function paragraphs(s) {
    return s.match(/[^\n]*(?:\n+|$)/g).filter((x) => x !== '');
  }

  function wordSet(s) {
    return new Set((s.toLowerCase().match(/[\p{L}\p{N}]+/gu) || []));
  }

  function jaccard(a, b) {
    if (!a.size || !b.size) return 0;
    let inter = 0;
    a.forEach((w) => b.has(w) && inter++);
    return inter / (a.size + b.size - inter);
  }

  function merge(ops) {
    const out = [];
    for (const op of ops) {
      const last = out[out.length - 1];
      if (last && last.type === op.type) last.value += op.value;
      else out.push({ type: op.type, value: op.value });
    }
    // whitespace mellem to ændringer hører til ændringen, så det læses som én blok
    for (let i = 1; i < out.length - 1; i++) {
      if (out[i].type === 'eq' && /^[ \t]+$/.test(out[i].value) && out[i - 1].type !== 'eq' && out[i + 1].type !== 'eq') {
        out.splice(i, 1, { type: 'del', value: out[i].value }, { type: 'ins', value: out[i].value });
      }
    }
    const tidy = [];
    for (const op of out) {
      const last = tidy[tidy.length - 1];
      if (last && last.type === op.type) last.value += op.value;
      else tidy.push(op);
    }
    // saml del/ins-sekvenser så sletninger står før indsættelser
    const res = [];
    let i = 0;
    while (i < tidy.length) {
      if (tidy[i].type === 'eq') {
        res.push(tidy[i++]);
        continue;
      }
      let del = '';
      let ins = '';
      while (i < tidy.length && tidy[i].type !== 'eq') {
        if (tidy[i].type === 'del') del += tidy[i].value;
        else ins += tidy[i].value;
        i++;
      }
      if (del) res.push({ type: 'del', value: del });
      if (ins) res.push({ type: 'ins', value: ins });
    }
    return res;
  }

  // afsnit parres grådigt med et lille vindue; billigt selv for meget lange tekster
  function alignParagraphs(pa, pb) {
    const sa = pa.map(wordSet);
    const sb = pb.map(wordSet);
    const sim = (i, j) => pa[i] === pb[j] || jaccard(sa[i], sb[j]) >= 0.35;
    const out = [];
    let i = 0;
    let j = 0;
    while (i < pa.length && j < pb.length) {
      if (sim(i, j)) {
        out.push({ type: 'pair', a: pa[i++], b: pb[j++] });
        continue;
      }
      let best = null;
      for (let d = 1; d <= 6 && !best; d++) {
        for (let k = 0; k <= d; k++) {
          const ii = i + k;
          const jj = j + d - k;
          if (ii < pa.length && jj < pb.length && sim(ii, jj)) {
            best = [ii, jj];
            break;
          }
        }
      }
      if (!best) {
        out.push({ type: 'pair', a: pa[i++], b: pb[j++] });
        continue;
      }
      while (i < best[0]) out.push({ type: 'del', value: pa[i++] });
      while (j < best[1]) out.push({ type: 'ins', value: pb[j++] });
    }
    while (i < pa.length) out.push({ type: 'del', value: pa[i++] });
    while (j < pb.length) out.push({ type: 'ins', value: pb[j++] });
    return out;
  }

  function diff(a, b) {
    const direct = lcsDiff(tokenize(a), tokenize(b), null, LIMIT);
    if (direct) return merge(direct);
    // store tekster: par afsnit der ligner hinanden, og diff ord for ord inden i hvert par
    const ops = [];
    alignParagraphs(paragraphs(a), paragraphs(b)).forEach((p) => {
      if (p.type !== 'pair') ops.push({ type: p.type, value: p.value });
      else {
        const inner = lcsDiff(tokenize(p.a), tokenize(p.b), null, LIMIT);
        if (inner) inner.forEach((o) => ops.push(o));
        else ops.push({ type: 'del', value: p.a }, { type: 'ins', value: p.b });
      }
    });
    return merge(ops);
  }

  function stats(ops) {
    let ins = 0;
    let del = 0;
    ops.forEach((o) => {
      const n = (o.value.match(/[\p{L}\p{N}]+/gu) || []).length;
      if (o.type === 'ins') ins += n;
      if (o.type === 'del') del += n;
    });
    return { ins, del };
  }

  const api = { diff, stats, tokenize };
  root.HumanizerDiff = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
