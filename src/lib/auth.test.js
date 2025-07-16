// src/lib/auth.test.js
import { generateAccessToken, verifyAccessToken } from './auth';

describe('Auth Library', () => {
  const user = {
    id: 'a1b2c3d4-e5f6-7890-1234-567890abcdef',
    email: 'test@example.com',
    role: 'parent',
    first_name: 'Test',
    last_name: 'User',
  };

  it('should generate a valid access token', () => {
    const token = generateAccessToken(user);
    expect(typeof token).toBe('string');
  });

  it('should verify a valid access token', () => {
    const token = generateAccessToken(user);
    const decoded = verifyAccessToken(token);

    expect(decoded.id).toBe(user.id);
    expect(decoded.email).toBe(user.email);
    expect(decoded.role).toBe(user.role);
    expect(decoded.first_name).toBe(user.first_name);
    expect(decoded.last_name).toBe(user.last_name);
    expect(decoded.iat).toBeDefined();
    expect(decoded.exp).toBeDefined();
  });

  it('should throw an error for an invalid token', () => {
    const invalidToken = 'invalid.token.string';
    expect(() => verifyAccessToken(invalidToken)).toThrow('Invalid or expired access token');
  });
});