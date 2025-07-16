-- /seed.sql (新設計版)
-- 役割: 教育AIシステムのサンプルデータ投入（新しいchildren設計対応）

-- ========================================
-- 1. 管理者ユーザー
-- ========================================
-- パスワード: adminpassword
INSERT INTO users (email, password_hash, first_name, last_name, role, birthday) VALUES
('admin@example.com', '$2b$10$rOvyUWqzGGO7Wd5Jjj8WKeuZhF7Rm.xVQoMtZgO4.xN8Br7QhjKY6', 'システム', '管理者', 'admin', '1980-01-01')
ON CONFLICT (email) DO NOTHING;

-- ========================================
-- 2. 保護者ユーザー
-- ========================================
-- パスワード: parentpassword
INSERT INTO users (email, password_hash, first_name, last_name, role, birthday) VALUES
('parent1@example.com', '$2b$10$YhPvDAx1ZSF8HqTu/QVzjOoGF.R4s9K8LFf6b7ZOx.xN8Br7Qhj8m', '太郎', '田中', 'parent', '1985-03-15'),
('parent2@example.com', '$2b$10$YhPvDAx1ZSF8HqTu/QVzjOoGF.R4s9K8LFf6b7ZOx.xN8Br7Qhj8m', '花子', '佐藤', 'parent', '1987-07-22'),
('parent3@example.com', '$2b$10$YhPvDAx1ZSF8HqTu/QVzjOoGF.R4s9K8LFf6b7ZOx.xN8Br7Qhj8m', '一郎', '鈴木', 'parent', '1982-11-08')
ON CONFLICT (email) DO NOTHING;

-- ========================================
-- 3. 子どもユーザー
-- ========================================
-- パスワード: childpassword
INSERT INTO users (email, password_hash, first_name, last_name, role, birthday) VALUES
('child1@example.com', '$2b$10$kNvXSM2bG9K7Wd5Jjj8WKeuZhF7Rm.xVQoMtZgO4.xN8Br7QhjX3p', '一郎', '田中', 'child', '2015-04-01'),
('child2@example.com', '$2b$10$kNvXSM2bG9K7Wd5Jjj8WKeuZhF7Rm.xVQoMtZgO4.xN8Br7QhjX3p', '美咲', '田中', 'child', '2017-08-15'),
('child3@example.com', '$2b$10$kNvXSM2bG9K7Wd5Jjj8WKeuZhF7Rm.xVQoMtZgO4.xN8Br7QhjX3p', '健太', '佐藤', 'child', '2016-01-20'),
('child4@example.com', '$2b$10$kNvXSM2bG9K7Wd5Jjj8WKeuZhF7Rm.xVQoMtZgO4.xN8Br7QhjX3p', '愛子', '鈴木', 'child', '2018-09-12'),
('child5@example.com', '$2b$10$kNvXSM2bG9K7Wd5Jjj8WKeuZhF7Rm.xVQoMtZgO4.xN8Br7QhjX3p', '翔太', '山田', 'child', '2014-12-03')
ON CONFLICT (email) DO NOTHING;

-- ========================================
-- 4. 子どもプロフィール（新設計）
-- ========================================
INSERT INTO children (user_id, display_name, birthday, gender, grade, school, notes)
SELECT 
    u.id,
    CONCAT(u.last_name, ' ', u.first_name),
    u.birthday,
    CASE 
        WHEN u.first_name IN ('一郎', '健太', '翔太') THEN '男の子'
        WHEN u.first_name IN ('美咲', '愛子') THEN '女の子'
        ELSE '未設定'
    END,
    CASE 
        WHEN EXTRACT(YEAR FROM AGE(u.birthday)) >= 10 THEN '小学4年生'
        WHEN EXTRACT(YEAR FROM AGE(u.birthday)) >= 9 THEN '小学3年生'
        WHEN EXTRACT(YEAR FROM AGE(u.birthday)) >= 8 THEN '小学2年生'
        WHEN EXTRACT(YEAR FROM AGE(u.birthday)) >= 7 THEN '小学1年生'
        ELSE '幼稚園'
    END,
    CASE 
        WHEN u.email LIKE 'child1%' OR u.email LIKE 'child2%' THEN '田中小学校'
        WHEN u.email LIKE 'child3%' THEN '佐藤小学校'
        WHEN u.email LIKE 'child4%' THEN '鈴木小学校'
        ELSE '山田小学校'
    END,
    'サンプルデータとして作成された子どもプロフィール'
