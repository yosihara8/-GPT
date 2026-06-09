#!/bin/bash
# =============================================================
# 自動動画生成セットアップスクリプト
# 初めて使うときはこれを1回だけ実行してください
# 使い方: bash scripts/setup.sh
# =============================================================

set -e  # エラーが起きたら即停止

echo ""
echo "================================================"
echo "  自動動画生成システム セットアップ"
echo "  Claude Code + Hyperframes + Lovart API"
echo "================================================"
echo ""

# ─────────────────────────────────────────────────────────────
# 1. Node.js チェック
# ─────────────────────────────────────────────────────────────
echo "▶ [1/5] Node.js の確認..."

if ! command -v node &> /dev/null; then
  echo "❌ Node.js が見つかりません"
  echo ""
  echo "インストール方法："
  echo "  Mac:   brew install node"
  echo "  Linux: curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash - && sudo apt-get install -y nodejs"
  echo "  Windows: https://nodejs.org からダウンロード"
  exit 1
fi

NODE_VERSION=$(node -v | sed 's/v//' | cut -d. -f1)
if [ "$NODE_VERSION" -lt 22 ]; then
  echo "⚠️  Node.js v${NODE_VERSION} が見つかりました（v22以上が必要）"
  echo "   アップデートしてください: https://nodejs.org"
  exit 1
fi

echo "✅ Node.js $(node -v) OK"

# ─────────────────────────────────────────────────────────────
# 2. FFmpeg チェック
# ─────────────────────────────────────────────────────────────
echo ""
echo "▶ [2/5] FFmpeg の確認..."

if ! command -v ffmpeg &> /dev/null; then
  echo "❌ FFmpeg が見つかりません"
  echo ""
  echo "インストール方法："
  echo "  Mac:   brew install ffmpeg"
  echo "  Ubuntu: sudo apt install ffmpeg"
  echo "  Windows: https://ffmpeg.org/download.html"
  exit 1
fi

echo "✅ FFmpeg $(ffmpeg -version 2>&1 | head -1 | awk '{print $3}') OK"

# ─────────────────────────────────────────────────────────────
# 3. npm パッケージインストール
# ─────────────────────────────────────────────────────────────
echo ""
echo "▶ [3/5] npm パッケージのインストール..."
npm install --silent
echo "✅ パッケージインストール完了"

# ─────────────────────────────────────────────────────────────
# 4. .env ファイルの作成
# ─────────────────────────────────────────────────────────────
echo ""
echo "▶ [4/5] 環境変数ファイルの確認..."

if [ ! -f ".env" ]; then
  cat > .env << 'EOF'
# Lovart API キー
# https://lovart.ai でアカウントを作成してAPIキーを取得してください
LOVART_API_KEY=your_lovart_api_key_here

# 出力設定
OUTPUT_DIR=videos
DEFAULT_FPS=30
DEFAULT_DURATION=10
EOF
  echo "✅ .env ファイルを作成しました（APIキーを設定してください）"
else
  echo "✅ .env ファイルは既に存在します"
fi

# ─────────────────────────────────────────────────────────────
# 5. 出力フォルダの作成
# ─────────────────────────────────────────────────────────────
echo ""
echo "▶ [5/5] フォルダ構造の確認..."

mkdir -p videos templates/assets

echo "✅ フォルダ構造OK"

# ─────────────────────────────────────────────────────────────
# 完了メッセージ
# ─────────────────────────────────────────────────────────────
echo ""
echo "================================================"
echo "  ✅ セットアップ完了！"
echo "================================================"
echo ""
echo "次のステップ："
echo ""
echo "  1. .env ファイルを開いて LOVART_API_KEY を設定"
echo "     （Lovartを使わない場合はスキップ可）"
echo ""
echo "  2. Claude Code に動画を作ってもらう："
echo "     /hyperframes 縦型15秒、商品紹介動画、青とホワイトのデザイン"
echo ""
echo "  3. または手動でテンプレートを試す："
echo "     npx hyperframes preview templates/social-video.html"
echo ""
echo "  4. MP4に書き出す："
echo "     npx hyperframes render templates/social-video.html"
echo ""
