#!/usr/bin/env bash
# SagaMap 用 Google Maps Platform 自動セットアップ
# Google Cloud Shell（https://shell.cloud.google.com）に貼り付けて実行します。
# 事前に https://console.cloud.google.com/billing でクレジットカードを登録しておいてください。
set -u

PROJECT_ID="sagamap-$(date +%y%m%d%H%M)"
DOMAIN="sagamap.jp"

echo "▶ 1/5 請求先アカウントを確認しています…"
BILLING=$(gcloud billing accounts list --filter="open=true" --format="value(name)" --limit=1)
if [ -z "$BILLING" ]; then
  echo "✖ 有効な請求先アカウントが見つかりません。https://console.cloud.google.com/billing でカードを登録してから、もう一度実行してください。"
  exit 1
fi

echo "▶ 2/5 プロジェクト ${PROJECT_ID} を作成しています…"
gcloud projects create "$PROJECT_ID" --name="SagaMap" || exit 1
gcloud billing projects link "$PROJECT_ID" --billing-account="$BILLING" >/dev/null || exit 1

echo "▶ 3/5 API を有効にしています…（1〜2 分かかります）"
gcloud services enable apikeys.googleapis.com maps-backend.googleapis.com geocoding-backend.googleapis.com --project="$PROJECT_ID" || exit 1
TARGETS="--api-target=service=maps-backend.googleapis.com"
for api in directions-backend distance-matrix-backend; do
  if gcloud services enable "${api}.googleapis.com" --project="$PROJECT_ID" 2>/dev/null; then
    TARGETS="$TARGETS --api-target=service=${api}.googleapis.com"
  else
    echo "  ⚠ ${api} は有効にできませんでした（Google の旧版 API のため）。"
  fi
done

echo "▶ 4/5 API キーを作成しています…"
# shellcheck disable=SC2086
gcloud services api-keys create --project="$PROJECT_ID" --display-name="SagaMap browser" \
  --allowed-referrers="https://${DOMAIN}/*,https://www.${DOMAIN}/*,http://localhost:3000/*" $TARGETS >/dev/null 2>&1 || exit 1
gcloud services api-keys create --project="$PROJECT_ID" --display-name="SagaMap server" \
  --api-target=service=geocoding-backend.googleapis.com >/dev/null 2>&1 || exit 1

key_string() {
  local name
  name=$(gcloud services api-keys list --project="$PROJECT_ID" --filter="displayName='$1'" --format="value(name)" --limit=1)
  gcloud services api-keys get-key-string "$name" --format="value(keyString)"
}
BROWSER_KEY=$(key_string "SagaMap browser")
SERVER_KEY=$(key_string "SagaMap server")

echo "▶ 5/5 完了しました！ 下の 2 行を sagamap/.env.local に貼り付けてください。"
echo "------------------------------------------------------------"
echo "NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=${BROWSER_KEY}"
echo "GOOGLE_MAPS_SERVER_KEY=${SERVER_KEY}"
echo "------------------------------------------------------------"
echo "プロジェクト: https://console.cloud.google.com/google/maps-apis/overview?project=${PROJECT_ID}"
