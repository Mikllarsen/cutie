/*
 * Danske regler.
 *
 * Dansk har ledstilling (V2): når et biord står først, kommer udsagnsordet før
 * grundleddet ("Derudover er der ..."). Derfor fjerner reglerne aldrig blindt et
 * biord i sætningsstart, men bytter det med et andet biord, så ordstillingen holder.
 * Når en at-sætning bliver til en hovedsætning, flyttes "ikke"/"aldrig" osv. om bag
 * udsagnsordet ("at systemet ikke er" -> "Systemet er ikke").
 */
(function (root) {
  'use strict';
  const R = (root.HumanizerRules = root.HumanizerRules || {});

  R.da = function (h) {
    const FINITE_FIXED = ['er', 'var', 'har', 'havde', 'kan', 'kunne', 'vil', 'ville', 'skal', 'skulle', 'må', 'måtte', 'bør', 'burde', 'bliver', 'blev', 'gør', 'gjorde', 'får', 'fik', 'giver', 'gav', 'findes', 'fandtes', 'ved', 'går', 'gik', 'står', 'stod', 'ser', 'så', 'tager', 'tog', 'kommer', 'kom', 'sker', 'skete'];
    const FINITE = '(?:' + FINITE_FIXED.join('|') + '|\\p{L}{2,}(?:er|ede|te|es))';
    const SUB_ADV = '(?:heller ikke|ikke|aldrig|altid|også|kun|jo|nok|stadig|allerede|ofte|sjældent|virkelig|faktisk|bare|egentlig|netop|næsten|snart|endnu)';
    const ADVS = SUB_ADV + '(?: ' + SUB_ADV + ')?';
    const PRONOUNS = 'det|der|vi|jeg|du|man|de|han|hun|den|dette|disse|I';
    const MARK = '\u0002'; // motorens markør: gør næste bogstav stort
    // står der et biord i ledsætningen, som vi ikke kunne flytte? Så lader vi hellere sætningen være.
    const ADV_AHEAD = new RegExp('^\\s*(?:[\\p{L}-]+\\s+){0,5}?' + SUB_ADV + '(?![\\p{L}])', 'u');

    // at-sætning -> hovedsætning: "(prefix), at systemet ikke er hurtigt" -> lead + "Systemet er ikke hurtigt"
    const atClause = (prefix, lead, extra) =>
      Object.assign(
        {
          cat: 'cliche',
          start: true,
          p: prefix + ',? at(?: (\\p{L}+(?: \\p{L}+){0,2}?) (' + ADVS + ') (' + FINITE + ')(?![\\p{L}]))?',
          r: (ctx, m, g) => {
            const out = Array.isArray(lead) ? ctx.pick(lead) : lead;
            if (!g[0]) {
              if (ADV_AHEAD.test(ctx.str.slice(ctx.offset + m.length, ctx.offset + m.length + 80))) return null;
              return /:\s*$/.test(out) ? out + MARK : out;
            }
            const subj = g[0];
            const bad = subj.toLowerCase().split(/\s+/).some((w) => FINITE_FIXED.includes(w));
            const clause = bad ? subj + ' ' + g[1] + ' ' + g[2] : subj + ' ' + g[2] + ' ' + g[1];
            return out ? out + h.capFirst(clause) : h.capFirst(clause);
          },
        },
        extra
      );

    // ord med bøjninger: forms('anvend', { e: 'bruge', er: 'bruger', ... })
    const forms = (stem, map, extra) =>
      Object.assign(
        {
          p: stem + '(' + Object.keys(map).sort((a, b) => b.length - a.length).join('|') + ')',
          r: (ctx, m, g) => map[g[0].toLowerCase()],
          cat: 'vocab',
          lvl: 2,
        },
        extra
      );

    const VERB_NOUNS = {
      vurdering: ['vurdere', 'vurderer', 'vurderede', 'vurderet'],
      analyse: ['analysere', 'analyserer', 'analyserede', 'analyseret'],
      undersøgelse: ['undersøge', 'undersøger', 'undersøgte', 'undersøgt'],
      evaluering: ['evaluere', 'evaluerer', 'evaluerede', 'evalueret'],
      gennemgang: ['gennemgå', 'gennemgår', 'gennemgik', 'gennemgået'],
      opdatering: ['opdatere', 'opdaterer', 'opdaterede', 'opdateret'],
    };
    const TENSE = { foretage: 0, foretager: 1, foretog: 2, foretaget: 3 };

    const rules = [
      // ---------- chatbot-floskler ----------
      { cat: 'chatbot', start: true, p: '(?:selvfølgelig|absolut|helt sikkert|bestemt|klart|godt spørgsmål|sikke et godt spørgsmål|fremragende spørgsmål|det er et godt spørgsmål)[!.,]', r: '' },
      { cat: 'chatbot', textStart: true, p: '(?:her er (?:en|et|din|dit) (?:omskrevet|omskrevne|revideret|reviderede|forbedret|forbedrede|opdateret|opdaterede|finpudset|finpudsede) (?:version|tekst|udgave|udkast)[^:\\n]*:)', r: '' },
      { cat: 'chatbot', p: 'jeg håber,? (?:at )?(?:dette|det|denne|disse) (?:hjælper|var en hjælp|var nyttigt|var brugbart|giver mening|kan hjælpe|kan bruges|var til hjælp)(?: dig)?(?: videre)?[.!]?', r: '' },
      { cat: 'chatbot', p: 'du er (?:altid |meget )?velkommen til at (?:spørge|kontakte|skrive|række ud|vende tilbage)[^.!?\\n]*[.!?]', r: '' },
      { cat: 'chatbot', p: '(?:lad mig|giv mig) (?:endelig )?(?:vide|besked),? hvis[^.!?\\n]*[.!?]', r: '' },
      { cat: 'chatbot', p: 'sig (?:endelig )?til,? hvis[^.!?\\n]*[.!?]', r: '' },
      { cat: 'chatbot', p: '(?:hvis du har|har du) (?:flere|andre|yderligere) spørgsmål[^.!?\\n]*[.!?]', r: '' },
      { cat: 'chatbot', p: 'som (?:en )?ai(?:-sprogmodel| sprogmodel|-assistent| assistent)?,? [^.!?\\n]*[.!?]', r: '' },
      { cat: 'chatbot', start: true, p: 'jeg (?:hjælper gerne|vil (?:gerne|med glæde) hjælpe)(?: dig)?(?: med (?:det|dette))?[.!]', r: '' },
      { cat: 'chatbot', p: '(?:lad os (?:dykke|springe) (?:direkte )?ind i det|lad os komme i gang|uden videre)[.!,:]?', r: '' },

      // ---------- at-sætninger der bare er omsvøb ----------
      atClause('det (?:er|kan være) (?:vigtigt|værd|relevant|væsentligt|afgørende|interessant|nyttigt|centralt) at (?:bemærke|huske|nævne|understrege|påpege|fremhæve|notere sig|have for øje|holde sig for øje|forstå|være opmærksom på|pointere)', ''),
      atClause('det skal (?:dog |også )?(?:bemærkes|nævnes|understreges|påpeges|siges|fremhæves)', ''),
      atClause('det er (?:ingen hemmelighed|ikke nogen hemmelighed)', ''),
      atClause('det siger sig selv', ''),
      atClause('det kan ikke understreges nok', ''),
      atClause('(?:afslutningsvis|sammenfattende|samlet set|overordnet set) kan (?:det|man) (?:siges|konkluderes|sige|konkludere|slå fast|fastslå|fastslås)', 'Kort sagt: '),
      atClause('det kan (?:derfor |således )?(?:konkluderes|fastslås)', 'Kort sagt: '),
      // efter et forfeltsled ("I dag er det vigtigt at bemærke, at ...") skal udsagnsordet stå først
      {
        cat: 'cliche',
        p: '(?:er|kan) det (?:være )?(?:vigtigt|værd|relevant|væsentligt|afgørende|interessant|nyttigt|centralt) at (?:bemærke|huske|nævne|understrege|påpege|fremhæve|notere sig|have for øje|forstå|være opmærksom på|pointere),? at (\\p{L}+(?: \\p{L}+){0,2}?) (?:(' + ADVS + ') )?(' + FINITE + ')(?![\\p{L}])',
        r: (ctx, m, g) => {
          if (ctx.atStart) return null;
          if (g[0].toLowerCase().split(/\s+/).some((w) => FINITE_FIXED.includes(w))) return null;
          return g[2] + ' ' + g[0] + (g[1] ? ' ' + g[1] : '');
        },
      },

      // ---------- AI-klichéer ----------
      { cat: 'cliche', p: 'i (?:nutidens|dagens|vor tids|nutiden) (?:(?:hurtige|hurtigt skiftende|digitale|moderne|travle|konstant foranderlige|evigt foranderlige|globaliserede|komplekse|teknologiske|digitaliserede|datadrevne),? ){1,2}(?:verden|samfund|tidsalder|landskab|virkelighed|tid),?', r: { casual: ['I dag', 'Nu om dage'], neutral: ['I dag', 'Nu om dage'], professional: 'I dag' } },
      { cat: 'cliche', p: 'lad os dykke (?:lidt )?(?:dybere )?ned i', r: ['lad os kigge nærmere på', 'lad os se nærmere på'] },
      { cat: 'cliche', p: '(dykke|dykker|dykkede|dykket|dyk) (?:lidt )?(?:dybere )?ned i', r: (ctx, m, g) => ({ dykke: 'kigge nærmere på', dykker: 'kigger nærmere på', dykkede: 'kiggede nærmere på', dykket: 'kigget nærmere på', dyk: 'kig nærmere på' })[g[0].toLowerCase()] },
      { cat: 'cliche', p: '(?:tage|tager|tog) (?:et )?dybdegående kig på', r: (ctx, m) => (/^tog/i.test(m) ? 'så nærmere på' : /^tager/i.test(m) ? 'ser nærmere på' : 'se nærmere på') },
      { cat: 'cliche', p: '(?:en )?(?:rig |rigt |farverig |farverigt )?(?:mosaik|tapet|tapestry|væv) af', r: 'en blanding af' },
      { cat: 'cliche', p: '(?:et )?(?:levende )?vidnesbyrd om', r: 'et bevis på' },
      {
        cat: 'cliche',
        p: '(spiller|spillede|spille|spillet) (?:(\\p{L}+) )?en (?:(?:afgørende|central|vigtig|essentiel|væsentlig|altafgørende|betydelig|stor|helt central|nøgle) ?rolle|nøglerolle) (?:for|i|når det gælder)',
        r: (ctx, m, g) => {
          const v = { spiller: 'betyder', spillede: 'betød', spille: 'betyde', spillet: 'betydet' }[g[0].toLowerCase()];
          return v + (g[1] ? ' ' + g[1] : '') + ' meget for';
        },
      },
      { cat: 'cliche', p: 'er af (?:afgørende|essentiel|central|stor|altafgørende|væsentlig) betydning', r: 'betyder rigtig meget' },
      { cat: 'cliche', p: '(?:i|inden for) det (\\p{L}+e) landskab', r: (ctx, m, g) => 'i den ' + g[0] + ' verden' },
      { cat: 'cliche', p: 'det (\\p{L}+e) landskab', r: (ctx, m, g) => 'den ' + g[0] + ' verden' },
      { cat: 'cliche', p: '(frigøre|frigør|frigjorde|frigjort|udnytte|udnytter|udnyttede|udnyttet) (?:det |sit |dit |jeres |vores |deres )?(?:fulde |hele |sande )?potentiale(?:t)? (?:i|af|ved)', r: (ctx, m, g) => { const w = g[0].toLowerCase(); return /^(?:frigøre|udnytte)$/.test(w) ? 'få mest muligt ud af' : /^(?:frigør|udnytter)$/.test(w) ? 'får mest muligt ud af' : /^(?:frigjorde|udnyttede)$/.test(w) ? 'fik mest muligt ud af' : 'fået mest muligt ud af'; } },
      { cat: 'cliche', p: '(navigere|navigerer|navigerede|navigeret) (?:i|gennem|rundt i) (?:kompleksiteten|kompleksiteterne|udfordringerne|labyrinten|junglen|faldgruberne) (?:af|i|ved)', r: (ctx, m, g) => ({ navigere: 'håndtere', navigerer: 'håndterer', navigerede: 'håndterede', navigeret: 'håndteret' })[g[0].toLowerCase()] },
      { cat: 'cliche', p: '(begive|begiver|begav) sig ud på (?:en|denne|den|vores|din) (?:\\p{L}+ )?(?:rejse|opdagelsesrejse) (?:mod|ind i|gennem|i|til)', r: (ctx, m, g) => ({ begive: 'kaste sig ud i', begiver: 'kaster sig ud i', begav: 'kastede sig ud i' })[g[0].toLowerCase()] },
      { cat: 'cliche', p: 'en (?:sand |ægte |rigtig )?game[- ]?changer', r: ['et kæmpe skridt', 'et stort skridt frem'] },
      { cat: 'cliche', p: '(tage|tager|tog|taget) (\\p{L}+(?: \\p{L}+)?) til (?:nye højder|det næste niveau|næste niveau|et nyt niveau)', r: (ctx, m, g) => ({ tage: 'gøre', tager: 'gør', tog: 'gjorde', taget: 'gjort' })[g[0].toLowerCase()] + ' ' + g[1] + ' endnu bedre' },
      { cat: 'cliche', p: '(løfte|løfter|løftede|løftet) (\\p{L}+(?: \\p{L}+)?) til (?:nye højder|det næste niveau|et nyt niveau)', r: (ctx, m, g) => ({ løfte: 'forbedre', løfter: 'forbedrer', løftede: 'forbedrede', løftet: 'forbedret' })[g[0].toLowerCase()] + ' ' + g[1] },
      { cat: 'cliche', p: '(sømløs|sømløst|sømløse)', r: (ctx, m, g) => ({ sømløs: 'gnidningsfri', sømløst: 'gnidningsfrit', sømløse: 'gnidningsfrie' })[g[0].toLowerCase()] },
      { cat: 'cliche', lvl: 2, p: '(innovativ|innovativt|innovative)', r: 'nyskabende' },
      { cat: 'cliche', lvl: 2, p: '(holistisk|holistiske)', r: (ctx, m, g) => (/e$/i.test(g[0]) ? 'samlede' : 'samlet') },
      { cat: 'cliche', p: 'banebrydende|revolutionerende|state[- ]of[- ]the[- ]art|cutting[- ]edge', r: () => null },
      { cat: 'cliche', p: 'en (?:integreret|uadskillelig|uundværlig|essentiel) del af', r: ['en fast del af', 'en vigtig del af'] },
      { cat: 'cliche', p: 'et utal af', r: 'rigtig mange' },
      { cat: 'cliche', p: 'et væld af', r: 'masser af' },
      { cat: 'cliche', p: '(?:en (?:bred|lang|stor) (?:vifte|palet|pallette) af|et bredt (?:udvalg|spektrum) af)', r: 'mange forskellige' },

      // ---------- fyld & omsvøb ----------
      { cat: 'filler', p: 'med henblik på at', r: 'for at' },
      { cat: 'filler', p: 'i henhold til', r: 'ifølge' },
      { cat: 'filler', p: 'på nuværende tidspunkt', r: 'nu' },
      { cat: 'filler', p: 'i (?:den )?nærmeste fremtid', r: 'snart' },
      { cat: 'filler', p: 'i tilfælde af,? at', r: 'hvis' },
      { cat: 'filler', p: '(?:på grund af det faktum|grundet det faktum|på baggrund af det faktum),? at', r: 'fordi' },
      { cat: 'filler', p: '(?:til trods for|på trods af)(?: det faktum)?,? at', r: 'selvom' },
      {
        cat: 'filler',
        p: 'på en (\\p{L}+) (?:måde|facon)',
        r: (ctx, m, g) => {
          const a = g[0];
          if (/^(?:ny|anden|sådan|bestemt|samme|lignende|hel|særlig|ganske|helt|mere|mindre|meget|helt anden)$/i.test(a)) return null;
          if (/(?:t|sk|e)$/i.test(a)) return a;
          return a + 't';
        },
      },
      { cat: 'filler', p: 'et (?:stort|betydeligt|væsentligt) antal', r: 'mange' },
      { cat: 'filler', p: '(?:langt )?(?:størstedelen|hovedparten|størsteparten) af', r: 'de fleste af' },
      { cat: 'filler', p: 'en lang række', r: 'mange' },
      { cat: 'filler', lvl: 2, p: '(?:med hensyn til|hvad angår|for så vidt angår|i relation til)', r: 'når det gælder' },
      { cat: 'filler', p: 'har (?:mulighed for|evnen til) at', r: 'kan' },
      { cat: 'filler', lvl: 2, p: 'er i stand til at', r: 'kan' },
      { cat: 'filler', p: '(foretage|foretager|foretog|foretaget) en (vurdering|analyse|undersøgelse|evaluering|gennemgang|opdatering) af', r: (ctx, m, g) => VERB_NOUNS[g[1].toLowerCase()][TENSE[g[0].toLowerCase()]] },
      { cat: 'filler', p: 'ikke blot', r: 'ikke kun' },

      // ---------- overgangsord i sætningsstart ----------
      { cat: 'transition', start: true, p: 'derudover,', r: ['Derudover', 'Desuden', 'Samtidig'] },
      { cat: 'transition', start: true, p: 'desuden,', r: 'Desuden' },
      { cat: 'transition', start: true, p: '(?:endvidere|ydermere|herudover|yderligere),?', r: { casual: ['Desuden', 'Og så', 'Oven i købet'], neutral: ['Desuden', 'Samtidig', 'Og så'], professional: ['Desuden', 'Samtidig'] } },
      { cat: 'transition', start: true, p: '(?:afslutningsvis|sammenfattende|overordnet set|samlet set|opsummerende|for at opsummere|konklusionen er),?', r: { casual: ['Alt i alt', 'Kort sagt'], neutral: ['Alt i alt', 'Kort sagt'], professional: ['Samlet set', 'Kort sagt'] } },
      { cat: 'transition', start: true, p: '(alt i alt|kort sagt|dog|desværre|heldigvis|faktisk|derfor|for det første|for det andet|for det tredje|i sidste ende|endelig),', r: (ctx, m, g) => g[0], flag: false },
      { cat: 'transition', start: true, p: 'imidlertid,? (' + FINITE_FIXED.join('|') + ') (' + PRONOUNS + ')(?![\\p{L}])', r: (ctx, m, g) => 'Men ' + g[1] + ' ' + g[0] },
      { cat: 'transition', p: 'imidlertid,?', r: 'dog' },
      { cat: 'transition', start: true, p: '(?:følgelig|som følge heraf|som konsekvens heraf|som en konsekvens heraf),?', r: 'Derfor' },
      { cat: 'transition', start: true, lvl: 2, p: 'således,', r: 'Derfor' },
      { cat: 'transition', start: true, p: '(?:ikke desto mindre|når det er sagt|når det så er sagt),?', r: 'Alligevel' },

      // ---------- formelle ord -> almindelige ord ----------
      { cat: 'vocab', lvl: 1, p: '(benytte|benytter|benyttede|benytte) sig af', r: (ctx, m, g) => ({ benytte: 'bruge', benytter: 'bruger', benyttede: 'brugte' })[g[0].toLowerCase()] },
      forms('anvend', { e: 'bruge', er: 'bruger', te: 'brugte', es: 'bruges', t: 'brugt', else: 'brug', elsen: 'brugen' }, { lvl: 1 }),
      forms('anvendelig', { '': 'brugbar', e: 'brugbare', t: 'brugbart' }),
      forms('benytt', { e: 'bruge', er: 'bruger', ede: 'brugte', es: 'bruges', et: 'brugt' }, { lvl: 1 }),
      forms('påbegynd', { e: 'starte', er: 'starter', te: 'startede', es: 'startes', t: 'startet' }),
      forms('foreta', { ge: 'lave', ger: 'laver', ges: 'laves', get: 'lavet' }),
      { cat: 'vocab', lvl: 2, p: 'foretog', r: 'lavede' },
      { cat: 'vocab', lvl: 1, p: 'såfremt', r: 'hvis' },
      { cat: 'vocab', lvl: 1, p: 'hvorvidt', r: 'om' },
      { cat: 'vocab', lvl: 1, p: 'eksempelvis', r: ['for eksempel', 'fx'] },
      { cat: 'vocab', lvl: 2, p: 'herunder', r: 'blandt andet' },
      { cat: 'vocab', lvl: 1, p: 'i særdeleshed', r: 'især' },
      { cat: 'vocab', lvl: 2, p: 'yderst', r: 'meget' },
      { cat: 'vocab', lvl: 2, p: 'særdeles', r: ['meget', 'virkelig'] },
      { cat: 'vocab', lvl: 3, p: 'idet', r: 'fordi' },
      { cat: 'vocab', lvl: 2, p: 'vedrørende', r: 'om' },
      { cat: 'vocab', lvl: 2, p: 'ligeledes', r: 'også' },
      { cat: 'vocab', lvl: 2, p: 'endvidere', r: 'også' },
      { cat: 'vocab', lvl: 2, p: 'fremadrettet', r: 'fremover' },
      forms('essentiel', { '': 'vigtig', t: 'vigtigt', le: 'vigtige' }, { lvl: 1 }),
      forms('optimal', { '': 'bedst mulig', t: 'bedst muligt', e: 'bedst mulige' }),
      forms('optimer', { e: 'forbedre', er: 'forbedrer', es: 'forbedres', ede: 'forbedrede', et: 'forbedret', ing: 'forbedring', ingen: 'forbedringen' }, { lvl: 3 }),
      forms('implementer', { e: 'indføre', er: 'indfører', es: 'indføres', ede: 'indførte', et: 'indført', ing: 'indførelse', ingen: 'indførelsen' }, { lvl: 3 }),
      { cat: 'vocab', lvl: 2, p: 'tilstrækkelig(?:t)? med', r: 'nok' },
      { cat: 'vocab', lvl: 2, p: 'tilstrækkelig|tilstrækkeligt|tilstrækkelige', r: 'nok' },
      { cat: 'vocab', lvl: 2, p: 'betydeligt (\\p{L}+(?:ere|re))', r: (ctx, m, g) => 'meget ' + g[0] },
      { cat: 'vocab', lvl: 2, p: 'en betydelig', r: 'en stor' },
      { cat: 'vocab', lvl: 2, p: 'et betydeligt', r: 'et stort' },
      { cat: 'vocab', lvl: 2, p: 'betydelige', r: 'store' },
      { cat: 'vocab', lvl: 2, start: true, p: 'dette (er|betyder|gør|viser|sikrer|giver|kan|vil|skal|har|kræver|indebærer|understreger)', r: (ctx, m, g) => 'det ' + g[0] },
      forms('indebær', { e: 'betyde', er: 'betyder' }, { lvl: 3 }),

      // ---------- tegnsætning ----------
      { cat: 'punct', word: false, p: '(?<=[\\p{L}\\p{N}%)"”’\\uE001])[\\t\\x20]*[—―][\\t\\x20]*(?=[\\p{L}\\p{N}"“(\\uE000])', r: ', ', keepCase: true },
      { cat: 'punct', word: false, p: '(?<=[\\p{L}\\p{N}%)"”’])[\\t\\x20]+--[\\t\\x20]+(?=[\\p{L}\\p{N}"“(])', r: ', ', keepCase: true },
      { cat: 'punct', word: false, lvl: 3, p: '(?<=[\\p{L}%)"”’])[\\t\\x20]+–[\\t\\x20]+(?=[\\p{L}"“(])', r: ', ', keepCase: true },
    ];

    return {
      rules,
      rhythm: {
        conjunctions: ['og', 'men'],
        subjects: ['jeg', 'vi', 'du', 'han', 'hun', 'den', 'det', 'de', 'der', 'man', 'i', 'dette', 'disse', 'mange', 'flere', 'alle', 'nogle', 'en', 'et', 'min', 'mit', 'mine', 'vores', 'din', 'dit', 'dine', 'deres', 'hans', 'hendes', 'ingen', 'alt', 'folk', 'hver', 'både'],
        leads: {
          og: { casual: ['', 'Og '], neutral: '', professional: '' },
          men: { casual: 'Men ', neutral: 'Men ', professional: 'Men ' },
        },
      },
      contractionRe: null,
    };
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = R.da;
})(typeof globalThis !== 'undefined' ? globalThis : this);
