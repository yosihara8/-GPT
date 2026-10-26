/**
 * AIメルマガ 自動配信スクリプト（Google Apps Script）
 *
 * 流れ（毎週金曜）
 *   12時台: createDraft()     … AIが最新情報を調べて原稿を作り、確認用アドレスへ下書きを送る
 *   17時台: sendNewsletter()  … 「承認」済みの原稿を、配信対象の人へ1通ずつ送る
 *   随時  : doGet()           … 配信停止リンク・開封の記録を受け付ける（ウェブアプリ）
 *
 * 初回は setup() を1回だけ実行してください。詳しくは README.md を参照。
 */

// ===== シート名・列 =====
const SHEET_LIST = '配信リスト';
const SHEET_SETTINGS = '設定';
const SHEET_DRAFTS = '原稿';
const SHEET_OPENS = '開封ログ';

const LIST_HEADERS = ['メールアドレス', '名前', '会社名', '配信状態', '同意区分', '同意取得日', '同意の方法・メモ', '停止日時'];
const DRAFT_HEADERS = ['号', '件名', '本文HTML', '状態', '作成日時', '送信日時', '送信数', '開封数（目安）'];
const OPEN_HEADERS = ['日時', '号', 'メールアドレス'];

// 特定電子メール法上、送ってよい区分（「不明」には送らない）
const SENDABLE_CONSENT = ['同意あり', '名刺交換', '取引先'];

const DEFAULT_SETTINGS = [
  ['送信者名', 'AI活用通信 編集部', 'メールの差出人として表示される名前'],
  ['送信元アドレス', '', '空欄＝このスクリプトを動かすGoogleアカウント。別アドレスはGmailの「送信元」に登録済みのものだけ使えます'],
  ['会社名', '', '法律上の表示（必須）'],
  ['住所', '', '法律上の表示（必須）'],
  ['お問い合わせ先', '', 'メールアドレスまたは電話番号（必須）'],
  ['お問い合わせURL', '', '例：お問い合わせフォームのURL'],
  ['サービス紹介', '', '自社サービスの1〜2行紹介文とURL'],
  ['セミナー案内', '', '次回セミナーの日時・内容・申込URL（無ければ空欄）'],
  ['コンサル案内', '', 'コンサルの紹介文と申込URL'],
  ['確認用アドレス', '', '毎週の下書きが届くアドレス'],
  ['確認モード', 'ON', 'ON＝原稿シートで「承認」にしたものだけ送信 / OFF＝完全自動'],
  ['原稿作成の時刻', '12', '金曜の何時台に原稿を作るか（0〜23）'],
  ['配信の時刻', '17', '金曜の何時台に配信するか（0〜23）'],
  ['AIモデル', 'claude-opus-5-5', '通常は変更不要'],
];

// ===== 初期設定 =====

/** 最初に1回だけ実行：シート作成・合言葉の生成・金曜の自動実行を登録 */
function setup() {
  const ss = SpreadsheetApp.getActive();
  ensureSheet_(ss, SHEET_LIST, LIST_HEADERS);
  ensureSheet_(ss, SHEET_DRAFTS, DRAFT_HEADERS);
  ensureSheet_(ss, SHEET_OPENS, OPEN_HEADERS);

  let st = ss.getSheetByName(SHEET_SETTINGS);
  if (!st) {
    st = ss.insertSheet(SHEET_SETTINGS);
    st.getRange(1, 1, 1, 3).setValues([['項目', '値', '説明']]).setFontWeight('bold');
    st.getRange(2, 1, DEFAULT_SETTINGS.length, 3).setValues(DEFAULT_SETTINGS);
    st.setColumnWidth(1, 160).setColumnWidth(2, 360).setColumnWidth(3, 480);
  }

  // 配信状態・同意区分はプルダウンにする
  const list = ss.getSheetByName(SHEET_LIST);
  list.getRange('D2:D').setDataValidation(
    SpreadsheetApp.newDataValidation().requireValueInList(['配信中', '停止'], true).build());
  list.getRange('E2:E').setDataValidation(
    SpreadsheetApp.newDataValidation().requireValueInList(SENDABLE_CONSENT.concat(['不明']), true).build());
  ss.getSheetByName(SHEET_DRAFTS).getRange('D2:D').setDataValidation(
    SpreadsheetApp.newDataValidation()
      .requireValueInList(['確認待ち', '承認', '送信中', '送信済み', '見送り'], true).build());

  const props = PropertiesService.getScriptProperties();
  if (!props.getProperty('SECRET')) {
    props.setProperty('SECRET', Utilities.getUuid() + Utilities.getUuid());
  }
  installTriggers();
  SpreadsheetApp.getActive().toast('初期設定が終わりました。README の手順3以降に進んでください。');
}

