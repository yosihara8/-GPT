-- SagaMap サンプルデータ（座標は佐賀県内の概略位置。ダミーです）
-- デモアカウントのパスワードはすべて "password123"

INSERT INTO business_owners (id, name, email, password_hash, plan, monthly_price) VALUES
  (1, '佐賀 太郎', 'owner@example.com', '$2a$10$F45UBWt.15kgnbhKtRoN8.ykMZ4JnojOHpMbcf6lrFwIxPripvbJu', 'premium', 3980),
  (2, '有田 花子', 'free-owner@example.com', '$2a$10$F45UBWt.15kgnbhKtRoN8.ykMZ4JnojOHpMbcf6lrFwIxPripvbJu', 'free', 3980),
  (3, 'サンプル事業者', 'sample-owners@example.com', '$2a$10$F45UBWt.15kgnbhKtRoN8.ykMZ4JnojOHpMbcf6lrFwIxPripvbJu', 'premium', 3980);
SELECT setval('business_owners_id_seq', (SELECT max(id) FROM business_owners));

INSERT INTO businesses (id, owner_id, name, address, lat, lng, category, service_description, contact, price_level, crowd_level, is_premium, instagram_url, twitter_url, view_count) VALUES
  (1, 1, 'カフェ 栄の国', '佐賀県佐賀市駅前中央1丁目', 33.2638, 130.2985, 'カフェ', '嬉野茶ラテと手作りスイーツ', '0952-00-0001', 2, 3, true, 'https://instagram.com/example_cafe', 'https://x.com/example_cafe', 128),
  (2, 3, '佐賀牛 炭火焼 たけお', '佐賀県佐賀市駅前中央2丁目', 33.2625, 130.2962, '飲食', '佐賀牛の炭火焼ランチ・ディナー', '0952-00-0002', 3, 4, true, NULL, NULL, 342),
  (3, 3, '唐人町 雑貨とうじん', '佐賀県佐賀市唐人1丁目', 33.2589, 130.2989, '雑貨', '有田焼の豆皿と手ぬぐい', '0952-00-0003', 2, 2, true, NULL, NULL, 76),
  (4, 3, '呉服元町 ギャラリー', '佐賀県佐賀市呉服元町', 33.2557, 130.3050, 'アート・工芸', '肥前びーどろ体験', '0952-00-0004', 2, 1, true, NULL, NULL, 54),
  (5, 3, 'シシリアンライス食堂', '佐賀県佐賀市白山2丁目', 33.2568, 130.2995, '飲食', '佐賀名物シシリアンライス', '0952-00-0005', 1, 4, true, NULL, NULL, 410),
  (6, 2, '有田焼 器の店 はなこ', '佐賀県佐賀市松原2丁目', 33.2512, 130.3002, '雑貨', '有田焼・伊万里焼のセレクトショップ', '0952-00-0006', 3, 2, false, NULL, NULL, 33),
  (7, 3, '佐賀城下 和菓子 丸ぼうろ', '佐賀県佐賀市城内1丁目', 33.2490, 130.2993, 'スイーツ', '丸ぼうろ・小城羊羹', '0952-00-0007', 1, 3, true, NULL, NULL, 198),
  (8, 3, 'ゲストハウス 城下町', '佐賀県佐賀市水ケ江1丁目', 33.2465, 130.3045, '宿泊', '古民家ゲストハウス', '0952-00-0008', 2, 2, true, NULL, NULL, 61),
  (9, 3, 'レンタサイクル さがりん', '佐賀県佐賀市駅前中央1丁目', 33.2648, 130.2978, '体験・アクティビティ', '市内観光レンタサイクル', '0952-00-0009', 1, 2, true, NULL, NULL, 89),
  (10, 3, 'クラフトビール 404', '佐賀県佐賀市中央本町', 33.2530, 130.2975, 'バー', '佐賀の地ビールと有明海のおつまみ', '0952-00-0010', 2, 3, false, NULL, NULL, 47),
  (11, 3, '嬉野温泉 湯どうふ茶屋', '佐賀県嬉野市嬉野町下宿', 33.1013, 129.9965, '飲食', '名物 温泉湯どうふ', '0954-00-0011', 2, 5, true, NULL, NULL, 520),
  (12, 3, '嬉野茶 茶房', '佐賀県嬉野市嬉野町岩屋川内', 33.1050, 130.0010, 'カフェ', 'うれしの茶の飲み比べ', '0954-00-0012', 2, 3, true, NULL, NULL, 140),
  (13, 3, '有田 窯元ギャラリー', '佐賀県西松浦郡有田町上幸平', 33.1906, 129.8806, 'アート・工芸', '絵付け体験', '0955-00-0013', 3, 3, true, NULL, NULL, 230),
  (14, 3, '唐津 イカ活き造り', '佐賀県唐津市呼子町', 33.5420, 129.8930, '飲食', '呼子のイカ活き造り', '0955-00-0014', 3, 5, true, NULL, NULL, 610),
  (15, 3, '唐津くんち 土産処', '佐賀県唐津市南城内', 33.4510, 129.9690, '雑貨', '唐津焼と曳山グッズ', '0955-00-0015', 2, 3, false, NULL, NULL, 95),
  (16, 3, '武雄温泉 楼門カフェ', '佐賀県武雄市武雄町武雄', 33.1932, 130.0213, 'カフェ', '武雄図書館近くのカフェ', '0954-00-0016', 2, 4, true, NULL, NULL, 301),
  (17, 3, '鹿島 酒蔵めぐり', '佐賀県鹿島市浜町', 33.0980, 130.1020, '体験・アクティビティ', '肥前浜宿の酒蔵試飲', '0954-00-0017', 2, 2, true, NULL, NULL, 120),
  (18, 3, '小城 羊羹本舗', '佐賀県小城市小城町', 33.2830, 130.2000, 'スイーツ', '老舗の小城羊羹', '0952-00-0018', 1, 2, false, NULL, NULL, 66);
