// /src/app/api/children/route.js
// 役割: 子どもの登録(POST)と一覧取得(GET) API（新スキーマ完全対応・インポート修正版）

// ▼▼▼ `query` をインポートに追加 ▼▼▼
import { getClient, beginTransaction, commitTransaction, rollbackTransaction, releaseClient, query } from '@/lib/db';
import { verifyAccessTokenFromHeader } from '@/lib/auth';
import { createUser } from '@/repositories/userRepository';
import { createChildProfile, createParentChildRelationship } from '@/repositories/childRepository';
import bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';

// [POST] 新しい子どもを登録する (新ロジック)
export async function POST(req) {
  const client = await getClient();
  try {
    const parentUser = verifyAccessTokenFromHeader(req);

    if (parentUser.role !== 'parent') {
      return Response.json({ error: '保護者のみ操作可能です' }, { status: 403 });
    }
    // ★ POST側では display_name ではなく、フォームから渡される想定の name を使う
    // ★ フロントエンドのフォームも後で display_name に合わせる必要があります
    const { name, gender, birthday } = await req.json();

    if (!name || !gender || !birthday) {
      return Response.json({ error: '名前、性別、誕生日は必須です。' }, { status: 400 });
    }
    
    await beginTransaction(client);

    // --- 1. 子ども用のユーザーアカウントを自動生成 ---
    const childEmail = `${uuidv4()}@child.local`;
    const tempPassword = uuidv4();
    const password_hash = await bcrypt.hash(tempPassword, 10);
    
    const childUser = await createUser(client, {
      email: childEmail,
      password_hash,
      first_name: name, // フォームからの name を使用
      last_name: '(子ども)',
      role: 'child',
      birthday,
    });
    
    // --- 2. 子どもプロフィールを作成 ---
    const childProfile = await createChildProfile(client, {
      user_id: childUser.id,
      display_name: name, // フォームからの name を display_name として使用
      birthday,
      gender,
    });
    
    // --- 3. 保護者と子どもの関係を作成 ---
    await createParentChildRelationship(client, {
      parent_user_id: parentUser.id,
      child_user_id: childUser.id,
      created_by: parentUser.id,
    });

    await commitTransaction(client);
    
    return Response.json(childProfile);

  } catch (err) {
    if (client) await rollbackTransaction(client);
    if (err.message.includes('token') || err.message.includes('Authorization')) {
        return Response.json({ error: `認証エラー: ${err.message}` }, { status: 401 });
    }
    console.error('子ども登録エラー:', err);
    return Response.json({ error: '子どもの登録に失敗しました。' }, { status: 500 });
  } finally {
    if (client) releaseClient(client);
  }
}


// [GET] 子どもの一覧または詳細を取得する (新ロジック)
export async function GET(req) {
  try {
    const user = verifyAccessTokenFromHeader(req);

    let queryText;
    let queryParams = [user.id];

    if (user.role === 'parent') {
      // 保護者の場合、関連付けられた子ども一覧を取得
      queryText = `
        SELECT c.id, c.user_id, c.display_name, c.birthday, c.gender, pcr.relationship_type
        FROM children c
        JOIN parent_child_relationships pcr ON c.user_id = pcr.child_user_id
        WHERE pcr.parent_user_id = $1 AND pcr.status = 'active'
        ORDER BY c.display_name;
      `;
    } else if (user.role === 'child') {
      // 子どもの場合、自分自身のプロフィールを取得
      queryText = `
        SELECT id, user_id, display_name, birthday, gender, created_at, updated_at
        FROM children
        WHERE user_id = $1;
      `;
    } else if (user.role === 'admin') {
      // 管理者の場合、すべての子ども一覧を取得（★親の情報もJOINして取得）
      queryText = `
        SELECT 
          c.id, 
          c.user_id, 
          c.display_name, 
          c.birthday, 
          c.gender, 
          pcr.parent_user_id,
          parent.email as parent_email
        FROM children c
        LEFT JOIN parent_child_relationships pcr ON c.user_id = pcr.child_user_id AND pcr.status = 'active'
        LEFT JOIN users parent ON pcr.parent_user_id = parent.id
        ORDER BY c.created_at DESC;
      `;
      queryParams = [];
    } else {
      return Response.json({ error: '権限がありません' }, { status: 403 });
    }
    
    const result = await query(queryText, queryParams);
    return Response.json(result.rows);

  } catch (err) {
    if (err.message.includes('token') || err.message.includes('Authorization')) {
        return Response.json({ error: `認証エラー: ${err.message}` }, { status: 401 });
    }
    console.error('子ども一覧/詳細取得エラー API:', err);
    return Response.json({ error: '一覧/詳細取得に失敗しました' }, { status: 500 });
  }
}