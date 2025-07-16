// /src/app/api/auth/refresh/route.js
// 役割: トークンリフレッシュAPI（子どもプロフィールID取得機能付き）

import { query } from '@/lib/db';
import { verifyRefreshToken, generateAccessToken } from '@/lib/auth';

export async function POST(req) {
  const refreshToken = req.cookies.get('refreshToken')?.value;

  if (!refreshToken) {
    return Response.json({ error: 'Refresh token not found' }, { status: 401 });
  }

  try {
    const tokenResult = await query(
      `SELECT * FROM refresh_tokens WHERE token = $1`,
      [refreshToken]
    );

    const storedToken = tokenResult.rows[0];

    if (!storedToken || storedToken.is_revoked || new Date() > new Date(storedToken.expires_at)) {
      return Response.json({ error: 'Invalid or expired refresh token' }, { status: 401 });
    }

    const decoded = verifyRefreshToken(refreshToken);
    const userResult = await query(
      `SELECT id, email, first_name, last_name, role FROM users WHERE id = $1`,
      [decoded.id]
    );

    if (userResult.rows.length === 0) {
      return Response.json({ error: 'User not found' }, { status: 401 });
    }
    const userFromDb = userResult.rows[0];

    // ✅ 追加: 子どもロールの場合、プロフィールIDを取得する
    let childProfileId = null;
    if (userFromDb.role === 'child') {
      const profileRes = await query(`SELECT id FROM children WHERE child_user_id = $1`, [userFromDb.id]);
      if (profileRes.rows.length > 0) {
        childProfileId = profileRes.rows[0].id;
      }
    }

    const newAccessToken = generateAccessToken(userFromDb);

    return Response.json({
      accessToken: newAccessToken,
      user: {
        id: userFromDb.id,
        email: userFromDb.email,
        firstName: userFromDb.first_name,
        lastName: userFromDb.last_name,
        role: userFromDb.role,
        childProfileId: childProfileId, // ✅ ペイロードにプロフィールIDを追加
      }
    });

  } catch (error) {
    console.error('Refresh token error:', error.message);
    if (error.message.includes('token')) {
        return Response.json({ error: error.message }, { status: 401 });
    }
    return Response.json({ error: 'Failed to refresh token due to a server error.' }, { status: 500 });
  }
}