// /src/app/api/debug/profile/route.js
// 役割: デバッグ用 - 子どもプロフィールの状態確認API（開発環境のみ）

import { query } from '@/lib/db';
import { verifyAccessTokenFromHeader } from '@/lib/auth';

export async function GET(req) {
  // 開発環境でのみ利用可能
  if (process.env.NODE_ENV !== 'development') {
    return Response.json({ error: 'このAPIは開発環境でのみ利用可能です' }, { status: 403 });
  }

  try {
    const user = verifyAccessTokenFromHeader(req);
    
    console.log('[Debug Profile API] Request from user:', { id: user.id, email: user.email, role: user.role });

    // ユーザー情報を取得
    const userResult = await query(
      `SELECT id, email, first_name, last_name, role, created_at FROM users WHERE id = $1`,
      [user.id]
    );

    if (userResult.rows.length === 0) {
      return Response.json({ error: 'ユーザーが見つかりません' }, { status: 404 });
    }

    const userData = userResult.rows[0];

    // 子どもの場合は、関連するchildrenレコードを確認
    let childProfiles = [];
    if (user.role === 'child') {
      const childResult = await query(
        `SELECT * FROM children WHERE child_user_id = $1 OR user_id = $1`,
        [user.id]
      );
      childProfiles = childResult.rows;
    } else if (user.role === 'parent') {
      const childResult = await query(
        `SELECT * FROM children WHERE user_id = $1`,
        [user.id]
      );
      childProfiles = childResult.rows;
    } else if (user.role === 'admin') {
      const childResult = await query(`SELECT * FROM children ORDER BY created_at DESC`);
      childProfiles = childResult.rows;
    }

    // スキルログも確認
    let skillLogs = [];
    if (childProfiles.length > 0) {
      const childIds = childProfiles.map(c => c.id);
      const skillResult = await query(
        `SELECT sl.*, c.name as child_name 
         FROM skill_logs sl 
         JOIN children c ON sl.child_id = c.id 
         WHERE sl.child_id = ANY($1) 
         ORDER BY sl.recorded_at DESC 
         LIMIT 10`,
        [childIds]
      );
      skillLogs = skillResult.rows;
    }

    const debugInfo = {
      user: userData,
      childProfiles: childProfiles,
      childProfilesCount: childProfiles.length,
      skillLogs: skillLogs,
      skillLogsCount: skillLogs.length,
      analysis: {
        hasValidChildProfile: user.role === 'child' ? childProfiles.some(c => c.child_user_id === user.id) : null,
        profileIssues: [],
        recommendations: []
      }
    };

    // 問題の分析
    if (user.role === 'child') {
      const validProfile = childProfiles.find(c => c.child_user_id === user.id);
      if (!validProfile) {
        debugInfo.analysis.profileIssues.push('子どもユーザーに対応するchildrenレコードが見つかりません');
        debugInfo.analysis.recommendations.push('管理者に連絡して、子どもプロフィールの作成を依頼してください');
      } else {
        debugInfo.analysis.recommendations.push(`プロフィールID ${validProfile.id} が正常に設定されています`);
      }
    }

    if (user.role === 'parent' && childProfiles.length === 0) {
      debugInfo.analysis.profileIssues.push('この保護者に紐づく子どもがいません');
      debugInfo.analysis.recommendations.push('子ども登録ページから子どもを追加してください');
    }

    return Response.json(debugInfo);

  } catch (err) {
    console.error('[Debug Profile API] Error:', err);
    if (err.message.includes('token') || err.message.includes('Authorization')) {
      return Response.json({ error: `認証エラー: ${err.message}` }, { status: 401 });
    }
    return Response.json({ error: 'プロフィール情報の取得に失敗しました' }, { status: 500 });
  }
}