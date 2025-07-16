// /src/utils/apiClient.js
// 役割: APIリクエストをラップし、認証ヘッダーの付与とトークンリフレッシュを自動化する（最終修正版）

let accessToken = null;
let isRefreshing = false;
let failedQueue = [];

// トークンリフレッシュ中に発生した後続リクエストを処理するキュー
const processQueue = (error, token = null) => {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

// アクセストークンをメモリに保存
export const setAccessToken = (token) => {
  accessToken = token;
};

// アクセストークンを取得
export const getAccessToken = () => accessToken;

// メインのAPIクライアント関数
export const apiClient = async (url, options = {}) => {
  // リクエストヘッダーを準備
  const customOptions = {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  };

  // メモリ上のアクセストークンをヘッダーに付与
  if (accessToken) {
    customOptions.headers['Authorization'] = `Bearer ${accessToken}`;
  }

  try {
    // 最初のAPIリクエストを実行
    let response = await fetch(url, customOptions);

    // ★ 401 Unauthorizedエラーの場合、トークンリフレッシュを試みる
    if (response.status === 401) {
      // 既にリフレッシュ処理が進行中でなければ、新しいリフレッシュ処理を開始
      if (!isRefreshing) {
        isRefreshing = true;
        try {
          // リフレッシュAPIを呼び出す（Cookieが自動で送信されるようにする）
          const refreshResponse = await fetch('/api/auth/refresh', {
            method: 'POST',
            credentials: 'include',
          });
          
          if (!refreshResponse.ok) {
            // リフレッシュが失敗した場合、セッション切れとみなし、エラーを投げる
            const errorData = await refreshResponse.json();
            throw new Error(errorData.error || 'セッションの有効期限が切れました。再ログインしてください。');
          }

          // 新しいアクセストークンとユーザー情報を取得
          const data = await refreshResponse.json();
          const newAccessToken = data.accessToken;
          
          // 新しいトークンをメモリに保存
          setAccessToken(newAccessToken);
          
          // トークンがリフレッシュされたことを他のコンポーネントに通知するイベント
          window.dispatchEvent(new CustomEvent('tokenRefreshed', { detail: data }));
          
          // 待機していたリクエストを新しいトークンで再開
          processQueue(null, newAccessToken);
          
          // 元々失敗したリクエストを新しいトークンで再実行
          customOptions.headers['Authorization'] = `Bearer ${newAccessToken}`;
          response = await fetch(url, customOptions);

        } catch (refreshError) {
          // リフレッシュ処理自体がエラーになった場合
          processQueue(refreshError, null);
          // ログアウトを促すイベント
          window.dispatchEvent(new Event('logout'));
          return Promise.reject(refreshError);
        } finally {
          isRefreshing = false;
        }
      } 
      // ★ リフレッシュ処理中に他のAPIリクエストが来た場合は、キューに追加して待機させる
      else if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then(newAccessToken => {
            customOptions.headers['Authorization'] = `Bearer ${newAccessToken}`;
            return fetch(url, customOptions);
          })
          .catch(err => {
            return Promise.reject(err);
          });
      }
    }

    // ★ 成功・失敗に関わらず、最終的なレスポンスオブジェクトをそのまま返す
    //    これにより、呼び出し元（Navbar.jsなど）がステータスコードやボディを自由に解釈できる
    return response;

  } catch (error) {
    // ネットワークエラーなど、fetch自体が失敗した場合
    console.error('API Client Network Error:', error);
    return Promise.reject(error);
  }
};