"""AI SME オンライン派遣サービス チラシ (A4) PDF 生成スクリプト"""

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import cm
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib.enums import TA_CENTER
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont

# 日本語フォントを登録
# Helvetica など標準フォントは日本語グリフを持たず、
# reportlab 組み込みの CID フォント（HeiseiKakuGo-W5 等）は
# 半角スペースの文字幅が 0 に近く「AI SME」のような半角混じり文言で
# スペースが消えてしまうため、実体を持つ TrueType フォント（IPAGothic）を使う。
_JP_FONT_PATH = '/usr/share/fonts/opentype/ipafont-gothic/ipag.ttf'
pdfmetrics.registerFont(TTFont('IPAGothic', _JP_FONT_PATH))
# 太字ウェイトが別途用意できないため、同じ字形を Bold 名でも登録し、
# <b> タグやボールドスタイル指定でフォント未検出エラーが出ないようにする。
pdfmetrics.registerFont(TTFont('IPAGothic-Bold', _JP_FONT_PATH))
pdfmetrics.registerFontFamily('IPAGothic', normal='IPAGothic', bold='IPAGothic-Bold')

FONT_BOLD = 'IPAGothic-Bold'
FONT_NORMAL = 'IPAGothic'

# A4 サイズの設定
page_width, page_height = A4

# PDF 作成
doc = SimpleDocTemplate(
    "AI_SME_Flyer_A4.pdf",
    pagesize=A4,
    rightMargin=1.5*cm,
    leftMargin=1.5*cm,
    topMargin=1.5*cm,
    bottomMargin=1.5*cm
)

# スタイル定義
styles = getSampleStyleSheet()

# カスタムスタイル
title_style = ParagraphStyle(
    'CustomTitle',
    parent=styles['Heading1'],
    fontSize=28,
    textColor=colors.HexColor('#1a73e8'),
    alignment=TA_CENTER,
    spaceAfter=20,
    fontName=FONT_BOLD
)

subtitle_style = ParagraphStyle(
    'CustomSubtitle',
    parent=styles['Heading2'],
    fontSize=18,
    textColor=colors.HexColor('#333333'),
    alignment=TA_CENTER,
    spaceAfter=15,
    fontName=FONT_BOLD
)

heading_style = ParagraphStyle(
    'CustomHeading',
    parent=styles['Heading3'],
    fontSize=16,
    textColor=colors.HexColor('#1a73e8'),
    spaceAfter=10,
    fontName=FONT_BOLD
)

body_style = ParagraphStyle(
    'CustomBody',
    parent=styles['Normal'],
    fontSize=11,
    textColor=colors.HexColor('#333333'),
    spaceAfter=8,
    leading=16,
    fontName=FONT_NORMAL
)

bullet_style = ParagraphStyle(
    'CustomBullet',
    parent=styles['Normal'],
    fontSize=11,
    textColor=colors.HexColor('#444444'),
    spaceAfter=6,
    leading=15,
    leftIndent=20,
    fontName=FONT_NORMAL
)

# 要素作成
story = []

# ヘッダー（青い帯）
def draw_header(canvas, doc):
    canvas.saveState()
    # 青い帯
    canvas.setFillColor(colors.HexColor('#1a73e8'))
    canvas.rect(0, page_height - 4*cm, page_width, 4*cm, fill=1, stroke=0)
    # アイコン（円 + AI 文字の簡易表現。絵文字は標準/CIDフォントで描画できないため図形で代用）
    canvas.setFillColor(colors.white)
    canvas.circle(page_width/2, page_height - 2*cm, 1.2*cm, fill=1, stroke=0)
    canvas.setFillColor(colors.HexColor('#1a73e8'))
    canvas.setFont('Helvetica-Bold', 22)
    canvas.drawCentredString(page_width/2, page_height - 2*cm - 0.35*cm, "AI")
    canvas.restoreState()

# フッター
def draw_footer(canvas, doc):
    canvas.saveState()
    canvas.setFillColor(colors.HexColor('#1a73e8'))
    canvas.rect(0, 0, page_width, 1.5*cm, fill=1, stroke=0)
    canvas.setFillColor(colors.white)
    canvas.setFont(FONT_NORMAL, 10)
    canvas.drawCentredString(page_width/2, 0.5*cm, "【佐賀県拠点】AI SME オンライン派遣サービス | 無料相談：090-XXXX-XXXX（担当：Eight）")
    canvas.restoreState()

