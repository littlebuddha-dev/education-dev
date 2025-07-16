// src/components/Navbar.test.js
import { render, screen } from '@testing-library/react';
import Navbar from './Navbar';
import { useAuth } from '../context/AuthContext';

// useAuthフックをモックする
jest.mock('../context/AuthContext', () => ({
  useAuth: jest.fn(),
}));

describe('Navbar Component', () => {

  it('renders login button when user is not authenticated', () => {
    useAuth.mockReturnValue({ isAuthenticated: false, user: null, isLoading: false });

    render(<Navbar />);
    
    expect(screen.getByRole('button', { name: /ログイン/i })).toBeInTheDocument();
    expect(screen.queryByText(/ログアウト/i)).not.toBeInTheDocument();
  });

  it('renders user info and logout button when user is authenticated', () => {
    const mockUser = {
      firstName: 'Taro',
      lastName: 'Yamada',
      role: 'parent',
    };
    useAuth.mockReturnValue({ isAuthenticated: true, user: mockUser, isLoading: false });

    render(<Navbar />);

    expect(screen.getByText(/Yamada Taro さん \(保護者\)/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /ログアウト/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /子ども一覧/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /ログイン/i })).not.toBeInTheDocument();
  });

  it('renders admin link for admin users', () => {
    const mockUser = {
      firstName: 'Admin',
      lastName: 'User',
      role: 'admin',
    };
    useAuth.mockReturnValue({ isAuthenticated: true, user: mockUser, isLoading: false });

    render(<Navbar />);
    
    expect(screen.getByRole('link', { name: /ユーザー管理/i })).toBeInTheDocument();
  });
});