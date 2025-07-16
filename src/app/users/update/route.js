// src/app/users/update/route.js
// タイトル: ユーザー情報更新API
// 役割: ユーザー情報を更新します。認証と認可処理を追加し、自分自身または管理者のみが更新できるように修正しました。

import { query } from '@/lib/db';
import { verifyAccessTokenFromHeader } from '@/lib/auth'; // 修正: verifyAccessTokenFromHeader に変更

export async function PATCH(req) {
  try {
    // [追加] リクエストからトークンを検証し、ユーザー情報を取得
    const currentUser = verifyAccessTokenFromHeader(req); // 修正: verifyAccessTokenFromHeader に変更
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
    console.error('ユーザー更新エラー:', err);
    // JWTの検証エラーなどもここでキャッチされる
    if (err.message.includes('token') || err.message.includes('Authorization')) { // 修正: `token` と `Authorization` をチェック
        return Response.json({ error: `認証エラー: ${err.message}` }, { status: 401 });
    }
    // DBのユニーク制約違反など
    if (err.code === '23505') {
        return Response.json({ error: 'そのメールアドレスは既に使用されています。' }, { status: 409 });
    }
    return Response.json({ error: '更新中にエラーが発生しました。' }, { status: 500 });
  }
}