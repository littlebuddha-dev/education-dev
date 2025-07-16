// /src/app/api/children/link/route.js
import { query, getClient, releaseClient, beginTransaction, commitTransaction, rollbackTransaction } from '@/lib/db';
import { verifyAccessTokenFromHeader } from '@/lib/auth'; // ✅ 修正: 正しい関数をインポート

export async function POST(req) {
  const client = await getClient();
  try {
    const user = verifyAccessTokenFromHeader(req); // ✅ 修正: ヘッダーからトークンを検証

    // 保護者ロールのみ許可
    if (user.role !== 'parent') {
      return Response.json({ error: '保護者のみがこの操作を行えます' }, { status: 403 });
    }

    const { childEmail } = await req.json(); // 紐付けたい子どものメールアドレス
    if (!childEmail) {
      return Response.json({ error: '子どものメールアドレスが指定されていません' }, { status: 400 });
    }

    await beginTransaction(client);

    // 1. childEmail に対応する 'child' ロールのユーザーを探す
    const childUserResult = await client.query(
      `SELECT id FROM users WHERE email = $1 AND role = 'child'`,
      [childEmail]
    );

    if (childUserResult.rows.length === 0) {
      await rollbackTransaction(client);
      return Response.json({ error: '指定されたメールアドレスの子どもアカウントが見つかりません' }, { status: 404 });
    }
    const childUserId = childUserResult.rows[0].id;

    // 2. その子どもユーザーIDに紐付く children テーブルのレコードを探す
    const childrenResult = await client.query(
      `SELECT id, user_id FROM children WHERE child_user_id = $1`,
      [childUserId]
    );

    if (childrenResult.rows.length === 0) {
        await rollbackTransaction(client);
        return Response.json({ error: 'この子どもアカウントに紐づくプロフィールが存在しません' }, { status: 400 });
    }
    const childProfile = childrenResult.rows[0];

    if (childProfile.user_id) {
        await rollbackTransaction(client);
        return Response.json({ error: 'この子どもアカウントは既に別の保護者に紐付けられています' }, { status: 409 });
    }

    // 3. children テーブルのレコードの user_id を更新して紐付け
    await client.query(
      `UPDATE children SET user_id = $1 WHERE id = $2`,
      [user.id, childProfile.id]
    );

    await commitTransaction(client);

    return Response.json({ message: '子どもアカウントが紐付けられました', childProfileId: childProfile.id });
  } catch (err) {
    if (client) await rollbackTransaction(client);
    console.error('子どもアカウント紐付けエラー:', err);
    if (err.message.includes('token') || err.message.includes('Authorization')) {
        return Response.json({ error: `認証エラー: ${err.message}` }, { status: 401 });
    }
    return Response.json({ error: err.message || '子どもアカウントの紐付けに失敗しました' }, { status: 500 });
  } finally {
    if (client) releaseClient(client);
  }
}