/** 金曜の自動実行を（再）登録。設定シートの時刻を変えたら再実行 */
function installTriggers() {
  ScriptApp.getProjectTriggers()
    .filter(t => ['createDraft', 'sendNewsletter'].includes(t.getHandlerFunction()))
    .forEach(t => ScriptApp.deleteTrigger(t));
  const s = getSettings_();
  ScriptApp.newTrigger('createDraft').timeBased()
    .onWeekDay(ScriptApp.WeekDay.FRIDAY).atHour(Number(s['原稿作成の時刻'] || 12)).create();
  ScriptApp.newTrigger('sendNewsletter').timeBased()
    .onWeekDay(ScriptApp.WeekDay.FRIDAY).atHour(Number(s['配信の時刻'] || 17)).create();
}

// ===== 1. 原稿づくり =====

function createDraft() {
  const s = getSettings_();
  const ss = SpreadsheetApp.getActive();
  const drafts = ss.getSheetByName(SHEET_DRAFTS);
  const issueNo = drafts.getLastRow(); // 見出し行を除いた件数＋1

  const recentSubjects = drafts.getLastRow() > 1
    ? drafts.getRange(Math.max(2, drafts.getLastRow() - 5), 2, Math.min(6, drafts.getLastRow() - 1), 1)
        .getValues().map(r => r[0]).filter(String)
    : [];

  let result;
  try {
    result = generateWithClaude_(s, recentSubjects);
  } catch (err) {
    notifyReviewer_(s, '【メルマガ】原稿の自動作成に失敗しました', '原因: ' + err.message +
      '\n\nスクリプトエディタで createDraft を手動実行すると、作り直せます。');
    throw err;
  }

  const autoMode = String(s['確認モード']).toUpperCase() === 'OFF';
  drafts.appendRow([issueNo, result.subject, result.bodyHtml, autoMode ? '承認' : '確認待ち', new Date(), '', '', 0]);
  const row = drafts.getLastRow();

  // 確認用アドレスへ、実際の見た目のまま送る
  if (s['確認用アドレス']) {
    const sample = { email: s['確認用アドレス'], name: '（確認用）' };
    const html = '<div style="background:#fff3cd;padding:12px;margin-bottom:16px;border-radius:6px;font-size:14px">' +
      (autoMode
        ? 'これは確認用の下書きです。確認モードがOFFのため、今日の配信時刻にこのまま送信されます。止めたい場合は原稿シート' + row + '行目の状態を「見送り」にしてください。'
        : 'これは確認用の下書きです。問題なければ、スプレッドシートの「原稿」シート ' + row + '行目の状態を<strong>「承認」</strong>に変えてください。件名・本文はそのシートで直接直せます。') +
      '</div>' + buildEmailHtml_(s, issueNo, result.bodyHtml, sample);
    GmailApp.sendEmail(s['確認用アドレス'], '【下書き確認】' + result.subject, htmlToText_(html),
      mailOptions_(s, html));
  }
}

