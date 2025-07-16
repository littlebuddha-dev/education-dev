// src/repositories/childRepository.js
// タイトル: 子どもリポジトリ
// 役割: childrenテーブルに関連するデータベース操作をカプセル化します。

import { query } from '@/lib/db';

/**
 * 新しい子どものプロフィールを作成します。（新スキーマ対応版）
 * @param {import('pg').Client} client - データベースクライアント
 * @param {object} childData - 子どもデータ { user_id, display_name, birthday, gender }
 * @returns {Promise<object>} 作成された子どもオブジェクト
 */
export async function createChildProfile(client, { user_id, display_name, birthday, gender }) {
  const result = await client.query(
    `INSERT INTO children (user_id, display_name, birthday, gender)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [user_id, display_name, birthday, gender]
  );
  return result.rows[0];
}

/**
 * 保護者と子どもの関係を作成します。（新規追加）
 * @param {import('pg').Client} client - データベースクライアント
 * @param {object} relationshipData - 関係データ { parent_user_id, child_user_id, created_by }
 * @returns {Promise<object>} 作成された関係オブジェクト
 */
export async function createParentChildRelationship(client, { parent_user_id, child_user_id, created_by }) {
  const result = await client.query(
    `INSERT INTO parent_child_relationships (parent_user_id, child_user_id, created_by, status)
     VALUES ($1, $2, $3, 'active')
     RETURNING *`,
    [parent_user_id, child_user_id, created_by]
  );
  return result.rows[0];
}