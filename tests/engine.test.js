'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');

require('../js/rules-en.js');
require('../js/rules-da.js');
require('../js/engine.js');
require('../js/analyze.js');
require('../js/diff.js');

const H = globalThis.Humanizer;
const A = globalThis.HumanizerAnalyze;
const D = globalThis.HumanizerDiff;

const run = (text, opts) => H.humanize(text, Object.assign({ seed: 1 }, opts)).text;

// ---------- engelsk ----------

test('en: fjerner chatbot-indledning og gør næste ord stort', () => {
  assert.equal(run('Certainly! Here is the plan.', { level: 1 }), 'Here is the plan.');
  assert.equal(run('Great question! the answer is yes.', { level: 1 }), 'The answer is yes.');
});

test('en: fjerner afsluttende floskler', () => {
  assert.equal(run('It works.\n\nI hope this helps! Let me know if you have any questions.', { level: 1 }), 'It works.');
});

test('en: "it is important to note that" forsvinder', () => {
  assert.equal(run('It is important to note that the API is fast.', { level: 1 }), 'The API is fast.');
  assert.equal(run("It's worth noting that, in 2020, sales fell.", { level: 1 }), 'In 2020, sales fell.');
});

test('en: sammentrækninger, men ikke sidst i en ledsætning', () => {
  assert.equal(run('It is not hard.', { level: 2 }), "It isn't hard.");
  assert.equal(run('I know what it is.', { level: 2 }), 'I know what it is.');
  assert.equal(run('I know who he is and why.', { level: 2 }), 'I know who he is and why.');
  assert.equal(run('Yes, I am.', { level: 2 }), 'Yes, I am.');
  assert.equal(run('Let us know if it breaks.', { level: 2 }), 'Let us know if it breaks.');
});

test('en: ingen sammentrækninger på styrke "let"', () => {
  assert.equal(run('We do not know.', { level: 1 }), 'We do not know.');
});

test('en: professionel tone beholder "it is" men trækker nægtelser sammen', () => {
  assert.equal(run('It is clear that we do not agree.', { level: 2, tone: 'professional' }), "It is clear that we don't agree.");
});

test('en: krøllede apostroffer bevares', () => {
  assert.equal(run('It’s late and we do not know.', { level: 2 }), 'It’s late and we don’t know.');
});

test('en: a/an følger det nye ord', () => {
  const out = run('It is an intricate design.', { level: 2, tone: 'professional' });
  assert.match(out, /^It is a (?:detailed|complex) design\.$/);
});

test('en: formelle ord bliver almindelige', () => {
  assert.equal(run('We utilize the data in order to learn.', { level: 1 }), 'We use the data to learn.');
  assert.equal(run('They leveraged AI.', { level: 2 }), 'They used AI.');
});

test('en: links, kode og beskyttede ord røres ikke', () => {
  assert.equal(run('Visit https://example.com/utilize-this to utilize it.', { level: 1 }), 'Visit https://example.com/utilize-this to use it.');
  assert.equal(run('Call `utilize()` to utilize it.', { level: 1, cats: { markdown: false } }), 'Call `utilize()` to use it.');
  assert.equal(run('Utilize Labs helps teams utilize data.', { level: 1, protect: ['Utilize Labs'] }), 'Utilize Labs helps teams use data.');
});

test('en: egne erstatninger', () => {
  assert.equal(run('Our synergy is great.', { level: 1, cats: { cliche: false }, custom: [{ from: 'synergy', to: 'teamwork' }] }), 'Our teamwork is great.');
});

test('en: tankestreger bliver til komma', () => {
  assert.equal(run('It is fast — and cheap.', { level: 1 }), 'It is fast, and cheap.');
  assert.equal(run('Pages 10–20 are new.', { level: 3 }), 'Pages 10–20 are new.');
});

test('en: lange sætninger deles, opremsninger gør ikke', () => {
  const long = 'The team spent most of the spring rebuilding the onboarding flow for new customers in three markets, but it still needs a final review from legal before anyone can ship it.';
  const out = run(long, { level: 2 });
  assert.match(out, /markets\. But it still needs/);
  const list = 'We sell apples from the north, pears from the south, plums from the old farm by the river, and bananas from abroad every single day of the week.';
  assert.equal(run(list, { level: 3 }), list);
});

test('en: markdown og emojis', () => {
  assert.equal(run('## Title\n**Bold** text', { level: 1 }), 'Title\nBold text');
  assert.equal(run('Ready 🚀 to go', { level: 1 }), 'Ready 🚀 to go');
  assert.equal(run('Ready 🚀 to go', { level: 1, cats: { emoji: true } }), 'Ready to go');
});

test('en: tone styrer overgangsord', () => {
  assert.equal(run('However, it failed.', { level: 2, tone: 'casual' }), 'But it failed.');
  assert.equal(run('However, it failed.', { level: 2, tone: 'professional' }), 'However, it failed.');
});

test('en: samme erstatning gentages ikke unødigt', () => {
  const out = run('Furthermore, it works. Moreover, it is cheap. Additionally, it is fast.', { level: 1, tone: 'casual' });
  const starts = out.split('. ').map((x) => x.split(' ')[0]);
  assert.equal(new Set(starts).size, starts.length, out);
});

test('en: samme seed giver samme resultat', () => {
  const text = 'Furthermore, we will delve into a wide range of topics.';
  assert.equal(run(text, { seed: 7 }), run(text, { seed: 7 }));
});

