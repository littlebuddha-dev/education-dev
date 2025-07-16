import { query } from '@/lib/db';
import ChildRegisterButton from '@/components/ChildRegisterButton';


export default async function UserDetailPage({ params }) {
  const userId = params.id;

  // 1. ユーザー情報取得
  const userRes = await query(
    `SELECT id, email, first_name, last_name, created_at
     FROM users WHERE id = $1`,
    [userId]
  );
  const user = userRes.rows[0];

  if (!user) return <div>ユーザーが見つかりませんでした。</div>;

  // 2. 子ども数の取得
  const childrenRes = await query(
    `SELECT COUNT(*) FROM children WHERE user_id = $1`,
    [userId]
  );
  const childCount = parseInt(childrenRes.rows[0].count);

  // 3. スキルログの統計取得
  const skillRes = await query(
    `SELECT skill_name, COUNT(*) as total, AVG(score)::int as avg_score
     FROM skill_logs
     WHERE child_id IN (
       SELECT id FROM children WHERE user_id = $1
     )
     GROUP BY skill_name
     ORDER BY avg_score DESC`,
    [userId]
  );

  return (
    <main style={{ padding: '2rem' }}>
      <h1>{user.last_name} {user.first_name} さんの学習分析</h1>
      <p>メール: {user.email}</p>
      <p>登録日: {new Date(user.created_at).toLocaleDateString()}</p>
      <p>子ども登録数: {childCount}</p>

      <h2>スキル分析</h2>
      {skillRes.rows.length === 0 ? (
        <p>スキルログがまだありません。</p>
      ) : (
        <table border="1" cellPadding="8" style={{ borderCollapse: 'collapse', width: '100%' }}>
          <thead>
            <tr>
              <th>スキル名</th>
              <th>記録回数</th>
              <th>平均スコア</th>
            </tr>
          </thead>
          <tbody>
            {skillRes.rows.map(skill => (
              <tr key={skill.skill_name}>
                <td>{skill.skill_name}</td>
                <td>{skill.total}</td>
                <td>{skill.avg_score}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      
    <ChildRegisterButton userId={user.id} />
    </main>
  );
}
