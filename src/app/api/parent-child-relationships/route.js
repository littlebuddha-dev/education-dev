// /src/app/api/parent-child-relationships/route.js
// 役割: 保護者と子どもの関係を管理するAPI

import { query } from '@/lib/db';
import { verifyAccessTokenFromHeader } from '@/lib/auth';

// [POST] 新しい保護者-子ども関係を申請/作成
export async function POST(req) {
  try {
    const user = verifyAccessTokenFromHeader(req);
    const { childEmail, relationshipType = 'parent', autoApprove = false } = await req.json();

    if (!childEmail) {
      return Response.json({ error: '子どものメールアドレスは必須です' }, { status: 400 });
    }

    // 保護者または管理者のみが関係を作成可能
    if (user.role !== 'parent' && user.role !== 'admin') {
      return Response.json({ error: '保護者または管理者のみが関係を作成できます' }, { status: 403 });
    }

    // 子どもユーザーを検索
    const childUserResult = await query(
      'SELECT id, email, first_name, last_name FROM users WHERE email = $1 AND role = $2',
      [childEmail.toLowerCase().trim(), 'child']
    );

    if (childUserResult.rows.length === 0) {
      return Response.json({ error: '指定されたメールアドレスの子どもユーザーが見つかりません' }, { status: 404 });
    }

    const childUser = childUserResult.rows[0];

    // 子どもプロフィールが存在するかチェック
    const childProfileResult = await query(
      'SELECT id FROM children WHERE user_id = $1',
      [childUser.id]
    );

    if (childProfileResult.rows.length === 0) {
      return Response.json({ error: 'この子どもにはプロフィールが作成されていません' }, { status: 400 });
    }

    // 既存の関係をチェック
    const existingRelationship = await query(
      'SELECT id, status FROM parent_child_relationships WHERE parent_user_id = $1 AND child_user_id = $2',
      [user.id, childUser.id]
    );

    if (existingRelationship.rows.length > 0) {
      const existing = existingRelationship.rows[0];
      if (existing.status === 'active') {
        return Response.json({ error: 'この子どもとの関係は既に有効です' }, { status: 409 });
      } else if (existing.status === 'pending') {
        return Response.json({ error: 'この子どもとの関係は既に申請済みです' }, { status: 409 });
      }
    }

    // 関係の作成
    const status = (user.role === 'admin' || autoApprove) ? 'active' : 'pending';
    const approvedAt = status === 'active' ? 'CURRENT_TIMESTAMP' : null;
    const approvedBy = status === 'active' ? user.id : null;

    const relationshipResult = await query(`
      INSERT INTO parent_child_relationships 
      (parent_user_id, child_user_id, relationship_type, status, created_by, approved_at, approved_by)
      VALUES ($1, $2, $3, $4, $1, ${approvedAt ? '$6' : 'NULL'}, ${approvedBy ? '$7' : 'NULL'})
      RETURNING *
    `, [
      user.id, 
      childUser.id, 
      relationshipType, 
      status,
      ...(approvedAt ? [new Date()] : []),
      ...(approvedBy ? [approvedBy] : [])
    ]);

    return Response.json({
      message: status === 'active' 
        ? '子どもとの関係が正常に作成されました'
        : '関係の申請が送信されました。承認をお待ちください',
      relationship: relationshipResult.rows[0],
      childInfo: {
        name: `${childUser.first_name} ${childUser.last_name}`,
        email: childUser.email
      }
    });

  } catch (err) {
    if (err.message.includes('token') || err.message.includes('Authorization')) {
      return Response.json({ error: `認証エラー: ${err.message}` }, { status: 401 });
    }
    console.error('関係作成エラー:', err);
    return Response.json({ error: '関係の作成に失敗しました' }, { status: 500 });
  }
}

