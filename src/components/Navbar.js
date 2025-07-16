// /src/components/Navbar.js (修正後)
'use client';

import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import ClientOnly from './ClientOnly';

export default function Navbar() {
  const { user, isAuthenticated, logout, isLoading } = useAuth();

  const handleLogout = () => {
    if (logout) logout();
  };

  const getRoleDisplayName = (role) => ({
    admin: '管理者', parent: '保護者', child: '子ども'
  }[role] || '不明');

  // スタイル定義 (変更なし)
  const navStyle = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', padding: '1rem 2rem', color: 'white', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' };
  const logoStyle = { fontSize: '1.2em', fontWeight: 'bold', color: 'white', textDecoration: 'none' };
  const navLinkStyle = { color: 'white', textDecoration: 'none', padding: '0.5rem 1rem', borderRadius: '4px', backgroundColor: 'rgba(255,255,255,0.1)', transition: 'background-color 0.2s', fontSize: '0.9em' };
  const logoutButtonStyle = { ...navLinkStyle, border: '1px solid rgba(255,255,0.3)', cursor: 'pointer' };
  const loginButtonStyle = { padding: '0.5rem 1rem', backgroundColor: 'white', color: '#667eea', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.9em', fontWeight: 'bold' };

  return (
    <nav style={navStyle}>
      <Link href="/" style={logoStyle}>🏠 教育AIシステム</Link>
      <ClientOnly>
        {isLoading ? (
          <div style={{ fontSize: '0.9em', color: 'white' }}>...</div>
        ) : isAuthenticated && user ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <span style={{ padding: '0.5rem', backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: '4px', fontSize: '0.9em' }}>
              👤 {user.lastName} {user.firstName} さん ({getRoleDisplayName(user.role)})
            </span>
            
            {user.role === 'admin' && <Link href="/admin/users" style={navLinkStyle}>👥 ユーザー管理</Link>}
            {user.role === 'parent' && <Link href="/children" style={navLinkStyle}>👶 子ども一覧</Link>}
            
            {/* ✅ 子どもロールのリンクを簡潔化 */}
            {user.role === 'child' && user.childProfileId && (
              <Link href={`/children/${user.childProfileId}`} style={navLinkStyle}>📊 学習状況</Link>
            )}

            <Link href="/chat" style={navLinkStyle}>💬 チャット</Link>
            <button onClick={handleLogout} style={logoutButtonStyle}>ログアウト</button>
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <Link href="/login"><button style={loginButtonStyle}>ログイン</button></Link>
          </div>
        )}
      </ClientOnly>
    </nav>
  );
}