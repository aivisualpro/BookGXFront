import React from 'react';
import { Users } from 'lucide-react';
import { UserProfile } from './UserProfile';
import { User as UserType } from '@/utils/usersData';

interface StickyHeaderProps {
  currentPage?: 'home' | 'users';
  onNavigate?: (page: 'home' | 'users') => void;
  user?: UserType;
  onLogout?: () => void;
}

export function StickyHeader({ currentPage = 'home', onNavigate, user, onLogout }: StickyHeaderProps) {
  const isAdmin = user?.Role.toLowerCase() === 'admin';

  return (
    <header className="sticky top-0 z-50 w-full bg-background/80 backdrop-blur-md border-b border-border/50">
      <div className="container mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          {/* Left side - Logo and Title (Clickable) */}
          <button
            onClick={() => onNavigate?.('home')}
            className="flex items-center space-x-3 hover:opacity-80 transition-opacity"
          >
            <div className="w-8 h-8 bg-gradient-to-br from-primary to-primary/80 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">BX</span>
            </div>
            <h1 className="text-xl font-bold text-foreground">
              BookGX Plus
            </h1>
          </button>

          {/* Right side - Navigation Links and User Profile */}
          <div className="flex items-center space-x-6">
            <nav className="flex items-center space-x-6">
              {/* Only show Users link for Admins */}
              {isAdmin && (
                <button
                  onClick={() => onNavigate?.('users')}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-all duration-200 ${
                    currentPage === 'users'
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                  }`}
                >
                  <Users className="w-4 h-4" />
                  <span className="font-medium">Users</span>
                </button>
              )}
            </nav>

            {/* User Profile */}
            {user && (
              <UserProfile user={user} onLogout={onLogout || (() => {})} />
            )}
          </div>
        </div>
      </div>
    </header>
  );
} 