// [GET] 保護者-子ども関係の一覧を取得
export async function GET(req) {
  try {
    const user = verifyAccessTokenFromHeader(req);
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status') || 'active';
    const type = searchParams.get('type'); // 'as_parent' or 'as_child'

    let relationships = [];

    if (user.role === 'parent') {
      // 保護者として管理している子ども
      const result = await query(`
        SELECT 
          pcr.*,
          cu.email as child_email,
          cu.first_name as child_first_name,
          cu.last_name as child_last_name,
          c.display_name,
          c.grade,
          c.school
        FROM parent_child_relationships pcr
        JOIN users cu ON pcr.child_user_id = cu.id
        LEFT JOIN children c ON cu.id = c.user_id
        WHERE pcr.parent_user_id = $1 AND pcr.status = $2
        ORDER BY pcr.created_at DESC
      `, [user.id, status]);

      relationships = result.rows;

    } else if (user.role === 'child') {
      // 自分を管理している保護者
      const result = await query(`
        SELECT 
          pcr.*,
          pu.email as parent_email,
          pu.first_name as parent_first_name,
          pu.last_name as parent_last_name
        FROM parent_child_relationships pcr
        JOIN users pu ON pcr.parent_user_id = pu.id
        WHERE pcr.child_user_id = $1 AND pcr.status = $2
        ORDER BY pcr.created_at DESC
      `, [user.id, status]);

      relationships = result.rows;

    } else if (user.role === 'admin') {
      // 管理者は全ての関係を閲覧可能
      const result = await query(`
        SELECT 
          pcr.*,
          pu.email as parent_email,
          pu.first_name as parent_first_name,
          pu.last_name as parent_last_name,
          cu.email as child_email,
          cu.first_name as child_first_name,
          cu.last_name as child_last_name,
          c.display_name,
          c.grade
        FROM parent_child_relationships pcr
        JOIN users pu ON pcr.parent_user_id = pu.id
        JOIN users cu ON pcr.child_user_id = cu.id
        LEFT JOIN children c ON cu.id = c.user_id
        WHERE ($1::text IS NULL OR pcr.status = $1)
        ORDER BY pcr.created_at DESC
      `, [status === 'all' ? null : status]);

      relationships = result.rows;

    } else {
      return Response.json({ error: '閲覧権限がありません' }, { status: 403 });
    }

    return Response.json({
      relationships,
      total: relationships.length,
      user_role: user.role
    });

  } catch (err) {
    if (err.message.includes('token') || err.message.includes('Authorization')) {
      return Response.json({ error: `認証エラー: ${err.message}` }, { status: 401 });
    }
    console.error('関係一覧取得エラー:', err);
    return Response.json({ error: '関係一覧の取得に失敗しました' }, { status: 500 });
  }
}

// [DELETE] 保護者-子ども関係を削除
export async function DELETE(req) {
  try {
    const user = verifyAccessTokenFromHeader(req);
    const { searchParams } = new URL(req.url);
    const relationshipId = searchParams.get('id');
    const childEmail = searchParams.get('childEmail');

    if (!relationshipId && !childEmail) {
      return Response.json({ error: '関係IDまたは子どものメールアドレスが必要です' }, { status: 400 });
    }

    let deleteQuery;
    let deleteParams;

    if (relationshipId) {
      // 関係IDで削除
      if (user.role === 'admin') {
        deleteQuery = 'DELETE FROM parent_child_relationships WHERE id = $1 RETURNING *';
        deleteParams = [relationshipId];
      } else {
        deleteQuery = `
          DELETE FROM parent_child_relationships 
          WHERE id = $1 AND (parent_user_id = $2 OR child_user_id = $2)
          RETURNING *
        `;
        deleteParams = [relationshipId, user.id];
      }
    } else {
      // 子どものメールアドレスで削除
      const childUserResult = await query(
        'SELECT id FROM users WHERE email = $1 AND role = $2',
        [childEmail.toLowerCase().trim(), 'child']
      );

      if (childUserResult.rows.length === 0) {
        return Response.json({ error: '指定された子どもユーザーが見つかりません' }, { status: 404 });
      }

      const childUserId = childUserResult.rows[0].id;

      if (user.role === 'admin') {
        deleteQuery = 'DELETE FROM parent_child_relationships WHERE child_user_id = $1 RETURNING *';
        deleteParams = [childUserId];
      } else {
        deleteQuery = `
          DELETE FROM parent_child_relationships 
          WHERE parent_user_id = $1 AND child_user_id = $2
          RETURNING *
        `;
        deleteParams = [user.id, childUserId];
      }
    }

    const result = await query(deleteQuery, deleteParams);

    if (result.rows.length === 0) {
      return Response.json({ error: '削除対象の関係が見つからないか、権限がありません' }, { status: 404 });
    }

    return Response.json({
      message: '関係が正常に削除されました',
      deleted_relationship: result.rows[0]
    });

  } catch (err) {
    if (err.message.includes('token') || err.message.includes('Authorization')) {
      return Response.json({ error: `認証エラー: ${err.message}` }, { status: 401 });
    }
    console.error('関係削除エラー:', err);
    return Response.json({ error: '関係の削除に失敗しました' }, { status: 500 });
  }
}