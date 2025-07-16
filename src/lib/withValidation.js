// src/lib/withValidation.js
// 役割: APIルートの入力値をzodスキーマで検証する高階関数

import { createValidationErrorResponse } from '@/utils/apiResponse';

/**
 * APIルートハンドラをzodスキーマで検証する高階関数
 * @param {Function} handler - 実際のAPI処理を行うハンドラ関数
 * @param {object} schemas - 検証スキーマ { body?: z.ZodSchema, params?: z.ZodSchema, query?: z.ZodSchema }
 * @returns {Function} Next.jsのAPIルートとして機能する非同期関数
 */
export function withValidation(handler, schemas) {
  return async (req, { params }) => {
    try {
      // Params validation
      if (schemas.params) {
        const parsedParams = await schemas.params.safeParseAsync(params);
        if (!parsedParams.success) {
          return createValidationErrorResponse(parsedParams.error.flatten().fieldErrors);
        }
      }

      // Body validation
      if (schemas.body && req.bodyUsed === false) {
        const body = await req.json();
        const parsedBody = await schemas.body.safeParseAsync(body);
        if (!parsedBody.success) {
          return createValidationErrorResponse(parsedBody.error.flatten().fieldErrors);
        }
        // 検証済みデータをリクエストに追加して後続処理で使えるようにする
        req.validatedBody = parsedBody.data;
      }
      
      // Query validation (必要に応じて実装)

      return await handler(req, { params });

    } catch (err) {
      if (err instanceof SyntaxError) {
        return createValidationErrorResponse(null, '無効なJSON形式です。');
      }
      console.error('Validation HOC Error:', err);
      return createValidationErrorResponse(null, 'リクエストの処理中にエラーが発生しました。');
    }
  };
}