test('en: kategorier kan slås fra', () => {
  assert.equal(run('Furthermore, it works.', { level: 1, cats: { transition: false } }), 'Furthermore, it works.');
});

// ---------- dansk ----------

test('da: at-sætning bliver hovedsætning med rigtig ordstilling', () => {
  assert.equal(run('Det er vigtigt at bemærke, at systemet ikke er hurtigt.', { level: 1 }), 'Systemet er ikke hurtigt.');
  assert.equal(run('Det er værd at nævne, at der er mange muligheder.', { level: 1 }), 'Der er mange muligheder.');
});

test('da: to biord og stort bogstav efter kolon', () => {
  assert.equal(run('Det er vigtigt at bemærke, at medarbejdere ikke altid trives hjemme.', { level: 1 }), 'Medarbejdere trives ikke altid hjemme.');
  assert.equal(run('Afslutningsvis kan det siges, at fjernarbejde er godt.', { level: 1 }), 'Kort sagt: Fjernarbejde er godt.');
});

test('da: ledsætning der ikke kan flyttes sikkert, bliver stående', () => {
  const s = 'Det er vigtigt at huske, at man i mange tilfælde ikke kan vide det.';
  assert.equal(run(s, { level: 1 }), s);
});

test('da: efter et forfeltsled kommer udsagnsordet først', () => {
  const out = run('I dagens digitale verden er det vigtigt at bemærke, at virksomheder ikke kan vente.', { level: 1 });
  assert.match(out, /^(?:I dag|Nu om dage) kan virksomheder ikke vente\.$/);
});

test('da: overgangsord mister kommaet uden at blive til spørgsmål', () => {
  assert.match(run('Derudover, er der mange fordele.', { level: 1 }), /^(?:Derudover|Desuden|Samtidig) er der mange fordele\.$/);
  assert.equal(run('Imidlertid er det svært.', { level: 1 }), 'Men det er svært.');
  assert.equal(run('Imidlertid er systemet langsomt.', { level: 1 }), 'Dog er systemet langsomt.');
});

test('da: kancellisprog bliver hverdagssprog', () => {
  assert.equal(run('Vi anvender AI på en effektiv måde.', { level: 1 }), 'Vi bruger AI effektivt.');
  assert.equal(run('Vi foretager en vurdering af behovet.', { level: 1 }), 'Vi vurderer behovet.');
  assert.equal(run('Data spiller en afgørende rolle for os.', { level: 1 }), 'Data betyder meget for os.');
  assert.equal(run('Der var et betydeligt fald.', { level: 2 }), 'Der var et stort fald.');
  assert.equal(run('Såfremt du vil, kan du.', { level: 1 }), 'Hvis du vil, kan du.');
});

test('da: ord med æ, ø og å matches helt', () => {
  assert.equal(run('I øvrigt er det fint.', { level: 3 }), 'I øvrigt er det fint.');
  assert.equal(run('Løsningen er sømløs.', { level: 1 }), 'Løsningen er gnidningsfri.');
});

test('da: lange sætninger deles ved ", men"', () => {
  const long = 'Vi har brugt det meste af foråret på at bygge en ny proces til kunderne i tre lande, men den mangler stadig en sidste gennemgang fra juristerne, før den kan sendes ud.';
  assert.match(run(long, { level: 2 }), /tre lande\. Men den mangler/);
});

test('sprogdetektion', () => {
  assert.equal(H.detectLanguage('Det er en god dag, og vi skal ud at gå.'), 'da');
  assert.equal(H.detectLanguage('It is a good day and we are going for a walk.'), 'en');
});

// ---------- analyse ----------

test('analyse: robot-scoren falder efter humanisering', () => {
  const en = "Certainly! In today's fast-paced digital world, it is important to note that businesses must leverage cutting-edge tools. Furthermore, AI plays a crucial role in shaping the future. Moreover, we will delve into the intricate tapestry of solutions. I hope this helps!";
  const before = A.analyze(en);
  const after = A.analyze(run(en, { level: 2 }));
  assert.ok(before.score > 50, 'før: ' + before.score);
  assert.ok(after.score < before.score - 20, 'efter: ' + after.score);
});

test('analyse: dansk bruger LIX', () => {
  const r = A.analyze('Det er en kort tekst. Den er let at læse.');
  assert.equal(r.lang, 'da');
  assert.equal(r.readability.name, 'LIX');
});

// ---------- diff ----------

test('diff: kan genskabe begge tekster', () => {
  const pairs = [
    ['Certainly! Here is it.\n\nSecond part.\n\nI hope this helps!', 'Here it is.\n\nSecond part.'],
    ['a b c d', 'a x c d e'],
    ['', 'new text'],
    ['old text', ''],
  ];
  for (const [a, b] of pairs) {
    const ops = D.diff(a, b);
    assert.equal(ops.filter((o) => o.type !== 'ins').map((o) => o.value).join(''), a);
    assert.equal(ops.filter((o) => o.type !== 'del').map((o) => o.value).join(''), b);
  }
});

test('diff: lange tekster går via afsnit og er stadig korrekte', () => {
  const para = 'Furthermore, we utilize a wide range of tools in order to deliver value to customers every single day.';
  const a = Array.from({ length: 300 }, (_, i) => para + ' Item ' + i + '.').join('\n\n');
  const b = run(a, { level: 2 });
  const ops = D.diff(a, b);
  assert.equal(ops.filter((o) => o.type !== 'ins').map((o) => o.value).join(''), a);
  assert.equal(ops.filter((o) => o.type !== 'del').map((o) => o.value).join(''), b);
});
