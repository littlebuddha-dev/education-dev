// /src/app/api/users/update/route.js
// 役割: ユーザー情報更新API。認証方式を刷新。

import { query } from '@/lib/db';
import { verifyAccessTokenFromHeader } from '@/lib/auth'; // ✅ 修正

export async function PATCH(req) {
  try {
    const currentUser = verifyAccessTokenFromHeader(req); // ✅ 修正
    const { id, first_name, last_name, email } = await req.json();

    // [追加] 認可チェック: 自分自身の情報か、または管理者が操作しているか
    if (currentUser.id !== id && currentUser.role !== 'admin') {
      return Response.json({ error: '権限がありません。' }, { status: 403 });
    }

    const result = await query(
      `UPDATE users
       SET first_name = $1, last_name = $2, email = $3, updated_at = CURRENT_TIMESTAMP
       WHERE id = $4
       RETURNING id, email, first_name, last_name, role`,
      [first_name, last_name, email, id]
    );

    if (result.rows.length === 0) {
      return Response.json({ error: '更新対象のユーザーが見つかりません。' }, { status: 404 });
    }

    return Response.json(result.rows[0]);
  } catch (err) {
    if (err.message.includes('token') || err.message.includes('Authorization')) {
        return Response.json({ error: `認証エラー: ${err.message}` }, { status: 401 });
    }
    console.error('ユーザー更新エラー:', err);
    if (err.code === '23505') {
        return Response.json({ error: 'そのメールアドレスは既に使用されています。' }, { status: 409 });
    }
    return Response.json({ error: '更新中にエラーが発生しました。' }, { status: 500 });
  }
}