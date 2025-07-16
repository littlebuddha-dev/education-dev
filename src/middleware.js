// /src/middleware.js
// 役割: 認証状態に応じたルート保護（リダイレクトループ解消版）
// 🔧 修正: より安全で単純なミドルウェア処理に変更

import { NextResponse } from 'next/server';

export function middleware(request) {
  const { pathname } = request.nextUrl;
  
  console.log(`[Middleware] Processing: ${pathname}`);
  
  // リフレッシュトークンの確認
  const refreshToken = request.cookies.get('refreshToken')?.value;

  // 🔧 修正: 公開パスを明示的に定義
  const publicPaths = ['/', '/login', '/users/register', '/setup'];
  const isPublicPath = publicPaths.includes(pathname);

  // APIルート、内部リクエスト、公開パスは常に許可
  if (
    pathname.startsWith('/api/') ||
    pathname.startsWith('/_next') ||
    pathname.endsWith('.ico') ||
    isPublicPath
  ) {
    console.log(`[Middleware] Allowing public/API path: ${pathname}`);
    return NextResponse.next();
  }

  // 🔧 修正: リフレッシュトークンがない場合のみリダイレクト
  if (!refreshToken) {
    console.log(`[Middleware] No refresh token, redirecting to login: ${pathname}`);
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirectTo', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // リフレッシュトークンがある場合は許可（詳細な認証はクライアント側で処理）
  console.log(`[Middleware] Refresh token found, allowing: ${pathname}`);
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};