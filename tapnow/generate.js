/**
 * TapNow.ai 動画自動生成スクリプト
 * 実行: node generate.js
 */
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const SESSION_PATH = path.join(__dirname, 'session.json');
const PRODUCT = JSON.parse(fs.readFileSync(path.join(__dirname, 'product.json'), 'utf-8'));

async function generateVideo() {
  if (!fs.existsSync(SESSION_PATH)) {
    console.error('セッションファイルが見つかりません。先に save-session.js を実行してください。');
    process.exit(1);
  }

  const outputDir = path.resolve(__dirname, PRODUCT.outputDir);
  fs.mkdirSync(outputDir, { recursive: true });

  const browser = await chromium.launch({
    headless: process.env.CI === 'true',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const context = await browser.newContext({
    storageState: SESSION_PATH,
    acceptDownloads: true
  });

  const page = await context.newPage();

  try {
    console.log('TapNow.ai にアクセス中...');
    await page.goto('https://app.tapnow.ai/home', { waitUntil: 'networkidle', timeout: 60000 });

    // ログイン確認
    const url = page.url();
    if (url.includes('login') || url.includes('signin')) {
      console.error('セッションが切れています。save-session.js を再実行してください。');
      process.exit(1);
    }

    console.log('新規プロジェクト作成中...');
    // 「Create」または「New」ボタンを探してクリック
    const createBtn = page.locator('button, a').filter({ hasText: /create|new|作成|新規/i }).first();
    await createBtn.waitFor({ timeout: 15000 });
    await createBtn.click();
    await page.waitForTimeout(2000);

    // 画像アップロード
    const imagePath = path.resolve(__dirname, PRODUCT.imagePath);
    if (fs.existsSync(imagePath)) {
      console.log('画像をアップロード中...');
      const fileInput = page.locator('input[type="file"]').first();
      await fileInput.setInputFiles(imagePath);
      await page.waitForTimeout(3000);
    } else {
      console.warn(`画像ファイルが見つかりません: ${imagePath}`);
    }

    // 商品説明テキスト入力
    console.log('商品説明を入力中...');
    const textArea = page.locator('textarea, [contenteditable="true"]').first();
    await textArea.waitFor({ timeout: 10000 });
    await textArea.fill(PRODUCT.description);
    await page.waitForTimeout(1000);

    // 生成ボタンをクリック
    console.log('動画を生成中...');
    const generateBtn = page.locator('button').filter({ hasText: /generate|生成|create|start/i }).first();
    await generateBtn.waitFor({ timeout: 10000 });
    await generateBtn.click();

    // 生成完了を待つ（最大10分）
    console.log('生成完了を待っています（最大10分）...');
    await page.waitForSelector('[data-status="completed"], .video-ready, video', {
      timeout: 600000
    });

    // ダウンロード
    console.log('動画をダウンロード中...');
    const downloadBtn = page.locator('button, a').filter({ hasText: /download|ダウンロード/i }).first();

    const [download] = await Promise.all([
      page.waitForEvent('download'),
      downloadBtn.click()
    ]);

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const savePath = path.join(outputDir, `video_${timestamp}.mp4`);
    await download.saveAs(savePath);

    console.log(`動画を保存しました: ${savePath}`);

  } catch (err) {
    console.error('エラーが発生しました:', err.message);

    // スクリーンショットを保存してデバッグ用に残す
    const screenshotPath = path.join(outputDir, `error_${Date.now()}.png`);
    await page.screenshot({ path: screenshotPath, fullPage: true });
    console.log(`スクリーンショットを保存しました: ${screenshotPath}`);
    process.exit(1);

  } finally {
    await browser.close();
  }
}

generateVideo();