SELECT setval('businesses_id_seq', (SELECT max(id) FROM businesses));

INSERT INTO coupons (business_id, title, discount_rate, conditions, expires_at) VALUES
  (1, 'ドリンク全品 10% OFF', 10, '1会計1回まで', now() + interval '30 days'),
  (2, 'ランチ 15% OFF', 15, '平日 11:00-14:00', now() + interval '14 days'),
  (3, '豆皿 2枚目 20% OFF', 20, '', now() + interval '30 days'),
  (5, '大盛り無料（10%相当）', 10, '', now() + interval '7 days'),
  (7, '丸ぼうろ 5% OFF', 5, '', now() + interval '60 days'),
  (9, 'レンタル 30% OFF', 30, '2時間以上', now() + interval '30 days'),
  (11, '湯どうふ定食 10% OFF', 10, '', now() + interval '30 days'),
  (13, '絵付け体験 20% OFF', 20, '要予約', now() + interval '45 days'),
  (14, '活き造り 1割引', 10, '平日のみ', now() + interval '30 days'),
  (16, 'ケーキセット 15% OFF', 15, '', now() + interval '30 days');

INSERT INTO ads (business_id, headline, body, ends_at) VALUES
  (2, '佐賀牛ランチ 本日限定 20 食', '駅から徒歩 3 分。予約なしでOK', now() + interval '30 days'),
  (11, '嬉野温泉 湯どうふ で ほっと一息', '温泉街の真ん中です', now() + interval '30 days');

