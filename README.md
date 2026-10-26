# cutie.

**Gør din tekst menneskelig.** En lille hjemmeside, der tager tekst, som lyder som en chatbot, og gør den mere naturlig. Den fjerner floskler, stive overgangsord og ensformige sætninger og viser præcis, hvad der er ændret.

Det hele kører i browseren. Der er ingen server, ingen konto og ingen build-trin.

## Hvad den kan

- **Regelmotor til dansk og engelsk** med over 300 regler fordelt på 10 kategorier:
  chatbot-floskler, AI-klichéer, fyld og omsvøb, stive overgangsord, formelle ord, sammentrækninger (engelsk), tegnsætning, sætningsrytme, markdown og emojis.
- **Dansk ordstilling holdes intakt.** "Derudover, er der" bliver til "Derudover er der" og ikke til en spørgesætning, og "Det er vigtigt at bemærke, at systemet ikke er hurtigt" bliver til "Systemet er ikke hurtigt".
- **Tre toner** (afslappet, neutral, professionel) og **tre styrker** (let, medium, kraftig).
- **Ændringer** vist med korrekturtegn: overstreget rødt for det, der er taget ud, grønt for det, der er sat ind, plus en liste over hver rettelse.
- **Analyse** med en robot-score før og efter, hvad der trækker scoren op, nøgletal og læsbarhed (LIX for dansk, Flesch for engelsk). Floskler, der stadig er tilbage, bliver markeret i teksten.
- **Ny variation**: kør igen og få andre ordvalg.
- **Beskyttede ord** (navne og fagord, der aldrig må ændres) og **egne erstatninger** i formen `fra => til`.
- Links, mailadresser og kode i backticks bliver aldrig rørt.
- Åbn `.txt`/`.md`-filer eller træk dem ind, kopiér resultatet eller hent det som `.txt`.
- Lyst og mørkt tema, dansk og engelsk brugerflade, virker på mobilen.
- **Valgfri Claude-tilstand**: indsæt din egen API-nøgle fra [platform.claude.com](https://platform.claude.com), så omskriver Claude hele teksten. Nøglen sendes kun til Anthropic og gemmes kun på din enhed, hvis du beder om det.

Robot-scoren er en tommelfingerregel baseret på de mønstre, cutie. kender. Den er ikke en AI-detektor.

## Læg den online med GitHub Pages

1. Gå til repoet på GitHub og åbn **Settings → Pages**.
2. Under **Build and deployment** vælger du **Source: Deploy from a branch**.
3. Vælg den gren, koden ligger på (fx `main`), og mappen **/ (root)**. Tryk **Save**.
4. Efter et minut eller to ligger siden på `https://mikllarsen.github.io/cutie/`.

Filen `.nojekyll` sørger for, at GitHub serverer filerne, som de er.

## Kør den lokalt

Åbn bare `index.html` i en browser. Regelmotoren virker også direkte fra disken.

Claude-tilstanden henter Anthropics SDK fra et CDN og skal derfor køre over `http(s)`:

```bash
npm start            # starter en lille server på http://localhost:8080
```

## Tests

```bash
npm test             # kører testene med Node 20+ (ingen afhængigheder)
```

Testene kører også automatisk på GitHub ved hvert push.

## Sådan er koden bygget op

| Fil | Indhold |
| --- | --- |
| `index.html` | Siden |
| `css/style.css` | Udseende, lyst og mørkt tema |
| `js/engine.js` | Selve motoren: maskering af links/kode, regelkørsel, oprydning, sætningsrytme og sprogdetektion |
| `js/rules-en.js` | Engelske regler |
| `js/rules-da.js` | Danske regler, inkl. omskrivning af at-sætninger til hovedsætninger |
| `js/analyze.js` | Robot-score, nøgletal og læsbarhed |
| `js/diff.js` | Ord-for-ord sammenligning af før og efter |
| `js/ai.js` | Den valgfri Claude-tilstand |
| `js/i18n.js` | Tekster på dansk og engelsk |
| `js/app.js` | Brugerfladen |
| `tests/engine.test.js` | Tests |

### Tilføj en regel

En regel er et objekt i `rules-da.js` eller `rules-en.js`:

```js
{ cat: 'vocab', lvl: 2, p: 'såfremt', r: 'hvis' }
```

- `p` er mønsteret. Mellemrum matcher ethvert mellemrum, og reglen rammer kun hele ord (også med æ, ø og å).
- `r` er erstatningen: en tekst, en liste at vælge tilfældigt fra, et objekt pr. tone (`{ casual, neutral, professional }`) eller en funktion.
- `lvl` er den laveste styrke, reglen bruges på (1 = let, 2 = medium, 3 = kraftig).
- `start: true` betyder, at reglen kun gælder i starten af en sætning.

Store og små bogstaver tilpasses automatisk, og hvis en regel fjerner starten af en sætning, får det næste ord stort begyndelsesbogstav.

## Privatliv

Regelmotoren sender intet nogen steder hen. Din seneste tekst og dine indstillinger gemmes i browserens `localStorage` på din egen enhed. Vælger du Claude, sendes teksten til Anthropic med din egen nøgle.
