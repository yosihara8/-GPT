#!/usr/bin/env node
/**
 * Lovart API クライアント
 * テキスト指示から画像・動画素材を生成します
 *
 * 使い方:
 *   node scripts/lovart.js "青いグラデーション背景、未来的なデザイン"
 *   node scripts/lovart.js "桜の花びら素材" --output templates/assets/
 *   node scripts/lovart.js "商品ロゴアニメーション" --type video
 */

const https = require("https");
const fs = require("fs");
const path = require("path");

// .env ファイルを読み込む
function loadEnv() {
  const envPath = path.join(__dirname, "..", ".env");
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, "utf8").split("\n");
    for (const line of lines) {
      const [key, ...vals] = line.split("=");
      if (key && !key.startsWith("#")) {
        process.env[key.trim()] = vals.join("=").trim();
      }
    }
  }
}

// コマンドライン引数を解析する
function parseArgs() {
  const args = process.argv.slice(2);
  const prompt = args.find((a) => !a.startsWith("--")) || "";
  const outputDir =
    args.includes("--output")
      ? args[args.indexOf("--output") + 1]
      : "templates/assets";
  const type = args.includes("--type")
    ? args[args.indexOf("--type") + 1]
    : "image";
  return { prompt, outputDir, type };
}

// Lovart API を呼び出す
async function generateWithLovart(prompt, type = "image") {
  const apiKey = process.env.LOVART_API_KEY;

  if (!apiKey || apiKey === "your_lovart_api_key_here") {
    console.log("⚠️  LOVART_API_KEY が設定されていません");
    console.log("   .env ファイルにAPIキーを追加してください");
    console.log("   取得先: https://lovart.ai");
    console.log("");
    console.log("📌 デモモード: サンプル素材を代わりに使用します");
    return generatePlaceholder(prompt, type);
  }

  console.log(`🎨 Lovart API で生成中: "${prompt}"`);

  return new Promise((resolve, reject) => {
    const payload = JSON.stringify({
      prompt: prompt,
      type: type,           // "image" or "video"
      style: "realistic",
      aspect_ratio: type === "video" ? "9:16" : "1:1",
      quality: "high",
    });

    const options = {
      hostname: "api.lovart.ai",
      path: "/v1/generate",
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
        "Content-Length": Buffer.byteLength(payload),
      },
    };

    const req = https.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => { data += chunk; });
      res.on("end", () => {
        try {
          const result = JSON.parse(data);
          if (result.error) {
            reject(new Error(`Lovart API エラー: ${result.error}`));
          } else {
            resolve(result);
          }
        } catch {
          reject(new Error("APIレスポンスの解析に失敗しました"));
        }
      });
    });

    req.on("error", reject);
    req.write(payload);
    req.end();
  });
}

// APIキーがない場合のプレースホルダー生成
function generatePlaceholder(prompt, type) {
  const timestamp = Date.now();
  const colors = ["#29abe2", "#1a7fb5", "#4ecdc4", "#ff6b6b", "#ffd93d"];
  const color = colors[Math.floor(Math.random() * colors.length)];

  const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1080">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:${color};stop-opacity:1" />
      <stop offset="100%" style="stop-color:#1a1a2e;stop-opacity:1" />
    </linearGradient>
  </defs>
  <rect width="1080" height="1080" fill="url(#bg)"/>
  <text x="540" y="500" text-anchor="middle" font-family="sans-serif"
        font-size="36" fill="white" opacity="0.9">
    [Lovart生成素材]
  </text>
  <text x="540" y="560" text-anchor="middle" font-family="sans-serif"
        font-size="24" fill="white" opacity="0.6">
    ${prompt.substring(0, 40)}
  </text>
</svg>`;

  return {
    id: `placeholder_${timestamp}`,
    type: type,
    format: "svg",
    content: svgContent,
    isPlaceholder: true,
  };
}

// ファイルを保存する
function saveResult(result, outputDir, prompt) {
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const timestamp = Date.now();
  const safeName = prompt
    .substring(0, 20)
    .replace(/[^a-zA-Z0-9぀-鿿]/g, "_");

  let filename, content;

  if (result.isPlaceholder) {
    filename = `placeholder_${safeName}_${timestamp}.svg`;
    content = result.content;
    fs.writeFileSync(path.join(outputDir, filename), content, "utf8");
  } else if (result.url) {
    // 実際のAPIからURLが返ってきた場合（ダウンロードが必要）
    filename = `lovart_${safeName}_${timestamp}.${result.format || "png"}`;
    console.log(`📥 ダウンロード中: ${result.url}`);
    // ダウンロード処理（本番実装では fetch を使う）
    fs.writeFileSync(
      path.join(outputDir, filename),
      `URL: ${result.url}`,
      "utf8"
    );
  } else if (result.base64) {
    filename = `lovart_${safeName}_${timestamp}.${result.format || "png"}`;
    const buffer = Buffer.from(result.base64, "base64");
    fs.writeFileSync(path.join(outputDir, filename), buffer);
  }

  return path.join(outputDir, filename);
}

// メイン処理
async function main() {
  loadEnv();
  const { prompt, outputDir, type } = parseArgs();

  if (!prompt) {
    console.log("使い方: node scripts/lovart.js <プロンプト> [--output <フォルダ>] [--type image|video]");
    console.log("");
    console.log("例:");
    console.log('  node scripts/lovart.js "青いグラデーション背景"');
    console.log('  node scripts/lovart.js "桜の花びら" --output templates/assets/');
    console.log('  node scripts/lovart.js "ロゴアニメーション" --type video');
    process.exit(1);
  }

  try {
    const result = await generateWithLovart(prompt, type);
    const savedPath = saveResult(result, outputDir, prompt);

    console.log(`✅ 素材を生成しました: ${savedPath}`);
    console.log("");

    if (result.isPlaceholder) {
      console.log("💡 本番の画像を生成するには .env に LOVART_API_KEY を設定してください");
    }

    // HTML で使いやすい形式で出力
    console.log("HTMLでの使い方:");
    console.log(`  <img src="${savedPath}" alt="${prompt}">`);

  } catch (err) {
    console.error(`❌ エラー: ${err.message}`);
    process.exit(1);
  }
}

main();
