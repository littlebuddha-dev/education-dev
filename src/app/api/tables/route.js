// littlebuddha-dev/education/education-676d25275fadd678f043e2a225217161a768db69/src/app/api/tables/route.js
import { query } from '@/lib/db';

export async function GET() {
  try {
    // データベース接続テストを兼ねて、テーブル一覧を取得
    const result = await query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
    `);
    // 接続成功した場合は、テーブルリストと共に success: true を返す
    return Response.json({ success: true, tables: result.rows });
  } catch (err) {
    console.error('Error fetching table list or connecting to DB:', err);
    // ここで err オブジェクト全体をログに出力し、詳細を確認します。
    // 特に err.code や err.message を確認してください。
    console.error('Full DB error object:', err); // ✅ 追加

    let errorMessage = 'DB接続に失敗しました。PostgreSQLが起動しているか、.env.localの設定を確認してください。';
    if (err.code === 'ENOTFOUND' || err.code === 'ECONNREFUSED') {
      errorMessage = 'データベースホストが見つからないか、接続が拒否されました。ホスト名、ポート、またはデータベースが起動しているか確認してください。';
    } else if (err.code === '28P01') { // PostgreSQL authentication_failed
      errorMessage = 'データベース認証に失敗しました。ユーザー名とパスワードが正しいか確認してください。';
    } else if (err.code === '3D000') { // PostgreSQL invalid_catalog_name
      errorMessage = '指定されたデータベースが存在しません。データベース名が正しいか確認してください。';
    } else {
      // 予測できないエラーの場合、汎用メッセージにエラー詳細を付加
      errorMessage = `データベースエラー: ${err.message}`;
    }

    return Response.json({ success: false, error: errorMessage }, { status: 500 });
  }
}