FROM users u
WHERE u.role = 'child'
ON CONFLICT (user_id) DO NOTHING;

-- ========================================
-- 5. 保護者-子ども関係（新設計）
-- ========================================
INSERT INTO parent_child_relationships (parent_user_id, child_user_id, relationship_type, status, created_by, approved_at, approved_by)
SELECT 
    p.id as parent_user_id,
    c.id as child_user_id,
    'parent' as relationship_type,
    'active' as status,
    p.id as created_by,
    CURRENT_TIMESTAMP as approved_at,
    (SELECT id FROM users WHERE role = 'admin' LIMIT 1) as approved_by
FROM users p
CROSS JOIN users c
WHERE p.role = 'parent' 
  AND c.role = 'child'
  AND (
    -- 田中太郎 → 田中一郎、田中美咲
    (p.email = 'parent1@example.com' AND c.email IN ('child1@example.com', 'child2@example.com'))
    OR
    -- 佐藤花子 → 佐藤健太
    (p.email = 'parent2@example.com' AND c.email = 'child3@example.com')
    OR
    -- 鈴木一郎 → 鈴木愛子
    (p.email = 'parent3@example.com' AND c.email = 'child4@example.com')
    -- child5@example.com (山田翔太) は独立した子ども（保護者なし）
  )
ON CONFLICT (parent_user_id, child_user_id) DO NOTHING;

-- ========================================
-- 6. 学習目標サンプルデータ
-- ========================================
INSERT INTO learning_goals (subject, domain, name, description, recommended_age_min, recommended_age_max, difficulty_level) VALUES
-- 国語
('国語', 'ひらがな', 'ひらがなの読み', '46文字のひらがなを正しく読める', 4, 6, 'beginner'),
('国語', 'ひらがな', 'ひらがなの書き', '46文字のひらがなを正しく書ける', 5, 7, 'beginner'),
('国語', 'カタカナ', 'カタカナの読み', '46文字のカタカナを正しく読める', 6, 8, 'beginner'),
('国語', 'カタカナ', 'カタカナの書き', '46文字のカタカナを正しく書ける', 6, 8, 'intermediate'),
('国語', '漢字', '1年生の漢字', '小学1年生で習う80の漢字を覚える', 6, 8, 'intermediate'),
('国語', '漢字', '2年生の漢字', '小学2年生で習う160の漢字を覚える', 7, 9, 'intermediate'),
('国語', '読解', '物語の理解', '簡単な物語を読んで内容を理解できる', 7, 10, 'intermediate'),

-- 算数
('算数', '数の概念', '数の数え方', '1から100まで数えられる', 4, 6, 'beginner'),
('算数', '足し算', '1桁の足し算', '1桁同士の足し算ができる', 5, 7, 'beginner'),
('算数', '足し算', '2桁の足し算', '2桁同士の足し算ができる', 6, 8, 'intermediate'),
('算数', '引き算', '1桁の引き算', '1桁同士の引き算ができる', 5, 7, 'beginner'),
('算数', '引き算', '2桁の引き算', '2桁同士の引き算ができる', 6, 8, 'intermediate'),
('算数', 'かけ算', '九九', '九九を完全に覚える', 7, 9, 'intermediate'),
('算数', '図形', '基本図形', '丸、三角、四角を区別できる', 4, 6, 'beginner'),

-- 理科
('理科', '観察', '植物の観察', '植物の成長を観察して記録できる', 6, 10, 'beginner'),
('理科', '実験', '水の性質', '水の三態変化を理解する', 8, 12, 'intermediate'),
('理科', '生物', '動物の分類', '動物を哺乳類、鳥類などに分類できる', 7, 10, 'intermediate'),

