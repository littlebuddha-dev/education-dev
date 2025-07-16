// src/constants/index.js
// 共通定数の定義

export const USER_ROLES = {
  ADMIN: 'admin',
  PARENT: 'parent',
  CHILD: 'child'
};

export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: '/api/users/login',
    LOGOUT: '/api/users/logout', 
    REFRESH: '/api/auth/refresh'
  },
  CHILDREN: '/api/children',
  CHAT: '/api/chat'
};

export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  INTERNAL_SERVER_ERROR: 500
};