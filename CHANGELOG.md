# Changelog

## 1.0.2

- Replace the browser board with an independently implemented, responsive Canvas 2D board inspired by the WebKC-style v1.5.3 interface.
- Support mouse and touch input and provide a keyboard-accessible grid with screen-reader labels. The board marks the selected cell, legal destinations, both sides' latest moves and DaiPunch positions, and the winning square.
- Use **戻る** to take back moves to your previous turn or the initial position. Use **進む** to replay the original moves one at a time.
- Playing a new move from an earlier position replaces the later moves and recalculates the game result. CSV and KJF exports include the full recorded game, including when reviewing history.
- Cancel CPU searches on rewind and ignore replies from cancelled searches. Stepping forward through history leaves the CPU idle. When play continues after a new move, the CPU searches from the new position.
- Add Canvas pointer mapping and takeback regression tests to the default test suite.

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