INSERT INTO customers (id, name, email, password_hash, interests) VALUES
  (1, 'デモ 顧客', 'customer@example.com', '$2a$10$F45UBWt.15kgnbhKtRoN8.ykMZ4JnojOHpMbcf6lrFwIxPripvbJu', ARRAY['カフェ','スイーツ']),
  (2, '観光 一郎', 'tourist1@example.com', '$2a$10$F45UBWt.15kgnbhKtRoN8.ykMZ4JnojOHpMbcf6lrFwIxPripvbJu', ARRAY['飲食']),
  (3, '観光 二郎', 'tourist2@example.com', '$2a$10$F45UBWt.15kgnbhKtRoN8.ykMZ4JnojOHpMbcf6lrFwIxPripvbJu', ARRAY['雑貨','アート・工芸']),
  (4, '観光 三子', 'tourist3@example.com', '$2a$10$F45UBWt.15kgnbhKtRoN8.ykMZ4JnojOHpMbcf6lrFwIxPripvbJu', ARRAY['カフェ']),
  (5, '観光 四郎', 'tourist4@example.com', '$2a$10$F45UBWt.15kgnbhKtRoN8.ykMZ4JnojOHpMbcf6lrFwIxPripvbJu', '{}'),
  (6, '観光 五郎', 'tourist5@example.com', '$2a$10$F45UBWt.15kgnbhKtRoN8.ykMZ4JnojOHpMbcf6lrFwIxPripvbJu', '{}'),
  (7, '観光 六子', 'tourist6@example.com', '$2a$10$F45UBWt.15kgnbhKtRoN8.ykMZ4JnojOHpMbcf6lrFwIxPripvbJu', '{}'),
  (8, '観光 七子', 'tourist7@example.com', '$2a$10$F45UBWt.15kgnbhKtRoN8.ykMZ4JnojOHpMbcf6lrFwIxPripvbJu', '{}'),
  (9, '観光 八郎', 'tourist8@example.com', '$2a$10$F45UBWt.15kgnbhKtRoN8.ykMZ4JnojOHpMbcf6lrFwIxPripvbJu', '{}');
SELECT setval('customers_id_seq', (SELECT max(id) FROM customers));

-- カフェ栄の国（id=1）経由の紹介 7 名（目標 10 名）
INSERT INTO referrals (business_id, customer_id, created_at) VALUES
  (1, 2, now() - interval '20 days'),
  (1, 3, now() - interval '18 days'),
  (1, 4, now() - interval '15 days'),
  (1, 5, now() - interval '11 days'),
  (1, 6, now() - interval '8 days'),
  (1, 7, now() - interval '4 days'),
  (1, 8, now() - interval '1 days');

-- 協調フィルタリング用の閲覧・利用履歴
INSERT INTO usage_history (customer_id, business_id, viewed_at, coupon_used) VALUES
  (1, 1, now() - interval '3 days', true),
  (1, 7, now() - interval '2 days', false),
  (2, 1, now() - interval '9 days', false),
  (2, 2, now() - interval '9 days', true),
  (2, 5, now() - interval '8 days', false),
  (3, 3, now() - interval '7 days', true),
  (3, 4, now() - interval '7 days', false),
  (3, 6, now() - interval '6 days', false),
  (4, 1, now() - interval '5 days', false),
  (4, 7, now() - interval '5 days', true),
  (4, 3, now() - interval '5 days', false),
  (5, 1, now() - interval '4 days', false),
  (5, 9, now() - interval '4 days', true),
  (5, 7, now() - interval '4 days', false),
  (6, 11, now() - interval '3 days', true),
  (6, 12, now() - interval '3 days', false),
  (7, 1, now() - interval '2 days', false),
  (7, 3, now() - interval '2 days', false),
  (8, 13, now() - interval '1 days', true),
  (8, 16, now() - interval '1 days', false);

INSERT INTO tourist_spots (name, description, lat, lng) VALUES
  ('佐賀城本丸歴史館', '佐賀藩の歴史を伝える復元御殿', 33.2470, 130.3005),
  ('佐賀県庁 SAGA360', '展望ホールから佐賀平野を一望', 33.2494, 130.2988),
  ('佐賀バルーンミュージアム', '熱気球の体験型ミュージアム', 33.2560, 130.3020),
  ('徴古館', '鍋島家ゆかりの美術品', 33.2475, 130.2958),
  ('佐賀駅', '観光の起点', 33.2643, 130.2970),
  ('嬉野温泉 シーボルトの湯', '日本三大美肌の湯', 33.1010, 129.9970),
  ('有田 トンバイ塀のある裏通り', '窯元の町並み', 33.1890, 129.8830),
  ('唐津城', '舞鶴城とも呼ばれる海辺の城', 33.4560, 129.9760),
  ('武雄温泉楼門', '辰野金吾設計の朱塗りの楼門', 33.1940, 130.0180),
  ('祐徳稲荷神社', '日本三大稲荷の一つ', 33.0650, 130.0860);
