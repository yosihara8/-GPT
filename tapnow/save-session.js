/**
 * 初回のみ実行: ブラウザを開いてGoogleログインし、セッションを保存する
 * 実行: node save-session.js
 */
const { chromium } = require('playwright');
const path = require('path');

(async () => {
  const sessionPath = path.join(__dirname, 'session.json');

  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  await page.goto('https://app.tapnow.ai/home');

  console.log('ブラウザでGoogleログインしてください。');
  console.log('ログイン完了後、TapNow.aiのホーム画面が表示されたらEnterを押してください。');

  // ログイン完了待ち
  await new Promise(resolve => {
    process.stdin.once('data', resolve);
  });

  await context.storageState({ path: sessionPath });
  console.log(`セッションを保存しました: ${sessionPath}`);

  await browser.close();
  process.exit(0);
})();
