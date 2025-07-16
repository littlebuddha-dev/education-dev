// /src/app/api/children/[id]/learning-progress/route.js
// 役割: 特定の子どもの学習進捗取得API。認証方式を刷新。
// 🔧 修正: Next.js 15のparams非同期化に対応

import { query } from '@/lib/db';
import { verifyAccessTokenFromHeader } from '@/lib/auth';

export async function GET(req, { params }) {
  // 🔧 修正: Next.js 15ではparamsを非同期で取得する必要がある
  const { id: childId } = await params;

  try {
    const user = verifyAccessTokenFromHeader(req);

    if (!childId || !/^[0-9a-fA-F-]{36}$/.test(childId)) {
        return Response.json({ error: '無効な子どもID形式です。' }, { status: 400 });
    }

    const childCheck = await query(
      `SELECT user_id, child_user_id FROM children WHERE id = $1`,
      [childId]
    );

    if (childCheck.rows.length === 0) {
      return Response.json({ error: '子どもが見つかりません。' }, { status: 404 });
    }
    const foundChild = childCheck.rows[0];

    if (user.id !== foundChild.user_id && user.role !== 'admin' && user.id !== foundChild.child_user_id) {
      return Response.json({ error: '閲覧権限がありません。' }, { status: 403 });
    }
    
    const result = await query(`
      SELECT clp.id, lg.name AS goal_name, lg.subject, lg.domain, clp.status, clp.last_accessed_at, clp.achieved_at, lg.description
      FROM child_learning_progress clp
      JOIN learning_goals lg ON clp.goal_id = lg.id
      WHERE clp.child_id = $1
      ORDER BY lg.subject, lg.domain
    `, [childId]);

    return Response.json(result.rows);
  } catch (err) {
    if (err.message.includes('token') || err.message.includes('Authorization')) {
        return Response.json({ error: `認証エラー: ${err.message}` }, { status: 401 });
    }
    console.error(`学習進捗取得エラー (childId: ${childId}):`, err);
    return Response.json({ error: '学習進捗の取得に失敗しました。' }, { status: 500 });
  }
}