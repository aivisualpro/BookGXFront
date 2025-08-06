import React, { useState, useEffect } from 'react';
import { Users, Lock } from 'lucide-react';
import { AuthModal } from './AuthModal';
import { UsersTable } from './UsersTable';

export function UsersPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);

  // Check for existing authentication on component mount
  useEffect(() => {
    const checkAuth = () => {
      const authCookie = document.cookie
        .split('; ')
        .find(row => row.startsWith('users_auth='));
      
      if (authCookie) {
        const authValue = authCookie.split('=')[1];
        if (authValue === '2025') {
          setIsAuthenticated(true);
          return;
        }
      }
      
      // If no valid auth cookie, show modal
      setShowAuthModal(true);
    };

    checkAuth();
  }, []);

  const handleAuthSuccess = () => {
    // Set cookie for 24 hours
    const expires = new Date();
    expires.setTime(expires.getTime() + (24 * 60 * 60 * 1000)); // 24 hours
    document.cookie = `users_auth=2025; expires=${expires.toUTCString()}; path=/`;
    
    setIsAuthenticated(true);
    setShowAuthModal(false);
  };

  const handleAuthClose = () => {
    setShowAuthModal(false);
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setShowAuthModal(true);
  };

  // Show loading state while authentication modal is open
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-dark relative overflow-hidden">
        <div className="relative z-10 p-6">
          <div className="glass rounded-xl p-8 text-center">
            <div className="flex flex-col items-center space-y-4">
              <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center">
                <Lock className="w-8 h-8 text-primary" />
              </div>
              <h1 className="text-2xl font-bold text-foreground">Users Management</h1>
              <p className="text-muted-foreground max-w-md">
                Please enter the passcode to access user data...
              </p>
            </div>
          </div>
        </div>

        <AuthModal
          isOpen={showAuthModal}
          onClose={handleAuthClose}
          onSuccess={handleAuthSuccess}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-dark relative overflow-hidden">
      <div className="relative z-10 p-6">
        <UsersTable onLogout={handleLogout} />
      </div>
    </div>
  );
} 