-- 社会
('社会', '地理', '都道府県', '47都道府県の名前と位置を覚える', 8, 12, 'intermediate'),
('社会', '歴史', '日本の歴史', '日本の主要な歴史的出来事を知る', 9, 15, 'advanced'),

-- 英語
('英語', '単語', '基本単語', '100の基本英単語を覚える', 6, 10, 'beginner'),
('英語', '会話', '挨拶', '基本的な挨拶ができる', 5, 8, 'beginner'),
('英語', '文法', 'be動詞', 'be動詞の使い方を理解する', 8, 12, 'intermediate')

ON CONFLICT (name) DO NOTHING;

-- ========================================
-- 7. 子ども学習進捗サンプルデータ
-- ========================================
-- 田中一郎の学習進捗
INSERT INTO child_learning_progress (child_id, goal_id, status, progress_percentage, last_accessed_at, achieved_at)
SELECT 
    c.id,
    lg.id,
    CASE 
        WHEN lg.name IN ('ひらがなの読み', '数の数え方', '基本図形') THEN '達成済み'
        WHEN lg.name IN ('ひらがなの書き', '1桁の足し算') THEN '学習中'
        ELSE '未学習'
    END,
    CASE 
        WHEN lg.name IN ('ひらがなの読み', '数の数え方', '基本図形') THEN 100
        WHEN lg.name IN ('ひらがなの書き', '1桁の足し算') THEN 75
        ELSE 0
    END,
    CASE 
        WHEN lg.name IN ('ひらがなの読み', '数の数え方', '基本図形', 'ひらがなの書き', '1桁の足し算') THEN CURRENT_TIMESTAMP - INTERVAL '1 day'
        ELSE NULL
    END,
    CASE 
        WHEN lg.name IN ('ひらがなの読み', '数の数え方', '基本図形') THEN CURRENT_TIMESTAMP - INTERVAL '2 days'
        ELSE NULL
    END
FROM children c
CROSS JOIN learning_goals lg
WHERE c.display_name = '田中 一郎'
  AND lg.recommended_age_min <= 9
ON CONFLICT (child_id, goal_id) DO NOTHING;

-- ========================================
-- 8. スキルログサンプルデータ
-- ========================================
INSERT INTO skill_logs (child_id, domain, score, context, recorded_at)
SELECT 
    c.id,
    domains.domain,
    (RANDOM() * 50 + 50)::INTEGER, -- 50-100点のランダムスコア
    'サンプル学習セッション',
    CURRENT_TIMESTAMP - (RANDOM() * INTERVAL '30 days')
FROM children c
CROSS JOIN (
    VALUES 
    ('ひらがな'), ('カタカナ'), ('数の概念'), ('足し算'), ('引き算'),
    ('観察'), ('基本単語'), ('図形'), ('読解'), ('会話')
) AS domains(domain)
WHERE c.display_name IN ('田中 一郎', '田中 美咲', '佐藤 健太')
ORDER BY RANDOM()
LIMIT 50;

-- ========================================
-- 9. 会話ログサンプルデータ
-- ========================================
INSERT INTO conversation_logs (user_id, role, message, created_at)
SELECT 
    u.id,
    log_data.role,
    log_data.message,
    CURRENT_TIMESTAMP - (RANDOM() * INTERVAL '7 days')
FROM users u
CROSS JOIN (
    VALUES 
    ('user', 'ひらがなの「あ」ってどう書くの？'),
    ('assistant', '「あ」は、まず左側に縦の線を書いて、それから右側に小さな「つ」のような形を書きます。練習してみましょう！'),
    ('user', '1 + 1 = ?'),
    ('assistant', '1 + 1 = 2 です！指を使って数えてみるとよく分かりますね。'),
    ('user', '今日は晴れてるね'),
    ('assistant', 'そうですね！晴れの日は外で遊んだり、観察をするのにとても良い日ですね。'),
    ('user', '動物の種類を教えて'),
    ('assistant', '動物にはいろいろな種類があります。哺乳類、鳥類、魚類、昆虫類などに分けることができますよ。')
) AS log_data(role, message)
WHERE u.role = 'child'
ORDER BY RANDOM()
LIMIT 30;

