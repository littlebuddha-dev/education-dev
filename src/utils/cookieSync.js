// src/utils/cookieSync.js
// Next.js App Router Cookie同期問題の根本的解決

/**
 * サーバーサイドでCookieを確実に読み取るヘルパー
 * ミドルウェアで設定されたCookieも含めて取得
 */
export function getServerCookie(req, cookieName) {
  let cookieValue = null;

  // 1. Next.js cookies API（通常のケース）
  try {
    if (req.cookies && typeof req.cookies.get === 'function') {
      const cookie = req.cookies.get(cookieName);
      if (cookie) {
        cookieValue = cookie.value;
        console.log(`📝 cookies.get(${cookieName}):`, cookieValue?.substring(0, 20));
      }
    }
  } catch (error) {
    console.log(`❌ cookies.get(${cookieName}) エラー:`, error.message);
  }

  // 2. Set-Cookieヘッダーから取得（ミドルウェア直後のケース）
  if (!cookieValue) {
    try {
      const setCookieHeader = req.headers.get('set-cookie');
      if (setCookieHeader) {
        const regex = new RegExp(`${cookieName}=([^;]+)`);
        const match = setCookieHeader.match(regex);
        if (match) {
          cookieValue = decodeURIComponent(match[1]);
          console.log(`🆕 Set-Cookie ${cookieName}:`, cookieValue?.substring(0, 20));
        }
      }
    } catch (error) {
      console.log(`❌ Set-Cookie ${cookieName} 解析エラー:`, error.message);
    }
  }

  // 3. 通常のCookieヘッダーから取得
  if (!cookieValue) {
    try {
      const cookieHeader = req.headers.get('cookie');
      if (cookieHeader) {
        const cookies = cookieHeader.split(';');
        for (const cookie of cookies) {
          const [name, value] = cookie.split('=').map(s => s.trim());
          if (name === cookieName) {
            cookieValue = decodeURIComponent(value);
            console.log(`🍪 Cookie ${cookieName}:`, cookieValue?.substring(0, 20));
            break;
          }
        }
      }
    } catch (error) {
      console.log(`❌ Cookie ${cookieName} 解析エラー:`, error.message);
    }
  }

  return cookieValue;
}

/**
 * ログイン後のCookie同期を確実にするヘルパー
 */
export function ensureCookieSync(token) {
  if (typeof window === 'undefined') return; // サーバーサイドでは何もしない

  try {
    // 複数の方法でCookieを設定
    const maxAge = 7 * 24 * 60 * 60; // 7日間
    const expires = new Date(Date.now() + maxAge * 1000).toUTCString();
    
    // 方法1: 標準的な設定
    document.cookie = `token=${encodeURIComponent(token)}; path=/; max-age=${maxAge}; SameSite=Lax`;
    
    // 方法2: expires付きで設定（ブラウザ互換性のため）
    document.cookie = `token=${encodeURIComponent(token)}; path=/; expires=${expires}; SameSite=Lax`;
    
    // 方法3: ドメイン指定（必要に応じて）
    if (window.location.hostname !== 'localhost') {
      document.cookie = `token=${encodeURIComponent(token)}; path=/; max-age=${maxAge}; SameSite=Lax; domain=${window.location.hostname}`;
    }

    console.log('🔄 Cookie同期完了:', token.substring(0, 20) + '...');
    
    // 設定後の確認
    setTimeout(() => {
      const verifyToken = getCookieClientSide('token');
      if (verifyToken) {
        console.log('✅ Cookie設定確認済み');
      } else {
        console.error('❌ Cookie設定が失敗している可能性があります');
        // 再試行
        document.cookie = `token=${encodeURIComponent(token)}; path=/; max-age=${maxAge}`;
      }
    }, 100);

  } catch (error) {
    console.error('❌ Cookie同期エラー:', error);
  }
}

/**
 * クライアントサイドでのCookie取得
 */
export function getCookieClientSide(name) {
  if (typeof document === 'undefined') return null;

  try {
    const cookies = document.cookie.split(';');
    for (const cookie of cookies) {
      const [cookieName, cookieValue] = cookie.split('=').map(s => s.trim());
      if (cookieName === name) {
        return decodeURIComponent(cookieValue);
      }
    }
    return null;
  } catch (error) {
    console.error(`Cookie取得エラー (${name}):`, error);
    return null;
  }
}

/**
 * Cookieの完全削除
 */
export function deleteCookieCompletely(name) {
  if (typeof document === 'undefined') return;

  try {
    // 複数の設定でCookieを削除
    const deletionConfigs = [
      `${name}=; path=/; max-age=0`,
      `${name}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`,
      `${name}=; path=/; max-age=0; SameSite=Lax`,
      `${name}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax`,
    ];

    // localhost以外ではドメイン指定でも削除
    if (window.location.hostname !== 'localhost') {
      deletionConfigs.push(
        `${name}=; path=/; max-age=0; domain=${window.location.hostname}`,
        `${name}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; domain=${window.location.hostname}`
      );
    }

    deletionConfigs.forEach(config => {
      document.cookie = config;
    });

    console.log(`🗑️ Cookie削除完了: ${name}`);
  } catch (error) {
    console.error(`Cookie削除エラー (${name}):`, error);
  }
}

/**
 * 認証状態のフォースリフレッシュ
 */
export function forceAuthRefresh() {
  if (typeof window === 'undefined') return;

  console.log('🔄 認証状態のフォースリフレッシュ開始');
  
  // AuthContextのrefreshAuth呼び出し（存在する場合）
  if (window.__authRefresh) {
    window.__authRefresh();
  }
  
  // カスタムイベントを発火してAuthContextに通知
  window.dispatchEvent(new CustomEvent('auth-refresh', {
    detail: { reason: 'force-refresh', timestamp: Date.now() }
  }));
  
  console.log('✅ 認証リフレッシュイベント発火');
}