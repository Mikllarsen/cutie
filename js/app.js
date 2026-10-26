/* cutie. – brugerfladen */
(function () {
  'use strict';

  const H = window.Humanizer;
  const A = window.HumanizerAnalyze;
  const D = window.HumanizerDiff;
  const I = window.I18n;
  const AI = window.HumanizerAI;
  const t = I.t;
  const $ = (id) => document.getElementById(id);

  // ---------- lokal lagring (kan fejle i private vinduer) ----------
  const store = {
    get(key, fallback) {
      try {
        const v = localStorage.getItem('cutie.' + key);
        return v === null ? fallback : JSON.parse(v);
      } catch (e) {
        return fallback;
      }
    },
    set(key, value) {
      try {
        localStorage.setItem('cutie.' + key, JSON.stringify(value));
      } catch (e) {
        /* ignorer */
      }
    },
    remove(key) {
      try {
        localStorage.removeItem('cutie.' + key);
      } catch (e) {
        /* ignorer */
      }
    },
    raw(key, value) {
      try {
        if (value === undefined) return localStorage.getItem('cutie.' + key);
        localStorage.setItem('cutie.' + key, value);
      } catch (e) {
        return null;
      }
      return null;
    },
  };

  // ---------- eksempeltekster ----------
  const SAMPLES = {
    da: [
      'Selvfølgelig! Her er en kort tekst om fjernarbejde.',
      '',
      'I dagens hurtige, digitale verden er fjernarbejde blevet en fast del af mange virksomheders hverdag. Det er vigtigt at bemærke, at medarbejdere ikke altid trives med at arbejde hjemmefra. Derudover, spiller ledelsen en afgørende rolle for, hvordan teamet oplever fleksibiliteten. Imidlertid er det muligt at anvende digitale værktøjer på en effektiv måde, og det kræver, at man foretager en grundig vurdering af behovene, og at man benytter sig af løsninger, der understøtter samarbejdet på tværs af afdelinger og lokationer.',
      '',
      'Endvidere kan fjernarbejde frigøre det fulde potentiale i medarbejdernes kompetencer — men kun hvis kulturen er på plads. Afslutningsvis kan det siges, at fjernarbejde er en game changer for moderne organisationer.',
      '',
      'Jeg håber, dette hjælper! Du er velkommen til at spørge, hvis du har flere spørgsmål.',
    ].join('\n'),
    en: [
      "Certainly! Here's a short piece about remote work.",
      '',
      "In today's fast-paced digital world, remote work has become an integral part of how companies operate. It is important to note that employees do not always thrive when working from home. Furthermore, leadership plays a crucial role in shaping how teams experience flexibility. However, it is possible to utilize digital tools in an effective manner, and it requires that managers carry out a comprehensive review of their needs, and that they leverage solutions that facilitate seamless collaboration across departments and locations.",
      '',
      'Moreover, remote work can unlock the full potential of employees — but only if the culture is right. In conclusion, remote work is a game-changer for modern organizations.',
      '',
      'I hope this helps! Let me know if you have any other questions.',
    ].join('\n'),
  };

  // ---------- forklaringskort ----------
  const HOW = {
    chatbot: {
      da: ['Fjerner indledninger og afslutninger, som kun en chatbot skriver.', [['Selvfølgelig! ', ''], ['Her er teksten.', null], [' Jeg håber, det hjælper!', '']]],
      en: ['Removes openers and sign-offs only a chatbot writes.', [['Certainly! ', ''], ["Here's the text.", null], [' I hope this helps!', '']]],
    },
    cliche: {
      da: ['Bytter de vendinger, sprogmodeller elsker, ud med almindeligt sprog.', [['Data ', null], ['spiller en afgørende rolle for', 'betyder meget for'], [' os.', null]]],
      en: ['Swaps the phrases language models love for plain language.', [["Let's ", null], ['delve into', 'dig into'], [' the data.', null]]],
    },
    filler: {
      da: ['Strammer omstændelige vendinger op.', [['med henblik på at', 'for at'], [' spare tid', null]]],
      en: ['Tightens wordy phrasing.', [['due to the fact that', 'because'], [' it works', null]]],
    },
    transition: {
      da: ['Varierer stive overgangsord og fjerner kommaet efter dem, uden at ødelægge ordstillingen.', [['Derudover,', 'Desuden'], [' er der en fordel.', null]]],
      en: ['Varies stiff transitions at the start of sentences.', [['Furthermore,', 'Also,'], [' it is cheap.', null]]],
    },
    vocab: {
      da: ['Erstatter kancellisprog med de ord, folk faktisk bruger.', [['Vi ', null], ['anvender', 'bruger'], [' AI ', null], ['såfremt', 'hvis'], [' det giver mening.', null]]],
      en: ['Replaces stiff words with the ones people actually use.', [['We ', null], ['utilize', 'use'], [' a ', null], ['robust', 'solid'], [' setup.', null]]],
    },
    contraction: {
      da: ['Trækker engelske udtryk sammen, som man gør, når man taler.', [['It ', null], ['is not', "isn't"], [' hard. We ', null], ['do not', "don't"], [' mind.', null]]],
      en: ['Uses contractions the way people do when they talk.', [['It ', null], ['is not', "isn't"], [' hard. We ', null], ['do not', "don't"], [' mind.', null]]],
    },
    punct: {
      da: ['Erstatter tankestreger med komma og skruer ned for udråbstegnene.', [['Hurtigt', null], [' — ', ', '], ['og billigt', null], ['!', '.']]],
      en: ['Replaces em dashes with commas and tones down exclamation marks.', [['Fast', null], [' — ', ', '], ['and cheap', null], ['!', '.']]],
    },
    rhythm: {
      da: ['Deler meget lange sætninger og laver semikolon om til punktum, så rytmen varierer.', [['… værktøjerne', null], [', og det', '. Det'], [' kræver tid …', null]]],
      en: ['Splits very long sentences and turns semicolons into full stops, so the rhythm varies.', [['… the tools', null], [', but it', '. But it'], [' takes time …', null]]],
    },
    markdown: {
      da: ['Fjerner fed skrift og overskriftstegn fra chat-svar.', [['**', ''], ['Vigtigt:', null], ['**', ''], [' læs det her', null]]],
      en: ['Strips bold and heading markers from chat answers.', [['**', ''], ['Important:', null], ['**', ''], [' read this', null]]],
    },
    emoji: {
      da: ['Fjerner emojis, hvis du slår det til under Flere indstillinger.', [['🚀 ', ''], ['Klar til start', null]]],
      en: ['Removes emojis if you switch it on under More settings.', [['🚀 ', ''], ['Ready to go', null]]],
    },
  };

  // ---------- tilstand ----------
  const DEFAULTS = {
    mode: 'rules',
    lang: 'auto',
    tone: 'neutral',
    level: 2,
    cats: Object.assign({}, H.DEFAULT_CATS),
    protect: '',
    custom: '',
    model: 'claude-opus-5-5',
  };
  const state = {
    settings: Object.assign({}, DEFAULTS, store.get('settings', {})),
    seed: 1,
    uiLang: store.get('uiLang', null) || 'da',
    tab: 'result',
    last: null, // { source, result, changes, lang, engine, model }
    busy: false,
    abort: null,
    apiKey: store.get('apiKey', ''),
  };
  state.settings.cats = Object.assign({}, H.DEFAULT_CATS, state.settings.cats || {});

  const el = {
    input: $('input'),
    output: $('output'),
    inCount: $('inCount'),
    detected: $('detected'),
    exampleBadge: $('exampleBadge'),
    runBtn: $('runBtn'),
    toolbar: $('toolbar'),
    langSel: $('langSel'),
    modelSel: $('modelSel'),
    apiKey: $('apiKey'),
    rememberKey: $('rememberKey'),
    aiDrawer: $('aiDrawer'),
    moreDrawer: $('moreDrawer'),
    catGrid: $('catGrid'),
    protectInput: $('protectInput'),
    customInput: $('customInput'),
    status: $('status'),
    diffView: $('diffView'),
    diffSummary: $('diffSummary'),
    changeList: $('changeList'),
    changeCount: $('changeCount'),
    analysisView: $('analysisView'),
    scoreChip: $('scoreChip'),
    scoreChipText: $('scoreChipText'),
    howGrid: $('howGrid'),
    toast: $('toast'),
    dropZone: $('dropZone'),
    fileInput: $('fileInput'),
    sampleBtn: $('sampleBtn'),
    sampleMenu: $('sampleMenu'),
  };

  // ---------- små DOM-hjælpere ----------
  function h(tag, attrs, children) {
    const node = document.createElement(tag);
    if (attrs) {
      Object.keys(attrs).forEach((k) => {
        if (k === 'class') node.className = attrs[k];
        else if (k === 'text') node.textContent = attrs[k];
        else if (k === 'style') node.setAttribute('style', attrs[k]);
        else node.setAttribute(k, attrs[k]);
      });
    }
    (children || []).forEach((c) => {
      if (c == null) return;
      node.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
    });
    return node;
  }

  function clear(node) {
    while (node.firstChild) node.removeChild(node.firstChild);
  }

  let toastTimer = null;
  function toast(msg) {
    el.toast.textContent = msg;
    el.toast.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => (el.toast.hidden = true), 2200);
  }

  function setStatus(msg, kind) {
    if (!msg) {
      el.status.hidden = true;
      el.status.textContent = '';
      el.status.className = 'status';
      return;
    }
    el.status.hidden = false;
    el.status.textContent = msg;
    el.status.className = 'status' + (kind ? ' is-' + kind : '');
  }

  function debounce(fn, ms) {
    let timer = null;
    return function () {
      const args = arguments;
      clearTimeout(timer);
      timer = setTimeout(() => fn.apply(null, args), ms);
    };
  }

  // ---------- indstillinger ----------
  function saveSettings() {
    store.set('settings', state.settings);
  }

  function syncControls() {
    const s = state.settings;
    document.querySelector('input[name="mode"][value="' + s.mode + '"]').checked = true;
    document.querySelector('input[name="tone"][value="' + s.tone + '"]').checked = true;
    document.querySelector('input[name="level"][value="' + s.level + '"]').checked = true;
    el.langSel.value = s.lang;
    el.modelSel.value = s.model;
    el.protectInput.value = s.protect;
    el.customInput.value = s.custom;
    el.apiKey.value = state.apiKey || '';
    el.rememberKey.checked = !!store.get('apiKey', '');
    H.CATEGORIES.forEach((c) => {
      const box = $('cat_' + c);
      if (box) box.checked = s.cats[c] !== false;
    });
    applyMode();
  }

  function applyMode() {
    const ai = state.settings.mode === 'ai';
    el.aiDrawer.hidden = !ai;
    updateRunButton();
  }

  function updateRunButton() {
    const label = el.runBtn.querySelector('.run-label');
    if (state.busy) {
      label.textContent = t('stop');
      el.runBtn.classList.add('is-stop');
    } else {
      label.textContent = state.settings.mode === 'ai' ? t('runAi') : t('run');
      el.runBtn.classList.remove('is-stop');
    }
  }

  function parseProtect() {
    return state.settings.protect
      .split(',')
      .map((w) => w.trim())
      .filter(Boolean);
  }

  function parseCustom() {
    return state.settings.custom
      .split('\n')
      .map((line) => {
        const i = line.indexOf('=>');
        if (i < 0) return null;
        return { from: line.slice(0, i).trim(), to: line.slice(i + 2).trim() };
      })
      .filter((r) => r && r.from);
  }

  function engineOpts() {
    return {
      lang: state.settings.lang,
      tone: state.settings.tone,
      level: Number(state.settings.level),
      cats: state.settings.cats,
      seed: state.seed,
      protect: parseProtect(),
      custom: parseCustom(),
    };
  }

  // ---------- kategorier & forklaring ----------
  function buildCats() {
    clear(el.catGrid);
    H.CATEGORIES.forEach((c) => {
      const box = h('input', { type: 'checkbox', id: 'cat_' + c });
      box.checked = state.settings.cats[c] !== false;
      box.addEventListener('change', () => {
        state.settings.cats[c] = box.checked;
        saveSettings();
        autoRun();
      });
      el.catGrid.appendChild(h('label', { class: 'cat-toggle', for: 'cat_' + c }, [box, h('span', { class: 'cat-name', text: t('cat_' + c) }), h('span', { class: 'cat-ex', text: t('cat_' + c + '_ex') })]));
    });
  }

  function buildHow() {
    clear(el.howGrid);
    Object.keys(HOW).forEach((c) => {
      const entry = HOW[c][I.lang] || HOW[c].da;
      const ex = h('p', { class: 'ex' });
      entry[1].forEach(([a, b]) => {
        if (b === null) ex.appendChild(document.createTextNode(a));
        else {
          ex.appendChild(h('del', { text: a }));
          if (b) ex.appendChild(h('ins', { text: b }));
        }
      });
      el.howGrid.appendChild(h('article', { class: 'how-card' }, [h('h3', { text: t('cat_' + c) }), h('p', { text: entry[0] }), ex]));
    });
  }

  // ---------- kørsel ----------
  function runRules() {
    const source = el.input.value;
    const res = H.humanize(source, engineOpts());
    el.output.value = res.text;
    state.last = { source, result: res.text, changes: res.changes, lang: res.lang, engine: 'rules' };
    setStatus('');
    renderAll();
  }

  async function runAi() {
    const source = el.input.value;
    if (!source.trim()) return;
    if (!state.apiKey) {
      el.aiDrawer.open = true;
      el.apiKey.focus();
      setStatus(t('aiNeedKey'), 'error');
      return;
    }
    const lang = state.settings.lang === 'auto' ? H.detectLanguage(source) : state.settings.lang;
    state.abort = new AbortController();
    state.busy = true;
    updateRunButton();
    el.output.value = '';
    setStatus(t('aiThinking'), 'busy');
    switchTab('result');
    let got = false;
    try {
      const res = await AI.rewrite({
        apiKey: state.apiKey,
        model: state.settings.model,
        text: source,
        tone: state.settings.tone,
        level: Number(state.settings.level),
        protect: parseProtect(),
        signal: state.abort.signal,
        onText: (txt) => {
          if (!got) {
            got = true;
            setStatus(t('aiWriting'), 'busy');
          }
          el.output.value = txt;
        },
      });
      el.output.value = res.text;
      state.last = { source, result: res.text, changes: null, lang, engine: 'ai', model: res.model };
      setStatus(res.truncated ? t('aiErrMaxTokens') : t('aiDone', { model: res.model }), res.truncated ? 'error' : null);
    } catch (err) {
      const partial = err.partial || el.output.value;
      el.output.value = partial;
      state.last = { source, result: partial, changes: null, lang, engine: 'ai' };
      const map = { aborted: 'aiStopped', auth: 'aiErrAuth', permission: 'aiErrPermission', rate: 'aiErrRate', network: 'aiErrNetwork', load: 'aiErrLoad', refusal: 'aiErrRefusal' };
      const key = map[err.code];
      setStatus(key ? t(key) : t('aiErrOther', { msg: err.message || String(err) }), err.code === 'aborted' ? null : 'error');
    } finally {
      state.busy = false;
      state.abort = null;
      updateRunButton();
      renderAll();
    }
  }

  function run() {
    if (state.busy) {
      if (state.abort) state.abort.abort();
      return;
    }
    if (state.settings.mode === 'ai') runAi();
    else runRules();
  }

  // længere tekster får lidt længere ventetid, så skrivningen ikke hakker
  let autoTimer = null;
  function autoRun() {
    clearTimeout(autoTimer);
    const len = el.input.value.length;
    autoTimer = setTimeout(() => {
      if (state.settings.mode === 'rules' && !state.busy && len < 120000) runRules();
      else renderCounts();
    }, Math.min(1200, 220 + len / 40));
  }

  // ---------- visning ----------
  function renderCounts() {
    const v = el.input.value;
    el.inCount.textContent = H.countWords(v) + ' ' + t('words') + ' · ' + v.length + ' ' + t('chars');
    const isSample = v === SAMPLES.da || v === SAMPLES.en;
    el.exampleBadge.hidden = !isSample;
    if (v.trim() && state.settings.lang === 'auto') {
      const lang = H.detectLanguage(v);
      el.detected.textContent = t('detected', { lang: t(lang === 'da' ? 'langDa' : 'langEn') });
    } else el.detected.textContent = '';
  }

  function currentPair() {
    const source = state.last ? state.last.source : el.input.value;
    return { source, result: el.output.value, lang: (state.last && state.last.lang) || H.detectLanguage(source) };
  }

  function renderAll() {
    renderCounts();
    renderChanges();
    renderAnalysis();
  }

  function renderChanges() {
    const { source, result } = currentPair();
    clear(el.diffView);
    clear(el.changeList);
    if (!source.trim() || !result.trim()) {
      el.diffSummary.textContent = t('outputPlaceholder');
      el.changeCount.textContent = '';
      return;
    }
    const ops = D.diff(source, result);
    const st = D.stats(ops);
    const edits = ops.filter((o) => o.type !== 'eq').length;
    const changes = state.last && state.last.engine === 'rules' && state.last.result === result ? state.last.changes : null;
    const n = changes ? changes.length : edits;
    el.changeCount.textContent = n ? String(n) : '';
    if (!edits) {
      el.diffSummary.textContent = t('noChanges');
    } else {
      el.diffSummary.textContent = t('changesSummary', { n, del: st.del, ins: st.ins });
    }
    ops.forEach((o) => {
      if (o.type === 'eq') el.diffView.appendChild(document.createTextNode(o.value));
      else el.diffView.appendChild(h(o.type, { text: o.value }));
    });

    if (!changes) {
      if (state.last && state.last.engine === 'ai' && edits) el.changeList.appendChild(h('li', {}, [h('span', { class: 'cat-chip', text: 'Claude' }), h('span', { class: 'pair', text: t('aiRewrite') }), h('span')]));
      return;
    }
    const groups = new Map();
    changes.forEach((c) => {
      const k = c.cat + '\u0000' + c.from.toLowerCase() + '\u0000' + c.to.toLowerCase();
      const g = groups.get(k);
      if (g) g.n++;
      else groups.set(k, { cat: c.cat, from: c.from, to: c.to, n: 1 });
    });
    const order = H.CATEGORIES.concat(['custom']);
    Array.from(groups.values())
      .sort((a, b) => order.indexOf(a.cat) - order.indexOf(b.cat) || b.n - a.n)
      .forEach((g) => {
        const pair = h('span', { class: 'pair' }, [
          h('del', { text: g.from }),
          h('span', { class: 'arrow', text: '→' }),
          g.to ? h('ins', { text: g.to }) : h('span', { class: 'empty', text: t('removed') }),
        ]);
        el.changeList.appendChild(h('li', {}, [h('span', { class: 'cat-chip', text: t('cat_' + g.cat) }), pair, h('span', { class: 'times', text: g.n > 1 ? '×' + g.n : '' })]));
      });
  }

  function fmt(n, digits) {
    return Number(n).toLocaleString(I.lang === 'da' ? 'da-DK' : 'en-GB', { maximumFractionDigits: digits || 0, minimumFractionDigits: digits || 0 });
  }

  function renderAnalysis() {
    const { source, result, lang } = currentPair();
    const view = el.analysisView;
    clear(view);
    if (!source.trim()) {
      el.scoreChip.hidden = true;
      view.appendChild(h('p', { class: 'empty-state', text: t('outputPlaceholder') }));
      return;
    }
    const a = A.analyze(source, lang);
    const b = result.trim() ? A.analyze(result, lang) : null;
    const after = b || a;
    const band = A.scoreBand(after.score);

    el.scoreChip.hidden = false;
    el.scoreChip.dataset.band = band;
    el.scoreChipText.textContent = t('robotScore') + ' ' + a.score + (b ? ' → ' + b.score : '');
    el.scoreChip.title = t('band_' + band);

    // måler
    const track = h('div', { class: 'track', role: 'img', 'aria-label': t('robotScore') + ': ' + t('before') + ' ' + a.score + (b ? ', ' + t('after') + ' ' + b.score : '') }, [
      h('span', { class: 'pin before', style: 'left:' + clampPct(a.score) + '%' }, [h('span', { class: 'pin-label', text: t('before') })]),
      b ? h('span', { class: 'pin after', style: 'left:' + clampPct(b.score) + '%' }, [h('span', { class: 'pin-label', text: t('after') })]) : null,
    ]);
    view.appendChild(
      h('div', { class: 'gauge' }, [
        h('div', { class: 'gauge-head' }, [
          h('div', {}, [h('div', { class: 'gauge-title', text: t('robotScore') }), h('div', { class: 'hint', text: t('band_' + band) })]),
          h('div', { class: 'gauge-figures' }, [
            h('div', { class: 'gauge-fig before' }, [h('b', { text: String(a.score) }), h('span', { text: t('before') })]),
            b ? h('div', { class: 'gauge-fig after' }, [h('b', { text: String(b.score) }), h('span', { text: t('after') })]) : null,
          ]),
        ]),
        track,
        h('div', { class: 'band-row' }, [h('span', { text: t('band_human') }), h('span', { text: t('band_veryRobotic') })]),
      ])
    );

    // hvad trækker op
    view.appendChild(h('h3', { class: 'subhead', text: t('whatCounts') }));
    const parts = h('div', { class: 'parts' });
    a.parts.forEach((p) => {
      const q = b ? b.parts.find((x) => x.key === p.key) : null;
      const bv = Math.round(p.value * 100);
      const av = q ? Math.round(q.value * 100) : null;
      parts.appendChild(
        h('div', { class: 'part' }, [
          h('span', { text: t('part_' + p.key) }),
          h('div', { class: 'part-bars' }, [h('div', { class: 'bar' }, [h('i', { style: 'width:' + bv + '%' })]), q ? h('div', { class: 'bar after' }, [h('i', { style: 'width:' + av + '%' })]) : null]),
          h('span', { class: 'part-val', text: q ? bv + '→' + av : String(bv) }),
        ])
      );
    });
    view.appendChild(parts);

    // nøgletal
    view.appendChild(h('h3', { class: 'subhead', text: t('stats') }));
    const rows = [
      [t('statWords'), fmt(a.words), b && fmt(b.words)],
      [t('statSentences'), fmt(a.sentences), b && fmt(b.sentences)],
      [t('statAvg'), fmt(a.avgSentence, 1), b && fmt(b.avgSentence, 1)],
      [t('statRange'), a.shortest + '–' + a.longest, b && b.shortest + '–' + b.longest],
      [t('statVariation'), fmt(a.variation, 2), b && fmt(b.variation, 2)],
      [t('statReadability') + ' (' + a.readability.name + ')', a.readability.value + ' · ' + t('read_' + a.readability.label), b && b.readability.value + ' · ' + t('read_' + b.readability.label)],
    ];
    if (a.contractionRate !== null || (b && b.contractionRate !== null)) {
      const pct = (x) => (x === null ? '–' : Math.round(x * 100) + ' %');
      rows.push([t('statContractions'), pct(a.contractionRate), b && pct(b.contractionRate)]);
    }
    const tbody = h('tbody');
    rows.forEach((r) => tbody.appendChild(h('tr', {}, [h('td', { text: r[0] }), h('td', { text: r[1] }), b ? h('td', { class: 'after', text: r[2] }) : null])));
    view.appendChild(
      h('div', { class: 'table-wrap' }, [
        h('table', { class: 'stat-table' }, [h('thead', {}, [h('tr', {}, [h('th', { text: '' }), h('th', { text: t('before') }), b ? h('th', { text: t('after') }) : null])]), tbody]),
      ])
    );

    // tilbageværende signaler
    const target = b ? result : source;
    const hits = after.hits;
    view.appendChild(h('h3', { class: 'subhead', text: t('remaining') + (hits.length ? ' (' + hits.length + ')' : '') }));
    if (!hits.length) {
      view.appendChild(h('p', { class: 'empty-state', text: t('remainingNone') }));
    } else {
      view.appendChild(h('p', { class: 'hint', text: t('remainingHint') }));
      const marked = h('div', { class: 'marked' });
      let pos = 0;
      hits.forEach((x) => {
        if (x.start > pos) marked.appendChild(document.createTextNode(target.slice(pos, x.start)));
        marked.appendChild(h('mark', { title: t('cat_' + x.cat), text: target.slice(x.start, x.end) }));
        pos = x.end;
      });
      if (pos < target.length) marked.appendChild(document.createTextNode(target.slice(pos)));
      view.appendChild(marked);
    }
    view.appendChild(h('p', { class: 'disclaimer', text: t('disclaimer') }));
  }

  function clampPct(x) {
    return Math.max(2, Math.min(98, x));
  }

  // ---------- faner ----------
  const tabs = Array.from(document.querySelectorAll('[role="tab"]'));
  function switchTab(name) {
    state.tab = name;
    tabs.forEach((tab) => {
      const on = tab.dataset.tab === name;
      tab.setAttribute('aria-selected', on ? 'true' : 'false');
      tab.tabIndex = on ? 0 : -1;
      $(tab.getAttribute('aria-controls')).hidden = !on;
    });
  }
  tabs.forEach((tab, i) => {
    tab.addEventListener('click', () => switchTab(tab.dataset.tab));
    tab.addEventListener('keydown', (e) => {
      if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
      e.preventDefault();
      const next = tabs[(i + (e.key === 'ArrowRight' ? 1 : tabs.length - 1)) % tabs.length];
      switchTab(next.dataset.tab);
      next.focus();
    });
  });

  // ---------- sprog & tema ----------
  function setUiLang(code) {
    state.uiLang = code;
    I.setLang(code);
    I.apply();
    store.set('uiLang', code);
    document.querySelectorAll('[data-ui-lang]').forEach((b) => b.setAttribute('aria-pressed', b.dataset.uiLang === code ? 'true' : 'false'));
    buildCats();
    buildHow();
    updateRunButton();
    renderAll();
  }

  function effectiveTheme() {
    const set = document.documentElement.getAttribute('data-theme');
    if (set) return set;
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }

  $('themeBtn').addEventListener('click', () => {
    const next = effectiveTheme() === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    store.raw('theme', next);
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', next === 'dark' ? '#14121c' : '#f6f4fa');
  });

  document.querySelectorAll('[data-ui-lang]').forEach((b) => b.addEventListener('click', () => setUiLang(b.dataset.uiLang)));

  // ---------- kontroller ----------
  el.toolbar.addEventListener('submit', (e) => {
    e.preventDefault();
    run();
  });

  el.toolbar.addEventListener('change', (e) => {
    const target = e.target;
    if (target.name === 'mode') {
      state.settings.mode = target.value;
      applyMode();
      if (target.value === 'ai') AI.preload();
      else autoRun();
    } else if (target.name === 'tone') state.settings.tone = target.value;
    else if (target.name === 'level') state.settings.level = Number(target.value);
    else if (target === el.langSel) state.settings.lang = target.value;
    saveSettings();
    if (target.name !== 'mode') autoRun();
  });

  el.modelSel.addEventListener('change', () => {
    state.settings.model = el.modelSel.value;
    saveSettings();
  });

  el.apiKey.addEventListener('input', () => {
    state.apiKey = el.apiKey.value.trim();
    if (el.rememberKey.checked) store.set('apiKey', state.apiKey);
  });

  el.rememberKey.addEventListener('change', () => {
    if (el.rememberKey.checked) store.set('apiKey', state.apiKey);
    else store.remove('apiKey');
  });

  el.protectInput.addEventListener('input', () => {
    state.settings.protect = el.protectInput.value;
    saveSettings();
    autoRun();
  });

  el.customInput.addEventListener('input', () => {
    state.settings.custom = el.customInput.value;
    saveSettings();
    autoRun();
  });

  $('resetBtn').addEventListener('click', () => {
    state.settings = Object.assign({}, DEFAULTS, { cats: Object.assign({}, H.DEFAULT_CATS) });
    saveSettings();
    syncControls();
    autoRun();
  });

  const saveDraft = debounce(() => store.set('draft', el.input.value), 400);

  el.input.addEventListener('input', () => {
    saveDraft();
    renderCounts();
    autoRun();
  });

  el.output.addEventListener(
    'input',
    debounce(() => {
      renderChanges();
      renderAnalysis();
    }, 300)
  );

  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      run();
    } else if (e.key === 'Escape') {
      if (state.busy && state.abort) state.abort.abort();
      if (!el.sampleMenu.hidden) closeSampleMenu();
    }
  });

  // eksempler
  function closeSampleMenu() {
    el.sampleMenu.hidden = true;
    el.sampleBtn.setAttribute('aria-expanded', 'false');
  }
  el.sampleBtn.addEventListener('click', () => {
    const open = el.sampleMenu.hidden;
    el.sampleMenu.hidden = !open;
    el.sampleBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
    if (open) el.sampleMenu.querySelector('button').focus();
  });
  document.addEventListener('click', (e) => {
    if (!el.sampleMenu.hidden && !e.target.closest('.menu-wrap')) closeSampleMenu();
  });
  function loadSample(code) {
    el.input.value = SAMPLES[code];
    closeSampleMenu();
    saveDraft();
    state.seed = 1;
    if (state.settings.mode === 'rules') runRules();
    else {
      el.output.value = '';
      state.last = null;
      renderAll();
    }
  }
  $('sampleDa').addEventListener('click', () => loadSample('da'));
  $('sampleEn').addEventListener('click', () => loadSample('en'));

  $('clearBtn').addEventListener('click', () => {
    el.input.value = '';
    el.output.value = '';
    state.last = null;
    store.set('draft', '');
    setStatus('');
    renderAll();
    el.input.focus();
  });

  // filer
  function readFile(file) {
    if (!file) return;
    if (file.size > 2 * 1024 * 1024 || !/(?:text|markdown)|\.(?:txt|md|markdown)$/i.test(file.type + ' ' + file.name)) {
      toast(t('fileError'));
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      el.input.value = String(reader.result || '');
      saveDraft();
      if (state.settings.mode === 'rules') runRules();
      else renderAll();
    };
    reader.onerror = () => toast(t('fileError'));
    reader.readAsText(file);
  }
  el.fileInput.addEventListener('change', () => {
    readFile(el.fileInput.files[0]);
    el.fileInput.value = '';
  });
  ['dragenter', 'dragover'].forEach((ev) =>
    el.dropZone.addEventListener(ev, (e) => {
      if (!e.dataTransfer || !Array.from(e.dataTransfer.types || []).includes('Files')) return;
      e.preventDefault();
      el.dropZone.classList.add('is-over');
    })
  );
  ['dragleave', 'drop'].forEach((ev) => el.dropZone.addEventListener(ev, () => el.dropZone.classList.remove('is-over')));
  el.dropZone.addEventListener('drop', (e) => {
    if (!e.dataTransfer || !e.dataTransfer.files.length) return;
    e.preventDefault();
    readFile(e.dataTransfer.files[0]);
  });

  // resultat-knapper
  $('copyBtn').addEventListener('click', () => {
    const text = el.output.value;
    if (!text) return;
    const fallback = () => {
      switchTab('result');
      el.output.focus();
      el.output.select();
      toast(t('copyFailed'));
    };
    try {
      navigator.clipboard.writeText(text).then(() => toast(t('copied')), fallback);
    } catch (e) {
      fallback();
    }
  });

  $('downloadBtn').addEventListener('click', () => {
    const text = el.output.value;
    if (!text) return;
    const url = URL.createObjectURL(new Blob([text], { type: 'text/plain;charset=utf-8' }));
    const a = h('a', { href: url, download: 'cutie-tekst.txt' });
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  });

  $('rerollBtn').addEventListener('click', () => {
    state.seed = (state.seed % 9973) + 1;
    run();
  });

  $('useBtn').addEventListener('click', () => {
    if (!el.output.value) return;
    el.input.value = el.output.value;
    saveDraft();
    if (state.settings.mode === 'rules') runRules();
    else {
      state.last = null;
      el.output.value = '';
      renderAll();
    }
    el.input.focus();
  });

  // ---------- start ----------
  I.setLang(state.uiLang);
  buildCats();
  syncControls();
  setUiLang(state.uiLang);
  const draft = store.get('draft', null);
  el.input.value = draft && draft.trim() ? draft : SAMPLES[state.uiLang] || SAMPLES.da;
  if (state.settings.mode === 'rules') runRules();
  else renderAll();
})();
