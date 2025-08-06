import React, { useState } from 'react';
import { User, LogOut, ChevronDown } from 'lucide-react';
import { User as UserType } from '@/utils/usersData';

interface UserProfileProps {
  user: UserType;
  onLogout: () => void;
}

export function UserProfile({ user, onLogout }: UserProfileProps) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const handleLogout = () => {
    // Clear the dashboard authentication cookie
    document.cookie = 'dashboard_auth=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
    onLogout();
    setIsDropdownOpen(false);
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
        className="flex items-center space-x-3 px-3 py-2 rounded-lg hover:bg-muted/50 transition-colors"
      >
        <div className="w-8 h-8 bg-primary/20 rounded-full flex items-center justify-center">
          <User className="w-4 h-4 text-primary" />
        </div>
        <div className="text-left">
          <p className="text-sm font-medium text-foreground">{user.Name}</p>
          <p className="text-xs text-muted-foreground">{user.Role}</p>
        </div>
        <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
      </button>

      {isDropdownOpen && (
        <div className="absolute right-0 top-full mt-2 w-48 glass rounded-lg border border-border shadow-lg z-50">
          <div className="p-3 border-b border-border/50">
            <p className="text-sm font-medium text-foreground">{user.Name}</p>
            <p className="text-xs text-muted-foreground">{user.Role}</p>
          </div>
          <div className="p-1">
            <button
              onClick={handleLogout}
              className="w-full flex items-center space-x-2 px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-md transition-colors"
            >
              <LogOut className="w-4 h-4" />
              <span>Logout</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
} 