# タイトルセクション
# ヘッダー帯は高さ 4cm で先頭ページ上部に描画される。topMargin(1.5cm) だけでは
# 帯の下に本文が潜り込むため、帯の高さ分を確保するスペーサーを入れる。
story.append(Spacer(1, 2.8*cm))
story.append(Paragraph("AI を使いたいのに、", title_style))
story.append(Paragraph("誰がやればいいかわからない？", title_style))
story.append(Spacer(1, 0.5*cm))
story.append(Paragraph("その悩み、中小企業の 6 割が抱えています。", subtitle_style))
story.append(Spacer(1, 1*cm))

# お悩みチェックボックス
story.append(Paragraph("こんなお悩みありませんか？", heading_style))

problem_data = [
    ['✓', 'AI 研修は受けたが、現場で全然使えていない'],
    ['✓', '社長が個人で ChatGPT は触っているが、会社としては止まっている'],
    ['✓', '「人手不足なので AI で何とかしたい」が、何から始めればいいか全くわからない'],
    ['✓', '社内に「AI を推進できる人」がいない…']
]

problem_data = [
    [Paragraph(row[0], body_style), Paragraph(row[1], body_style)]
    for row in problem_data
]

problem_table = Table(problem_data, colWidths=[0.8*cm, 14*cm])
problem_table.setStyle(TableStyle([
    ('BACKGROUND', (0, 0), (0, -1), colors.HexColor('#f0f7ff')),
    ('TEXTCOLOR', (0, 0), (-1, -1), colors.HexColor('#333333')),
    ('FONTSIZE', (0, 0), (-1, -1), 11),
    ('BOTTOMPADDING', (0, 0), (-1, -1), 10),
    ('TOPPADDING', (0, 0), (-1, -1), 10),
    ('LEFTPADDING', (0, 0), (-1, -1), 10),
    ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#1a73e8')),
    ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#f8fbff')),
]))
story.append(problem_table)
story.append(Spacer(1, 1*cm))

# 主要メッセージ（目立つボックス）
story.append(Paragraph("1 ヶ月間、完全無料。", subtitle_style))
story.append(Paragraph("あなたの会社に「AI 専門家」を派遣します。", subtitle_style))
story.append(Spacer(1, 0.5*cm))

# サービス名ボックス
service_data = [[Paragraph('「AI SME オンライン派遣」', ParagraphStyle(
    'ServiceName', fontName=FONT_BOLD, fontSize=20, textColor=colors.white, alignment=TA_CENTER))]]
service_table = Table(service_data, colWidths=[17*cm])
service_table.setStyle(TableStyle([
    ('BACKGROUND', (0, 0), (0, 0), colors.HexColor('#1a73e8')),
    ('BOTTOMPADDING', (0, 0), (0, 0), 15),
    ('TOPPADDING', (0, 0), (0, 0), 15),
    ('ALIGN', (0, 0), (0, 0), 'CENTER'),
    ('GRID', (0, 0), (0, 0), 2, colors.HexColor('#1a73e8')),
]))
story.append(service_table)
story.append(Spacer(1, 1*cm))

# 成果セクション
story.append(Paragraph("1 ヶ月間で、必ずこうなります。", heading_style))

result_data = [
    ['✓', '自社で最初に AI 化すべき業務 1 つが明確になる'],
    ['✓', 'その業務の「AI 運用手順書」と「プロンプト」が完成する'],
    ['✓', '社長または担当者が、一人でその業務を AI で回せる状態になる']
]
result_data = [
    [Paragraph(row[0], body_style), Paragraph(row[1], body_style)]
    for row in result_data
]

result_table = Table(result_data, colWidths=[0.8*cm, 14*cm])
result_table.setStyle(TableStyle([
    ('BACKGROUND', (0, 0), (0, -1), colors.HexColor('#e8f5e9')),
    ('TEXTCOLOR', (0, 0), (-1, -1), colors.HexColor('#333333')),
    ('FONTSIZE', (0, 0), (-1, -1), 11),
    ('BOTTOMPADDING', (0, 0), (-1, -1), 10),
    ('TOPPADDING', (0, 0), (-1, -1), 10),
    ('LEFTPADDING', (0, 0), (-1, -1), 10),
    ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#4caf50')),
    ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#f1f8e9')),
]))
story.append(result_table)
story.append(Spacer(1, 0.5*cm))

