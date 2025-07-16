// src/app/api/users/check-admin/route.js
import { query } from '@/lib/db';

export async function GET() {
  try {
    const result = await query(`SELECT COUNT(*) FROM users WHERE role = 'admin'`);
    const adminExists = parseInt(result.rows[0].count) > 0;
    return Response.json({ adminExists });
  } catch (err) {
    console.error('Error checking admin user existence:', err);
    // データベース接続エラーやusersテーブルが存在しない場合のハンドリング
    let errorMessage = '管理者ユーザーの存在確認に失敗しました。';
    if (err.code === 'ENOTFOUND' || err.code === 'ECONNREFUSED') {
      errorMessage = 'データベースホストが見つからないか、接続が拒否されました。';
    } else if (err.code === '28P01') { // PostgreSQL authentication_failed
      errorMessage = 'データベース認証に失敗しました。';
    } else if (err.code === '3D000') { // PostgreSQL invalid_catalog_name
      // データベースが存在しない場合、テーブルも存在しないので adminExists: false とみなす
      return Response.json({ adminExists: false, error: '指定されたデータベースが存在しないか、テーブルが未作成です。' }, { status: 200 });
    } else if (err.message && err.message.includes('relation "users" does not exist')) {
        // users テーブルが存在しない場合も adminExists: false とみなす
        return Response.json({ adminExists: false, error: 'users テーブルが存在しません。' }, { status: 200 });
    }

    // 予期せぬエラーは500で返す
    return Response.json({ adminExists: false, error: errorMessage }, { status: 500 });
  }
}