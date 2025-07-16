// src/utils/apiResponse.js (改良版)
// 役割: 統一されたAPIレスポンス形式を提供

import { HTTP_STATUS } from '@/constants';

/**
 * 統一されたAPIレスポンス形式
 */
export const API_RESPONSE_FORMAT = {
  // 成功レスポンス
  SUCCESS: {
    success: true,
    data: null,
    message: null,
    timestamp: null,
    meta: null
  },
  // エラーレスポンス
  ERROR: {
    success: false,
    error: {
      code: null,
      message: null,
      details: null
    },
    timestamp: null,
    meta: null
  }
};

/**
 * 成功レスポンスを作成
 * @param {any} data - レスポンスデータ
 * @param {string} message - 成功メッセージ（オプション）
 * @param {object} meta - メタデータ（ページネーション等）
 * @param {number} status - HTTPステータスコード（デフォルト: 200）
 */
export const createSuccessResponse = (data = null, message = null, meta = null, status = HTTP_STATUS.OK) => {
  const response = {
    success: true,
    timestamp: new Date().toISOString()
  };

  // dataがnullでない場合のみ追加
  if (data !== null) {
    response.data = data;
  }

  // messageがある場合のみ追加
  if (message) {
    response.message = message;
  }

  // metaがある場合のみ追加（ページネーション、カウント等）
  if (meta) {
    response.meta = meta;
  }

  return Response.json(response, { status });
};

/**
 * エラーレスポンスを作成
 * @param {string} message - エラーメッセージ
 * @param {number} status - HTTPステータスコード
 * @param {string} code - エラーコード（オプション）
 * @param {any} details - エラー詳細情報（オプション）
 * @param {object} meta - メタデータ（オプション）
 */
export const createErrorResponse = (
  message, 
  status = HTTP_STATUS.BAD_REQUEST, 
  code = null, 
  details = null, 
  meta = null
) => {
  const response = {
    success: false,
    error: {
      message
    },
    timestamp: new Date().toISOString()
  };

  // エラーコードがある場合
  if (code) {
    response.error.code = code;
  }

  // エラー詳細がある場合
  if (details) {
    response.error.details = details;
  }

  // メタデータがある場合
  if (meta) {
    response.meta = meta;
  }

  return Response.json(response, { status });
};

/**
 * 認証エラーレスポンス
 * @param {string} message - エラーメッセージ（デフォルト: '認証が必要です'）
 * @param {string} code - エラーコード
 */
export const createAuthErrorResponse = (
  message = '認証が必要です', 
  code = 'AUTH_REQUIRED'
) => {
  return createErrorResponse(message, HTTP_STATUS.UNAUTHORIZED, code);
};

/**
 * 権限エラーレスポンス
 * @param {string} message - エラーメッセージ（デフォルト: 'アクセス権限がありません'）
 * @param {string} code - エラーコード
 */
export const createForbiddenResponse = (
  message = 'アクセス権限がありません', 
  code = 'FORBIDDEN'
) => {
  return createErrorResponse(message, HTTP_STATUS.FORBIDDEN, code);
};

/**
 * バリデーションエラーレスポンス
 * @param {string|object} errors - バリデーションエラー
 * @param {string} message - エラーメッセージ
 */
export const createValidationErrorResponse = (
  errors, 
  message = 'バリデーションエラーが発生しました'
) => {
  const details = typeof errors === 'string' ? { general: errors } : errors;
  
  return createErrorResponse(
    message, 
    HTTP_STATUS.BAD_REQUEST, 
    'VALIDATION_ERROR', 
    details
  );
};

/**
 * 404エラーレスポンス
 * @param {string} resource - 見つからないリソース名
 * @param {string} message - カスタムメッセージ
 */
export const createNotFoundResponse = (
  resource = 'リソース', 
  message = null
) => {
  const errorMessage = message || `${resource}が見つかりません`;
  
  return createErrorResponse(
    errorMessage, 
    HTTP_STATUS.NOT_FOUND, 
    'NOT_FOUND',
    { resource }
  );
};

/**
 * 重複エラーレスポンス（409 Conflict）
 * @param {string} resource - 重複するリソース名
 * @param {string} message - カスタムメッセージ
 */
export const createConflictResponse = (
  resource = 'データ', 
  message = null
) => {
  const errorMessage = message || `${resource}は既に存在します`;
  
  return createErrorResponse(
    errorMessage, 
    HTTP_STATUS.CONFLICT, 
    'CONFLICT',
    { resource }
  );
};

/**
 * サーバーエラーレスポンス
 * @param {string} message - エラーメッセージ
 * @param {Error} error - エラーオブジェクト（開発環境でのみ詳細を含める）
 */
export const createServerErrorResponse = (
  message = 'サーバー内部でエラーが発生しました', 
  error = null
) => {
  const details = {};
  
  // 開発環境でのみエラー詳細を含める
  if (process.env.NODE_ENV === 'development' && error) {
    details.stack = error.stack;
    details.name = error.name;
  }

  return createErrorResponse(
    message, 
    HTTP_STATUS.INTERNAL_SERVER_ERROR, 
    'INTERNAL_ERROR',
    Object.keys(details).length > 0 ? details : null
  );
};

/**
 * ページネーション付きレスポンス
 * @param {Array} data - データ配列
 * @param {number} page - 現在のページ
 * @param {number} limit - 1ページあたりの件数
 * @param {number} total - 総件数
 * @param {string} message - メッセージ
 */
export const createPaginatedResponse = (
  data, 
  page, 
  limit, 
  total, 
  message = null
) => {
  const totalPages = Math.ceil(total / limit);
  const hasNext = page < totalPages;
  const hasPrev = page > 1;

  const meta = {
    pagination: {
      page,
      limit,
      total,
      totalPages,
      hasNext,
      hasPrev
    }
  };

  return createSuccessResponse(data, message, meta);
};

/**
 * 認証エラーのハンドリング
 * @param {Error} error - エラーオブジェクト
 */
export const handleAuthError = (error) => {
  if (error.message.includes('token') || error.message.includes('Authorization')) {
    return createAuthErrorResponse(`認証エラー: ${error.message}`, 'TOKEN_INVALID');
  }
  return createServerErrorResponse('認証処理中にエラーが発生しました', error);
};

/**
 * データベースエラーのハンドリング
 * @param {Error} error - データベースエラー
 * @param {string} operation - 実行していた操作
 */
export const handleDatabaseError = (error, operation = 'データベース操作') => {
  console.error(`Database error in ${operation}:`, error);

  // PostgreSQLエラーコードに基づく処理
  switch (error.code) {
    case '23505': // unique_violation
      return createConflictResponse('データ', 'このデータは既に存在します');
    
    case '23503': // foreign_key_violation
      return createValidationErrorResponse(
        '関連するデータが見つかりません',
        '参照整合性エラーが発生しました'
      );
    
    case '23502': // not_null_violation
      return createValidationErrorResponse(
        '必須項目が不足しています',
        'データの入力に不備があります'
      );
    
    case '42703': // undefined_column
      return createServerErrorResponse('データベース構造エラーが発生しました');
    
    default:
      return createServerErrorResponse(`${operation}中にエラーが発生しました`, error);
  }
};