function generateWithClaude_(s, recentSubjects) {
  const apiKey = PropertiesService.getScriptProperties().getProperty('ANTHROPIC_API_KEY');
  if (!apiKey) throw new Error('APIキーが未設定です（スクリプトプロパティ ANTHROPIC_API_KEY）');

  const today = Utilities.formatDate(new Date(), 'Asia/Tokyo', 'yyyy年M月d日');
  const system = [
    'あなたは、日本語の週刊メールマガジン「AI活用通信」の編集者です。',
    '',
    '# 読者',
    'ChatGPTやClaudeなどのチャット機能は日常的に使いこなしていて、AIエージェント（AIに作業を任せる使い方）を使い始めたばかりの社会人。',
    '基本的な用語の説明は不要ですが、エージェントについては「何ができて、どう始めればよいか」が具体的に分かると喜ばれます。',
    '',
    '# トーン',
    '丁寧で優しい語り口（です・ます調）。そのうえで、読み終えたときに「やってみよう！」と気持ちが高まる、情熱的で前向きな文章にしてください。',
    '煽りや誇張はせず、温かい熱量で背中を押すイメージです。',
    '',
    '# 構成',
    '1. 導入（2〜3文）：今週のAIの動きを一言で伝え、読む楽しみを感じさせる',
    '2. 今週のAIトピック（2〜3件）：各トピックに「何が起きたか」「読者にとって何がうれしいか」「さっそく試せる使い方」を書く。出典リンクを必ず付ける',
    '3. 今週のひと工夫：エージェントやチャットを仕事で使うための、すぐ試せる具体的なコツを1つ（手順やプロンプト例つき）',
    '4. 締め：読者を励ます情熱的なひと言',
    '',
    '# 守ること',
    '- web_searchで、直近7日程度のAI関連ニュース（新機能・新モデル・活用事例）を調べ、確認できた事実だけを書く。不確かなことは書かない',
    '- 数字・日付・製品名は検索結果で確かめたものだけを使う',
    '- 宛名・署名・会社の宣伝・配信停止の案内は書かない（後からシステムが付け足します）',
    '- 本文はスマホで3〜4分で読める分量（全角1,500〜2,200字程度）',
    '',
    '# 出力形式（これ以外は何も出力しない）',
    '<subject>件名（全角30字以内。開きたくなる、具体的な件名）</subject>',
    '<body>本文のHTML。使ってよいタグは h2, h3, p, ul, ol, li, strong, a(href) のみ。style属性は付けない</body>',
  ].join('\n');

  const user = '今日は' + today + '（金曜日）です。今週号の原稿を作ってください。' +
    (recentSubjects.length ? '\n最近の号の件名（内容が重ならないようにしてください）:\n- ' + recentSubjects.join('\n- ') : '');

  const messages = [{ role: 'user', content: user }];
  const texts = [];
  for (let i = 0; i < 5; i++) {
    const resp = callClaude_(apiKey, s['AIモデル'] || 'claude-opus-5-5', system, messages);
    if (resp.stop_reason === 'refusal') throw new Error('AIが作成を見送りました（refusal）');
    resp.content.filter(b => b.type === 'text').forEach(b => texts.push(b.text));
    if (resp.stop_reason !== 'pause_turn') break;
    // 検索の途中で一時停止した場合は、そのまま続きを依頼する
    messages.push({ role: 'assistant', content: resp.content });
  }

  const all = texts.join('');
  const subject = (all.match(/<subject>([\s\S]*?)<\/subject>/) || [])[1];
  const body = (all.match(/<body>([\s\S]*?)<\/body>/) || [])[1];
  if (!subject || !body) throw new Error('AIの出力形式が想定と違いました: ' + all.slice(0, 300));
  return { subject: subject.trim(), bodyHtml: sanitizeHtml_(body.trim()) };
}

function callClaude_(apiKey, model, system, messages) {
  const payload = {
    model: model,
    max_tokens: 16000,
    system: system,
    messages: messages,
    tools: [{ type: 'web_search_20260209', name: 'web_search', max_uses: 8 }],
    output_config: { effort: 'high' },
    fallbacks: 'default',
  };
  const res = UrlFetchApp.fetch('https://api.anthropic.com/v1/messages', {
    method: 'post',
    contentType: 'application/json',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-beta': 'server-side-fallback-2026-07-01',
    },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true,
  });
  const code = res.getResponseCode();
  if (code !== 200) throw new Error('Claude API エラー ' + code + ': ' + res.getContentText().slice(0, 500));
  return JSON.parse(res.getContentText());
}

// ===== 2. 配信 =====

function sendNewsletter() {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(30000)) return;
  try {
    const s = getSettings_();
    const ss = SpreadsheetApp.getActive();
    const drafts = ss.getSheetByName(SHEET_DRAFTS);
    if (drafts.getLastRow() < 2) return;

    // 最新の原稿を対象にする
    const row = drafts.getLastRow();
    const [issueNo, subject, bodyHtml, status] = drafts.getRange(row, 1, 1, 4).getValues()[0];
    if (status === '確認待ち') {
      notifyReviewer_(s, '【メルマガ】未承認のため、今週は送信していません',
        '原稿シート ' + row + '行目を「承認」にしてから、スクリプトエディタで sendNewsletter を実行すると送信できます。');
      return;
    }
    if (status !== '承認') return; // 送信済み・見送り

    const recipients = getRecipients_();
    if (MailApp.getRemainingDailyQuota() < recipients.length) {
      notifyReviewer_(s, '【メルマガ】送信上限が足りません',
        '今日送れる残り件数: ' + MailApp.getRemainingDailyQuota() + ' / 配信対象: ' + recipients.length);
      return;
    }

    drafts.getRange(row, 4).setValue('送信中');
    let sent = 0;
    const failed = [];
    recipients.forEach(r => {
      try {
        const html = buildEmailHtml_(s, issueNo, bodyHtml, r);
        GmailApp.sendEmail(r.email, subject, htmlToText_(html), mailOptions_(s, html));
        sent++;
      } catch (err) {
        failed.push(r.email + ': ' + err.message);
      }
    });
    drafts.getRange(row, 4, 1, 4).setValues([['送信済み', drafts.getRange(row, 5).getValue(), new Date(), sent]]);

    notifyReviewer_(s, '【メルマガ】第' + issueNo + '号を送信しました（' + sent + '件）',
      '件名: ' + subject + '\n送信: ' + sent + '件' +
      (failed.length ? '\n\n送れなかった宛先:\n' + failed.join('\n') : ''));
  } finally {
    lock.releaseLock();
  }
}

