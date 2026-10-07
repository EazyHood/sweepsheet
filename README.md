# SweepSheet

Turn a cleanup voice note into counts you have actually reviewed. Use your regular voice recorder outside; import the notes when you get back. Listen, transcribe locally, check six categories, and export the confirmed counts.

**[Open SweepSheet](https://eazyhood.github.io/sweepsheet/)** · [Model test results](evidence/model-run.json) · [Test method and limitations](evidence/README.md)

Built October 7, 2026 for DEV's [Hacktoberfest Open-Source AI Challenge Week 1: Touch Grass](https://dev.to/challenges/hacktoberfest-week1-2026-10-05). This is a new project, not a fork of an earlier entry. No later-than-deadline changes currently exist. If changes are made after October 12, 2026 06:59 UTC, they will be documented here.

## Try it

1. Choose **Try the example notebook**. Its recordings are synthesized test fixtures, clearly labeled. They are not field recordings or evidence of a real cleanup.
2. Play **Along the canal**. Select **Transcribe again** to run the open model on your device. The first use downloads model files; it may take time.
3. Review 3 plastic bottles and 2 cans. Click **Confirm these counts**. The total becomes 5.
4. Review **By the footbridge**: 4 wrappers, 6 cigarette butts, 1 glass bottle. Confirm; total becomes 16.
5. Open **An uncertain count**. The model says “Maybe 4 or 5 rappers.” The proposal is held for manual review; it does not affect the total.
6. Change a confirmed count and provide a correction reason. The old and new counts remain in the history. Download the CSV and JSON review history.

You can import your own audio. The browser must support decoding its format. WAV is the most portable option; short MP3/M4A/OGG recordings may work depending on the browser. Maximum 10 MB and 60 seconds per note. English only. Use explicit materials, e.g. “plastic bottles” rather than “bottles.”

## Why speech recognition is central

[Whisper tiny.en](https://github.com/openai/whisper) converts the audio into editable text; without it, transcription is a manual task. [Transformers.js](https://huggingface.co/docs/transformers.js/v3.8.1/en/index) runs the quantized open model through ONNX Runtime WASM in a web worker. No transcription API key or paid inference server is required.

The narrow parser is deliberately ordinary JavaScript, not a second language model. Exact quantities and known categories become suggestions. Words indicating uncertainty, corrections, negation, observations, or unrecognized numbered categories trigger a hold. These conservative rules are not a complete language-understanding system. **Nothing changes a total until the user confirms.**

## Data and reliability boundaries

- Audio, transcripts and review history are stored in this browser's IndexedDB. There is no application backend, telemetry or audio upload. Network requests load the app, font, model and runtime files.
- Browser storage is not a backup. Clearing site data or starting a new notebook removes the local notes. Export the counts/history and keep original recordings. JSON export contains hashes and metadata, not audio bytes.
- SHA-256 of the audio bytes prevents the exact same file from being imported twice into a notebook. Re-encoding the same recording changes its bytes and will not be detected as a duplicate.
- The first model use needs internet. Cached models can be reused; **offline reload is not supported or claimed** in this version. Loading/caching behavior depends on the browser. A failed transcription leaves the note available for manual entry.
- Do not depend on web recording in the background or with a locked screen. SweepSheet imports recordings made with a separate recorder.
- A transcript is not proof that an item was collected. Counts are self-reported and user-confirmed, not environmental-impact verification.
- The synthetic tests do not establish accuracy outdoors, across accents, in wind, or on mobile hardware. No field trial or screen-time reduction is claimed.

## Run and test

Node 22 or newer:

```sh
npm ci
npm test
npm run dev
```

Production: `npm run build` creates `dist/`. `npm run preview` serves the build. The app is static; deploy the entire `dist/` directory. No secrets or environment variables are needed.

`npm run verify:model` runs real CPU inference in Node on ten synthetic fixtures, writes the complete observed transcripts and suggestions to `evidence/model-run.json`, and requires a first model download. This is a separate execution backend from browser WASM, so its timing should not be used as a browser-speed claim. `scripts/fixtures.ps1` reproduces the spoken fixtures on Windows with the named installed system voice; `scripts/non-speech.mjs` adds deterministic silence/noise cases.

## Open components and assistance

- App: MIT, copyright Jhonatan del rio mejia (EazyHood).
- Whisper code and original weights: OpenAI, MIT.
- ONNX conversion: [Xenova/whisper-tiny.en](https://huggingface.co/Xenova/whisper-tiny.en), model metadata Apache-2.0, pinned to `79fb389fc764e7c395bd330e9531d9d32ada7049`; q8 encoder/decoder. Model weights are downloaded separately and are not relicensed by this repository.
- Transformers.js 3.8.1: Apache-2.0. ONNX Runtime: MIT. Vite: MIT. DM Sans font: SIL Open Font License, served by Google Fonts.
- Demo speech: Microsoft Zira Desktop, synthesized locally from the sentences in `public/samples/manifest.json`; attributed test material rather than human or outdoor recordings.
- Codex assisted substantially with product implementation, tests, documentation and the submission draft. No other human teammates, user interviews, production users, outdoor use or measured time savings are claimed.

This notebook covers a smaller task than community cleanup platforms: reviewing quantities from audio after a cleanup. Offline collection itself is not a novelty claim; tools such as [Clean Swell](https://oceanconservancy.org/work/plastics/cleanups-icc/clean-swell-app/) already support cleanup logging. SweepSheet is not affiliated with them.
