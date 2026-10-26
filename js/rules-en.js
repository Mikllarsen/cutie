/*
 * Engelske regler.
 *
 * Felter: p = mønster (mellemrum matcher ethvert whitespace), r = erstatning
 * (tekst, liste at vælge fra, objekt pr. tone eller funktion), lvl = 1 let / 2 medium / 3 kraftig,
 * cat = kategori, start = kun i starten af en sætning, tones = kun disse toner.
 */
(function (root) {
  'use strict';
  const R = (root.HumanizerRules = root.HumanizerRules || {});

  R.en = function (h) {
    // verb med bøjninger: verb('utili[sz]', { e: 'use', es: 'uses', ... })
    const verb = (stem, map, extra) =>
      Object.assign(
        {
          p: stem + '(' + Object.keys(map).sort((a, b) => b.length - a.length).join('|') + ')',
          r: (ctx, m, g) => map[g[0].toLowerCase()],
          cat: 'vocab',
          lvl: 2,
        },
        extra
      );

    // adjektiv med a/an-tilpasning: adj('robust', ['solid', 'strong'])
    const adj = (word, reps, extra) =>
      Object.assign(
        {
          p: '(?:(an?) )?(?:' + word + ')',
          r: (ctx, m, g) => {
            const rep = Array.isArray(reps) ? ctx.pick(reps) : reps;
            return h.article(g[0], rep) + rep;
          },
          cat: 'vocab',
          lvl: 2,
        },
        extra
      );

    const S = "(?:'s|’s| is)"; // it's / it is
    // ord der viser at "is"/"will" står sidst i en ledsætning ("I know who he is and ...")
    const CLAUSE_END = new Set(['and', 'or', 'but', 'because', 'so', 'if', 'when', 'then', 'too', 'now', 'today', 'anyway', 'though', 'that', 'which', 'who', 'why', 'how', 'what', 'where', 'while', 'until', 'unless', 'since', 'as']);
    const LANDSCAPES = 'world|age|era|landscape|society|environment|climate|economy|marketplace|business landscape';

    const rules = [
      // ---------- chatbot-floskler ----------
      { cat: 'chatbot', start: true, p: "(?:certainly|absolutely|of course|sure thing|sure|great question|what a great question|excellent question|good question|that(?:'s|’s| is) a great question)[!.,]", r: '' },
      { cat: 'chatbot', textStart: true, p: "(?:here(?:'s|’s| is) (?:a|an|the|your) (?:revised|rewritten|improved|updated|polished|refined) (?:version|text|draft)[^:\\n]*:)", r: '' },
      { cat: 'chatbot', p: "i hope (?:this|that|it|these) (?:helps|help|was helpful|is helpful|clarifies things|makes sense|gives you[^.!?\\n]*)(?: you)?(?: out)?[.!]?", r: '' },
      { cat: 'chatbot', p: "(?:please )?(?:feel free|don(?:'|’)t hesitate|do not hesitate) to (?:reach out|ask|contact|let me know|get in touch|share|drop)[^.!?\\n]*[.!?]", r: '' },
      { cat: 'chatbot', p: "let me know if (?:you (?:have|need|want|would like|'d like|’d like)|there(?:'s|’s| is)|anything)[^.!?\\n]*[.!?]", r: '' },
      { cat: 'chatbot', p: '(?:if you have|should you have) any (?:other |further |more |additional )?questions[^.!?\\n]*[.!?]', r: '' },
      { cat: 'chatbot', p: 'as an ai(?: language model| assistant| model)?,? [^.!?\\n]*[.!?]', r: '' },
      { cat: 'chatbot', p: "i(?:'m|’m| am) (?:happy|glad) to help[^.!?\\n]*[.!?]", r: '' },
      { cat: 'chatbot', p: "(?:let(?:'s|’s| us) (?:dive|delve|jump) (?:right )?in(?:to it)?|without further ado)[.!,:]?", r: '' },
      { cat: 'chatbot', p: 'happy (?:writing|coding|learning|reading)[!.]', r: '' },

      // ---------- AI-klichéer ----------
      { cat: 'cliche', p: "in today(?:'s|’s) (?:(?:fast-paced|digital|modern|ever-changing|ever-evolving|rapidly changing|rapidly evolving|interconnected|competitive|data-driven|tech-driven|hyper-connected|busy|complex|global),? ){1,2}(?:" + LANDSCAPES + '),?', r: { casual: ['These days,', 'Nowadays,', ''], neutral: ['Today,', 'These days,', ''], professional: ['Today,'] } },
      { cat: 'cliche', p: 'in (?:this|the) (?:day and age|modern era|digital age|digital era),?', r: { casual: ['These days,', 'Nowadays,'], neutral: ['Today,', 'These days,'], professional: ['Today,'] } },
      { cat: 'cliche', p: 'in an (?:era|age|world) where', r: 'now that' },
      { cat: 'cliche', p: 'an (?:integral|essential|indispensable|inseparable) part of', r: ['a key part of', 'a big part of'] },
      { cat: 'cliche', p: 'it' + S + ' (?:important|crucial|essential|vital|key|interesting|worth) (?:to )?(?:note|noting|remember|mention|mentioning|understand|recognize|recognise|keep in mind|point out|pointing out|highlight|highlighting|emphasize|emphasise|stress|consider) that,?', r: '' },
      { cat: 'cliche', p: 'it' + S + ' worth (?:noting|mentioning|pointing out),', r: '' },
      { cat: 'cliche', p: 'it (?:should|must) be (?:noted|mentioned|emphasized|emphasised|stressed|said|pointed out) that,?', r: '' },
      { cat: 'cliche', p: 'it (?:can|could) be argued that', r: 'arguably,' },
      { cat: 'cliche', start: true, p: "(?:needless to say|it goes without saying(?: that)?|it(?:'s|’s| is) no secret that),?", r: '' },
      { cat: 'cliche', start: true, p: '(?:notably|importantly|more importantly|interestingly(?: enough)?|crucially|significantly|indeed),', r: '' },
      { cat: 'chatbot', start: true, p: "(?:i can|i(?:'d|’d| would) be (?:happy|glad) to|i(?:'m|’m| am) (?:happy|glad) to) help(?: you)?(?: with (?:that|this))?[.!]", r: '' },
      { cat: 'cliche', p: '(?:a |the )?(?:rich |vibrant |intricate |complex |colorful |colourful )?tapestry of', r: ['a mix of', 'a blend of'] },
      { cat: 'cliche', p: '(?:stands|serves) as a (?:testament|tribute) to', r: 'shows' },
      { cat: 'cliche', p: '(?:stand|serve) as a (?:testament|tribute) to', r: 'show' },
      { cat: 'cliche', p: 'is a (?:testament|tribute) to', r: ['shows', 'proves'] },
      { cat: 'cliche', p: 'was a (?:testament|tribute) to', r: ['showed', 'proved'] },
      { cat: 'cliche', p: '(?:a )?testament to', r: 'proof of' },
      { cat: 'cliche', p: 'serves as a (?:stark |powerful |gentle )?reminder (that|of)', r: (ctx, m, g) => 'reminds us ' + g[0].toLowerCase() },
      { cat: 'cliche', p: '(plays|play|played|playing) an? (?:crucial|vital|pivotal|key|significant|important|critical|central|major|instrumental|integral|essential) role in', r: (ctx, m, g) => g[0].toLowerCase() + ' a big part in' },
      { cat: 'cliche', p: 'delve(?:s)? (?:deeper )?into', r: (ctx, m) => (/^delves/i.test(m) ? ctx.pick(['digs into', 'looks at', 'gets into']) : ctx.pick(['dig into', 'look at', 'get into'])) },
      { cat: 'cliche', p: 'delved (?:deeper )?into', r: ['dug into', 'looked at'] },
      { cat: 'cliche', p: 'delving (?:deeper )?into', r: ['digging into', 'looking at'] },
      { cat: 'cliche', p: 'delve deeper', r: 'dig deeper' },
      { cat: 'cliche', p: 'a deep dive into', r: 'a close look at' },
      { cat: 'cliche', p: '(?:dive|diving|dives) deep(?:ly)? into', r: (ctx, m) => (/^diving/i.test(m) ? 'looking closely at' : /^dives/i.test(m) ? 'looks closely at' : 'look closely at') },
      { cat: 'cliche', lvl: 2, p: '(dive|dives|diving) into', r: (ctx, m, g) => ({ dive: 'get into', dives: 'gets into', diving: 'getting into' })[g[0].toLowerCase()] },
      { cat: 'cliche', p: 'embark(s|ed|ing)? on an? (?:\\p{L}+ )?(?:journey|quest|adventure) to', r: (ctx, m, g) => ({ '': 'set out to', s: 'sets out to', ed: 'set out to', ing: 'setting out to' })[(g[0] || '').toLowerCase()] },
      { cat: 'cliche', p: 'embark(s|ed|ing)? on (?:an?|the|this|your|our|their) (?:\\p{L}+ )?(?:journey|quest|adventure)(?: of| into| through| towards?)?', r: (ctx, m, g) => ({ '': 'start', s: 'starts', ed: 'started', ing: 'starting' })[(g[0] || '').toLowerCase()] + (/(of|into|through|towards?)$/i.test(m) ? ' exploring' : '') },
      { cat: 'cliche', p: '(navigate|navigates|navigated|navigating) (?:the |these |those )?(?:complexities|intricacies|challenges|nuances|maze|ins and outs|waters) of', r: (ctx, m, g) => ({ navigate: 'deal with', navigates: 'deals with', navigated: 'dealt with', navigating: 'dealing with' })[g[0].toLowerCase()] },
      { cat: 'cliche', p: '(unlock|unlocks|unlocked|unlocking) (?:the |its |your |their |our )?(?:full |true )?potential of', r: (ctx, m, g) => ({ unlock: 'get the most out of', unlocks: 'gets the most out of', unlocked: 'got the most out of', unlocking: 'getting the most out of' })[g[0].toLowerCase()] },
      { cat: 'cliche', p: '(harness|harnesses|harnessed|harnessing) the (?:full )?(?:power|potential) of', r: (ctx, m, g) => ({ harness: 'use', harnesses: 'uses', harnessed: 'used', harnessing: 'using' })[g[0].toLowerCase()] },
      { cat: 'cliche', p: '(?:the )?ever[- ](?:evolving|changing) (?:landscape|world|field|realm|nature) of', r: 'the world of' },
      { cat: 'cliche', p: 'ever[- ](?:evolving|changing)', r: ['changing', 'fast-moving'] },
      { cat: 'cliche', p: 'ever[- ](?:growing|increasing)', r: 'growing' },
      { cat: 'cliche', p: 'the (digital|tech|technology|technological|business|marketing|AI|media|education|healthcare) landscape', r: (ctx, m, g) => 'the ' + g[0] + ' world' },
      { cat: 'cliche', p: 'in the (?:realm|world|sphere|domain) of', r: 'in', lvl: 2 },
      { cat: 'cliche', p: 'game[- ]changer', r: { casual: ['big deal'], neutral: ['big deal', 'big step forward'], professional: ['major step forward'] } },
      { cat: 'cliche', p: 'game[- ]changing', r: ['huge', 'major'] },
      { cat: 'cliche', p: 'paradigm shift', r: 'big change' },
      { cat: 'cliche', p: 'to the next level', r: 'further' },
      { cat: 'cliche', p: '(pave|paves|paved|paving) the way (?:for|to)', r: (ctx, m, g) => ({ pave: 'open the door to', paves: 'opens the door to', paved: 'opened the door to', paving: 'opening the door to' })[g[0].toLowerCase()] },
      { cat: 'cliche', p: '(?:a|the) (?:shining )?beacon of', r: 'a symbol of' },
      { cat: 'cliche', p: '(?:a|the) (?:symphony|kaleidoscope|melting pot) of', r: 'a mix of' },
      { cat: 'cliche', p: 'treasure trove', r: 'goldmine' },
      { cat: 'cliche', p: 'labyrinth(?:ine)?', r: (ctx, m) => (/ine$/i.test(m) ? 'maze-like' : 'maze') },
      { cat: 'cliche', p: 'of the utmost importance', r: 'very important' },
      { cat: 'cliche', p: 'at the forefront of', r: 'leading' },
      { cat: 'cliche', p: 'a (?:pivotal|crucial|critical|key) (?:moment|turning point)', r: 'a turning point' },
      { cat: 'cliche', p: 'stands? the test of time', r: (ctx, m) => (/^stands/i.test(m) ? 'lasts' : 'last') },
      { cat: 'cliche', p: 'whether you(?:\'re|’re| are) a (?:seasoned|experienced) (?:\\p{L}+ )?or (?:a |just )?(?:beginner|newcomer|novice|starting out|new to[^,.\\n]*)', r: 'whatever your level' },
      { cat: 'cliche', p: '(?:seamless(?:ly)?)', r: (ctx, m) => (/ly$/i.test(m) ? 'smoothly' : 'smooth') },
      { cat: 'cliche', p: 'cutting[- ]edge', r: ['modern', 'advanced', 'new'] },
      { cat: 'cliche', p: 'state[- ]of[- ]the[- ]art', r: ['modern', 'up-to-date'] },
      adj('pivotal', 'key', { cat: 'cliche', lvl: 1 }),
      adj('groundbreaking|revolutionary', ['new', 'major'], { cat: 'cliche' }),
      adj('transformative', ['major', 'big'], { cat: 'cliche' }),
      adj('unparalleled|unprecedented', ['unmatched', 'rare'], { cat: 'cliche' }),
      adj('holistic', 'well-rounded', { cat: 'cliche' }),
      adj('vibrant', 'lively', { cat: 'cliche' }),
      adj('bustling', 'busy', { cat: 'cliche' }),
      adj('meticulous', 'careful', { cat: 'cliche' }),
      { cat: 'cliche', lvl: 2, p: 'meticulously', r: 'carefully' },
      adj('intricate', ['detailed', 'complex'], { cat: 'cliche' }),
      { cat: 'cliche', lvl: 2, p: 'synerg(?:y|ies)', r: 'teamwork' },
      { cat: 'cliche', lvl: 2, p: 'of paramount importance', r: 'very important' },
      { cat: 'cliche', lvl: 2, p: '(is|are) paramount', r: (ctx, m, g) => (g[0].toLowerCase() === 'is' ? 'matters most' : 'matter most') },

      // ---------- fyld & omsvøb ----------
      { cat: 'filler', p: 'in order to', r: 'to' },
      { cat: 'filler', p: '(?:due|owing) to the fact that', r: 'because' },
      { cat: 'filler', p: 'in light of the fact that', r: 'since' },
      { cat: 'filler', p: '(?:despite|in spite of) the fact that', r: 'even though' },
      { cat: 'filler', p: 'given the fact that', r: 'given that' },
      { cat: 'filler', p: 'at this point in time|at the present (?:time|moment)', r: 'now' },
      { cat: 'filler', p: 'in the near future', r: 'soon' },
      { cat: 'filler', p: 'in the event that', r: 'if' },
      { cat: 'filler', p: 'for the purpose of', r: 'for' },
      { cat: 'filler', p: '(?:has|have) the (?:ability|capacity) to', r: (ctx) => (/^(?:will|would|should|could|may|might|must|to|not)$/.test(ctx.prevWord) ? 'be able to' : 'can') },
      { cat: 'filler', lvl: 2, p: '(?:is|are) able to', r: 'can' },
      { cat: 'filler', p: 'prior to', r: 'before' },
      { cat: 'filler', p: 'subsequent to', r: 'after' },
      { cat: 'filler', p: 'each and every', r: 'every' },
      { cat: 'filler', p: 'first and foremost', r: 'first' },
      { cat: 'filler', p: 'last but not least', r: 'finally' },
      { cat: 'filler', p: 'a (?:large|great|significant|substantial|considerable|vast|huge) (number|amount|quantity) of', r: (ctx, m, g) => (ctx.tone === 'professional' ? (g[0].toLowerCase() === 'number' ? 'many' : 'a lot of') : ctx.pick(['a lot of', 'lots of'])) },
      { cat: 'filler', p: 'the (?:vast )?majority of', r: 'most' },
      { cat: 'filler', p: 'a (?:wide|broad|diverse|vast|whole) (?:range|array|variety|spectrum|selection|host) of', r: { casual: ['all kinds of', 'lots of'], neutral: ['many different', 'all kinds of', 'lots of'], professional: ['many', 'many different'] } },
      { cat: 'filler', p: 'a (?:myriad|plethora|multitude|wealth|slew) of', r: { casual: ['lots of', 'plenty of', 'tons of'], neutral: ['lots of', 'plenty of', 'many'], professional: ['many', 'plenty of'] } },
      { cat: 'filler', lvl: 2, p: 'myriad', r: 'countless' },
      { cat: 'filler', lvl: 2, p: 'when it comes to', r: ['with', 'for'] },
      { cat: 'filler', p: 'on a (daily|weekly|monthly|yearly|regular|consistent) basis', r: (ctx, m, g) => ({ daily: 'daily', weekly: 'weekly', monthly: 'monthly', yearly: 'every year', regular: 'regularly', consistent: 'consistently' })[g[0].toLowerCase()] },
      {
        cat: 'filler',
        p: 'in an? (\\p{L}+) (?:manner|fashion)',
        r: (ctx, m, g) => {
          const a = g[0].toLowerCase();
          if (a === 'timely') return 'promptly';
          if (/(?:ly|ing|ed)$/.test(a) || a === 'similar' || a === 'same') return null;
          if (/ic$/.test(a)) return a + 'ally';
          if (/le$/.test(a)) return a.slice(0, -1) + 'y';
          if (/y$/.test(a)) return a.slice(0, -1) + 'ily';
          return a + 'ly';
        },
      },
      { cat: 'filler', lvl: 2, p: '(?:very|extremely|highly|incredibly|truly|really) unique', r: 'unique' },
      { cat: 'filler', lvl: 2, p: '(?:with|in) (?:regards?|respect|relation) to|pertaining to', r: 'about' },
      { cat: 'filler', lvl: 3, p: 'regarding', r: 'about' },
      { cat: 'filler', lvl: 2, p: '(ensure|ensures|ensured|ensuring) that', r: (ctx, m, g) => ({ ensure: 'make sure', ensures: 'makes sure', ensured: 'made sure', ensuring: 'making sure' })[g[0].toLowerCase()] },

      // ---------- overgangsord i sætningsstart ----------
      { cat: 'transition', start: true, p: '(?:furthermore|moreover),?', r: { casual: ['Also,', 'Plus,', 'On top of that,', ''], neutral: ['Also,', "What's more,", ''], professional: ['Also,', 'In addition,'] } },
      { cat: 'transition', start: true, p: 'additionally,?', r: { casual: ['Also,', 'Plus,', ''], neutral: ['Also,', ''], professional: ['Also,', 'In addition,'] } },
      { cat: 'transition', start: true, lvl: 2, p: 'in addition,', r: { casual: ['Also,', 'Plus,'], neutral: ['Also,'], professional: ['In addition,'] } },
      { cat: 'transition', start: true, lvl: 2, p: 'however,', r: { casual: ['But'], neutral: ['But', 'But', 'Still,'], professional: ['However,'] } },
      { cat: 'transition', start: true, lvl: 2, p: 'therefore,', r: { casual: ['So'], neutral: ['So', "That's why"], professional: ['Therefore,'] } },
      { cat: 'transition', start: true, lvl: 2, p: '(?:consequently|as a result|thus|hence),', r: { casual: ['So'], neutral: ['So', 'As a result,'], professional: ['As a result,'] } },
      { cat: 'transition', start: true, lvl: 2, p: '(?:nevertheless|nonetheless),', r: ['Still,', 'Even so,'] },
      { cat: 'transition', start: true, lvl: 2, p: 'ultimately,', r: { casual: ['In the end,', ''], neutral: ['In the end,', ''], professional: ['In the end,'] } },
      { cat: 'transition', start: true, lvl: 2, p: '(?:essentially|in essence),', r: { casual: ['Basically,', 'In short,'], neutral: ['In short,', ''], professional: ['In short,'] } },
      { cat: 'transition', start: true, p: '(?:in conclusion|to conclude|in summary|to summarize|to summarise|to sum up|in closing),', r: { casual: ['So,', 'Bottom line:', 'All in all,'], neutral: ['In short,', 'All in all,', 'So,'], professional: ['In short,', 'Overall,'] } },
      { cat: 'transition', start: true, lvl: 2, p: 'firstly,', r: 'First,' },
      { cat: 'transition', start: true, lvl: 2, p: 'secondly,', r: 'Second,' },
      { cat: 'transition', start: true, lvl: 2, p: 'thirdly,', r: 'Third,' },
      { cat: 'transition', start: true, lvl: 2, p: 'lastly,', r: 'Finally,' },
      { cat: 'transition', start: true, lvl: 2, p: '(?:that being said|with that (?:being )?said|having said that),', r: { casual: ['Still,', 'That said,'], neutral: ['That said,', 'Still,'], professional: ['That said,'] } },
      { cat: 'transition', start: true, lvl: 2, p: 'subsequently,', r: ['Then', 'After that,'] },

      // ---------- formelle ord -> almindelige ord ----------
      verb('utili[sz]', { e: 'use', es: 'uses', ed: 'used', ing: 'using', ation: 'use' }, { lvl: 1 }),
      verb('leverag', { es: 'uses', ed: 'used', ing: 'using' }),
      { cat: 'vocab', lvl: 2, p: "(?<=(?:to|can|could|will|would|should|must|we|you|they|I|and|or|let(?:'|’)s|help|helps) )leverage(?= \\p{L})", r: 'use' },
      verb('facilitat', { e: 'support', es: 'supports', ed: 'supported', ing: 'supporting' }),
      verb('commenc', { e: 'start', es: 'starts', ed: 'started', ing: 'starting' }),
      verb('bolster', { '': 'boost', s: 'boosts', ed: 'boosted', ing: 'boosting' }),
      verb('spearhead', { '': 'lead', s: 'leads', ed: 'led', ing: 'leading' }),
      verb('garner', { '': 'earn', s: 'earns', ed: 'earned', ing: 'earning' }),
      verb('elucidat', { e: 'explain', es: 'explains', ed: 'explained', ing: 'explaining' }),
      verb('resonat', { e: 'connect', es: 'connects', ed: 'connected', ing: 'connecting' }, { p: 'resonat(es|ed|ing|e)(?= with)' }),
      adj('commendable', 'impressive'),
      adj('noteworthy', 'notable'),
      adj('captivating|enthralling', 'gripping'),
      adj('unwavering', 'steady'),
      adj('bespoke', 'custom'),
      { cat: 'vocab', lvl: 2, p: '(endeavou?r|endeavou?rs) to', r: (ctx, m, g) => (/s$/i.test(g[0]) ? 'tries to' : 'try to') },
      { cat: 'vocab', lvl: 3, p: 'endeavou?rs?', r: (ctx, m) => (/s$/i.test(m) ? 'efforts' : 'effort') },
      verb('ascertain', { '': 'find out', s: 'finds out', ed: 'found out', ing: 'finding out' }),
      { cat: 'vocab', lvl: 2, p: 'approximately', r: { casual: ['about', 'around'], neutral: ['about', 'around'], professional: ['about'] } },
      { cat: 'vocab', lvl: 2, p: 'numerous', r: 'many' },
      { cat: 'vocab', lvl: 2, p: 'individuals', r: 'people' },
      { cat: 'vocab', lvl: 2, p: 'sufficient', r: 'enough' },
      adj('additional', 'extra'),
      adj('optimal', 'ideal'),
      adj('robust', ['solid', 'strong', 'sturdy']),
      adj('comprehensive', ['complete', 'thorough', 'full']),
      adj('crucial', ['key', 'important']),
      adj('paramount', 'top'),
      adj('innovative', ['fresh', 'new', 'clever']),
      adj('nuanced', 'subtle', { lvl: 3 }),
      { cat: 'vocab', lvl: 2, p: 'subsequently', r: ['later', 'then'] },
      verb('demonstrat', { e: 'show', es: 'shows', ing: 'showing' }, { lvl: 3 }),
      { cat: 'vocab', lvl: 3, p: 'demonstrated', r: (ctx) => (/^(?:has|have|had|been|was|were|is|are|be)$/.test(ctx.prevWord) ? 'shown' : 'showed') },
      verb('revolutioni[sz]', { e: 'change', es: 'changes', ed: 'changed', ing: 'changing' }),
      verb('streamlin', { e: 'simplify', es: 'simplifies', ed: 'simplified', ing: 'simplifying' }),
      verb('showcas', { es: 'shows', ed: 'showed', ing: 'showing' }),
      { cat: 'vocab', lvl: 2, p: 'showcase', r: (ctx) => (/^(?:a|the|this|our|your|their)$/.test(ctx.prevWord) ? null : 'show') },
      verb('underscor', { e: 'highlight', es: 'highlights', ed: 'highlighted', ing: 'highlighting' }),
      { cat: 'vocab', lvl: 2, p: '(foster|fosters|fostered|fostering)', r: (ctx, m, g) => (/^(?:parents?|care|child|children|home|homes|family|families|mother|father|kids?|carers?|dog|cat|pets?)$/.test(ctx.nextWord) ? null : { foster: 'build', fosters: 'builds', fostered: 'built', fostering: 'building' }[g[0].toLowerCase()]) },
      verb('elevat', { e: 'lift', es: 'lifts', ing: 'lifting' }),
      { cat: 'vocab', lvl: 2, p: '(empower|empowers|empowered|empowering) (\\p{L}+) to', r: (ctx, m, g) => ({ empower: 'help', empowers: 'helps', empowered: 'helped', empowering: 'helping' })[g[0].toLowerCase()] + ' ' + g[1] },
      { cat: 'vocab', lvl: 2, p: '(boast|boasts|boasted|boasting)', r: (ctx, m, g) => (/^(?:about|of|that|to)$/.test(ctx.nextWord) ? null : { boast: 'have', boasts: 'has', boasted: 'had', boasting: 'having' }[g[0].toLowerCase()]) },
      verb('optimi[sz]', { e: 'improve', es: 'improves', ed: 'improved', ing: 'improving' }, { lvl: 3 }),
      verb('obtain', { '': 'get', s: 'gets', ing: 'getting' }, { lvl: 3 }),
      { cat: 'vocab', lvl: 3, tones: ['casual', 'neutral'], p: '(purchase|purchases|purchased|purchasing)', r: (ctx, m, g) => (/^(?:a|the|each|every|first|this|that|your|our|their|any|no|of|my)$/.test(ctx.prevWord) ? null : { purchase: 'buy', purchases: 'buys', purchased: 'bought', purchasing: 'buying' }[g[0].toLowerCase()]) },
      { cat: 'vocab', lvl: 3, p: '(require|requires)(?= (?:a|an|the|some|more|less|you|us|them|it|this|time|money|\\p{L}+ing))', r: (ctx, m, g) => (g[0].toLowerCase() === 'require' ? 'need' : 'needs') },
      { cat: 'vocab', lvl: 3, p: '(assist|assists|assisted|assisting)', r: (ctx, m, g) => (/^(?:an|the|with)$/.test(ctx.prevWord) ? null : { assist: 'help', assists: 'helps', assisted: 'helped', assisting: 'helping' }[g[0].toLowerCase()]) },
      { cat: 'vocab', lvl: 2, p: 'the realm of', r: 'the world of' },
      { cat: 'vocab', lvl: 2, p: 'realms?', r: (ctx, m) => (/s$/i.test(m) ? 'areas' : 'area') },
      { cat: 'vocab', lvl: 3, p: '(serves|served) as(?! a reminder)', r: (ctx, m, g) => (g[0].toLowerCase() === 'serves' ? 'is' : 'was') },

      // ---------- sammentrækninger ----------
      ...[
        ['do not', "don't"], ['does not', "doesn't"], ['did not', "didn't"], ['is not', "isn't"], ['are not', "aren't"],
        ['was not', "wasn't"], ['were not', "weren't"], ['has not', "hasn't"], ['have not', "haven't"], ['had not', "hadn't"],
        ['will not', "won't"], ['would not', "wouldn't"], ['should not', "shouldn't"], ['could not', "couldn't"], ['cannot', "can't"], ['can not', "can't"],
      ].map(([a, b]) => ({ cat: 'contraction', lvl: 2, p: a, r: b, flag: false, contraction: true })),
      ...[
        ['I am', "I'm"], ['you are', "you're"], ['we are', "we're"], ['they are', "they're"], ['he is', "he's"], ['she is', "she's"],
        ['it is', "it's"], ['that is', "that's"], ['there is', "there's"], ['here is', "here's"], ['what is', "what's"], ['who is', "who's"], ['where is', "where's"],
        ['I will', "I'll"], ['you will', "you'll"], ['we will', "we'll"], ['they will', "they'll"],
      ].map(([a, b]) => ({ cat: 'contraction', lvl: 2, tones: ['casual', 'neutral'], p: a + '(?=\\s+[\\p{L}\\p{N}"“‘])', r: (ctx) => (CLAUSE_END.has(ctx.nextWord) ? null : ctx.q(b)), flag: false, contraction: true })),
      ...[
        ['it will', "it'll"], ['that will', "that'll"], ['I would', "I'd"], ['we would', "we'd"], ['you would', "you'd"], ['they would', "they'd"],
      ].map(([a, b]) => ({ cat: 'contraction', lvl: 2, tones: ['casual'], p: a + '(?=\\s+[\\p{L}])', r: (ctx) => (CLAUSE_END.has(ctx.nextWord) ? null : ctx.q(b)), flag: false, contraction: true })),
      ...['I', 'you', 'we', 'they'].map((pr) => ({
        cat: 'contraction',
        lvl: 2,
        tones: ['casual', 'neutral'],
        p: pr + ' have(?= (?:been|got|never|always|already|just|ever|seen|done|had|made|tried|found|heard|read|written|learned|learnt|noticed|used|worked|spent|built|created|decided|started|finished|known|met|lost|won|chosen|taken|given|gone|become|felt|thought|said|told|asked|wanted|needed|loved|missed|kept|left|put|run|seen|shown|grown)\\b)',
        r: pr + "'ve",
        flag: false,
        contraction: true,
      })),
      { cat: 'contraction', lvl: 2, tones: ['casual', 'neutral'], p: 'let us(?= (?:begin|start|look|explore|consider|take|see|dive|turn|move|talk|get|go|break|review|walk|focus|examine|discuss|compare|imagine|say|try|recap|unpack)\\b)', r: "let's", flag: false, contraction: true },

      // ---------- tegnsætning ----------
      { cat: 'punct', word: false, p: '(?<=[\\p{L}\\p{N}%)"”’\\uE001])[\\t\\x20]*[—―][\\t\\x20]*(?=[\\p{L}\\p{N}"“(\\uE000])', r: ', ', keepCase: true },
      { cat: 'punct', word: false, p: '(?<=[\\p{L}\\p{N}%)"”’])[\\t\\x20]+--[\\t\\x20]+(?=[\\p{L}\\p{N}"“(])', r: ', ', keepCase: true },
      { cat: 'punct', word: false, lvl: 2, p: '(?<=[\\p{L}%)"”’])[\\t\\x20]+–[\\t\\x20]+(?=[\\p{L}"“(])', r: ', ', keepCase: true },
    ];

    return {
      rules,
      rhythm: {
        conjunctions: ['and', 'but', 'so', 'yet'],
        subjects: ['i', 'we', 'you', 'he', 'she', 'it', 'they', 'this', 'these', 'those', 'there', 'the', 'a', 'an', 'my', 'our', 'your', 'his', 'her', 'their', 'its', 'many', 'most', 'some', 'all', 'each', 'every', 'no', 'one', 'people', 'everyone', 'nobody', 'someone', 'something', 'nothing', 'everything', "it's", 'it’s', "that's", 'that’s', "there's", 'there’s', "we're", 'we’re', "they're", 'they’re', "you're", 'you’re', "i'm", 'i’m'],
        leads: {
          and: { casual: ['', 'And '], neutral: ['', '', 'And '], professional: '' },
          but: { casual: 'But ', neutral: 'But ', professional: 'However, ' },
          so: { casual: 'So ', neutral: 'So ', professional: 'As a result, ' },
          yet: { casual: 'Still, ', neutral: 'Still, ', professional: 'Even so, ' },
        },
      },
      contractionRe: /\b\p{L}+['’](?:t|s|re|ve|ll|d|m)\b/giu,
    };
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = R.en;
})(typeof globalThis !== 'undefined' ? globalThis : this);
