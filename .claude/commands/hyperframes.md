# /hyperframes — 動画自動生成コマンド

$ARGUMENTS に動画の内容・雰囲気・用途を日本語で書いてください。

## あなたのタスク

ユーザーの指示 `$ARGUMENTS` をもとに、以下の手順で動画を自動生成してください。

---

### STEP 1: 指示を解析する

`$ARGUMENTS` から以下を読み取る：
- 動画サイズ（縦型 1080x1920 / 横型 1920x1080 / 正方形 1080x1080）
- 動画の長さ（秒数、指定なければ 10秒）
- 表示テキスト・メッセージ
- カラー・デザインテーマ
- アニメーションの雰囲気

---

### STEP 2: HTMLアニメーションを生成する

`templates/` フォルダに `[動画の内容]-[タイムスタンプ].html` という名前でファイルを作成する。

#### HTMLファイルの必須構造：

```html
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<style>
  /* CSSアニメーションをここに書く */
  /* @keyframes を使ってアニメーションを定義 */
</style>
</head>
<body>
<div id="stage"
     data-composition-id="[一意のID]"
     data-start="0"
     data-width="[幅]"
     data-height="[高さ]">

  <!-- 背景レイヤー -->
  <div id="bg" data-start="0" data-duration="[秒数]">...</div>

  <!-- テキストレイヤー -->
  <h1 id="title" data-start="0.5" data-duration="[秒数-0.5]">テキスト</h1>

  <!-- アニメーション要素 -->
  <div id="animation" data-start="1" data-duration="[秒数-1]">...</div>

</div>

<script>
// GSAPアニメーション（seekable にするため必須）
// CDN: https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.2/gsap.min.js
const tl = gsap.timeline({ paused: true });
tl.from("#title", { opacity: 0, y: 40, duration: 0.8 }, 0.5);
// ... その他のアニメーション

window.__timelines = window.__timelines || {};
window.__timelines["[composition-id]"] = tl;
</script>
</body>
</html>
```

#### アニメーションのルール：
- `data-start` と `data-duration` は必ず設定する（秒単位）
- GSAP timeline は `paused: true` で初期化し `window.__timelines` に登録する
- CSSアニメーションより GSAP を優先する（フレーム精度が上がる）
- 日本語フォントは Google Fonts の `Noto Sans JP` を使う

---

### STEP 3: Lovart API で素材を生成する（APIキーがある場合）

```bash
# 環境変数チェック
if [ -n "$LOVART_API_KEY" ]; then
  node scripts/lovart.js "[生成したい素材の説明]" --output templates/assets/
fi
```

APIキーがない場合はスキップして STEP 4 に進む。

---

### STEP 4: Hyperframes でレンダリングする

生成したHTMLをHyperframesでMP4に変換する：

```bash
# Hyperframesがインストール済みか確認
if ! command -v npx &> /dev/null; then
  echo "❌ Node.js が必要です。https://nodejs.org からインストールしてください"
  exit 1
fi

# 一時プロジェクトを作成してレンダリング
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
TEMP_DIR="videos/render_${TIMESTAMP}"
mkdir -p "$TEMP_DIR"

# HTMLをコピー
cp "templates/[生成したHTMLファイル]" "$TEMP_DIR/index.html"

# レンダリング実行
cd "$TEMP_DIR"
npx hyperframes render --output "../../videos/output_${TIMESTAMP}.mp4"
cd ../..

echo "✅ 動画が生成されました: videos/output_${TIMESTAMP}.mp4"
```

---

### STEP 5: 結果を報告する

完成したら以下を伝える：
- 生成されたHTMLファイルのパス
- 出力されたMP4ファイルのパス
- プレビューコマンド（`npx hyperframes preview`）
- 修正したい場合の指示方法

---

## 使用例

```
/hyperframes 縦型15秒、「春の新作コレクション」、ピンクと白のグラデーション、桜が舞うアニメーション、Instagram Reels用
```

```
/hyperframes 横型30秒のプレゼン動画、会社紹介、ネイビーとゴールド、モダンでプロフェッショナルな雰囲気
```

```
/hyperframes 正方形10秒、月間売上グラフのアニメーション、青系カラー、棒グラフが下から伸びるアニメーション
```
