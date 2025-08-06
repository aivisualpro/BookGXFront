import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { UsersPage } from "@/components/dashboard/UsersPage";
import { ConnectionPage } from "@/components/dashboard/ConnectionPage";
import { LoginModal } from "@/components/dashboard/LoginModal";
import { fetchUsersData, User } from "@/utils/usersData";

const Index = () => {
  const [currentPage, setCurrentPage] = useState<'home' | 'users' | 'connection'>('home');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState<{
    dataSource: 'google_sheets' | 'mock_data';
    recordCount?: number;
    lastUpdated: Date;
    businessHealth?: number;
  } | null>(null);

  // Load users data and check authentication on mount
  useEffect(() => {
    const initializeApp = async () => {
      try {
        const usersData = await fetchUsersData();
        setUsers(usersData);
        
        // Check for existing dashboard authentication
        const authCookie = document.cookie
          .split('; ')
          .find(row => row.startsWith('dashboard_auth='));
        
        if (authCookie) {
          const authData = authCookie.split('=')[1];
          try {
            const userData = JSON.parse(decodeURIComponent(authData));
            const foundUser = usersData.find(u => 
              u.Name === userData.Name && 
              u.Role === userData.Role
            );
            
            if (foundUser) {
              setUser(foundUser);
              setIsAuthenticated(true);
            }
          } catch (error) {
            console.error('Error parsing auth cookie:', error);
          }
        }
      } catch (error) {
        console.error('Error loading users data:', error);
      } finally {
        setLoading(false);
      }
    };

    initializeApp();
  }, []);

  const handleNavigate = (page: 'home' | 'users' | 'connection') => {
    if (!isAuthenticated && page === 'home') {
      setShowLoginModal(true);
      return;
    }
    setCurrentPage(page);
  };

  const handleLoginSuccess = (loggedInUser: User) => {
    // Set cookie for 24 hours
    const expires = new Date();
    expires.setTime(expires.getTime() + (24 * 60 * 60 * 1000)); // 24 hours
    const userData = encodeURIComponent(JSON.stringify({
      Name: loggedInUser.Name,
      Role: loggedInUser.Role
    }));
    document.cookie = `dashboard_auth=${userData}; expires=${expires.toUTCString()}; path=/`;
    
    setUser(loggedInUser);
    setIsAuthenticated(true);
    setShowLoginModal(false);
    setCurrentPage('home');
  };

  const handleLogout = () => {
    setUser(null);
    setIsAuthenticated(false);
    setCurrentPage('home');
  };

  const handleLoginClose = () => {
    setShowLoginModal(false);
  };

  const handleDashboardDataUpdate = (data: {
    dataSource: 'google_sheets' | 'mock_data';
    recordCount?: number;
    lastUpdated: Date;
    businessHealth?: number;
  }) => {
    setDashboardData(data);
  };

  // Show loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-dark flex items-center justify-center">
        <div className="glass rounded-xl p-8 text-center">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // Show login modal if not authenticated
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 relative overflow-hidden">
        {/* Animated Background */}
        <div className="absolute inset-0">
          {/* Floating particles */}
          {[...Array(30)].map((_, i) => (
            <div
              key={i}
              className="absolute rounded-full opacity-20 animate-pulse"
              style={{
                width: 2 + Math.random() * 6,
                height: 2 + Math.random() * 6,
                backgroundColor: ['#3b82f6', '#8b5cf6', '#06b6d4', '#10b981'][Math.floor(Math.random() * 4)],
                animationDelay: `${Math.random() * 3}s`,
                animationDuration: `${2 + Math.random() * 3}s`,
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
              }}
            />
          ))}
          
          {/* Animated grid pattern */}
          <div className="absolute inset-0 opacity-10">
            <div className="absolute inset-0" style={{
              backgroundImage: `radial-gradient(circle at 1px 1px, rgba(255,255,255,0.15) 1px, transparent 0)`,
              backgroundSize: '40px 40px'
            }} />
          </div>
        </div>

        {/* Backdrop blur */}
        <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" />

        {/* Main Content */}
        <div className="relative z-10 flex items-center justify-center min-h-screen p-6">
          <div className="relative w-full max-w-md">
            <div className="relative overflow-hidden">
              {/* Glowing border */}
              <div className="absolute inset-0 bg-gradient-to-r from-primary via-purple-500 to-blue-500 rounded-2xl blur-sm opacity-50 animate-pulse" />
              
              {/* Main content */}
              <div className="relative glass rounded-2xl p-8 border border-white/10 shadow-2xl">
                {/* Animated Logo */}
                <div className="flex flex-col items-center space-y-8">
                  <div className="relative">
                    {/* Outer glow ring */}
                    <div className="absolute inset-0 bg-gradient-to-r from-primary via-purple-500 to-blue-500 rounded-full blur-lg animate-pulse opacity-50" />
                    
                    {/* Main logo container */}
                    <div className="relative w-24 h-24 bg-gradient-to-br from-primary via-purple-500 to-blue-500 rounded-full flex items-center justify-center shadow-2xl">
                      {/* Inner glow */}
                      <div className="absolute inset-2 bg-gradient-to-br from-white/20 to-transparent rounded-full" />
                      
                      {/* Book icon with animation */}
                      <div className="relative">
                        <svg className="w-12 h-12 text-white animate-bounce" style={{ animationDuration: '2s' }} fill="currentColor" viewBox="0 0 24 24">
                          <path d="M21,4H3A2,2 0 0,0 1,6V19A2,2 0 0,0 3,21H21A2,2 0 0,0 23,19V6A2,2 0 0,0 21,4M3,19V6H8V19H3M10,19V6H21V19H10Z" />
                        </svg>
                        
                        {/* Sparkle effects */}
                        <div className="absolute -top-2 -right-2">
                          <svg className="w-5 h-5 text-yellow-300 animate-ping" style={{ animationDuration: '1s' }} fill="currentColor" viewBox="0 0 24 24">
                            <path d="M12,2L13.09,8.26L20,9L13.09,9.74L12,16L10.91,9.74L4,9L10.91,8.26L12,2Z" />
                          </svg>
                        </div>
                        <div className="absolute -bottom-2 -left-2">
                          <svg className="w-4 h-4 text-blue-300 animate-ping" style={{ animationDuration: '1.5s', animationDelay: '0.5s' }} fill="currentColor" viewBox="0 0 24 24">
                            <path d="M12,2L13.09,8.26L20,9L13.09,9.74L12,16L10.91,9.74L4,9L10.91,8.26L12,2Z" />
                          </svg>
                        </div>
                      </div>
                    </div>
                    
                    {/* Rotating border */}
                    <div className="absolute inset-0 rounded-full border-2 border-transparent bg-gradient-to-r from-primary via-purple-500 to-blue-500 animate-spin opacity-30" 
                         style={{ animationDuration: '3s' }} />
                  </div>
                  
                  {/* Title and Description */}
                  <div className="text-center space-y-4">
                    <h1 className="text-4xl font-bold bg-gradient-to-r from-white via-blue-100 to-purple-100 bg-clip-text text-transparent">
                      BookGX Plus
                    </h1>
                    <p className="text-blue-200/80 text-lg font-medium">
                      Welcome to the dashboard
                    </p>
                    <p className="text-gray-400 text-sm max-w-md">
                      Experience the future of business analytics with our advanced dashboard. 
                      Get insights, track performance, and make data-driven decisions.
                    </p>
                  </div>

                  {/* Features */}
                  <div className="grid grid-cols-1 gap-3 w-full">
                    <div className="flex items-center space-x-3 p-3 bg-white/5 rounded-lg border border-white/10">
                      <div className="w-8 h-8 bg-green-500/20 rounded-full flex items-center justify-center">
                        <svg className="w-4 h-4 text-green-400" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M9,20.42L2.79,14.21L5.62,11.38L9,14.77L18.88,4.88L21.71,7.71L9,20.42Z" />
                        </svg>
                      </div>
                      <span className="text-sm text-gray-300">Real-time Analytics</span>
                    </div>
                    <div className="flex items-center space-x-3 p-3 bg-white/5 rounded-lg border border-white/10">
                      <div className="w-8 h-8 bg-blue-500/20 rounded-full flex items-center justify-center">
                        <svg className="w-4 h-4 text-blue-400" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2M12,4A8,8 0 0,1 20,12A8,8 0 0,1 12,20A8,8 0 0,1 4,12A8,8 0 0,1 12,4M12,6A6,6 0 0,0 6,12A6,6 0 0,0 12,18A6,6 0 0,0 18,12A6,6 0 0,0 12,6M12,8A4,4 0 0,1 16,12A4,4 0 0,1 12,16A4,4 0 0,1 8,12A4,4 0 0,1 12,8Z" />
                        </svg>
                      </div>
                      <span className="text-sm text-gray-300">Interactive Dashboards</span>
                    </div>
                    <div className="flex items-center space-x-3 p-3 bg-white/5 rounded-lg border border-white/10">
                      <div className="w-8 h-8 bg-purple-500/20 rounded-full flex items-center justify-center">
                        <svg className="w-4 h-4 text-purple-400" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M12,2L13.09,8.26L20,9L13.09,9.74L12,16L10.91,9.74L4,9L10.91,8.26L12,2Z" />
                        </svg>
                      </div>
                      <span className="text-sm text-gray-300">Advanced Insights</span>
                    </div>
                  </div>

                  {/* Login Button */}
                  <button
                    onClick={() => setShowLoginModal(true)}
                    className="w-full px-8 py-4 bg-gradient-to-r from-primary to-purple-600 text-white rounded-xl font-medium hover:from-primary/90 hover:to-purple-600/90 transition-all duration-300 transform hover:scale-105 flex items-center justify-center space-x-3 text-lg"
                  >
                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12,4A4,4 0 0,1 16,8A4,4 0 0,1 12,12A4,4 0 0,1 8,8A4,4 0 0,1 12,4M12,14C16.42,14 20,15.79 20,18V20H4V18C4,15.79 7.58,14 12,14Z" />
                    </svg>
                    <span>Login to Dashboard</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <LoginModal
          isOpen={showLoginModal}
          onClose={handleLoginClose}
          onSuccess={handleLoginSuccess}
          users={users}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-dark">
      {/* Sticky DashboardHeader on all pages */}
      <DashboardHeader 
        user={user} 
        dataSource={dashboardData?.dataSource}
        recordCount={dashboardData?.recordCount}
        lastUpdated={dashboardData?.lastUpdated}
        businessHealth={dashboardData?.businessHealth}
        onNavigateHome={() => handleNavigate('home')} 
        onNavigateUsers={() => handleNavigate('users')} 
        onNavigateConnection={() => handleNavigate('connection')}
        onLogout={handleLogout}
      />
      
      {/* Page Content */}
      <div className="pt-4">
        {currentPage === 'home' ? (
          <DashboardLayout 
            user={user} 
            onNavigateHome={() => handleNavigate('home')} 
            onNavigateUsers={() => handleNavigate('users')} 
            onLogout={handleLogout}
            onDataUpdate={handleDashboardDataUpdate}
          />
        ) : currentPage === 'users' ? (
          <UsersPage />
        ) : currentPage === 'connection' ? (
          <ConnectionPage onBack={() => handleNavigate('home')} />
        ) : null}
      </div>

      <LoginModal
        isOpen={showLoginModal}
        onClose={handleLoginClose}
        onSuccess={handleLoginSuccess}
        users={users}
      />
    </div>
  );
};

export default Index;