-- ========================================
-- 10. 評価ログサンプルデータ
-- ========================================
INSERT INTO evaluation_logs (user_id, child_id, conversation_id, subject, domain, level, reason, recommendation, created_at)
SELECT 
    u.id,
    c.id,
    cl.id,
    eval_data.subject,
    eval_data.domain,
    eval_data.level,
    eval_data.reason,
    eval_data.recommendation,
    cl.created_at
FROM users u
JOIN children c ON u.id = c.user_id
JOIN conversation_logs cl ON u.id = cl.user_id
CROSS JOIN (
    VALUES 
    ('国語', 'ひらがな', '初級', 'ひらがなの書き方について質問したため', '毎日ひらがな練習帳で3文字ずつ練習することをお勧めします'),
    ('算数', '足し算', '初級', '基本的な足し算を学習しているため', '指を使った計算から始めて、徐々に暗算に移行しましょう'),
    ('理科', '観察', '初級', '自然現象に興味を示しているため', '身近な植物や動物の観察日記をつけることをお勧めします'),
    ('社会', '日常生活', '初級', '日常の出来事について話しているため', '家族や地域の人々との関わりについて学習しましょう')
) AS eval_data(subject, domain, level, reason, recommendation)
WHERE u.role = 'child'
  AND cl.role = 'user'
ORDER BY RANDOM()
LIMIT 20;

-- ========================================
-- 11. スキルスコアサンプルデータ
-- ========================================
INSERT INTO skill_scores (user_id, subject, domain, level, score, created_at, updated_at)
SELECT 
    u.id,
    score_data.subject,
    score_data.domain,
    score_data.level,
    (RANDOM() * 20 + 1)::INTEGER, -- 1-20点のスコア
    CURRENT_TIMESTAMP - (RANDOM() * INTERVAL '30 days'),
    CURRENT_TIMESTAMP
FROM users u
CROSS JOIN (
    VALUES 
    ('国語', 'ひらがな', '初級'),
    ('国語', 'カタカナ', '初級'),
    ('国語', '漢字', '初級'),
    ('算数', '足し算', '初級'),
    ('算数', '引き算', '初級'),
    ('算数', '数の概念', '初級'),
    ('理科', '観察', '初級'),
    ('社会', '地理', '初級'),
    ('英語', '単語', '初級'),
    ('英語', '会話', '初級')
) AS score_data(subject, domain, level)
WHERE u.role = 'child'
ON CONFLICT (user_id, subject, domain) DO NOTHING;

-- ========================================
-- 12. データ整合性チェック
-- ========================================
DO $
DECLARE
    user_count INTEGER;
    child_count INTEGER;
    relationship_count INTEGER;
    goal_count INTEGER;
