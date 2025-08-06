import React, { useState, useEffect } from 'react';
import { User, Lock, Eye, EyeOff, BookOpen, Sparkles, Shield, Zap } from 'lucide-react';
import { User as UserType } from '@/utils/usersData';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (user: UserType) => void;
  users: UserType[];
}

// Floating Particle Component
const FloatingParticle = ({ delay, duration, size, color }: { 
  delay: number; 
  duration: number; 
  size: number; 
  color: string; 
}) => (
  <div
    className={`absolute rounded-full opacity-20 animate-pulse`}
    style={{
      width: size,
      height: size,
      backgroundColor: color,
      animationDelay: `${delay}s`,
      animationDuration: `${duration}s`,
      left: `${Math.random() * 100}%`,
      top: `${Math.random() * 100}%`,
    }}
  />
);

// Animated Logo Component
const AnimatedLogo = () => (
  <div className="relative">
    {/* Outer glow ring */}
    <div className="absolute inset-0 bg-gradient-to-r from-primary via-purple-500 to-blue-500 rounded-full blur-lg animate-pulse opacity-50" />
    
    {/* Main logo container */}
    <div className="relative w-20 h-20 bg-gradient-to-br from-primary via-purple-500 to-blue-500 rounded-full flex items-center justify-center shadow-2xl">
      {/* Inner glow */}
      <div className="absolute inset-2 bg-gradient-to-br from-white/20 to-transparent rounded-full" />
      
      {/* Book icon with animation */}
      <div className="relative">
        <BookOpen className="w-10 h-10 text-white animate-bounce" style={{ animationDuration: '2s' }} />
        
        {/* Sparkle effects */}
        <div className="absolute -top-1 -right-1">
          <Sparkles className="w-4 h-4 text-yellow-300 animate-ping" style={{ animationDuration: '1s' }} />
        </div>
        <div className="absolute -bottom-1 -left-1">
          <Sparkles className="w-3 h-3 text-blue-300 animate-ping" style={{ animationDuration: '1.5s', animationDelay: '0.5s' }} />
        </div>
      </div>
    </div>
    
    {/* Rotating border */}
    <div className="absolute inset-0 rounded-full border-2 border-transparent bg-gradient-to-r from-primary via-purple-500 to-blue-500 animate-spin opacity-30" 
         style={{ animationDuration: '3s' }} />
  </div>
);

export function LoginModal({ isOpen, onClose, onSuccess, users }: LoginModalProps) {
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [shake, setShake] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    // Simulate loading delay for better UX
    await new Promise(resolve => setTimeout(resolve, 800));

    // Find user by name (case-insensitive)
    const user = users.find(u => 
      u.Name.toLowerCase() === name.toLowerCase() && 
      u.Password === password
    );

    if (user) {
      // Success animation
      setIsLoading(false);
      onSuccess(user);
      setName('');
      setPassword('');
      setError('');
    } else {
      // Error animation
      setIsLoading(false);
      setError('Invalid name or password. Please try again.');
      setShake(true);
      setTimeout(() => setShake(false), 500);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Animated Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
        {/* Floating particles */}
        {[...Array(20)].map((_, i) => (
          <FloatingParticle
            key={i}
            delay={Math.random() * 3}
            duration={2 + Math.random() * 3}
            size={2 + Math.random() * 4}
            color={['#3b82f6', '#8b5cf6', '#06b6d4', '#10b981'][Math.floor(Math.random() * 4)]}
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

      {/* Main Modal */}
      <div className={`relative w-full max-w-md mx-4 transform transition-all duration-500 ${
        isOpen ? 'scale-100 opacity-100' : 'scale-95 opacity-0'
      }`}>
        <div className="relative overflow-hidden">
          {/* Glowing border */}
          <div className="absolute inset-0 bg-gradient-to-r from-primary via-purple-500 to-blue-500 rounded-2xl blur-sm opacity-50 animate-pulse" />
          
          {/* Main content */}
          <div className="relative glass rounded-2xl p-8 border border-white/10 shadow-2xl">
            {/* Header */}
            <div className="flex flex-col items-center space-y-6 mb-8">
              <AnimatedLogo />
              
              <div className="text-center space-y-2">
                <h1 className="text-3xl font-bold bg-gradient-to-r from-white via-blue-100 to-purple-100 bg-clip-text text-transparent">
                  BookGX Plus
                </h1>
                <p className="text-blue-200/80 text-sm font-medium">
                  Welcome to the dashboard
                </p>
                <p className="text-muted-foreground text-xs">
                  Please login to continue
                </p>
              </div>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Name Input */}
              <div className="space-y-2">
                <label className="flex items-center space-x-2 text-sm font-medium text-blue-100">
                  <User className="w-4 h-4" />
                  <span>Name</span>
                </label>
                <div className="relative group">
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Enter your name"
                    className={`w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all duration-300 text-white placeholder-gray-400 ${
                      shake ? 'animate-pulse border-red-400' : ''
                    }`}
                    autoFocus
                  />
                  <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-primary/20 to-purple-500/20 opacity-0 group-focus-within:opacity-100 transition-opacity duration-300 -z-10 blur-sm" />
                </div>
              </div>

              {/* Password Input */}
              <div className="space-y-2">
                <label className="flex items-center space-x-2 text-sm font-medium text-blue-100">
                  <Lock className="w-4 h-4" />
                  <span>Password</span>
                </label>
                <div className="relative group">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    className={`w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all duration-300 text-white placeholder-gray-400 pr-12 ${
                      shake ? 'animate-pulse border-red-400' : ''
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white transition-colors duration-200"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                  <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-primary/20 to-purple-500/20 opacity-0 group-focus-within:opacity-100 transition-opacity duration-300 -z-10 blur-sm" />
                </div>
              </div>

              {/* Error Message */}
              {error && (
                <div className="flex items-center space-x-2 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
                  <Shield className="w-4 h-4" />
                  <span>{error}</span>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 px-6 py-3 text-sm font-medium text-gray-300 hover:text-white transition-colors duration-200 border border-white/10 rounded-xl hover:bg-white/5"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-primary to-purple-600 text-white rounded-xl font-medium hover:from-primary/90 hover:to-purple-600/90 transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                >
                  {isLoading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Logging in...</span>
                    </>
                  ) : (
                    <>
                      <Zap className="w-4 h-4" />
                      <span>Login</span>
                    </>
                  )}
                </button>
              </div>
            </form>

            {/* Footer */}
            <div className="mt-8 pt-6 border-t border-white/10">
              <div className="flex items-center justify-center space-x-4 text-xs text-gray-400">
                <div className="flex items-center space-x-1">
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                  <span>Secure Connection</span>
                </div>
                <div className="flex items-center space-x-1">
                  <Shield className="w-3 h-3" />
                  <span>256-bit Encryption</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 