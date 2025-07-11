import React, { useState } from 'react';
import { AuthProvider } from './contexts/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { ConfigurationScreen } from './components/ConfigurationScreen';
import { InterviewScreen } from './components/InterviewScreen';
import { AnalyticsScreen } from './components/AnalyticsScreen';
import { InterviewConfig, AppScreen } from './types';
import { AIInterviewSimulator } from './utils/aiSimulator';

function App() {
  const [currentScreen, setCurrentScreen] = useState<AppScreen>('config');
  const [interviewConfig, setInterviewConfig] = useState<InterviewConfig | null>(null);
  const [completedSimulator, setCompletedSimulator] = useState<AIInterviewSimulator | null>(null);

  const handleStartInterview = (config: InterviewConfig) => {
    setInterviewConfig(config);
    setCurrentScreen('interview');
  };

  const handleEndInterview = (simulator: AIInterviewSimulator) => {
    setCompletedSimulator(simulator);
    setCurrentScreen('analytics');
  };

  const handleBackToConfig = () => {
    setCurrentScreen('config');
    setInterviewConfig(null);
    setCompletedSimulator(null);
  };

  const handleRetryInterview = () => {
    if (interviewConfig) {
      setCurrentScreen('interview');
      setCompletedSimulator(null);
    }
  };

  return (
    <AuthProvider>
      <div className="min-h-screen">
        <ProtectedRoute>
          {currentScreen === 'config' && (
            <ConfigurationScreen onStartInterview={handleStartInterview} />
          )}
          
          {currentScreen === 'interview' && interviewConfig && (
            <InterviewScreen
              config={interviewConfig}
              onEndInterview={handleEndInterview}
              onBackToConfig={handleBackToConfig}
            />
          )}
          
          {currentScreen === 'analytics' && completedSimulator && (
            <AnalyticsScreen
              simulator={completedSimulator}
              onBackToConfig={handleBackToConfig}
              onRetryInterview={handleRetryInterview}
            />
          )}
        </ProtectedRoute>
      </div>
    </AuthProvider>
  );
}

export default App;