// src/app/api/users/[id]/skills/route.js
import { verifyAccessTokenFromHeader } from '@/lib/auth';
import { findSkillScoresByUserId } from '@/repositories/skillRepository'; // 変更

export async function GET(req, { params }) {
  const userId = params.id;

  try {
    const user = verifyAccessTokenFromHeader(req);

    // ✅ 自分自身 or 管理者のみアクセス許可
    if (user.id !== userId && user.role !== 'admin') {
      return Response.json({ error: '閲覧権限がありません' }, { status: 403 });
    }

    // ✅ UUID形式チェック（セキュリティ対策）
    if (!/^[0-9a-fA-F-]{36}$/.test(userId)) {
      return Response.json({ error: '無効なユーザーID' }, { status: 400 });
    }

    // 変更: リポジトリ関数を呼び出す
    const skillScores = await findSkillScoresByUserId(userId);

    return Response.json(skillScores);
  } catch (err) {
    // 認証エラーのハンドリングを追加
    if (err.message.includes('token') || err.message.includes('Authorization')) {
        return Response.json({ error: `認証エラー: ${err.message}` }, { status: 401 });
    }
    console.error('[スキル取得エラー]', err);
    return Response.json({ error: '取得失敗' }, { status: 500 });
  }
}