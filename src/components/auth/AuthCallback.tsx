import React, { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Loader2, CheckCircle, AlertCircle } from 'lucide-react';

interface AuthCallbackProps {
  onSuccess?: () => void;
  onError?: () => void;
}

export const AuthCallback: React.FC<AuthCallbackProps> = ({ onSuccess, onError }) => {
  const { user, loading } = useAuth();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Processing authentication...');

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        // Wait for auth state to be determined
        if (!loading) {
          if (user) {
            setStatus('success');
            setMessage('Authentication successful! Redirecting...');
            setTimeout(() => {
              onSuccess?.();
            }, 2000);
          } else {
            setStatus('error');
            setMessage('Authentication failed. Please try again.');
            setTimeout(() => {
              onError?.();
            }, 3000);
          }
        }
      } catch (error) {
        setStatus('error');
        setMessage('An error occurred during authentication.');
        setTimeout(() => {
          onError?.();
        }, 3000);
      }
    };

    handleAuthCallback();
  }, [user, loading, onSuccess, onError]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-3xl shadow-xl p-8 border border-gray-100 text-center">
          <div className="mb-6">
            {status === 'loading' && (
              <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 text-blue-600 rounded-2xl mb-4">
                <Loader2 className="w-8 h-8 animate-spin" />
              </div>
            )}
            {status === 'success' && (
              <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 text-green-600 rounded-2xl mb-4">
                <CheckCircle className="w-8 h-8" />
              </div>
            )}
            {status === 'error' && (
              <div className="inline-flex items-center justify-center w-16 h-16 bg-red-100 text-red-600 rounded-2xl mb-4">
                <AlertCircle className="w-8 h-8" />
              </div>
            )}
          </div>

          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            {status === 'loading' && 'Authenticating...'}
            {status === 'success' && 'Welcome!'}
            {status === 'error' && 'Authentication Failed'}
          </h1>

          <p className="text-gray-600 mb-6">
            {message}
          </p>

          {status === 'loading' && (
            <div className="flex items-center justify-center">
              <div className="animate-pulse flex space-x-1">
                <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};