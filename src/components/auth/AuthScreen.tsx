import React, { useState } from 'react';
import { LoginForm } from './LoginForm';
import { RegisterForm } from './RegisterForm';
import { AuthCallback } from './AuthCallback';

interface AuthScreenProps {
  onAuthSuccess?: () => void;
}

export const AuthScreen: React.FC<AuthScreenProps> = ({ onAuthSuccess }) => {
  const [currentView, setCurrentView] = useState<'login' | 'register' | 'callback'>('login');

  const handleSwitchToRegister = () => {
    setCurrentView('register');
  };

  const handleSwitchToLogin = () => {
    setCurrentView('login');
  };

  const handleAuthSuccess = () => {
    onAuthSuccess?.();
  };

  const handleAuthError = () => {
    setCurrentView('login');
  };

  // Check if we're in a callback URL
  React.useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const isCallback = window.location.pathname.includes('/auth/callback') || 
                      urlParams.has('access_token') || 
                      urlParams.has('code');
    
    if (isCallback) {
      setCurrentView('callback');
    }
  }, []);

  switch (currentView) {
    case 'register':
      return (
        <RegisterForm
          onSwitchToLogin={handleSwitchToLogin}
          onRegisterSuccess={handleAuthSuccess}
        />
      );
    case 'callback':
      return (
        <AuthCallback
          onSuccess={handleAuthSuccess}
          onError={handleAuthError}
        />
      );
    case 'login':
    default:
      return (
        <LoginForm
          onSwitchToRegister={handleSwitchToRegister}
          onLoginSuccess={handleAuthSuccess}
        />
      );
  }
};