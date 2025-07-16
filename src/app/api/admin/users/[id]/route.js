// /src/app/api/admin/users/[id]/route.js
import { query } from '@/lib/db';
import { verifyAccessTokenFromHeader } from '@/lib/auth'; // ✅ 修正: 正しい関数をインポート

export async function DELETE(req, { params }) {
  try {
    const user = verifyAccessTokenFromHeader(req); // ✅ 修正: ヘッダーからトークンを検証
    if (user.role !== 'admin') {
      return Response.json({ error: '管理者専用操作です' }, { status: 403 });
    }

    const userIdToDelete = params.id;

    // 自分自身は削除不可にしておく（任意）
    if (user.id === userIdToDelete) {
      return Response.json({ error: '自分自身は削除できません' }, { status: 400 });
    }

    await query(`DELETE FROM users WHERE id = $1`, [userIdToDelete]);

    return Response.json({ success: true });
  } catch (err) {
    console.error('ユーザー削除エラー:', err);
    // 認証エラーのハンドリングを追加
    if (err.message.includes('token') || err.message.includes('Authorization')) {
        return Response.json({ error: `認証エラー: ${err.message}` }, { status: 401 });
    }
    return Response.json({ error: '削除に失敗しました' }, { status: 500 });
  }
}