BEGIN
    -- 各テーブルのレコード数を確認
    SELECT COUNT(*) INTO user_count FROM users;
    SELECT COUNT(*) INTO child_count FROM children;
    SELECT COUNT(*) INTO relationship_count FROM parent_child_relationships;
    SELECT COUNT(*) INTO goal_count FROM learning_goals;
    
    RAISE NOTICE '=== サンプルデータ投入完了 ===';
    RAISE NOTICE 'ユーザー数: %', user_count;
    RAISE NOTICE '子どもプロフィール数: %', child_count;
    RAISE NOTICE '保護者-子ども関係数: %', relationship_count;
    RAISE NOTICE '学習目標数: %', goal_count;
    RAISE NOTICE '';
    
    -- サンプルアカウント情報
    RAISE NOTICE '=== サンプルアカウント情報 ===';
    RAISE NOTICE '管理者: admin@example.com / adminpassword';
    RAISE NOTICE '保護者1: parent1@example.com / parentpassword (田中太郎)';
    RAISE NOTICE '保護者2: parent2@example.com / parentpassword (佐藤花子)';
    RAISE NOTICE '保護者3: parent3@example.com / parentpassword (鈴木一郎)';
    RAISE NOTICE '子ども1: child1@example.com / childpassword (田中一郎)';
    RAISE NOTICE '子ども2: child2@example.com / childpassword (田中美咲)';
    RAISE NOTICE '子ども3: child3@example.com / childpassword (佐藤健太)';
    RAISE NOTICE '子ども4: child4@example.com / childpassword (鈴木愛子)';
    RAISE NOTICE '子ども5: child5@example.com / childpassword (山田翔太 - 独立)';
    RAISE NOTICE '';
    
    -- 関係性の説明
    RAISE NOTICE '=== 親子関係 ===';
    RAISE NOTICE '田中太郎 → 田中一郎、田中美咲';
    RAISE NOTICE '佐藤花子 → 佐藤健太';
    RAISE NOTICE '鈴木一郎 → 鈴木愛子';
    RAISE NOTICE '山田翔太 → 独立した子ども（保護者なし）';
    RAISE NOTICE '';
    
    RAISE NOTICE '=== 便利なクエリ ===';
    RAISE NOTICE 'SELECT * FROM children_with_parents; -- 保護者情報付き子ども一覧';
    RAISE NOTICE 'SELECT * FROM user_details; -- ユーザー詳細情報';
    RAISE NOTICE 'SELECT * FROM get_managed_children(''<parent_user_id>''); -- 管理している子ども取得';
    RAISE NOTICE 'SELECT * FROM get_child_managers(''<child_user_id>''); -- 子どもの管理者取得';
    RAISE NOTICE 'SELECT * FROM get_child_learning_stats(''<child_id>''); -- 学習統計取得';
END $;

-- ========================================
-- 13. パスワードハッシュの生成参考
-- ========================================
/*
パスワードハッシュの生成方法（Node.jsでの例）:

const bcrypt = require('bcrypt');

// adminpassword
const adminHash = await bcrypt.hash('adminpassword', 10);
console.log('Admin hash:', adminHash);

// parentpassword  
const parentHash = await bcrypt.hash('parentpassword', 10);
console.log('Parent hash:', parentHash);

// childpassword
const childHash = await bcrypt.hash('childpassword', 10);
console.log('Child hash:', childHash);

実際の本番環境では、より強力なパスワードを使用し、
各ユーザーに個別のパスワードを設定してください。
*/

-- ========================================
-- 14. 開発用便利クエリ
-- ========================================
/*
-- 全ユーザーとその関係を確認
SELECT 
    u.email,
    u.role,
    u.first_name,
    u.last_name,
    CASE 
        WHEN u.role = 'child' THEN c.display_name
        ELSE NULL
    END as child_display_name
FROM users u
LEFT JOIN children c ON u.id = c.user_id
ORDER BY u.role, u.email;

-- 親子関係の確認
SELECT 
    pu.email as parent_email,
    pu.first_name || ' ' || pu.last_name as parent_name,
    cu.email as child_email, 
    c.display_name as child_name,
    pcr.relationship_type,
    pcr.status
FROM parent_child_relationships pcr
JOIN users pu ON pcr.parent_user_id = pu.id
JOIN users cu ON pcr.child_user_id = cu.id
JOIN children c ON cu.id = c.user_id
ORDER BY pu.email;

-- 学習進捗の確認
SELECT 
    c.display_name,
    lg.subject,
    lg.domain,
    clp.status,
    clp.progress_percentage,
    clp.achieved_at
FROM child_learning_progress clp
JOIN children c ON clp.child_id = c.id
JOIN learning_goals lg ON clp.goal_id = lg.id
WHERE clp.status != '未学習'
ORDER BY c.display_name, lg.subject, lg.domain;

-- スキルログの統計
SELECT 
    c.display_name,
    sl.domain,
    COUNT(*) as log_count,
    ROUND(AVG(sl.score), 1) as avg_score,
    MAX(sl.recorded_at) as last_recorded
FROM skill_logs sl
JOIN children c ON sl.child_id = c.id
GROUP BY c.display_name, sl.domain
ORDER BY c.display_name, avg_score DESC;
*/