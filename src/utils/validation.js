// src/utils/validation.js
// 共通バリデーション関数

export const isValidUUID = (id) => {
  if (!id || typeof id !== 'string') return false;
  return /^[0-9a-fA-F-]{36}$/.test(id);
};

export const isValidEmail = (email) => {
  if (!email || typeof email !== 'string') return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};

export const isValidRole = (role) => {
  return Object.values(USER_ROLES).includes(role);
};

export const sanitizeString = (str) => {
  if (!str || typeof str !== 'string') return '';
  return str.trim();
};