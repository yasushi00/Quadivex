# Changelog

## 1.0.1

- Bundle the 96 WebKC openings in `InitialPosition.csv` under the MIT License with permission from the original rights holder.
- Load the bundled CSV directly in the browser, including GitHub Pages, and in the CLI.
- Validate all bundled openings in the default test suite.

## 1.0.0 (2026-11-21)

- Independent Quadivex browser interface and CLI comparisons.
- KJF v1.0 JSON export for Web games and two-game CLI comparisons.
- KJF interruption policy: evaluation cutoffs do not claim draws; no premature game 2 in paired exports.
- MIT source release, external WebKC Rust engine and WebKC openings installed locally only.
- Node.js setup, tests, notices, CI and version 1.0.0.
- **No modifications to the original QDX/QZ C sources or their compiled WASM binaries.**

- Public project name restored to Quadivex; QZ and QDX engine identities retained.
- Standard CSV only; partial output is disclosed and complete results are in KJF.
- Stadium and benchmark modes, Web 1000-ply cutoff, actual timestamps, history-safe session state and conservative prohibited-return adjudication.
- Shared opening validation, stronger KJF semantic validation and cross-repository CI.
