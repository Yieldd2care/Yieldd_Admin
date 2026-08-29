# Test fixtures

Inputs for the verification scripts. Each has a `.html` or generator alongside it
so it can be regenerated rather than being an opaque binary nobody can change.

## Business cards — `card*.jpeg`, `not-a-card.jpeg`

Used by `npm run verify:card` and `npm run compare:card-models`.

Each `.jpeg` is a screenshot of the `.html` next to it at 1050×600. To
regenerate, open the HTML in a browser at that size and screenshot the viewport
as JPEG. The ground truth for each is written into
`scripts/compare-card-models.mjs`, so a change to a card means a change there too.

| file | what it tests |
|---|---|
| `card.jpeg` | a clean, well-lit card — the easy case |
| `card-hard.jpeg` | angled, dim, glare across it, left edge cropped, low JPEG quality |
| `card-minimal.jpeg` | name, mobile and email only — **five fields must come back empty** |
| `card-dense.jpeg` | three numbers, a GST line, a long two-line works address |
| `card-devanagari.jpeg` | a Devanagari name beside the English one, on a dark card |
| `card-script.jpeg` | decorative script face, low contrast — the hardest read |
| `not-a-card.jpeg` | a hall signboard. **Everything must come back empty.** |

The last one is the important one. A model that scores well on six cards and
invents a person out of a signpost is not usable, and an accuracy average would
hide that — which is why the harness counts INVENTED separately from MISSED.

## Voice note — `voice-note.wav`

Used by `npm run verify:voice`. Twenty-six seconds of a rep dictating a note
after meeting someone, containing a company name, a quantity, a budget and a
deadline, so the checks can assert each survived both the transcript and the
summary.

Synthesised with Windows' built-in text-to-speech, so it is clean studio
speech — it measures the pipeline and the summary, **not** how the transcriber
copes with an accent over a noisy show floor. Regenerate with:

```powershell
Add-Type -AssemblyName System.Speech
$s = New-Object System.Speech.Synthesis.SpeechSynthesizer
$s.SetOutputToWaveFile("scripts/fixtures/voice-note.wav")
$s.Speak("Okay so this is Rajesh from Northline Engineering. They are evaluating three vendors for a new plant line in Pune. He wants a formal quotation with lead times by next Friday. Budget is around forty lakhs. He also asked whether we can supply the precision castings in batches of five hundred. Follow up on Monday and send the brochure.")
$s.Dispose()
```
