# Evidence, not a field trial

The test data is deliberately small, synthetic and inspectable. Eight short sentences are spoken by the installed Microsoft Zira Desktop voice at rate −1 and saved as 16 kHz, 16-bit mono WAV. Two more cases contain digital silence and deterministic white noise. They are not recordings of a cleanup, human accent testing, or wind/noise robustness measurements.

## Reproduce

On Windows with the named system voice installed:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/fixtures.ps1
node scripts/non-speech.mjs
npm run verify:model
npm test
```

The committed WAVs allow the inference run on other supported Node platforms without synthesizing them again. `verify:model` executes the pinned quantized model on CPU using ONNX Runtime through Transformers.js 3.8.1. The app uses WASM in a browser worker; these timings are not interchangeable.

## Observed October 7, 2026

Full inputs, outputs, durations and pipeline options are in [model-run.json](model-run.json). Raw transcript strings are retained, including failures.

| Case | Observed transcript | Parser outcome |
| --- | --- | --- |
| Clear quantities | I collected three plastic bottles and two cans. | Suggest 3 plastic, 2 cans |
| Multiple categories | 4 wrappers, 6 cigarette butts, and 1 glass bottle. | Suggest 4 wrappers, 6 butts, 1 glass |
| Correction | Make that two plastic bottles. Not three. | Hold |
| Uncertain quantity | Maybe 4 or 5 rappers. | Hold |
| Vague quantity | I picked up some cans. | Hold |
| Not collected | I saw six plastic bottles but did not collect them. | Hold |
| Silence | Empty (energy guard, no model invocation) | Hold |
| White noise | (water splashing) | Hold |
| Zero and another category | 0 glass bottles and 2 other items. | Suggest 0 glass, 2 other |
| Larger quantities | 23 rappers and 12 kids. | Hold; recognition failure |

**Interpretation:** three of four unambiguous spoken count fixtures produced the intended counts. The fourth was held because transcription changed both category names. Four uncertain/negative/correction fixtures and two non-speech fixtures produced no proposed counts. This is a ten-case development check, not an accuracy benchmark or evidence of reliable speech recognition outdoors. Confirmations are required even for the successful cases.

CPU inference in the committed warm-cache run took 473–700 ms per spoken clip. Clips lasted 2.41–5.275 seconds. Timing excludes browser decoding and initial downloads. The silence guard took 1 ms and was not model inference. Do not generalize these numbers to mobile devices or browser WASM.

The parser does not repair homophones automatically: guessing that “rappers” means “wrappers” could turn unrelated speech into a count. A person can edit the transcript or enter quantities after listening. A normal voice memo plus a spreadsheet remains a workable manual alternative; no user-effort improvement has been measured.

## State checks

`tests/core.test.js` covers supported counts, uncertainty, correction, negation, vague and malformed quantities, pending/excluded totals, correction replacement rather than addition, immutable count history, bounds, spreadsheet-formula escaping, and silence guarding. File deduplication uses SHA-256 in the browser; exact-byte duplicates are detected, not acoustically equivalent recordings.

Browser visual/integration observations are documented separately when performed. No claim of a completed field trial, offline reload, or independent human usability test is made.
