// /src/lib/withAuth.js
// 役割: APIルートをラップする高階関数。認証方式を刷新。

import { verifyAccessTokenFromHeader } from '@/lib/auth'; // ✅ 修正

/**
 * APIルートハンドラを認証・認可でラップする高階関数。
 * @param {Function} handler - 実際のAPI処理を行うハンドラ関数。引数として (req, { user, params }) を受け取ります。
 * @param {object} [options] - オプション。
 * @param {string[]} [options.allowedRoles=[]] - このAPIへのアクセスを許可するユーザーロールの配列。空配列の場合は認証のみ行い、ロールチェックは行いません。
 * @returns {Function} Next.jsのAPIルートとして機能する非同期関数。
 */
export function withAuth(handler, { allowedRoles = [] } = {}) {
  return async (req, { params }) => {
    try {
      const user = verifyAccessTokenFromHeader(req); // ✅ 修正

      if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
        return new Response(JSON.stringify({ error: 'この操作を行う権限がありません。' }), {
          status: 403,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      return await handler(req, { user, params });

    } catch (err) {
      if (err.message.includes('token') || err.message.includes('Authorization')) {
        return new Response(JSON.stringify({ error: err.message }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      console.error('API認証ラッパーで予期せぬエラー:', err);
      return new Response(JSON.stringify({ error: 'サーバー内部でエラーが発生しました。' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  };
}