// /src/app/api/parent-child-relationships/[id]/approve/route.js
// 役割: 保護者-子ども関係の承認API

import { query } from '@/lib/db';
import { verifyAccessTokenFromHeader } from '@/lib/auth';

// [PUT] 関係を承認する
export async function PUT(req, { params }) {
  try {
    const user = verifyAccessTokenFromHeader(req);
    const relationshipId = params.id;
    const { action = 'approve' } = await req.json(); // 'approve' or 'reject'

    if (!relationshipId || !/^[0-9a-fA-F-]{36}$/.test(relationshipId)) {
      return Response.json({ error: '無効な関係IDです' }, { status: 400 });
    }

    // 関係の詳細を取得
    const relationshipResult = await query(`
      SELECT 
        pcr.*,
        pu.email as parent_email,
        pu.first_name as parent_first_name,
        pu.last_name as parent_last_name,
        cu.email as child_email,
        cu.first_name as child_first_name,
        cu.last_name as child_last_name
      FROM parent_child_relationships pcr
      JOIN users pu ON pcr.parent_user_id = pu.id
      JOIN users cu ON pcr.child_user_id = cu.id
      WHERE pcr.id = $1
    `, [relationshipId]);

    if (relationshipResult.rows.length === 0) {
      return Response.json({ error: '指定された関係が見つかりません' }, { status: 404 });
    }

    const relationship = relationshipResult.rows[0];

    // 権限チェック
    const canApprove = (
      user.role === 'admin' ||
      user.id === relationship.child_user_id ||  // 子ども本人
      user.id === relationship.parent_user_id    // 申請した保護者（取り消し用）
    );

    if (!canApprove) {
      return Response.json({ error: '承認権限がありません' }, { status: 403 });
    }

    // 既に処理済みかチェック
    if (relationship.status === 'active') {
      return Response.json({ error: 'この関係は既に承認済みです' }, { status: 409 });
    }

    if (relationship.status === 'rejected') {
      return Response.json({ error: 'この関係は既に拒否されています' }, { status: 409 });
    }

    let updateQuery;
    let updateParams;
    let newStatus;
    let message;

    if (action === 'approve') {
      newStatus = 'active';
      message = '関係が正常に承認されました';
      updateQuery = `
        UPDATE parent_child_relationships 
        SET status = $1, approved_at = CURRENT_TIMESTAMP, approved_by = $2
        WHERE id = $3
        RETURNING *
      `;
      updateParams = [newStatus, user.id, relationshipId];
    } else if (action === 'reject') {
      newStatus = 'rejected';
      message = '関係が拒否されました';
      updateQuery = `
        UPDATE parent_child_relationships 
        SET status = $1, approved_by = $2
        WHERE id = $3
        RETURNING *
      `;
      updateParams = [newStatus, user.id, relationshipId];
    } else {
      return Response.json({ error: '無効なアクションです' }, { status: 400 });
    }

    const updateResult = await query(updateQuery, updateParams);

    return Response.json({
      message,
      relationship: updateResult.rows[0],
      action_by: {
        id: user.id,
        role: user.role,
        name: `${user.first_name} ${user.last_name}`
      }
    });

  } catch (err) {
    if (err.message.includes('token') || err.message.includes('Authorization')) {
      return Response.json({ error: `認証エラー: ${err.message}` }, { status: 401 });
    }
    console.error('関係承認エラー:', err);
    return Response.json({ error: '関係の承認処理に失敗しました' }, { status: 500 });
  }
}