function getRecipients_() {
  const sh = SpreadsheetApp.getActive().getSheetByName(SHEET_LIST);
  if (sh.getLastRow() < 2) return [];
  const seen = {};
  return sh.getRange(2, 1, sh.getLastRow() - 1, 5).getValues()
    .map(([email, name, company, status, consent]) => ({
      email: String(email).trim().toLowerCase(), name: String(name).trim(), company, status, consent,
    }))
    .filter(r => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(r.email))
    .filter(r => r.status === '配信中' && SENDABLE_CONSENT.includes(r.consent))
    .filter(r => (seen[r.email] ? false : (seen[r.email] = true)));
}

/** 1人分のメール本文（宛名・本文・ご案内・法定表示・配信停止・開封記録） */
function buildEmailHtml_(s, issueNo, bodyHtml, r) {
  const webapp = PropertiesService.getScriptProperties().getProperty('WEBAPP_URL') || '';
  const token = tokenFor_(r.email);
  const q = 'e=' + encodeURIComponent(r.email) + '&t=' + token;
  const unsubUrl = webapp ? webapp + '?a=unsub&' + q : '';
  const pixel = webapp ? '<img src="' + webapp + '?a=open&i=' + issueNo + '&' + q + '" width="1" height="1" alt="" style="display:block;border:0">' : '';

  const promo = [
    ['自社サービス', s['サービス紹介']],
    ['セミナーのご案内', s['セミナー案内']],
    ['AI活用コンサルティング', s['コンサル案内']],
  ].filter(p => p[1]).map(p =>
    '<div style="margin:0 0 12px"><strong style="color:#c2410c">▶ ' + p[0] + '</strong><br>' + linkify_(esc_(p[1])) + '</div>').join('');

  return '<div style="max-width:640px;margin:0 auto;font-family:sans-serif;font-size:16px;line-height:1.8;color:#222">' +
    '<p style="color:#888;font-size:13px">AI活用通信 第' + issueNo + '号</p>' +
    '<p>' + (r.name ? esc_(r.name) + ' 様' : 'いつもお読みいただきありがとうございます。') + '</p>' +
    bodyHtml +
    (promo ? '<hr style="border:none;border-top:2px solid #f97316;margin:32px 0 16px">' + promo : '') +
    (s['お問い合わせURL'] ? '<p style="text-align:center;margin:24px 0"><a href="' + esc_(s['お問い合わせURL']) +
      '" style="background:#f97316;color:#fff;padding:12px 28px;border-radius:24px;text-decoration:none;font-weight:bold">お気軽にご相談ください</a></p>' : '') +
    '<hr style="border:none;border-top:1px solid #ddd;margin:24px 0 12px">' +
    '<div style="font-size:12px;color:#666;line-height:1.6">' +
    '発行：' + esc_(s['会社名']) + '（' + esc_(s['送信者名']) + '）<br>' +
    '住所：' + esc_(s['住所']) + '<br>' +
    'お問い合わせ：' + linkify_(esc_(s['お問い合わせ先'])) + '<br>' +
    (unsubUrl ? '配信停止をご希望の方は<a href="' + unsubUrl + '">こちら</a>から手続きできます（ワンクリックで完了します）。'
              : '配信停止をご希望の方は、このメールにご返信ください。') +
    '</div>' + pixel + '</div>';
}

function mailOptions_(s, html) {
  const o = { htmlBody: html, name: s['送信者名'] };
  if (s['送信元アドレス']) { o.from = s['送信元アドレス']; o.replyTo = s['送信元アドレス']; }
  return o;
}

// ===== 3. 配信停止・開封の受付（ウェブアプリ） =====

