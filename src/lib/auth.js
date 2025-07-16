// /src/lib/auth.js
// 役割: JWTの生成と検証ロジック。ペイロードのプロパティ名をDBと統一。

import jwt from 'jsonwebtoken';
import { randomBytes } from 'crypto';

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET;

if (!JWT_SECRET || !JWT_REFRESH_SECRET) {
  throw new Error('JWT_SECRET and JWT_REFRESH_SECRET must be set in .env.local');
}

/**
 * 短命なアクセストークンを生成します
 * @param {object} user - DBから取得したスネークケースのユーザーオブジェクト
 */
export function generateAccessToken(user) {
  // ✅【修正】ペイロードにはDBと一貫したスネークケースのプロパティ名を使用
  const payload = {
    id: user.id,
    email: user.email,
    role: user.role,
    first_name: user.first_name,
    last_name: user.last_name,
  };
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '15m' });
}

/**
 * 長命なリフレッシュトークンを生成します
 */
export function generateRefreshToken(user, jti) {
  const payload = {
    id: user.id,
    jti
  };
  return jwt.sign(payload, JWT_REFRESH_SECRET, { expiresIn: '7d' });
}

/**
 * リフレッシュトークンの一意なIDを生成します
 */
export function generateJti() {
  return randomBytes(16).toString('hex');
}


/**
 * アクセストークンを検証します
 */
export function verifyAccessToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    throw new Error('Invalid or expired access token');
  }
}

/**
 * リフレッシュトークンを検証します
 */
export function verifyRefreshToken(token) {
    try {
        return jwt.verify(token, JWT_REFRESH_SECRET);
    } catch (error) {
        throw new Error('Invalid or expired refresh token');
    }
}

/**
 * APIリクエストヘッダーからアクセストークンを取得し検証します
 * @param {Request} req - Next.jsのRequestオブジェクト
 * @returns {object} デコードされたユーザーペイロード
 */
export function verifyAccessTokenFromHeader(req) {
  const authHeader = req.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new Error('Authorization header is missing or invalid');
  }
  const token = authHeader.substring(7);
  return verifyAccessToken(token);
}