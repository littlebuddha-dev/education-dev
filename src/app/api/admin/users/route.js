// /src/app/api/admin/users/route.js (互換性維持版)
// 役割: 管理者向けのユーザー一覧取得API（既存フロントエンドとの互換性を維持）

import { query } from '@/lib/db';
import { verifyAccessTokenFromHeader } from '@/lib/auth';
import { createSuccessResponse, createErrorResponse } from '@/utils/apiResponse'; // インポート

export async function GET(req) {
  try {
    const user = verifyAccessTokenFromHeader(req);

    if (user.role !== 'admin') {
      return createErrorResponse('管理者権限が必要です', 403, 'FORBIDDEN'); // 修正
    }

    const result = await query(`
      SELECT 
        u.id, u.email, u.first_name, u.last_name, u.role, u.created_at,
        (SELECT COUNT(*)::int FROM parent_child_relationships pcr WHERE pcr.parent_user_id = u.id AND pcr.status = 'active') as children_count
      FROM users u
      WHERE u.role != 'child'
      ORDER BY u.created_at DESC
    `);
    
    // 修正: 標準形式でレスポンスを返す
    return createSuccessResponse(result.rows);

  } catch (err) {
    if (err.message.includes('token') || err.message.includes('Authorization')) {
        return createErrorResponse(`認証エラー: ${err.message}`, 401, 'AUTH_ERROR'); // 修正
    }
    console.error('ユーザー一覧取得エラー:', err);
    return createErrorResponse('ユーザー一覧の取得に失敗しました', 500, 'DATABASE_ERROR'); // 修正
  }
}