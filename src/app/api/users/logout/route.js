// /src/app/api/users/logout/route.js
// 役割: リフレッシュトークンを無効化し、クライアントのCookieをクリアする。

import { query } from '@/lib/db';
import { serialize } from 'cookie';
// ❌ import { cookies } from 'next/headers'; を削除します

export async function POST(req) {
  // ✅【修正】Requestオブジェクトから直接cookieを取得します
  const refreshToken = req.cookies.get('refreshToken')?.value;

  if (refreshToken) {
    try {
      // DBのリフレッシュトークンを無効化
      await query(`DELETE FROM refresh_tokens WHERE token = $1`, [refreshToken]);
    } catch (dbError) {
      console.error("Logout DB Error:", dbError);
    }
  }

  // クライアントのCookieをクリアするヘッダーを生成
  const clearCookie = serialize('refreshToken', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    expires: new Date(0),
  });

  const response = Response.json({ message: 'Logged out successfully' });
  response.headers.set('Set-Cookie', clearCookie);

  return response;
}