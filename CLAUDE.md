# 自動動画生成プロジェクト

## このプロジェクトでできること

テキストで指示するだけで **MP4動画** が自動生成されます。

```
あなたの日本語指示
    ↓
Claude Code が HTML + CSS アニメーションを生成
    ↓
Lovart API で必要な素材画像を生成
    ↓
Hyperframes が HTML を MP4 に変換
    ↓
完成動画 (videos/ フォルダに保存)
```

---

## スラッシュコマンド

### `/hyperframes` — 動画を作る

```
/hyperframes SNS用の縦型動画を作って。商品紹介アニメーション。青と白のデザイン。
```

このコマンドを使うと Claude が自動で：
1. HTML + CSS アニメーションを `templates/` に生成
2. Lovart API で素材画像を生成（APIキーがある場合）
3. `npx hyperframes render` でMP4に変換
4. `videos/` フォルダに保存

---

## 手動で使う方法

### 1. 初回セットアップ

```bash
bash scripts/setup.sh
```

### 2. 動画を新規作成

```bash
# プロジェクト作成
npx hyperframes init my-video
cd my-video

# ライブプレビュー（ブラウザで確認）
npx hyperframes preview

# MP4に書き出し
npx hyperframes render
```

### 3. Lovart API で素材生成

```bash
# 環境変数にAPIキーをセット
export LOVART_API_KEY="your_api_key_here"

# 素材を生成
node scripts/lovart.js "青いグラデーション背景、未来的なデザイン"
```

---

## テンプレート一覧

| ファイル | 用途 | サイズ |
|--------|------|--------|
| `templates/social-video.html` | SNS縦型動画 | 1080x1920 |
| `templates/presentation.html` | プレゼン横型 | 1920x1080 |
| `templates/data-viz.html` | データ可視化 | 1920x1080 |

---

## 動画を作るときのコツ

Claude に指示するときは以下を伝えると精度が上がります：

- **サイズ**: 縦型(9:16) or 横型(16:9) or 正方形(1:1)
- **長さ**: 何秒の動画か
- **テキスト**: 表示したい文章
- **雰囲気**: カラー・フォント・アニメーションの方向性
- **用途**: SNS/プレゼン/広告など

例：
```
縦型9:16、15秒、「新製品発売！」というテキスト、
黒背景にゴールドのグリッターアニメーション、SNSリール用
```

---

## 環境変数

`.env` ファイルを作って設定してください：

```env
LOVART_API_KEY=your_lovart_api_key
```

---

## トラブルシューティング

| エラー | 原因 | 解決方法 |
|-------|------|---------|
| `ffmpeg not found` | FFmpegが未インストール | `brew install ffmpeg` (Mac) / `apt install ffmpeg` (Linux) |
| `node: command not found` | Node.jsが未インストール | Node.js 22以上をインストール |
| `npx hyperframes` が動かない | npmが古い | `npm install -g npm@latest` |
