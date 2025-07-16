// /src/app/api/users/login/route.js
// 役割: ログイン処理（子どもプロフィールID取得機能付き）

import { query } from '@/lib/db';
import { generateAccessToken, generateRefreshToken, generateJti } from '@/lib/auth';
import bcrypt from 'bcrypt';
import { serialize } from 'cookie';
import { createSuccessResponse, createErrorResponse } from '@/utils/apiResponse'; // インポート

export async function POST(req) {
  try {
    const { email, password } = await req.json();
    if (!email || !password) {
      return createErrorResponse('メールアドレスとパスワードを入力してください', 400); // 修正
    }

    const result = await query(
      `SELECT id, email, password_hash, first_name, last_name, role FROM users WHERE email = $1`,
      [email.toLowerCase().trim()]
    );
    if (result.rows.length === 0) {
      return createErrorResponse('メールアドレスまたはパスワードが正しくありません', 401); // 修正
    }

    const userFromDb = result.rows[0];
    const isPasswordValid = await bcrypt.compare(password, userFromDb.password_hash);
    if (!isPasswordValid) {
      return createErrorResponse('メールアドレスまたはパスワードが正しくありません', 401); // 修正
    }
    
    let childProfileId = null;
    if (userFromDb.role === 'child') {
      const profileRes = await query(`SELECT id FROM children WHERE user_id = $1`, [userFromDb.id]); // 修正: child_user_id -> user_id
      if (profileRes.rows.length > 0) {
        childProfileId = profileRes.rows[0].id;
      }
    }

    const jti = generateJti();
    const accessToken = generateAccessToken(userFromDb);
    const refreshToken = generateRefreshToken(userFromDb, jti);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await query(
      `INSERT INTO refresh_tokens (jti, user_id, token, expires_at) VALUES ($1, $2, $3, $4)`,
      [jti, userFromDb.id, refreshToken, expiresAt]
    );

    const refreshTokenCookie = serialize('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      expires: expiresAt,
    });

    // 修正: 標準形式のレスポンスを生成
    const responseData = {
      accessToken,
      user: {
        id: userFromDb.id,
        email: userFromDb.email,
        firstName: userFromDb.first_name,
        lastName: userFromDb.last_name,
        role: userFromDb.role,
        childProfileId: childProfileId,
      }
    };
    const response = createSuccessResponse(responseData);
    
    // Set-Cookieヘッダーを追加
    response.headers.set('Set-Cookie', refreshTokenCookie);
    
    return response;

  } catch (error) {
    console.error('Login API error:', error);
    return createErrorResponse('ログイン処理中にエラーが発生しました', 500); // 修正
  }
}