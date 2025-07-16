// /src/app/api/children/[id]/skills/route.js
// 役割: 特定の子どものスキルログ一覧取得API。認証方式を刷新。
// 🔧 修正: Next.js 15のparams非同期化に対応

import { query } from '@/lib/db';
import { verifyAccessTokenFromHeader } from '@/lib/auth';
import { findSkillLogsByChildId } from '@/repositories/skillRepository'; // 変更

export async function GET(req, { params }) {
  const { id: childId } = await params;

  try {
    const currentUser = verifyAccessTokenFromHeader(req);

    if (!childId || !/^[0-9a-fA-F-]{36}$/.test(childId)) {
      return Response.json({ error: '不正な子どもIDです。' }, { status: 400 });
    }

    const childCheckRes = await query(
      `SELECT user_id, child_user_id FROM children WHERE id = $1`,
      [childId]
    );

    if (childCheckRes.rows.length === 0) {
      return Response.json({ error: '対象の子どもが見つかりません。' }, { status: 404 });
    }
    const childData = childCheckRes.rows[0];

    const isOwner = currentUser.id === childData.user_id;
    const isSelf = currentUser.id === childData.child_user_id;
    const isAdmin = currentUser.role === 'admin';

    if (!isOwner && !isSelf && !isAdmin) {
      return Response.json({ error: 'アクセス権限がありません。' }, { status: 403 });
    }

    // 変更: リポジトリ関数を呼び出す
    const skillLogs = await findSkillLogsByChildId(childId);
    
    return Response.json(skillLogs);

  } catch (err) {
    if (err.message.includes('token') || err.message.includes('Authorization')) {
      return Response.json({ error: `認証エラー: ${err.message}` }, { status: 401 });
    }
    console.error(`スキル取得エラー (childId: ${childId}):`, err);
    return Response.json({ error: 'スキルログの取得に失敗しました。' }, { status: 500 });
  }
}