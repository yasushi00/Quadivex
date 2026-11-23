# Quadivex — 形四エンジン・対戦環境 v1.0.2

**日本語** | [English](#english)

<a id="日本語"></a>

固定初期配置から始める準形四をブラウザで遊び、Node.jsで思考エンジン同士を比較できるソフトウェアです。QuadZenith `QZ1`～`QZ3`、Quadivex `QDX1`～`QDX3` を同梱しています。旧WebKC Rustレベル7（`RUST7`）は、利用者がローカルに導入した場合に限り**CLI比較対戦専用**で利用できます。ブラウザ版では旧Rustエンジンを読み込みません。

**バージョンの区別：** このソフトウェアのバージョンは **1.0.2** です。出力するKJF棋譜の形式バージョンは `format: "KJF"`、`version: "1.0"` です。思考エンジンのバイナリ処理は従来版から変更していません。Cソースのファイル名 `guadzenith_engine.c` は既存名のままです。

## 1. 動作条件・Node.jsの導入（macOS）

- macOS、ターミナル、Python 3（ブラウザ用の静的HTTPサーバーに使用）
- **Node.js 20以降**とnpm。Node.js 22 LTSも利用できます。
- 同梱済みのWASMエンジンを使うだけなら、Rust・Cコンパイラは不要です。

Node.jsは次の**いずれか一方**の方法で導入します。

**Homebrewを使用：**

```bash
brew install node
node --version
npm --version
```

Homebrewを未導入の場合は https://brew.sh/ から導入してください。または https://nodejs.org/en/download のmacOS向けインストーラを利用し、上記のコマンドでバージョンを確認します。テストスクリプトに外部npmパッケージへの依存はないため、同梱のテストを実行するだけなら **`npm install` は不要**です。

## 2. 同梱の96初期配置

WebKC由来の96初期配置を収録した [InitialPosition.csv](InitialPosition.csv) を、原権利者の許諾に基づきMITライセンスで配布しています。Web版とCLI版はこのCSVを直接読み込みます。展開後、追加の取得や変換なしで使えます。

`npm run test:positions` で96件の形式、座標、駒と配置の重複、および初期状態に正方形がないことを検証できます。動作確認用の独自データは `examples/demo_positions.csv` にあります。

## 3. ブラウザで対戦する

```bash
python3 -m http.server 8000
```

[GitHub Pages](https://yasushi00.github.io/Quadivex/) とローカル（http://localhost:8000/）の両方で、`QDX1`～`QDX3` または `QZ1`～`QZ3`、自分の色、同梱の96初期配置またはランダム初期配置を選べます。Web版は `InitialPosition.csv` を相対パスで読み込みます。

5×5の盤面はWebKC系v1.5.3を参考に独立実装したCanvas 2Dです。マウスやタッチで石と移動先を選べます。キーボードではTabで盤面に入り、矢印キーでマスを移動し、Enterまたはスペースで選択します。黒白それぞれの直前の着手と大パンチを盤面に表示し、正方形完成時は勝者の4マスをピンクにします。「戻る」は原則として直前の自分の手番まで巻き戻します。「進む」で元の棋譜を1手ずつ確認でき、自分の手番で新たに指すと、その先の旧棋譜を置き換えて対局を続けます。

「**棋譜CSV出力**」「**KJF v1.0出力**」は履歴表示中も対局の全手をローカルに保存します。ブラウザ対局は `header.matchType="single"` として記録し、進行中の対局は `playing` とします。

## 4. CLIでエンジン同士を対戦させる

`A` に第1局の黒エンジン、`B` に第1局の白エンジンを指定します。第2局は第1局の黒白初期配置を入れ替え、**各対戦者の担当色を維持したまま白先手**で開始します。

| 指定名 | エンジン | ブラウザ | CLI |
|---|---|---|---|
| `QDX1`, `QDX2`, `QDX3` | Quadivex（レベル8/9/10） | 対応 | 対応 |
| `QZ1`, `QZ2`, `QZ3` | QuadZenith（レベル8/9/10） | 対応 | 対応 |
| `RUST7` | 元WebKC Rustレベル7 | 非対応 | 別途導入で対応 |

**実行例：**

```bash
# 同梱の独自デモ配置を使った2局セット
A=QZ1 B=QDX1 POSITION_FILE=examples/demo_positions.csv STARTS=1 DEPTH=2 MAXPLY=30 npm run test:match

# WebKCの96配置。第1局がすべて完了した場合、最大192局
A=QZ1 B=QDX3 STARTS=96 BUDGET=450 MAXPLY=80 npm run test:match

# 探索ノード数と探索深度で打ち切り条件を固定
A=QZ2 B=QDX2 STARTS=96 NODES=1000000 DEPTH=10 MAXPLY=80 npm run test:match
```

**元Rustレベル7の導入（必要な利用権限・条件を確認した場合のみ）：**

```bash
npm run setup:rust7
A=QZ1 B=RUST7 STARTS=96 BUDGET=450 MAXPLY=80 npm run test:match
```

導入スクリプトは `https://licheng.sakura.ne.jp/webkc/pkg/` から `webkc_rust.js` と `webkc_rust_bg.wasm` を取得し、Git管理対象外の `legacy_rust/` に格納します。WASMヘッダーも確認します。**上流URLは変更される可能性があります。またダウンロードできても再配布や公開サーバーへの配置が許諾されたことにはなりません。**

手動・オフラインで導入する場合：

```bash
npm run setup:rust7 -- --from ./path/to/folder-with-rust-files
```

指定ディレクトリには `webkc_rust.js` と `webkc_rust_bg.wasm` の両方が必要です。`RUST7` は**Node.js CLI対戦専用**です。元のRustバイナリには原権利者の利用条件が適用されます。

### CLIパラメータ一覧

| 環境変数 | 既定値 | 内容 |
|---|---|---|
| `A` | `QZ1` | 第1局の黒エンジン |
| `B` | `RUST7` | 第1局の白エンジン |
| `POSITION_FILE` | `InitialPosition.csv` | 初期配置ファイル（別のCSVも指定可） |
| `STARTS` | `2` | 初期配置の数（1～96） |
| `MODE` | `benchmark` | `stadium`（上限1000手固定） / `benchmark`（MAXPLY指定可） |
| `MAXPLY` | `80` | benchmarkの最大着手数（1～1000）、stadiumでは無視 |
| `BUDGET` | `100` | **QDX/QZのみ：** 1手の時間制限、ミリ秒（1～30000） |
| `NODES` | 未設定 | **QDX/QZのみ：** 1手の最大探索ノード数（1～100,000,000） |
| `DEPTH` | 未設定 | **QDX/QZのみ：** 最大探索深度（1～60） |
| `OUTPUT_DIR` | `tests/results_<a>_vs_<b>` | 出力先ディレクトリ |

`NODES` または `DEPTH` を指定して `BUDGET` を省略した場合、QDX/QZでは**時間制限による打ち切りを無効化**します。`BUDGET` も指定すると、すべての制限を併用します。`RUST7` の独自探索条件は変更しません。指定値は原則として**上限**であり、必ず指定ノード数まで探索するという意味ではありません。また、同一制限でもエンジン間のCPU使用時間が一致するわけではありません。

従来のCLIコマンドも利用できます。

```bash
QDX=8 STARTS=96 BUDGET=450 MAXPLY=80 npm run test:rust7
BLACK=8 WHITE=10 STARTS=96 NODES=1000000 DEPTH=10 npm run test:selfplay
```

## 5. KJF v1.0・形四スタジアムCSVの出力

各初期配置について `OUTPUT_DIR` 以下に次のファイルを生成します。

```text
keishiscore_001.csv  # 公開スタジアムCSV仕様準拠の棋譜（部分出力の場合あり）
kjf_001.json         # KJF v1.0準拠の棋譜（原則として1ファイルに2局）
summary.json         # 集計結果と各局の情報
```

KJFには、**0手目の初期盤面を1回**、各着手後に**黒白合計8駒の盤面**を保存します。各色4駒の配列順序・駒の対応関係を維持します。2局セットでは第2局を白先手とし、最初の黒白初期配列を同じインデックスのまま交換します。`games[].black` / `white` の対戦者IDは `p1` / `p2` を維持します。各局と2局セットの結果を個別に計算します。

**途中打ち切りの注意：** `MAXPLY` は**評価テスト上の中断条件**であり、公式ルール上の引き分けを意味しません。`maxPly` または `noMove` による打ち切りでは、KJFに `status="interrupted"`、`reason="interrupted"`、`winner=null` と記録します。**第1局が中断された場合、第2局は開始しません**（KJFの規定による）。このため局数は `STARTS × 2` より少ないことがあります。CSVに `DRAW` は出力しません。非正方形終局の勝敗はKJFにのみ記録します。第1局が禁手負けなどで終わった場合、再生側がWINなしの第2局を拒否するため、CSVは第1局までの部分出力とし、KJFには全局を保存します。正方形完成による勝利だけが `reason="square"` です。

**KJF v1.0の仕様書・JSON Schema・検証プログラムは別リポジトリで公開しています：**

https://github.com/yasushi00/keishi-kjf

完全な互換性を検証するには、そのリポジトリを取得し、Python製の検証ツールを実行します。

```bash
git clone https://github.com/yasushi00/keishi-kjf.git ../keishi-kjf
python3 -m venv .venv
source .venv/bin/activate
python -m pip install -r ../keishi-kjf/requirements-dev.txt
python ../keishi-kjf/tools/kjf_validate.py tests/results_qz1_vs_qdx1/kjf_001.json
```

JavaScriptシリアライザはKJF仕様に合わせて実装しています。構造・意味のローカルテストを同梱していますが、**上流のPython製Schema検証ツールは同梱しません**。公式配置や旧Rustを取得しなくても、同梱デモデータでオフライン試験ができます。

## 6. テスト

```bash
npm test                 # MIT配布物だけで行うオフラインテスト。GitHub Actionsでも実行
npm run test:kjf         # KJF形式・第2局・中断時のテスト
npm run test:quadzenith  # QZ/QDXをWebKCの96配置で検証
npm run test:full        # WebKCの96配置を使う全体テスト
```

WebKCの96配置によるテストは同梱CSVを使用します。`npm run test:rust7` の実行には追加で `npm run setup:rust7` が必要です。

## 7. C/WASMエンジンの再ビルド（任意）

配布物にはコンパイル済みの `.wasm` を含みます。macOSでQuadZenithをビルドする場合：

```bash
brew install llvm
"$(brew --prefix llvm)/bin/clang" --target=wasm32 -O3 -fno-builtin -nostdlib \
  -Wl,--no-entry -Wl,--export-all -Wl,--allow-undefined \
  -o guadzenith_engine.wasm guadzenith_engine.c
```

本v1.0.2パッケージでは `guadzenith_engine.c`、`enhanced_engine.c`、および対応するコンパイル済みWASMを変更していません。

### 公開前の仕様補足

- Web版は1000手で警告して中断し、単局引き分けとはしません。対局中は設定を固定します。巻き戻すとCPUの思考を停止し、新たな着手に対してCPUが応手します。棋譜出力は表示位置にかかわらず、確定している全手を対象とします。
- 禁手負けの判定は、相手に次の合法着手で正方形を完成する手があり、禁止された戻し手なら全ての即勝ちを防げる一方、他に合法な回避手（自分の即勝ちを含む）がない場合とします。原典の記述を実装に落とし込むための Quadivex の判定方針です。C/WASMの探索自体は変更しません。
- 対局日時はUTCのRFC 3339形式（`date`もUTC日付）、`site`は `Quadivex`。終了前は `endedAt` を省略します。
- CSV互換は棋譜書式の互換であり、共有 `keishiscore.csv` を使う外部プログラム逐次対戦機構は未実装です。
- `npm run test:integration` は別途取得した `../keishi-kjf` と `../keishi-replay` を使います。GitHub Actionsにも同じ検証を設定しています（参照コミットはログ出力）。

## 8. GitHub での公開

GitHub Pages は `main` のルートを使用します。公開前にGitのステージを確認し、同梱CSVが含まれ、元WebKCのRust/WASMとテスト生成物が除外されていることを確認します。必須テストおよび Actions の成功後に注釈付きタグとリリースを作成します。

## 9. 生成AIの利用

Quadivex（QDX・QZ）は、**ChatGPTおよびGeminiを含む生成AIツールを開発支援に利用して作成**しています。設計、コード統合、テスト、公開管理はプロジェクトの管理者が行います。AI支援によるコードも、それ以外のコードと同じく、コードレビュー、権利確認、セキュリティ確認の対象です。

## 10. 第三者の素材

`npm run setup:rust7` は元WebKCのRust/WASMをCLI比較用にローカルの `legacy_rust/` に導入します。上流のファイルには原権利者の利用条件が適用されます。

## 11. ライセンスと参考URL

本プロジェクト独自のコードは **MIT License** です。Copyright (c) 2026 Yasushi Ishizuka。詳しくは `LICENSE` を参照してください。WebKC由来の96初期配置にも、原権利者の許諾に基づきMIT Licenseが適用されます。出典と第三者の権利については `NOTICE.md` を参照してください。

- **WebKC：** https://licheng.sakura.ne.jp/webkc/
- **形四・形四スタジアム原典：** https://dnjiro.hatenablog.com/entry/keisi#p7
- **KJF v1.0仕様書（別リポジトリ）：** https://github.com/yasushi00/keishi-kjf
- **棋譜再生 Keishi Replay：** https://github.com/yasushi00/keishi-replay ／ https://yasushi00.github.io/keishi-replay/

---

<a id="english"></a>

# Quadivex — Keishi engine suite 1.0.2

[日本語](#日本語) | **English**

A browser-based Jun-Keishi game played from a preset opening and Node.js engine-versus-engine test suite. Engines included: QuadZenith `QZ1..QZ3`, Quadivex `QDX1..QDX3`. Optional legacy WebKC Rust Level 7 (`RUST7`) is available **for CLI comparison only** after local setup. The browser does not load Rust.

**Version separation:** this software distribution is **1.0.2**, while the exported Keishi JSON Format (KJF) record uses `format: "KJF"` and `version: "1.0"`. The source engines retain their existing binary logic, including the exact spelling `guadzenith_engine.c`.

## 1. Requirements / Node.js installation (macOS)

- macOS with Terminal and Python 3 (for the browser's static HTTP server).
- Node.js **20 or later**, with npm. Node.js 22 LTS is a suitable choice for this release.
- No Rust compiler or C compiler is needed to play or run the precompiled C/WASM engines.

Choose **one** Node installation method:

**Homebrew (macOS):**

```bash
brew install node
node --version
npm --version
```

If Homebrew is not installed, install it from https://brew.sh/ before running `brew install node`. Alternatively, download the macOS installer from https://nodejs.org/en/download, and then verify the same two version commands. `npm install` is **not required** for the supplied Node-only test scripts because they use no external npm packages.

## 2. Bundled 96 openings

[InitialPosition.csv](InitialPosition.csv) contains the 96 WebKC openings, distributed under the MIT License with permission from the original rights holder. The browser and CLI read this CSV directly after extraction.

Run `npm run test:positions` to check the format, coordinates, piece overlaps, duplicate openings, and absence of completed squares. The independently composed smoke-test fixture is in `examples/demo_positions.csv`.

## 3. Browser play

```bash
python3 -m http.server 8000
```

On [GitHub Pages](https://yasushi00.github.io/Quadivex/) or locally at http://localhost:8000/, choose `QDX1..QDX3` or `QZ1..QZ3`, your side, and one of the 96 bundled openings or a random opening. The browser loads `InitialPosition.csv` using a relative URL.

The 5×5 board is an independent Canvas 2D implementation based on the WebKC-style v1.5.3 interface. Select a stone and its destination with a mouse or touch. With a keyboard, use Tab to enter the board, the arrow keys to navigate, and Enter or Space to select. The board shows both sides' most recent moves and DaiPunch positions. A completed square highlights the winner's four cells in pink. **戻る** rewinds to your previous turn or the initial position. **進む** shows the original moves one at a time. Playing a move on your turn replaces the rest of the original game record and continues play.

The **棋譜CSV出力** and **KJF v1.0出力** buttons save the full game locally, including when reviewing history. Browser games use `header.matchType="single"`, and unfinished games use `playing`.

## 4. CLI engine comparisons

Choose `A` (Black, first game) and `B` (White, first game). In the second game, the first game's initial Black and White positions are swapped, the same players retain their original colors, and **White moves first**.

| Name | Engine | Browser | CLI |
|---|---|---|---|
| `QDX1`, `QDX2`, `QDX3` | Quadivex (level 8/9/10) | Yes | Yes |
| `QZ1`, `QZ2`, `QZ3` | QuadZenith (level 8/9/10) | Yes | Yes |
| `RUST7` | Original WebKC Rust Level 7 | No | Optional |

Examples:

```bash
# Two-game test on the included independent demo opening
A=QZ1 B=QDX1 POSITION_FILE=examples/demo_positions.csv STARTS=1 DEPTH=2 MAXPLY=30 npm run test:match

# 96 original openings => at most 192 games (if every first game completes)
A=QZ1 B=QDX3 STARTS=96 BUDGET=450 MAXPLY=80 npm run test:match

# Fixed search constraints, CPU speed-independent stop conditions
A=QZ2 B=QDX2 STARTS=96 NODES=1000000 DEPTH=10 MAXPLY=80 npm run test:match
```

Optional original Rust Level 7 (only if you have verified you may use the upstream artifacts):

```bash
npm run setup:rust7
A=QZ1 B=RUST7 STARTS=96 BUDGET=450 MAXPLY=80 npm run test:match
```

The script attempts to fetch the original `webkc_rust.js` and `webkc_rust_bg.wasm` from `https://licheng.sakura.ne.jp/webkc/pkg/` into the ignored `legacy_rust/` directory. It checks that the downloaded WASM has a valid WASM header. **The source URLs are upstream-dependent and could change. A successful download is not a grant of permission to redistribute or publicly host the files.**

**Manual/offline alternative** (with an authorized copy of the original files):

```bash
npm run setup:rust7 -- --from ./path/to/folder-with-rust-files
```

That folder must contain both `webkc_rust.js` and `webkc_rust_bg.wasm`. `RUST7` runs **only in Node.js CLI test matches**; the local browser game deliberately offers QZ1–3 and QDX1–3 only. The original Rust files are governed by the original rights holder’s terms.

### CLI parameters

| Environment variable | Default | Description |
|---|---|---|
| `A` | `QZ1` | Black-side engine |
| `B` | `RUST7` | White-side engine |
| `POSITION_FILE` | `InitialPosition.csv` | Opening data source; alternate CSV files supported |
| `STARTS` | `2` | Number of openings (1–96) |
| `MODE` | `benchmark` | `stadium` (fixed 1000 plies) or `benchmark` (MAXPLY configurable) |
| `MAXPLY` | `80` | Benchmark cutoff (1–1000); ignored in stadium mode |
| `BUDGET` | `100` | **QDX/QZ only:** milliseconds per move (1–30000) |
| `NODES` | unset | **QDX/QZ only:** max nodes per move (1–100,000,000) |
| `DEPTH` | unset | **QDX/QZ only:** max search depth (1–60) |
| `OUTPUT_DIR` | `tests/results_<a>_vs_<b>` | Output folder |

If `NODES` or `DEPTH` is set without `BUDGET`, QDX/QZ run with **no time-based cutoff**. If both are specified, all applicable limits are enforced. `RUST7` retains the original search settings; no QDX/QZ search-limit variables are passed to it. Settings are limits, not necessarily an exact number of visited nodes. Different engines can consume different CPU time for the same limit.

Legacy CLI aliases remain supported:

```bash
QDX=8 STARTS=96 BUDGET=450 MAXPLY=80 npm run test:rust7
BLACK=8 WHITE=10 STARTS=96 NODES=1000000 DEPTH=10 npm run test:selfplay
```

## 5. KJF v1.0 and Stadium CSV output

Each starting position creates (under `OUTPUT_DIR`):

```text
keishiscore_001.csv  # Standard Stadium moves (may be partial)
kjf_001.json         # Strict KJF v1.0 record (one pair per file)
summary.json         # Aggregate statistics and per-game metadata
```

KJF saves **the initial 0-ply position once** and **all eight stones after every move**. Original four-stone list order and identity are preserved. For paired matches, the second game starts White and exchanges the Black and White initial arrays index-for-index; `games[].black` / `white` retain player IDs `p1` and `p2`. `result` is computed separately for each game and the whole pair.

**IMPORTANT on cutoffs:** `MAXPLY` in these scripts is an **evaluation stop**, not an officially established game draw. Therefore, on `maxPly` or `noMove` cutoffs the KJF result is `status="interrupted"`, `reason="interrupted"`, `winner=null`. If the **first** game is interrupted, the second game is **not started** (KJF prohibits it), so some positions generate just one game and the total may be fewer than `2 × STARTS`. No `DRAW` is emitted. Non-square outcomes are stored in KJF only. If leg 1 ends without a square WIN, CSV contains only leg 1, since Replay rejects leg 2 without a preceding WIN; KJF preserves both legs. Only a genuine square victory uses `reason="square"`.

KJF v1.0 authoritative specification, Schema and validator: https://github.com/yasushi00/keishi-kjf

For full compatibility checks, clone that repository and install the validator's Python dependency:

```bash
git clone https://github.com/yasushi00/keishi-kjf.git ../keishi-kjf
python3 -m venv .venv
source .venv/bin/activate
python -m pip install -r ../keishi-kjf/requirements-dev.txt
python ../keishi-kjf/tools/kjf_validate.py tests/results_qz1_vs_qdx1/kjf_001.json
```

The JavaScript serializer is developed to follow that specification. Its local structural/semantic tests are included, but **the upstream Python Schema validator is not bundled** and must be run separately as shown. Optional offline demo files can be used without downloading the original positions or Rust.

## 6. Tests

```bash
npm test              # MIT-only, offline: KJF, rules, demo QZ vs QDX; also used in GitHub Actions
npm run test:kjf      # KJF format + second-leg + interruption tests
npm run test:quadzenith  # Full 96-opening QZ/QDX test
npm run test:full      # Full original 96-opening engine tests
```

The full checks use the bundled WebKC CSV. `npm run test:rust7` additionally requires `npm run setup:rust7`.

## 7. Build the C/WASM engines (optional)

The distribution includes already-built `.wasm` files. To build QuadZenith yourself on macOS:

```bash
brew install llvm
"$(brew --prefix llvm)/bin/clang" --target=wasm32 -O3 -fno-builtin -nostdlib \
  -Wl,--no-entry -Wl,--export-all -Wl,--allow-undefined \
  -o guadzenith_engine.wasm guadzenith_engine.c
```

**Neither `guadzenith_engine.c` nor `enhanced_engine.c`, nor either precompiled WASM, was modified for this 1.0.2 package.**

### Release behavior

- Web games stop with a warning at 1,000 plies, as interruptions, not draws. Settings are locked during play. Rewinding cancels any CPU search. The CPU responds after you make a new move. Exports contain all recorded moves regardless of the displayed position.
- Prohibited-return loss is adjudicated when the opponent has an immediate legal square, reversing the prohibited move would prevent every immediate square, and no legal response (including a winning move) does so. This is Quadivex's conservative operational interpretation of the original rule. The C/WASM search engines are unchanged.
- Actual times use RFC 3339 UTC (`date` is the UTC date); `site` is `Quadivex`. `endedAt` is omitted while playing.
- Compatibility concerns the Stadium record format, not the shared-file external match protocol.
- `npm run test:integration` checks sibling checkouts `../keishi-kjf` and `../keishi-replay`. GitHub Actions runs the same checks and logs the upstream commit IDs.

## 8. GitHub publication

GitHub Pages serves the root of `main`. Review the staged files before publishing and include the bundled CSV and exclude the original WebKC Rust/WASM and generated test files. Create the annotated tag and release after the required tests and Actions succeed.

## 9. Generative AI usage

Quadivex (QDX and QZ engines) was developed with assistance from generative AI tools, including **ChatGPT and Gemini**. The project maintainer performs project design, code integration, testing and release management. AI-assisted contributions are subject to the same code-review, rights and security checks as other contributions.

## 10. Third-party assets

`npm run setup:rust7` installs the original WebKC Rust/WASM into the local `legacy_rust/` directory for CLI comparisons. Those upstream files are governed by the original rights holder's terms.

## 11. License and references

Code authored for this project is MIT-licensed, Copyright (c) 2026 Yasushi Ishizuka (`LICENSE`). The WebKC 96-position data is also distributed under the MIT License with permission from the original rights holder. See `NOTICE.md` for provenance and third-party rights.

- **WebKC:** https://licheng.sakura.ne.jp/webkc/
- **Original Keishi / Stadium description:** https://dnjiro.hatenablog.com/entry/keisi#p7
- **KJF v1.0 reference specification:** https://github.com/yasushi00/keishi-kjf
- **Keishi Replay:** https://github.com/yasushi00/keishi-replay · https://yasushi00.github.io/keishi-replay/
