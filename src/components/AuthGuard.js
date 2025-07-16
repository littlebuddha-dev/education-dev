// src/components/AuthGuard.js (修正後)
'use client';

import { useEffect } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { isPublicPage, isAdminPage } from '@/lib/authConfig';

export default function AuthGuard({ children }) {
  const { user, isAuthenticated, hasInitialized } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (!hasInitialized) return; // AuthContextの初期化が終わるまで待機

    const isPublic = isPublicPage(pathname);
    const isAuthPage = ['/login', '/users/register', '/setup'].includes(pathname);

    if (isAuthenticated) {
      // 認証済みでログインページなどにいる場合、適切なダッシュボードへリダイレクト
      if (isAuthPage) {
        const dashboardPaths = { admin: '/admin/users', parent: '/children', child: '/chat' };
        router.replace(dashboardPaths[user.role] || '/');
      }
      // 管理者ページへの権限チェック
      else if (isAdminPage(pathname) && user.role !== 'admin') {
        router.replace('/');
      }
    } else if (!isPublic) {
      // 未認証で保護ページにアクセスした場合、ログインページへリダイレクト
      const redirectTo = pathname + (searchParams.toString() ? `?${searchParams.toString()}` : '');
      router.replace(`/login?redirectTo=${encodeURIComponent(redirectTo)}`);
    }
  }, [hasInitialized, isAuthenticated, user, pathname, router, searchParams]);
  
  // 認証チェック中は何も表示しないか、ローディング画面を表示
  if (!hasInitialized) {
    return <main style={{ padding: "2rem", textAlign: "center" }}>認証情報を確認しています...</main>;
  }

  // 認証チェックが完了したら子コンポーネントを描画
  return <>{children}</>;
}