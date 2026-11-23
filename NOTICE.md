# Notices and external material

Quadivex 1.0.2 includes independent Quadivex and QuadZenith sources, builds, and a Canvas 2D browser interface. These files are offered under the repository's [MIT License](LICENSE).

- The Canvas board was written independently with the WebKC-style v1.5.3 interface as a visual and interaction reference. The original WebKC interface, local reference files, and upstream Rust/WASM artifacts are excluded from this distribution. `npm run setup:rust7` optionally installs the upstream artifacts locally into an ignored directory. The original author's terms govern those files. [WebKC](https://licheng.sakura.ne.jp/webkc/) is the related project.
- [InitialPosition.csv](InitialPosition.csv) contains the 96 initial positions from WebKC. The original rights holder granted permission to distribute this dataset under the [MIT License](LICENSE). Copyright in the dataset belongs to its original rights holder.
- KJF v1.0 (https://github.com/yasushi00/keishi-kjf) is a separate MIT-licensed format specification. The KJF schema and validator are not copied here; users should validate with the upstream repository.
- Keishi Replay (https://github.com/yasushi00/keishi-replay) is the separate CSV/KJF viewer and compatibility target. The hosted viewer is at https://yasushi00.github.io/keishi-replay/.
- Keishi was created by 山本蛍 (Hotaru Yamamoto). 大和団次郎 (Danjiro Daiwa) adapted it as Jun-Keishi and documents the rules and stadium conventions at https://dnjiro.hatenablog.com/entry/keisi#p7.

`guadzenith_engine.c` deliberately preserves the spelling requested for that source filename.

The installation helper `scripts/install_legacy_rust.mjs` is original project code under MIT. It installs the upstream Rust/WASM files into the local Git-ignored directory.