function doGet(e) {
  const p = e.parameter || {};
  const email = String(p.e || '').toLowerCase();
  const valid = email && p.t === tokenFor_(email);

  if (p.a === 'open') {
    if (valid) recordOpen_(String(p.i), email);
    return ContentService.createTextOutput('');
  }
  if (p.a === 'unsub') {
    if (!valid) return page_('リンクが正しくありません', 'お手数ですが、このメールに返信して配信停止をお知らせください。');
    unsubscribe_(email);
    return page_('配信を停止しました', esc_(email) + ' への配信を停止しました。これまでお読みいただき、ありがとうございました。');
  }
  return page_('AI活用通信', '');
}

function unsubscribe_(email) {
  const sh = SpreadsheetApp.getActive().getSheetByName(SHEET_LIST);
  const values = sh.getRange(2, 1, Math.max(sh.getLastRow() - 1, 1), 1).getValues();
  values.forEach((v, i) => {
    if (String(v[0]).trim().toLowerCase() === email) {
      sh.getRange(i + 2, 4).setValue('停止');
      sh.getRange(i + 2, 8).setValue(new Date());
    }
  });
}

function recordOpen_(issueNo, email) {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(10000)) return;
  try {
    const ss = SpreadsheetApp.getActive();
    const log = ss.getSheetByName(SHEET_OPENS);
    const rows = log.getLastRow() > 1 ? log.getRange(2, 2, log.getLastRow() - 1, 2).getValues() : [];
    if (rows.some(r => String(r[0]) === issueNo && r[1] === email)) return; // 同じ人の2回目以降は数えない
    log.appendRow([new Date(), issueNo, email]);

    const drafts = ss.getSheetByName(SHEET_DRAFTS);
    const ids = drafts.getRange(2, 1, Math.max(drafts.getLastRow() - 1, 1), 1).getValues();
    const idx = ids.findIndex(r => String(r[0]) === issueNo);
    if (idx >= 0) {
      const cell = drafts.getRange(idx + 2, 8);
      cell.setValue(Number(cell.getValue() || 0) + 1);
    }
  } finally {
    lock.releaseLock();
  }
}

// ===== 共通 =====

function getSettings_() {
  const sh = SpreadsheetApp.getActive().getSheetByName(SHEET_SETTINGS);
  const out = {};
  if (!sh) return out;
  sh.getRange(2, 1, Math.max(sh.getLastRow() - 1, 1), 2).getValues().forEach(([k, v]) => { if (k) out[k] = String(v).trim(); });
  return out;
}

function ensureSheet_(ss, name, headers) {
  let sh = ss.getSheetByName(name);
  if (!sh) sh = ss.insertSheet(name);
  if (sh.getLastRow() === 0) {
    sh.getRange(1, 1, 1, headers.length).setValues([headers]).setFontWeight('bold');
    sh.setFrozenRows(1);
  }
  return sh;
}

function tokenFor_(email) {
  const secret = PropertiesService.getScriptProperties().getProperty('SECRET');
  const sig = Utilities.computeHmacSha256Signature(email, secret);
  return Utilities.base64EncodeWebSafe(sig).replace(/=+$/, '').slice(0, 22);
}

function notifyReviewer_(s, subject, text) {
  const to = s['確認用アドレス'] || Session.getEffectiveUser().getEmail();
  if (to) GmailApp.sendEmail(to, subject, text, s['送信元アドレス'] ? { from: s['送信元アドレス'] } : {});
}

function page_(title, message) {
  return HtmlService.createHtmlOutput(
    '<div style="font-family:sans-serif;max-width:480px;margin:60px auto;text-align:center;line-height:1.8">' +
    '<h2>' + esc_(title) + '</h2><p>' + message + '</p></div>')
    .setTitle(title)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

/** AIが出したHTMLから、危ない要素を取り除く */
function sanitizeHtml_(html) {
  return html
    .replace(/<(script|style|iframe|object|embed|form)[\s\S]*?<\/\1>/gi, '')
    .replace(/<(script|style|iframe|object|embed|form|img|input|meta|link)[^>]*>/gi, '')
    .replace(/\s(on\w+|style)\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '')
    .replace(/href\s*=\s*(["'])\s*javascript:[^"']*\1/gi, 'href="#"');
}

function htmlToText_(html) {
  return html
    .replace(/<a [^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi, '$2（$1）')
    .replace(/<(br|\/p|\/h2|\/h3|\/li|\/div|hr)[^>]*>/gi, '\n')
    .replace(/<li[^>]*>/gi, '・')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, '\n\n').trim();
}

function esc_(v) {
  return String(v == null ? '' : v)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function linkify_(escaped) {
  return escaped.replace(/https?:\/\/[^\s<（）]+/g, u => '<a href="' + u + '">' + u + '</a>');
}