story.append(Paragraph("「30 日後、必ず 1 つの業務が AI で自動化されている」",
                      ParagraphStyle('Quote', parent=body_style, alignment=TA_CENTER, fontSize=13, textColor=colors.HexColor('#2e7d32'), fontName=FONT_BOLD)))
story.append(Spacer(1, 1*cm))

# 対象事業者
story.append(Paragraph("対象はこんな事業者さん", heading_style))

target_data = [
    ['•', '従業員 10〜50 名程度の中小企業・個人事業主'],
    ['•', '「AI 研修は受けていない」'],
    ['•', '「人手不足で AI に期待しているが、何から始めればいいかわからない」']
]
target_data = [
    [Paragraph(row[0], body_style), Paragraph(row[1], body_style)]
    for row in target_data
]

target_table = Table(target_data, colWidths=[0.8*cm, 14*cm])
target_table.setStyle(TableStyle([
    ('TEXTCOLOR', (0, 0), (-1, -1), colors.HexColor('#333333')),
    ('FONTSIZE', (0, 0), (-1, -1), 11),
    ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
    ('TOPPADDING', (0, 0), (-1, -1), 6),
    ('LEFTPADDING', (0, 0), (-1, -1), 6),
]))
story.append(target_table)
story.append(Spacer(1, 0.3*cm))
story.append(Paragraph("対応方法：オンラインのみ（佐賀県拠点ですが、全国対応可能です）",
                      ParagraphStyle('Note', parent=body_style, fontSize=10, textColor=colors.HexColor('#666666'))))
story.append(Spacer(1, 1*cm))

# 実績例
story.append(Paragraph("実績例", heading_style))

case_cell_style = ParagraphStyle('CaseCell', parent=body_style, fontSize=10)
case_head_style = ParagraphStyle('CaseHead', parent=body_style, fontSize=10, fontName=FONT_BOLD)

case_data = [
    [Paragraph('【A 社：飲食店、従業員 12 名】', case_head_style), Paragraph('【B 社：小売店、従業員 8 名】', case_head_style)],
    [Paragraph('課題：シフト作成に毎月 8 時間', case_cell_style),
     Paragraph('課題：商品説明の SNS 投稿を週 3 本作成（1 本 30 分）', case_cell_style)],
    [Paragraph('1 ヶ月後：AI がシフト案を作成し、店長は最終調整のみ<br/>（8 時間→1 時間に短縮）', case_cell_style),
     Paragraph('1 ヶ月後：AI が下書きを作成し、店長は加筆のみ<br/>（90 分→15 分に短縮）', case_cell_style)],
]

case_table = Table(case_data, colWidths=[8.5*cm, 8.5*cm])
case_table.setStyle(TableStyle([
    ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#fff3e0')),
    ('TEXTCOLOR', (0, 0), (-1, -1), colors.HexColor('#333333')),
    ('FONTSIZE', (0, 0), (-1, -1), 10),
    ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
    ('TOPPADDING', (0, 0), (-1, -1), 8),
    ('LEFTPADDING', (0, 0), (-1, -1), 10),
    ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#ff9800')),
    ('VALIGN', (0, 0), (-1, -1), 'TOP'),
]))
story.append(case_table)
story.append(Spacer(1, 1*cm))

# なぜ無料か
story.append(Paragraph("なぜ、1 ヶ月無料なのか？", heading_style))
story.append(Paragraph("多くの中小企業様は、「AI に興味はあるが、本当に効果があるかわからない」と思っています。そこで、まずは 1 ヶ月間、完全無料で「AI で業務がどう変わるか」を実感していただきたいと考えました。", body_style))
story.append(Paragraph("1 ヶ月後に「これは使える！」と思っていただければ、2 ヶ月目から有料プランへ。「思ったほどじゃなかった」と思われれば、そのまま終了で OK です。「無料期間中にどこまで価値を見せられるか」に、私たちは全精力を注ぎます。", body_style))
story.append(Spacer(1, 1*cm))

# 料金プラン
story.append(Paragraph("料金プラン（2 ヶ月目から有料）", heading_style))

plan_body_style = ParagraphStyle('PlanBody', parent=body_style, fontSize=10, textColor=colors.HexColor('#333333'))
plan_goal_style = ParagraphStyle('PlanGoal', parent=body_style, fontSize=10, textColor=colors.HexColor('#333333'))


def plan_price_style(bg_color):
    return ParagraphStyle('PlanPrice', fontName=FONT_BOLD, fontSize=16, textColor=colors.white, leading=20)


