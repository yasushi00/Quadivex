# Notices and external material

The Quadivex project contains **independent** Quadivex and QuadZenith sources, builds, and a newly written browser interface. Those shipped files are offered under the repository's MIT License.

- WebKC (https://licheng.sakura.ne.jp/webkc/) is a related/reference project. The original interface and Rust/WASM artifacts are **not** included because their redistribution terms could not be verified. `npm run setup:rust7` optionally installs the upstream artifacts locally, into an ignored directory. Their license remains governed by their original author, not by this repository's MIT License.
- The original shape-96 position data is **not** included in the publishable source release. `npm run setup:positions` installs the upstream CSV locally into an ignored path. The rights to the original position dataset are not asserted here.
- KJF v1.0 (https://github.com/yasushi00/keishi-kjf) is a separate MIT-licensed format specification. The KJF schema and validator are not copied here; users should validate with the upstream repository.
- Keishi Replay (https://github.com/yasushi00/keishi-replay) is the separate CSV/KJF viewer and compatibility target. The hosted viewer is at https://yasushi00.github.io/keishi-replay/.
- Keishi was created by 山本蛍 (Hotaru Yamamoto). 大和団次郎 (Danjiro Daiwa) adapted it as Jun-Keishi and documents the rules and stadium conventions at https://dnjiro.hatenablog.com/entry/keisi#p7.

`guadzenith_engine.c` deliberately preserves the spelling requested for that source filename.

Installation helpers (`scripts/install_official_positions.mjs` and
`scripts/install_legacy_rust.mjs`) are original project code under MIT.
They install upstream files into local Git-ignored paths. They do not
confer a license for third-party data or binaries. See README.md.
