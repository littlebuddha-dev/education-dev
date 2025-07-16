-- /schema.sql (新設計版)
-- 役割: 教育AIシステムの完全なデータベーススキーマ（新しいchildren設計対応）

-- 古い関数定義が残っていてもエラーにならないよう、最初に削除処理を追加
DROP FUNCTION IF EXISTS get_managed_children(uuid);
DROP FUNCTION IF EXISTS get_child_managers(uuid);

-- PostgreSQL拡張機能の有効化
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ========================================
-- 1. ユーザーテーブル
-- ========================================
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(255),
    last_name VARCHAR(255),
    role VARCHAR(50) DEFAULT 'parent' NOT NULL CHECK (role IN ('admin', 'parent', 'child')),
    birthday DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ========================================
-- 2. 子どもプロフィールテーブル（新設計）
-- ========================================
CREATE TABLE IF NOT EXISTS children (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    display_name VARCHAR(255) NOT NULL,
    birthday DATE,
    gender VARCHAR(50),
    grade VARCHAR(50),
    school VARCHAR(255),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ========================================
-- 3. 保護者-子ども関係テーブル（新設計）
-- ========================================
CREATE TABLE IF NOT EXISTS parent_child_relationships (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    parent_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    child_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    relationship_type VARCHAR(50) DEFAULT 'parent' CHECK (relationship_type IN ('parent', 'guardian', 'relative', 'other')),
    status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'pending', 'rejected', 'suspended')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES users(id),
    approved_at TIMESTAMP WITH TIME ZONE,
    approved_by UUID REFERENCES users(id),
    notes TEXT,
    
    UNIQUE(parent_user_id, child_user_id)
);

-- ========================================
-- 4. リフレッシュトークンテーブル
-- ========================================
CREATE TABLE IF NOT EXISTS refresh_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    jti VARCHAR(255) UNIQUE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token TEXT NOT NULL UNIQUE,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    is_revoked BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ========================================
-- 5. 会話ログテーブル
-- ========================================
CREATE TABLE IF NOT EXISTS conversation_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(50) NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
    message TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ========================================
-- 6. 評価ログテーブル
-- ========================================
CREATE TABLE IF NOT EXISTS evaluation_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    child_id UUID REFERENCES children(id) ON DELETE CASCADE,
    conversation_id UUID REFERENCES conversation_logs(id) ON DELETE SET NULL,
    subject VARCHAR(255),
    domain VARCHAR(255),
    level VARCHAR(255),
    reason TEXT,
    recommendation TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ========================================
-- 7. スキルスコアテーブル（ユーザーごとの総合スキルスコア）
-- ========================================
CREATE TABLE IF NOT EXISTS skill_scores (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    subject VARCHAR(255) NOT NULL,
    domain VARCHAR(255) NOT NULL,
    level VARCHAR(255),
    score INTEGER DEFAULT 0 NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, subject, domain)
);

-- ========================================
-- 8. スキルログテーブル（詳細なスキル記録）
-- ========================================
CREATE TABLE IF NOT EXISTS skill_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    child_id UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE,
    session_id UUID,
    domain VARCHAR(255) NOT NULL,
    score INTEGER NOT NULL,
    context TEXT,
    recorded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ========================================
