// src/utils/authUtils.js
// タイトル: 認証ユーティリティ（Cookie読み取り強化版）
// 役割: 堅牢なCookie解析ロジックを提供し、認証状態の不整合を解消する。

import { jwtDecode } from 'jwt-decode';

const COOKIE_CONFIG = {
  name: 'token',
  maxAge: 7 * 24 * 60 * 60, // 7日間
  path: '/',
  sameSite: 'Lax',
};

/**
 * 【最重要修正】より堅牢な方法でCookieを取得する関数
 * @param {string} name - 取得したいCookieの名前
 * @returns {string|null} Cookieの値。見つからない場合はnull。
 */
export function getCookie(name) {
  if (typeof document === 'undefined') {
    return null;
  }
  const match = document.cookie.match(new RegExp('(^|;\\s*)' + name + '=([^;]*)'));
  return match ? decodeURIComponent(match[2]) : null;
}

export function setAuthCookie(token) {
  if (typeof document === 'undefined') {
    return;
  }
  try {
    const cookieString = `${COOKIE_CONFIG.name}=${encodeURIComponent(token)}; path=${COOKIE_CONFIG.path}; max-age=${COOKIE_CONFIG.maxAge}; SameSite=${COOKIE_CONFIG.sameSite}`;
    document.cookie = cookieString;
  } catch (error) {
    console.error('❌ Cookie設定エラー:', error);
  }
}

export function removeAuthCookie() {
  if (typeof document === 'undefined') return;
  try {
    const domain = window.location.hostname;
    const commonPath = `path=${COOKIE_CONFIG.path}; SameSite=${COOKIE_CONFIG.sameSite}`;
    
    document.cookie = `${COOKIE_CONFIG.name}=; ${commonPath}; max-age=0; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
    if (domain !== 'localhost') {
        document.cookie = `${COOKIE_CONFIG.name}=; ${commonPath}; domain=${domain}; max-age=0; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
    }
  } catch (error) {
    console.error('Cookie削除エラー:', error);
  }
}

export function isTokenValid() {
  const token = getCookie(COOKIE_CONFIG.name);
  if (!token) return false;

  try {
    const decoded = jwtDecode(token);
    const now = Math.floor(Date.now() / 1000);
    
    if (decoded.exp && now >= decoded.exp) {
      removeAuthCookie();
      return false;
    }
    return true;
  } catch (error) {
    removeAuthCookie();
    return false;
  }
}

export function getUserFromToken() {
  if (!isTokenValid()) return null;

  try {
    const token = getCookie(COOKIE_CONFIG.name);
    if (!token) return null;
    const decodedPayload = jwtDecode(token);
    
    return {
      id: decodedPayload.id,
      email: decodedPayload.email,
      first_name: decodedPayload.first_name,
      last_name: decodedPayload.last_name,
      role: decodedPayload.role,
    };
  } catch (error) {
    removeAuthCookie();
    return null;
  }
}