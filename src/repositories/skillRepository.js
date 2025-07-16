// src/repositories/skillRepository.js
// タイトル: スキルリポジトリ
// 役割: skill_scores, skill_logs テーブルに関連するすべてのデータベース操作をカプセル化します。

import { query } from '@/lib/db';

/**
 * 特定の子どものスキルログ一覧を取得します。
 * @param {string} childId - 子どものID
 * @returns {Promise<Array<object>>} スキルログのリスト
 */
export async function findSkillLogsByChildId(childId) {
  const result = await query(
    `SELECT id, domain, score, recorded_at
     FROM skill_logs
     WHERE child_id = $1
     ORDER BY recorded_at DESC`,
    [childId]
  );
  return result.rows;
}

/**
 * 特定の保護者に紐づく、すべての子どものスキルログを集計します。（管理者向け）
 * @param {string} parentUserId - 保護者のユーザーID
 * @returns {Promise<Array<object>>} 子どもごとのスキル統計リスト
 */
export async function getSkillStatsByParentId(parentUserId) {
  const result = await query(`
    SELECT
      c.id AS child_id,
      c.display_name AS child_name,
      s.domain,
      ROUND(AVG(s.score)::numeric, 1) AS avg_score,
      COUNT(*)::INTEGER AS entry_count,
      MAX(s.recorded_at) AS last_recorded
    FROM skill_logs s
    JOIN children c ON s.child_id = c.id
    JOIN parent_child_relationships pcr ON c.user_id = pcr.child_user_id
    WHERE pcr.parent_user_id = $1 AND pcr.status = 'active'
    GROUP BY c.id, c.display_name, s.domain
    ORDER BY c.display_name, s.domain;
  `, [parentUserId]);
  return result.rows;
}

/**
 * 特定のユーザーの総合スキルスコア一覧を取得します。
 * @param {string} userId - ユーザーID
 * @returns {Promise<Array<object>>} スキルスコアのリスト
 */
export async function findSkillScoresByUserId(userId) {
  const result = await query(`
    SELECT subject, domain, level, score, updated_at
    FROM skill_scores
    WHERE user_id = $1
    ORDER BY subject, domain
  `, [userId]);
  return result.rows;
}

/**
 * 新しいスキルログを作成します。
 * @param {object} logData - スキルログデータ { childId, domain, score }
 * @returns {Promise<object>} 作成されたスキルログオブジェクト
 */
export async function createSkillLog({ childId, domain, score }) {
  const result = await query(`
    INSERT INTO skill_logs (child_id, domain, score)
    VALUES ($1, $2, $3)
    RETURNING *
  `, [childId, domain, score]);
  return result.rows[0];
}