-- 9. 学習目標テーブル
-- ========================================
CREATE TABLE IF NOT EXISTS learning_goals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    subject VARCHAR(255) NOT NULL,
    domain VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL UNIQUE,
    description TEXT,
    recommended_age_min INTEGER,
    recommended_age_max INTEGER,
    difficulty_level VARCHAR(50) DEFAULT 'beginner' CHECK (difficulty_level IN ('beginner', 'intermediate', 'advanced')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ========================================
-- 10. 子ども学習進捗テーブル
-- ========================================
CREATE TABLE IF NOT EXISTS child_learning_progress (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    child_id UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE,
    goal_id UUID NOT NULL REFERENCES learning_goals(id) ON DELETE CASCADE,
    status VARCHAR(50) DEFAULT '未学習' NOT NULL CHECK (status IN ('未学習', '学習中', '達成済み', '要復習')),
    progress_percentage INTEGER DEFAULT 0 CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
    last_accessed_at TIMESTAMP WITH TIME ZONE,
    achieved_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(child_id, goal_id)
);

-- ========================================
-- 11. 問題集テーブル
-- ========================================
CREATE TABLE IF NOT EXISTS questions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    subject VARCHAR(255) NOT NULL, -- 教科 (例: 算数)
    domain VARCHAR(255) NOT NULL, -- 分野 (例: 足し算)
    learning_goal_id UUID REFERENCES learning_goals(id) ON DELETE SET NULL, -- 関連する学習目標 (任意)
    question_text TEXT NOT NULL, -- 問題文
    question_type VARCHAR(50) DEFAULT 'free_text' NOT NULL CHECK (question_type IN ('free_text', 'multiple_choice')), -- 問題形式
    options JSONB, -- 選択肢 (multiple_choiceの場合) 例: {"a": "答え1", "b": "答え2"}
    correct_answer TEXT NOT NULL, -- 正解
    explanation TEXT, -- 解説
    difficulty_level VARCHAR(50) DEFAULT 'beginner', -- 難易度
    target_age_min INT, -- 対象年齢（下限）
    target_age_max INT, -- 対象年齢（上限）
    created_by UUID REFERENCES users(id), -- 作成者ID
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ========================================
-- インデックスの作成（パフォーマンス向上のため）
-- ========================================

-- ユーザーテーブル
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- 子どもプロフィールテーブル
CREATE INDEX IF NOT EXISTS idx_children_user_id ON children(user_id);
CREATE INDEX IF NOT EXISTS idx_children_display_name ON children(display_name);

-- 保護者-子ども関係テーブル
CREATE INDEX IF NOT EXISTS idx_parent_child_parent ON parent_child_relationships(parent_user_id);
CREATE INDEX IF NOT EXISTS idx_parent_child_child ON parent_child_relationships(child_user_id);
CREATE INDEX IF NOT EXISTS idx_parent_child_status ON parent_child_relationships(status);
CREATE INDEX IF NOT EXISTS idx_parent_child_created_at ON parent_child_relationships(created_at);

-- リフレッシュトークンテーブル
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_id ON refresh_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_token ON refresh_tokens(token);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_expires_at ON refresh_tokens(expires_at);

-- 会話ログテーブル
CREATE INDEX IF NOT EXISTS idx_conversation_logs_user_id ON conversation_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_conversation_logs_created_at ON conversation_logs(created_at);

-- 評価ログテーブル
CREATE INDEX IF NOT EXISTS idx_evaluation_logs_user_id ON evaluation_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_evaluation_logs_child_id ON evaluation_logs(child_id);
CREATE INDEX IF NOT EXISTS idx_evaluation_logs_created_at ON evaluation_logs(created_at);

-- スキルスコアテーブル
CREATE INDEX IF NOT EXISTS idx_skill_scores_user_subject_domain ON skill_scores(user_id, subject, domain);

-- スキルログテーブル
CREATE INDEX IF NOT EXISTS idx_skill_logs_child_id ON skill_logs(child_id);
CREATE INDEX IF NOT EXISTS idx_skill_logs_recorded_at ON skill_logs(recorded_at);

-- 学習目標テーブル
CREATE INDEX IF NOT EXISTS idx_learning_goals_subject_domain ON learning_goals(subject, domain);

-- 子ども学習進捗テーブル
CREATE INDEX IF NOT EXISTS idx_child_learning_progress_child_goal ON child_learning_progress(child_id, goal_id);
CREATE INDEX IF NOT EXISTS idx_child_learning_progress_status ON child_learning_progress(status);

-- インデックスの追加
CREATE INDEX IF NOT EXISTS idx_questions_subject_domain ON questions(subject, domain);
CREATE INDEX IF NOT EXISTS idx_questions_age_range ON questions(target_age_min, target_age_max);
CREATE INDEX IF NOT EXISTS idx_questions_difficulty ON questions(difficulty_level);


-- ========================================
-- ビューの作成（便利な参照用）
-- ========================================

-- 保護者付き子ども一覧ビュー
CREATE OR REPLACE VIEW children_with_parents AS
SELECT 
    c.*,
    pcr.parent_user_id,
    pu.first_name as parent_first_name,
    pu.last_name as parent_last_name,
    pu.email as parent_email,
    pcr.relationship_type,
    pcr.status as relationship_status,
    pcr.created_at as relationship_created_at
FROM children c
LEFT JOIN parent_child_relationships pcr ON c.user_id = pcr.child_user_id AND pcr.status = 'active'
LEFT JOIN users pu ON pcr.parent_user_id = pu.id;

-- ユーザー詳細ビュー
CREATE OR REPLACE VIEW user_details AS
SELECT 
    u.*,
    CASE 
        WHEN u.role = 'child' THEN (
            SELECT json_build_object(
                'child_profile_id', c.id,
                'display_name', c.display_name,
                'grade', c.grade,
                'school', c.school
            )
            FROM children c WHERE c.user_id = u.id
        )
        WHEN u.role = 'parent' THEN (
            SELECT json_agg(
                json_build_object(
                    'child_id', c.id,
                    'child_user_id', c.user_id,
                    'display_name', c.display_name,
                    'relationship_type', pcr.relationship_type
                )
            )
            FROM parent_child_relationships pcr
            JOIN children c ON pcr.child_user_id = c.user_id
            WHERE pcr.parent_user_id = u.id AND pcr.status = 'active'
        )
        ELSE NULL
    END as role_specific_data
FROM users u;

-- ========================================
-- 関数の作成（便利な操作用）
-- ========================================

-- 保護者が管理する子どもを取得する関数
CREATE OR REPLACE FUNCTION get_managed_children(parent_user_id UUID)
RETURNS TABLE(
    child_id UUID,
    child_user_id UUID,
    display_name VARCHAR,
    birthday DATE,
    grade VARCHAR,
    relationship_type VARCHAR
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        c.id,
        c.user_id,
        c.display_name,
        c.birthday,
        c.grade,
        pcr.relationship_type
    FROM parent_child_relationships pcr
    JOIN children c ON pcr.child_user_id = c.user_id
    WHERE pcr.parent_user_id = parent_user_id 
      AND pcr.status = 'active'
    ORDER BY c.display_name;
END;
$$ LANGUAGE plpgsql;

-- 子どもの管理者を取得する関数
CREATE OR REPLACE FUNCTION get_child_managers(child_user_id UUID)
RETURNS TABLE(
    parent_id UUID,
    parent_email VARCHAR,
    parent_name VARCHAR,
    relationship_type VARCHAR,
    status VARCHAR
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        u.id,
        u.email,
        CONCAT(u.first_name, ' ', u.last_name)::VARCHAR,
        pcr.relationship_type,
        pcr.status
    FROM parent_child_relationships pcr
    JOIN users u ON pcr.parent_user_id = u.id
    WHERE pcr.child_user_id = child_user_id
    ORDER BY pcr.created_at;
END;
$$ LANGUAGE plpgsql;

-- 子どもの学習統計を取得する関数
CREATE OR REPLACE FUNCTION get_child_learning_stats(child_id UUID)
RETURNS TABLE(
    total_goals INTEGER,
    achieved_goals INTEGER,
    in_progress_goals INTEGER,
    achievement_rate NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*)::INTEGER as total_goals,
        COUNT(CASE WHEN status = '達成済み' THEN 1 END)::INTEGER as achieved_goals,
        COUNT(CASE WHEN status = '学習中' THEN 1 END)::INTEGER as in_progress_goals,
        CASE 
            WHEN COUNT(*) = 0 THEN 0
            ELSE ROUND((COUNT(CASE WHEN status = '達成済み' THEN 1 END) * 100.0 / COUNT(*))::NUMERIC, 2)
        END as achievement_rate
    FROM child_learning_progress
    WHERE child_learning_progress.child_id = get_child_learning_stats.child_id;
END;
$$ LANGUAGE plpgsql;

-- ========================================
-- トリガー関数（自動更新用）
-- ========================================

-- updated_atカラムを自動更新するトリガー関数
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- トリガーの作成
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_children_updated_at BEFORE UPDATE ON children FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_skill_scores_updated_at BEFORE UPDATE ON skill_scores FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_learning_goals_updated_at BEFORE UPDATE ON learning_goals FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_child_learning_progress_updated_at BEFORE UPDATE ON child_learning_progress FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_questions_updated_at BEFORE UPDATE ON questions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ========================================
-- 完了メッセージ
-- ========================================
DO $$
BEGIN
    RAISE NOTICE '=== 教育AIシステム データベーススキーマ作成完了 ===';
    RAISE NOTICE '新機能:';
    RAISE NOTICE '- 単純化されたchildren設計 (1対1関係)';
    RAISE NOTICE '- 保護者-子ども関係管理システム';
    RAISE NOTICE '- 関係承認フロー';
    RAISE NOTICE '- 便利なビューと関数';
    RAISE NOTICE '- 自動更新トリガー';
    RAISE NOTICE '';
    RAISE NOTICE '次のステップ: seed.sqlを実行してサンプルデータを投入してください';
END $$;