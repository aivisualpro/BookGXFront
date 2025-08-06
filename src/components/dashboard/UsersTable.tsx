import React, { useState, useEffect } from 'react';
import { Users, Search, Download, LogOut, Eye, EyeOff, Grid, List, User as UserIcon, Shield, Key } from 'lucide-react';
import { fetchUsersData, User } from '@/utils/usersData';

interface UsersTableProps {
  onLogout: () => void;
}

// Custom Icons for different roles
const AdminIcon = (props: any) => (
  <svg
    aria-hidden="true"
    fill="none"
    focusable="false"
    height="24"
    role="presentation"
    viewBox="0 0 24 24"
    width="24"
    {...props}
  >
    <path
      d="M12 2C13.1 2 14 2.9 14 4C14 5.1 13.1 6 12 6C10.9 6 10 5.1 10 4C10 2.9 10.9 2 12 2ZM21 9V7L15 1H5C3.89 1 3 1.89 3 3V21C3 22.11 3.89 23 5 23H19C20.11 23 21 22.11 21 21V9ZM19 21H5V3H13V9H19V21Z"
      fill="currentColor"
    />
  </svg>
);

const ManagerIcon = (props: any) => (
  <svg
    aria-hidden="true"
    fill="none"
    focusable="false"
    height="24"
    role="presentation"
    viewBox="0 0 24 24"
    width="24"
    {...props}
  >
    <path
      d="M12 2C13.1 2 14 2.9 14 4C14 5.1 13.1 6 12 6C10.9 6 10 5.1 10 4C10 2.9 10.9 2 12 2ZM21 9V7L15 1H5C3.89 1 3 1.89 3 3V21C3 22.11 3.89 23 5 23H19C20.11 23 21 22.11 21 21V9ZM19 21H5V3H13V9H19V21Z"
      fill="currentColor"
    />
  </svg>
);

const SalesIcon = (props: any) => (
  <svg
    aria-hidden="true"
    fill="none"
    focusable="false"
    height="24"
    role="presentation"
    viewBox="0 0 24 24"
    width="24"
    {...props}
  >
    <path
      d="M12 2C13.1 2 14 2.9 14 4C14 5.1 13.1 6 12 6C10.9 6 10 5.1 10 4C10 2.9 10.9 2 12 2ZM21 9V7L15 1H5C3.89 1 3 1.89 3 3V21C3 22.11 3.89 23 5 23H19C20.11 23 21 22.11 21 21V9ZM19 21H5V3H13V9H19V21Z"
      fill="currentColor"
    />
  </svg>
);

const ReceptionistIcon = (props: any) => (
  <svg
    aria-hidden="true"
    fill="none"
    focusable="false"
    height="24"
    role="presentation"
    viewBox="0 0 24 24"
    width="24"
    {...props}
  >
    <path
      d="M12 2C13.1 2 14 2.9 14 4C14 5.1 13.1 6 12 6C10.9 6 10 5.1 10 4C10 2.9 10.9 2 12 2ZM21 9V7L15 1H5C3.89 1 3 1.89 3 3V21C3 22.11 3.89 23 5 23H19C20.11 23 21 22.11 21 21V9ZM19 21H5V3H13V9H19V21Z"
      fill="currentColor"
    />
  </svg>
);

const AllUsersIcon = (props: any) => (
  <svg
    aria-hidden="true"
    fill="none"
    focusable="false"
    height="24"
    role="presentation"
    viewBox="0 0 24 24"
    width="24"
    {...props}
  >
    <path
      d="M16 4C16 5.1 15.1 6 14 6C12.9 6 12 5.1 12 4C12 2.9 12.9 2 14 2C15.1 2 16 2.9 16 4ZM20 22V20C20 18.9 19.1 18 18 18C16.9 18 16 18.9 16 20V22H20ZM10 4C10 5.1 9.1 6 8 6C6.9 6 6 5.1 6 4C6 2.9 6.9 2 8 2C9.1 2 10 2.9 10 4ZM14 22V20C14 18.9 13.1 18 12 18C10.9 18 10 18.9 10 20V22H14ZM6 4C6 5.1 5.1 6 4 6C2.9 6 2 5.1 2 4C2 2.9 2.9 2 4 2C5.1 2 6 2.9 6 4ZM10 22V20C10 18.9 9.1 18 8 18C6.9 18 6 18.9 6 20V22H10Z"
      fill="currentColor"
    />
  </svg>
);

