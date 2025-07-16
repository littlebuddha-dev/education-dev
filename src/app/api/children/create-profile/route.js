// /src/app/api/children/create-profile/route.js
// 役割: 既存の子どもユーザーに対してchildrenテーブルのプロフィールを作成するAPI

import { query } from '@/lib/db';
import { verifyAccessTokenFromHeader } from '@/lib/auth';

export async function POST(req) {
  try {
    const user = verifyAccessTokenFromHeader(req);
    const { childUserId, name, birthday, gender } = await req.json();

    console.log('[Create Profile API] Request:', { 
      requestUserId: user.id, 
      requestUserRole: user.role,
      childUserId, 
      name 
    });

    // 管理者またはユーザー自身のみが実行可能
    if (user.role !== 'admin' && user.id !== childUserId) {
      return Response.json({ error: '権限がありません' }, { status: 403 });
    }

    // 対象ユーザーが存在し、子どもロールであることを確認
    const targetUserResult = await query(
      `SELECT id, email, first_name, last_name, role, birthday FROM users WHERE id = $1`,
      [childUserId]
    );

    if (targetUserResult.rows.length === 0) {
      return Response.json({ error: '対象のユーザーが見つかりません' }, { status: 404 });
    }

    const targetUser = targetUserResult.rows[0];
    if (targetUser.role !== 'child') {
      return Response.json({ error: '対象のユーザーは子どもロールではありません' }, { status: 400 });
    }

    // 既にプロフィールが存在するかチェック
    const existingProfileResult = await query(
      `SELECT id FROM children WHERE child_user_id = $1`,
      [childUserId]
    );

    if (existingProfileResult.rows.length > 0) {
      return Response.json({ 
        error: 'このユーザーには既にプロフィールが存在します',
        existingProfileId: existingProfileResult.rows[0].id
      }, { status: 409 });
    }

    // プロフィール名とその他の情報を決定
    const profileName = name || `${targetUser.last_name || ''} ${targetUser.first_name || ''}`.trim() || 'Unknown';
    const profileBirthday = birthday || targetUser.birthday;
    const profileGender = gender || null;

    // 子どもプロフィールを作成
    const createResult = await query(
      `INSERT INTO children (child_user_id, name, birthday, gender, created_at, updated_at)
       VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
       RETURNING *`,
      [childUserId, profileName, profileBirthday, profileGender]
    );

    const newProfile = createResult.rows[0];
    
    console.log('[Create Profile API] Profile created:', {
      profileId: newProfile.id,
      childUserId: newProfile.child_user_id,
      name: newProfile.name
    });

    return Response.json({
      message: '子どもプロフィールが正常に作成されました',
      profile: newProfile
    });

  } catch (err) {
    console.error('[Create Profile API] Error:', err);
    if (err.message.includes('token') || err.message.includes('Authorization')) {
      return Response.json({ error: `認証エラー: ${err.message}` }, { status: 401 });
    }
    return Response.json({ error: 'プロフィールの作成に失敗しました' }, { status: 500 });
  }
}