def build_plan_table(title, price, feature_lines, goal, head_bg, price_bg, grid_color):
    data = [
        [Paragraph(title, ParagraphStyle('PlanTitle', fontName=FONT_BOLD, fontSize=14, textColor=colors.HexColor('#333333')))],
        [Paragraph(price, plan_price_style(price_bg))],
    ]
    for line in feature_lines:
        data.append([Paragraph(line, plan_body_style)])
    data.append([Paragraph(goal, ParagraphStyle('PlanGoal', parent=plan_goal_style, fontSize=10))])

    table = Table(data, colWidths=[17*cm])
    style_cmds = [
        ('BACKGROUND', (0, 0), (0, 0), head_bg),
        ('BACKGROUND', (0, 1), (0, 1), price_bg),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
        ('TOPPADDING', (0, 0), (-1, -1), 8),
        ('LEFTPADDING', (0, 0), (-1, -1), 15),
        ('GRID', (0, 0), (-1, -1), 1, grid_color),
    ]
    table.setStyle(TableStyle(style_cmds))
    return table

story.append(build_plan_table(
    'AI スタート（基本相談型）',
    '月額 3.5 万円（税別）',
    [
        '• 月 2 回×各 1 時間のオンライン MTG　• チャットでの日常相談',
        '• 最初に AI 化すべき業務 1 つを特定　• その業務の「AI 運用手順書」と「プロンプト」',
    ],
    '成果目標：月間 10 時間以上の工数削減',
    colors.HexColor('#e3f2fd'), colors.HexColor('#1a73e8'), colors.HexColor('#1a73e8')
))
story.append(Spacer(1, 0.5*cm))

story.append(build_plan_table(
    'AI 本格（軽量伴走型）【主力プラン】',
    '月額 8 万円（税別）',
    [
        '• 月 2 回×各 2 時間のオンライン MTG　• チャットでの日常相談',
        '• 新たに AI 化したい業務の追加（月 1 業務まで）　• 効果測定シート（月 1 回）',
        '• 社内研修（オンライン・1 時間×1 回）',
    ],
    '成果目標：月間 30 時間以上の工数削減',
    colors.HexColor('#fff3e0'), colors.HexColor('#ff9800'), colors.HexColor('#ff9800')
))
story.append(Spacer(1, 0.5*cm))

story.append(build_plan_table(
    'AI 経営（標準顧問型）',
    '月額 15 万円（税別）',
    [
        '• 月 4 回×各 2 時間のオンライン MTG　• チャットでの日常相談',
        '• 全業務の AI 化ロードマップ作成　• 社内研修（オンライン・2 時間×2 回）',
        '• 効果測定ダッシュボード（月 1 回）',
    ],
    '成果目標：月間 100 時間以上の工数削減',
    colors.HexColor('#f3e5f5'), colors.HexColor('#9c27b0'), colors.HexColor('#9c27b0')
))
story.append(Spacer(1, 1*cm))

# CTA セクション
story.append(Spacer(1, 0.5*cm))
story.append(Paragraph("まずは 1 ヶ月、完全無料でお試しください。",
                      ParagraphStyle('CTA', parent=subtitle_style, fontSize=16, textColor=colors.HexColor('#1a73e8'))))
story.append(Paragraph("2 ヶ月目から有料ですが、その頃には「もう手放せない」状態になっています。",
                      ParagraphStyle('CTA2', parent=body_style, alignment=TA_CENTER, fontSize=12)))
story.append(Spacer(1, 1*cm))

# QR コードプレースホルダー
qr_cell_style = ParagraphStyle('QRCell', fontName=FONT_NORMAL, fontSize=14, textColor=colors.HexColor('#333333'), alignment=TA_CENTER)
qr_data = [[Paragraph('[QR コード配置]', qr_cell_style)], [Paragraph('無料相談申込：30 秒で完了', qr_cell_style)]]
qr_table = Table(qr_data, colWidths=[17*cm])
qr_table.setStyle(TableStyle([
    ('BACKGROUND', (0, 0), (0, 0), colors.HexColor('#f5f5f5')),
    ('BOTTOMPADDING', (0, 0), (-1, -1), 20),
    ('TOPPADDING', (0, 0), (-1, -1), 20),
    ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
    ('GRID', (0, 0), (-1, -1), 1, colors.HexColor('#cccccc')),
]))
story.append(qr_table)

# PDF 生成
doc.build(story, onFirstPage=draw_header, onLaterPages=draw_footer)

print("A4 チラシ PDF を作成しました：AI_SME_Flyer_A4.pdf")
