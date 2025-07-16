// /src/app/api/children/[id]/evaluations/route.js
import { query } from '@/lib/db';
import { verifyAccessTokenFromHeader } from '@/lib/auth'; // ✅ 認証関数をインポート

export async function GET(req, { params }) { // ✅ req を引数に追加
  const childId = params.id;

  // UUID形式かどうかチェック
  if (!/^[0-9a-fA-F-]{36}$/.test(childId)) {
    return Response.json({ error: '不正なID形式です' }, { status: 400 });
  }

  try {
    // ✅ 認証チェックを追加
    const currentUser = verifyAccessTokenFromHeader(req);

    const childCheckRes = await query(
      `SELECT user_id, child_user_id FROM children WHERE id = $1`,
      [childId]
    );

    if (childCheckRes.rows.length === 0) {
      return Response.json({ error: '対象の子どもが見つかりません。' }, { status: 404 });
    }
    const childData = childCheckRes.rows[0];

    // ✅ 権限チェックを追加
    const isOwner = currentUser.id === childData.user_id;
    const isSelf = currentUser.id === childData.child_user_id;
    const isAdmin = currentUser.role === 'admin';

    if (!isOwner && !isSelf && !isAdmin) {
      return Response.json({ error: 'アクセス権限がありません。' }, { status: 403 });
    }

    const result = await query(`
      SELECT subject, domain, level, reason, recommendation, created_at
      FROM evaluation_logs
      WHERE child_id = $1
      ORDER BY created_at DESC
    `, [childId]);

    return Response.json(result.rows);
  } catch (err) {
    // ✅ 認証エラーハンドリングを追加
    if (err.message.includes('token') || err.message.includes('Authorization')) {
        return Response.json({ error: `認証エラー: ${err.message}` }, { status: 401 });
    }
    console.error('評価ログ取得エラー:', err);
    return Response.json({ error: '評価取得に失敗しました' }, { status: 500 });
  }
}