export function UsersTable({ onLogout }: UsersTableProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showPasswords, setShowPasswords] = useState(false);
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('cards');
  const [selectedRole, setSelectedRole] = useState<string>('all');

  useEffect(() => {
    const loadUsers = async () => {
      try {
        const usersData = await fetchUsersData();
        setUsers(usersData);
      } catch (error) {
        console.error('Error loading users:', error);
      } finally {
        setLoading(false);
      }
    };

    loadUsers();
  }, []);

  // Get unique roles for filter tabs
  const uniqueRoles = Array.from(new Set(users.map(user => user.Role))).sort();

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.Name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.Role.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = selectedRole === 'all' || user.Role === selectedRole;
    return matchesSearch && matchesRole;
  });

  const handleExportCSV = () => {
    const headers = ['Name', 'Role', 'Password', 'Cards'];
    const csvContent = [
      headers.join(','),
      ...users.map(user => [
        user.Name,
        user.Role,
        user.Password,
        user.Cards || ''
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'users_data.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const getCardBadges = (cards: string) => {
    if (!cards) return [];
    return cards.split(',').map(card => card.trim());
  };

  const getRoleColor = (role: string) => {
    switch (role.toLowerCase()) {
      case 'admin':
        return 'bg-red-500/10 text-red-600 border-red-500/20';
      case 'branch manager':
        return 'bg-blue-500/10 text-blue-600 border-blue-500/20';
      case 'sales officer':
        return 'bg-green-500/10 text-green-600 border-green-500/20';
      case 'artist':
        return 'bg-purple-500/10 text-purple-600 border-purple-500/20';
      case 'receiptionist':
        return 'bg-orange-500/10 text-orange-600 border-orange-500/20';
      case 'customer service':
        return 'bg-cyan-500/10 text-cyan-600 border-cyan-500/20';
      default:
        return 'bg-gray-500/10 text-gray-600 border-gray-500/20';
    }
  };

  const getRoleTabColor = (role: string) => {
    switch (role.toLowerCase()) {
      case 'admin':
        return 'bg-red-500';
      case 'branch manager':
        return 'bg-blue-500';
      case 'sales officer':
        return 'bg-green-500';
      case 'artist':
        return 'bg-purple-500';
      case 'receiptionist':
        return 'bg-orange-500';
      case 'customer service':
        return 'bg-cyan-500';
      default:
        return 'bg-primary';
    }
  };

  const getRoleTabTextColor = (role: string) => {
    switch (role.toLowerCase()) {
      case 'admin':
        return 'text-red-600';
      case 'branch manager':
        return 'text-blue-600';
      case 'sales officer':
        return 'text-green-600';
      case 'artist':
        return 'text-purple-600';
      case 'receiptionist':
        return 'text-orange-600';
      case 'customer service':
        return 'text-cyan-600';
      default:
        return 'text-primary';
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role.toLowerCase()) {
      case 'admin':
        return <AdminIcon className="w-4 h-4" />;
      case 'branch manager':
        return <ManagerIcon className="w-4 h-4" />;
      case 'sales officer':
        return <SalesIcon className="w-4 h-4" />;
      case 'artist':
        return <SalesIcon className="w-4 h-4" />;
      case 'receiptionist':
        return <ReceptionistIcon className="w-4 h-4" />;
      case 'customer service':
        return <ReceptionistIcon className="w-4 h-4" />;
      default:
        return <UserIcon className="w-4 h-4" />;
    }
  };

  const getRoleCount = (role: string) => {
    if (role === 'all') return users.length;
    return users.filter(user => user.Role === role).length;
  };

  // Calculate tab positions for proper alignment
  const getTabPosition = (role: string) => {
    if (role === 'all') return 0;
    const index = uniqueRoles.indexOf(role);
    return index + 1; // +1 because "All" is at position 0
  };

  const getTabWidth = (role: string) => {
    // Calculate width based on content length
    const baseWidth = 120; // Base width in pixels
    const roleLength = role.length;
    return Math.max(baseWidth, roleLength * 8 + 60); // Adjust based on text length
  };

  // Calculate cumulative position for sliding background
  const getCumulativePosition = (role: string) => {
    if (role === 'all') return 0;
    
    let position = 0;
    // Add width of "All Users" tab
    position += getTabWidth('All Users') + 4; // 4px for gap
    
    // Add widths of all tabs before the target role
    const targetIndex = uniqueRoles.indexOf(role);
    for (let i = 0; i < targetIndex; i++) {
      position += getTabWidth(uniqueRoles[i]) + 4; // 4px for gap
    }
    
    return position;
  };

  if (loading) {
    return (
      <div className="glass rounded-xl p-8 text-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-muted-foreground">Loading users...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Enhanced Search - Mobile Responsive */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search users..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 sm:py-3 bg-background/50 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary text-sm sm:text-base"
        />
      </div>

      {/* Beautiful Mobile-First Filter Tabs - Hidden on Mobile */}
      <div className="hidden md:flex w-full flex-col">
        <div className="relative bg-muted/50 rounded-xl p-1">
          {/* Mobile: Beautiful pill-style tabs */}
          <div className="flex overflow-x-auto scrollbar-hide gap-1">
            {/* Animated sliding indicator */}
            <div 
              className={`absolute top-1 bottom-1 rounded-lg transition-all duration-500 ease-out shadow-lg ${
                selectedRole === 'all' ? 'bg-primary' : getRoleTabColor(selectedRole)
              }`}
              style={{
                left: selectedRole === 'all' ? '4px' : 
                      `${4 + getCumulativePosition(selectedRole)}px`,
                width: `${getTabWidth(selectedRole)}px`
              }}
            />
            
            <button
              onClick={() => setSelectedRole('all')}
              className={`relative flex items-center justify-center space-x-1 px-3 py-2 rounded-lg transition-all duration-300 ease-out flex-shrink-0 min-w-[60px] ${
                selectedRole === 'all'
                  ? 'text-primary-foreground font-medium'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
              style={{ width: `${getTabWidth('All Users')}px` }}
            >
              <span className="text-xs font-medium truncate">All</span>
              <span className={`text-xs px-1.5 py-0.5 rounded-full transition-all duration-300 flex-shrink-0 font-medium ${
                selectedRole === 'all' 
                  ? 'bg-primary-foreground/20 text-primary-foreground' 
                  : 'bg-background/20'
              }`}>
                {getRoleCount('all')}
              </span>
            </button>
            
            {uniqueRoles.map((role, index) => (
              <button
                key={role}
                onClick={() => setSelectedRole(role)}
                className={`relative flex items-center justify-center space-x-1 px-3 py-2 rounded-lg transition-all duration-300 ease-out flex-shrink-0 min-w-[60px] ${
                  selectedRole === role
                    ? 'text-white font-medium'
                    : `${getRoleTabTextColor(role)} hover:text-foreground`
                }`}
                style={{ width: `${getTabWidth(role)}px` }}
              >
                <span className="text-xs font-medium truncate">{role}</span>
                <span className={`text-xs px-1.5 py-0.5 rounded-full transition-all duration-300 flex-shrink-0 font-medium ${
                  selectedRole === role 
                    ? 'bg-white/20 text-white' 
                    : 'bg-background/20'
                }`}>
                  {getRoleCount(role)}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Enhanced Password Toggle - Mobile Responsive */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between space-y-2 sm:space-y-0">
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setShowPasswords(!showPasswords)}
            className="flex items-center space-x-2 px-3 py-2 text-xs sm:text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            {showPasswords ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            <span className="hidden sm:inline">{showPasswords ? 'Hide' : 'Show'} Passwords</span>
            <span className="sm:hidden">{showPasswords ? 'Hide' : 'Show'}</span>
          </button>
        </div>
        <div className="text-xs sm:text-sm text-muted-foreground">
          {filteredUsers.length} of {users.length} users
        </div>
      </div>

      {/* Content */}
      {viewMode === 'cards' ? (
        /* Enhanced Card View - Mobile First */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-2 sm:gap-3 lg:gap-4">
          {filteredUsers.map((user, index) => (
            <div key={index} className="glass rounded-xl p-3 sm:p-4 lg:p-6 hover:shadow-lg transition-all duration-200 border border-border/50 group">
              {/* User Avatar and Name - Mobile Optimized */}
              <div className="flex items-start space-x-2 sm:space-x-3 mb-3 sm:mb-4">
                <div className="w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12 bg-gradient-to-br from-primary/20 to-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                  <UserIcon className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-foreground truncate text-sm sm:text-base">{user.Name}</h3>
                  <div className="flex items-center space-x-1 sm:space-x-2 mt-1 flex-wrap">
                    <div className="flex items-center space-x-1">
                      {getRoleIcon(user.Role)}
                      <span className={`text-xs px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full border ${getRoleColor(user.Role)}`}>
                        {user.Role}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Password - Responsive */}
              <div className="mb-3 sm:mb-4">
                <div className="flex items-center space-x-1 sm:space-x-2 mb-1 sm:mb-2">
                  <Key className="w-3 h-3 sm:w-4 sm:h-4 text-muted-foreground flex-shrink-0" />
                  <span className="text-xs sm:text-sm text-muted-foreground">Password</span>
                </div>
                <div className="text-xs sm:text-sm font-mono bg-muted/50 rounded px-2 sm:px-3 py-1 sm:py-1.5 lg:py-2 break-all">
                  {showPasswords ? user.Password || '—' : '••••••••'}
                </div>
              </div>

              {/* Access Cards - Mobile Optimized */}
              <div>
                <div className="flex items-center space-x-1 sm:space-x-2 mb-1 sm:mb-2">
                  <Shield className="w-3 h-3 sm:w-4 sm:h-4 text-muted-foreground flex-shrink-0" />
                  <span className="text-xs sm:text-sm text-muted-foreground">Access Cards</span>
                </div>
                <div className="flex flex-wrap gap-1">
                  {getCardBadges(user.Cards || '').map((card, cardIndex) => (
                    <span
                      key={cardIndex}
                      className="inline-flex px-1 sm:px-1.5 lg:px-2 py-0.5 sm:py-1 text-xs font-medium rounded-full bg-primary/10 text-primary border border-primary/20"
                    >
                      {card}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* Enhanced Table View - Mobile Responsive */
        <div className="glass rounded-xl overflow-hidden">
          {/* Mobile Card View for Table Mode */}
          <div className="block lg:hidden">
            {filteredUsers.map((user, index) => (
              <div key={index} className="p-4 border-b border-border/50 last:border-b-0">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-primary/20 to-primary/10 rounded-full flex items-center justify-center">
                      <UserIcon className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground text-sm">{user.Name}</h3>
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getRoleColor(user.Role)}`}>
                        {user.Role}
                      </span>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Password:</span>
                    <div className="text-xs font-mono bg-muted/50 rounded px-2 py-1">
                      {showPasswords ? user.Password || '—' : '••••••••'}
                    </div>
                  </div>
                  
                  <div>
                    <span className="text-xs text-muted-foreground block mb-1">Access Cards:</span>
                    <div className="flex flex-wrap gap-1">
                      {getCardBadges(user.Cards || '').map((card, cardIndex) => (
                        <span
                          key={cardIndex}
                          className="inline-flex px-1.5 py-0.5 text-xs font-medium rounded-full bg-primary/10 text-primary"
                        >
                          {card}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          {/* Desktop Table View */}
          <div className="hidden lg:block overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-medium text-foreground">Name</th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-foreground">Role</th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-foreground">
                    <div className="flex items-center space-x-2">
                      <span>Password</span>
                      <button
                        onClick={() => setShowPasswords(!showPasswords)}
                        className="text-muted-foreground hover:text-foreground"
                      >
                        {showPasswords ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-foreground">Access Cards</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {filteredUsers.map((user, index) => (
                  <tr key={index} className="hover:bg-muted/30 transition-colors">
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-foreground">{user.Name}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getRoleColor(user.Role)}`}>
                        {user.Role}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-muted-foreground font-mono">
                        {showPasswords ? user.Password || '—' : '••••••••'}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1">
                        {getCardBadges(user.Cards || '').map((card, cardIndex) => (
                          <span
                            key={cardIndex}
                            className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-primary/10 text-primary"
                          >
                            {card}
                          </span>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Enhanced Summary Cards - Mobile Responsive */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div className="glass rounded-xl p-3 sm:p-4 text-center">
          <div className="text-lg sm:text-2xl font-bold text-foreground">{users.length}</div>
          <div className="text-xs sm:text-sm text-muted-foreground">Total Users</div>
        </div>
        <div className="glass rounded-xl p-3 sm:p-4 text-center">
          <div className="text-lg sm:text-2xl font-bold text-foreground">
            {users.filter(u => u.Role.toLowerCase() === 'admin').length}
          </div>
          <div className="text-xs sm:text-sm text-muted-foreground">Admins</div>
        </div>
        <div className="glass rounded-xl p-3 sm:p-4 text-center">
          <div className="text-lg sm:text-2xl font-bold text-foreground">
            {users.filter(u => u.Role.toLowerCase() !== 'admin').length}
          </div>
          <div className="text-xs sm:text-sm text-muted-foreground">Regular Users</div>
        </div>
        <div className="glass rounded-xl p-3 sm:p-4 text-center">
          <div className="text-lg sm:text-2xl font-bold text-foreground">
            {users.filter(u => u.Cards?.includes('PerformanceIndicators')).length}
          </div>
          <div className="text-xs sm:text-sm text-muted-foreground">Full Access</div>
        </div>
      </div>
    </div>
  );
} 