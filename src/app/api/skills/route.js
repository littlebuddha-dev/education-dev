// /src/app/api/skills/route.js
// 役割: 手動スキルログ登録API。認証方式を刷新。

import { verifyAccessTokenFromHeader } from '@/lib/auth';
import { createSkillLog } from '@/repositories/skillRepository'; // 変更

export async function POST(req) {
  try {
    const user = verifyAccessTokenFromHeader(req);
    if (user.role !== 'parent') {
      return Response.json({ error: '保護者のみ操作可能です' }, { status: 403 });
    }

    const { childId, domain, score } = await req.json();

    // 変更: リポジトリ関数を呼び出す
    const newLog = await createSkillLog({ childId, domain, score: parseFloat(score) });

    return Response.json(newLog);
  } catch (err) {
    if (err.message.includes('token') || err.message.includes('Authorization')) {
        return Response.json({ error: `認証エラー: ${err.message}` }, { status: 401 });
    }
    console.error('Skill log 登録エラー:', err);
    return Response.json({ error: '登録に失敗しました' }, { status: 500 });
  }
}