# Vendored browser libraries

- `mediabunny-1.52.2.min.js` is the pinned Mediabunny 1.52.2 browser bundle.
  The upstream `.cjs` browser bundle is stored with a `.js` suffix so static
  hosts serve it with a JavaScript MIME type.
- `MEDIABUNNY-LICENSE.txt` is its Mozilla Public License 2.0 licence.
- The vendored bundle has one local compatibility change: its automatically
  generated AVC codec string requests Baseline profile (`42`) instead of High
  profile (`64`). This is used only for Chunkplayer's small MP4 clip exports and
  works around iOS WebKit rejecting the High-profile encoder configuration.
- `mediabunny-1.52.2-ios-avc-baseline.patch` contains the corresponding source
  change against the upstream TypeScript source.

Source: <https://www.npmjs.com/package/mediabunny/v/1.52.2>
