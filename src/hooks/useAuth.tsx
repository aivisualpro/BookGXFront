/**
 * Consolidated Authentication Hook
 * 
 * Simplifies the authentication flow by consolidating all auth-related logic
 * into a single hook with better state management and error handling
 */

import { useState, useEffect, useCallback } from 'react';
import { fetchUsersData, User } from '../utils/usersData';
import { logger } from '../utils/logger';

interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
  users: User[];
  loading: boolean;
  error: string | null;
}

interface AuthActions {
  login: (user: User) => void;
  logout: () => void;
  refreshUsers: () => Promise<void>;
  clearError: () => void;
}

const AUTH_COOKIE_KEY = 'dashboard_auth';
const COOKIE_EXPIRY_HOURS = 24;

/**
 * Consolidated authentication hook
 * Manages authentication state, user data, and session persistence
 */
export function useAuth(): AuthState & AuthActions {
  const [authState, setAuthState] = useState<AuthState>({
    isAuthenticated: false,
    user: null,
    users: [],
    loading: true,
    error: null
  });

  // Load users and check for existing session on mount
  useEffect(() => {
    initializeAuth();
  }, []);

  /**
   * Initialize authentication state
   */
  const initializeAuth = useCallback(async () => {
    try {
      logger.debug('Initializing authentication...');
      
      // Load users data
      const usersData = await fetchUsersData();
      
      // Check for existing session
      const existingSession = getStoredSession();
      let authenticatedUser: User | null = null;
      
      if (existingSession) {
        // Verify user still exists in the users list
        authenticatedUser = usersData.find(u => 
          u.Name === existingSession.Name && 
          u.Role === existingSession.Role
        ) || null;
        
        if (!authenticatedUser) {
          // User no longer exists, clear invalid session
          clearStoredSession();
        }
      }
      
      setAuthState({
        isAuthenticated: !!authenticatedUser,
        user: authenticatedUser,
        users: usersData,
        loading: false,
        error: null
      });
      
      logger.success(`Auth initialized. ${authenticatedUser ? 'User logged in' : 'No active session'}`);
      
    } catch (error) {
      logger.error('Failed to initialize auth:', error);
      setAuthState(prev => ({
        ...prev,
        loading: false,
        error: 'Failed to load user data'
      }));
    }
  }, []);

  /**
   * Login user and persist session
   */
  const login = useCallback((user: User) => {
    try {
      logger.debug('Logging in user:', user.Name);
      
      // Store session in cookie
      storeSession(user);
      
      // Update state
      setAuthState(prev => ({
        ...prev,
        isAuthenticated: true,
        user,
        error: null
      }));
      
      logger.success('User logged in successfully');
      
    } catch (error) {
      logger.error('Login failed:', error);
      setAuthState(prev => ({
        ...prev,
        error: 'Login failed'
      }));
    }
  }, []);

  /**
   * Logout user and clear session
   */
  const logout = useCallback(() => {
    try {
      logger.debug('Logging out user');
      
      // Clear stored session
      clearStoredSession();
      
      // Update state
      setAuthState(prev => ({
        ...prev,
        isAuthenticated: false,
        user: null,
        error: null
      }));
      
      logger.success('User logged out successfully');
      
    } catch (error) {
      logger.error('Logout failed:', error);
    }
  }, []);

  /**
   * Refresh users data
   */
  const refreshUsers = useCallback(async () => {
    try {
      logger.debug('Refreshing users data...');
      
      const usersData = await fetchUsersData();
      
      setAuthState(prev => ({
        ...prev,
        users: usersData,
        error: null
      }));
      
      logger.success('Users data refreshed');
      
    } catch (error) {
      logger.error('Failed to refresh users:', error);
      setAuthState(prev => ({
        ...prev,
        error: 'Failed to refresh user data'
      }));
    }
  }, []);

  /**
   * Clear error state
   */
  const clearError = useCallback(() => {
    setAuthState(prev => ({
      ...prev,
      error: null
    }));
  }, []);

  return {
    ...authState,
    login,
    logout,
    refreshUsers,
    clearError
  };
}

// =============================================================================
// SESSION MANAGEMENT UTILITIES
// =============================================================================

interface StoredSession {
  Name: string;
  Role: string;
  timestamp: number;
}

/**
 * Store user session in cookie
 */
function storeSession(user: User): void {
  const expires = new Date();
  expires.setTime(expires.getTime() + (COOKIE_EXPIRY_HOURS * 60 * 60 * 1000));
  
  const sessionData: StoredSession = {
    Name: user.Name,
    Role: user.Role,
    timestamp: Date.now()
  };
  
  const encodedData = encodeURIComponent(JSON.stringify(sessionData));
  document.cookie = `${AUTH_COOKIE_KEY}=${encodedData}; expires=${expires.toUTCString()}; path=/; SameSite=Strict`;
}

/**
 * Retrieve stored session from cookie
 */
function getStoredSession(): StoredSession | null {
  try {
    const cookies = document.cookie.split('; ');
    const authCookie = cookies.find(row => row.startsWith(`${AUTH_COOKIE_KEY}=`));
    
    if (!authCookie) return null;
    
    const encodedData = authCookie.split('=')[1];
    const sessionData: StoredSession = JSON.parse(decodeURIComponent(encodedData));
    
    // Check if session is still valid (within expiry time)
    const now = Date.now();
    const sessionAge = now - sessionData.timestamp;
    const maxAge = COOKIE_EXPIRY_HOURS * 60 * 60 * 1000;
    
    if (sessionAge > maxAge) {
      clearStoredSession();
      return null;
    }
    
    return sessionData;
    
  } catch (error) {
    logger.error('Failed to parse stored session:', error);
    clearStoredSession();
    return null;
  }
}

/**
 * Clear stored session
 */
function clearStoredSession(): void {
  document.cookie = `${AUTH_COOKIE_KEY}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
}

// =============================================================================
// AUTHENTICATION UTILITIES
// =============================================================================

/**
 * Check if user has specific role
 */
export function hasRole(user: User | null, role: string): boolean {
  return user?.Role === role;
}

/**
 * Check if user has any of the specified roles
 */
export function hasAnyRole(user: User | null, roles: string[]): boolean {
  return user ? roles.includes(user.Role) : false;
}

/**
 * Get user display name
 */
export function getUserDisplayName(user: User | null): string {
  if (!user) return 'Anonymous';
  return user.Name || 'Unknown User';
}

/**
 * Get user initials for avatar
 */
export function getUserInitials(user: User | null): string {
  if (!user || !user.Name) return '??';
  
  const names = user.Name.split(' ');
  if (names.length >= 2) {
    return `${names[0][0]}${names[1][0]}`.toUpperCase();
  }
  
  return user.Name.substring(0, 2).toUpperCase();
}
