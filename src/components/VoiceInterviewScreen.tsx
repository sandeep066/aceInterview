import React, { useState, useEffect, useRef } from 'react';
import { 
  Mic, 
  MicOff, 
  Volume2, 
  VolumeX, 
  Play, 
  Pause, 
  Square, 
  MessageCircle,
  Clock,
  FileText,
  Send,
  Loader,
  Wifi,
  WifiOff,
  AlertCircle,
  Phone,
  PhoneOff,
  Users,
  Signal,
  Bot,
  User,
  Zap,
  CheckCircle,
  XCircle
} from 'lucide-react';
import { InterviewConfig } from '../types';
import { AIInterviewSimulator } from '../utils/aiSimulator';
import { useLiveKit } from '../hooks/useLiveKit';
import { VoiceInterviewService } from '../services/voiceInterviewService';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition';

interface VoiceInterviewScreenProps {
  config: InterviewConfig;
  onEndInterview: (simulator: AIInterviewSimulator) => void;
  onBackToConfig: () => void;
}

export const VoiceInterviewScreen: React.FC<VoiceInterviewScreenProps> = ({
  config,
  onEndInterview,
  onBackToConfig
}) => {
  const [simulator] = useState(() => new AIInterviewSimulator(config));
  const [isInterviewActive, setIsInterviewActive] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState<string>('');
  const [notes, setNotes] = useState('');
  const [startTime, setStartTime] = useState<number | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [isThinking, setIsThinking] = useState(false);
  const [voiceSession, setVoiceSession] = useState<any>(null);
  const [connectionStatus, setConnectionStatus] = useState<'disconnected' | 'connecting' | 'connected' | 'error'>('disconnected');
  const [audioLevel, setAudioLevel] = useState(0);
  const [participantName] = useState(`participant-${Date.now()}`);
  const [livekitReady, setLivekitReady] = useState(false);
  const [conversationalMode, setConversationalMode] = useState(false);
  const [aiAgentEnabled, setAiAgentEnabled] = useState(false);
  const [conversationHistory, setConversationHistory] = useState<Array<{
    speaker: 'ai' | 'user';
    message: string;
    timestamp: number;
    type?: 'greeting' | 'question' | 'response' | 'feedback';
  }>>([]);
  const [isAISpeaking, setIsAISpeaking] = useState(false);
  const [userSpeaking, setUserSpeaking] = useState(false);
  
  const {
    isListening,
    transcript,
    startListening,
    stopListening,
    resetTranscript,
    isSupported: speechSupported
  } = useSpeechRecognition();

  // Create LiveKit props using the backend-provided URL when we have a session
  const livekitProps = voiceSession && voiceSession.participantToken ? {
    wsUrl: voiceSession.wsUrl,
    token: voiceSession.participantToken,
    onConnected: () => {
      setConnectionStatus('connected');
      console.log('[VoiceInterview] ✅ Connected to LiveKit room');
    },
    onDisconnected: () => {
      setConnectionStatus('disconnected');
      console.log('[VoiceInterview] ❌ Disconnected from LiveKit room');
    },
    onError: (error: Error) => {
      setConnectionStatus('error');
      console.error('[VoiceInterview] ❌ LiveKit error:', error);
    }
  } : null;

  // Only initialize LiveKit hook when we have valid props
  const {
    room,
    isConnected: livekitConnected,
    isConnecting: livekitConnecting,
    error: livekitError,
    localAudioTrack,
    remoteAudioTracks,
    connect: connectLiveKit,
    disconnect: disconnectLiveKit,
    startAudio,
    stopAudio,
    sendDataMessage
  } = useLiveKit(livekitProps || {
    wsUrl: '',
    token: '',
    onConnected: () => {},
    onDisconnected: () => {},
    onError: () => {}
  });

  const notesRef = useRef<HTMLTextAreaElement>(null);
  const conversationRef = useRef<HTMLDivElement>(null);

  // Auto-scroll conversation to bottom
  useEffect(() => {
    if (conversationRef.current) {
      conversationRef.current.scrollTop = conversationRef.current.scrollHeight;
    }
  }, [conversationHistory]);

  // Timer effect
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isInterviewActive && startTime) {
      interval = setInterval(() => {
        setElapsedTime(Date.now() - startTime);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isInterviewActive, startTime]);

  // Audio level monitoring
  useEffect(() => {
    if (localAudioTrack) {
      const analyzeAudio = () => {
        setAudioLevel(Math.random() * 100);
      };
      
      const interval = setInterval(analyzeAudio, 100);
      return () => clearInterval(interval);
    }
  }, [localAudioTrack]);

  // Update connection status based on LiveKit state
  useEffect(() => {
    if (!livekitProps) {
      return;
    }
    
    if (livekitConnecting) {
      setConnectionStatus('connecting');
    } else if (livekitConnected) {
      setConnectionStatus('connected');
    } else if (livekitError) {
      setConnectionStatus('error');
    } else if (voiceSession) {
      setConnectionStatus('disconnected');
    }
  }, [livekitConnecting, livekitConnected, livekitError, voiceSession, livekitProps]);

  // Effect to handle LiveKit connection after session is set
  useEffect(() => {
    if (voiceSession && voiceSession.participantToken && !livekitReady) {
      console.log('[VoiceInterview] Session ready, preparing LiveKit connection');
      console.log('[VoiceInterview] AI Agent enabled:', voiceSession.aiAgentEnabled);
      console.log('[VoiceInterview] Conversational mode:', voiceSession.conversationalMode);
      
      setLivekitReady(true);
      setAiAgentEnabled(voiceSession.aiAgentEnabled || false);
      setConversationalMode(voiceSession.conversationalMode || false);
      
      // Add initial greeting to conversation history if AI agent is enabled
      if (voiceSession.aiAgentEnabled) {
        setConversationHistory([{
          speaker: 'ai',
          message: 'Hello! I\'m your AI interviewer. I\'ll be conducting your interview today. Please wait a moment while I prepare...',
          timestamp: Date.now(),
          type: 'greeting'
        }]);
      }
      
      // Small delay to ensure state is fully updated
      setTimeout(async () => {
        try {
          console.log('[VoiceInterview] ========== ATTEMPTING LIVEKIT CONNECTION ==========');
          
          await connectLiveKit();
          
          setIsInterviewActive(true);
          setStartTime(Date.now());
          setIsThinking(false);
          
          console.log('[VoiceInterview] ✅ Voice interview started successfully');
          
          // If conversational mode is enabled, start listening immediately
          if (voiceSession.conversationalMode && speechSupported) {
            setTimeout(() => {
              startListening();
              setUserSpeaking(true);
              console.log('[VoiceInterview] 🎤 Started listening for conversational mode');
              
              // Add system message about continuous listening
              setConversationHistory(prev => [...prev, {
                speaker: 'ai',
                message: 'Great! I can hear you now. The interview will flow naturally - just speak when you\'re ready to respond. Are you ready to begin?',
                timestamp: Date.now(),
                type: 'question'
              }]);
              
            }, 3000); // Give more time for AI agent to initialize
          }
          
        } catch (connectError) {
          console.error('[VoiceInterview] ❌ Failed to connect to LiveKit:', connectError);
          setConnectionStatus('error');
          setIsThinking(false);
          alert(`Failed to connect to voice interview: ${connectError instanceof Error ? connectError.message : 'Unknown error'}`);
        }
      }, 1000);
    }
  }, [voiceSession, livekitReady, connectLiveKit, speechSupported, startListening]);

  // Listen for remote audio data (AI responses) in conversational mode
  useEffect(() => {
    if (conversationalMode && remoteAudioTracks.length > 0) {
      console.log('[VoiceInterview] 🎵 AI audio received in conversational mode');
      setIsAISpeaking(true);
      
      // Stop user listening while AI is speaking
      if (isListening) {
        stopListening();
        setUserSpeaking(false);
      }
      
      // Resume listening after AI finishes (simulated delay)
      setTimeout(() => {
        setIsAISpeaking(false);
        if (conversationalMode && speechSupported && isInterviewActive) {
          startListening();
          setUserSpeaking(true);
        }
      }, 3000); // Adjust based on actual audio duration
    }
  }, [conversationalMode, remoteAudioTracks, isListening, stopListening, startListening, speechSupported, isInterviewActive]);

  // Handle transcript updates in conversational mode
  useEffect(() => {
    if (conversationalMode && transcript && transcript.length > 20) {
      // Add user message to conversation history
      setConversationHistory(prev => {
        const lastMessage = prev[prev.length - 1];
        if (lastMessage?.speaker === 'user' && Date.now() - lastMessage.timestamp < 10000) {
          // Update the last user message if it's recent
          return [...prev.slice(0, -1), {
            ...lastMessage,
            message: transcript,
            timestamp: Date.now()
          }];
        } else {
          // Add new user message
          return [...prev, {
            speaker: 'user',
            message: transcript,
            timestamp: Date.now(),
            type: 'response'
          }];
        }
      });
    }
  }, [conversationalMode, transcript]);

  const formatTime = (ms: number): string => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const startVoiceInterview = async () => {
    try {
      setIsThinking(true);
      setConnectionStatus('connecting');
      
      console.log('[VoiceInterview] ========== STARTING VOICE INTERVIEW ==========');
      
      // Start voice interview session with AI agent enabled
      const session = await VoiceInterviewService.startVoiceInterview(config, participantName);
      console.log('[VoiceInterview] Session received from backend:', session);
      
      // Validate session data before proceeding
      if (!session.participantToken) {
        throw new Error('No participant token received from backend');
      }
      
      console.log('[VoiceInterview] ✅ Session validation passed, setting voiceSession state');
      
      // Extract question string from the response object
      const firstQuestion = typeof session.firstQuestion === 'string' 
        ? session.firstQuestion 
        : session.firstQuestion?.question || 'Welcome to your voice interview. Please wait for the first question.';
      setCurrentQuestion(firstQuestion);
      
      // Set the session - this will trigger the useEffect above to connect to LiveKit
      setVoiceSession(session);
      
    } catch (error) {
      console.error('[VoiceInterview] ❌ Error starting voice interview:', error);
      
      setConnectionStatus('error');
      setIsThinking(false);
      
      // Show user-friendly error message
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      alert(`Failed to start voice interview: ${errorMessage}`);
    }
  };

  const pauseInterview = async () => {
    setIsInterviewActive(false);
    stopListening();
    setUserSpeaking(false);
    if (livekitProps) {
      stopAudio();
    }
    
    if (voiceSession) {
      try {
        await VoiceInterviewService.pauseInterview(voiceSession.sessionId);
        
        // Add pause message to conversation
        setConversationHistory(prev => [...prev, {
          speaker: 'ai',
          message: 'Interview paused. Click resume when you\'re ready to continue.',
          timestamp: Date.now(),
          type: 'feedback'
        }]);
      } catch (error) {
        console.error('[VoiceInterview] Error pausing interview:', error);
      }
    }
  };

  const resumeInterview = async () => {
    setIsInterviewActive(true);
    
    if (voiceSession) {
      try {
        await VoiceInterviewService.resumeInterview(voiceSession.sessionId);
        if (livekitProps) {
          await startAudio();
        }
        
        // Resume listening in conversational mode
        if (conversationalMode && speechSupported) {
          startListening();
          setUserSpeaking(true);
        }
        
        // Add resume message to conversation
        setConversationHistory(prev => [...prev, {
          speaker: 'ai',
          message: 'Great! Let\'s continue with the interview. Where were we?',
          timestamp: Date.now(),
          type: 'question'
        }]);
      } catch (error) {
        console.error('[VoiceInterview] Error resuming interview:', error);
      }
    }
  };

  const endInterview = async () => {
    setIsInterviewActive(false);
    stopListening();
    setUserSpeaking(false);
    if (livekitProps) {
      stopAudio();
      disconnectLiveKit();
    }
    
    if (voiceSession) {
      try {
        await VoiceInterviewService.endInterview(voiceSession.sessionId);
        
        // Add completion message to conversation
        setConversationHistory(prev => [...prev, {
          speaker: 'ai',
          message: 'Thank you for completing the interview! I\'ll now generate your detailed analytics.',
          timestamp: Date.now(),
          type: 'feedback'
        }]);
      } catch (error) {
        console.error('[VoiceInterview] Error ending interview:', error);
      }
    }
    
    onEndInterview(simulator);
  };

  const submitVoiceResponse = async () => {
    if (!transcript.trim() || !voiceSession) return;

    stopListening();
    setUserSpeaking(false);
    setIsThinking(true);
    
    try {
      const result = await VoiceInterviewService.processVoiceResponse(
        voiceSession.sessionId,
        transcript.trim(),
        {
          audioLevel,
          duration: elapsedTime,
          confidence: 0.9
        }
      );
      
      // Update simulator with the response
      await simulator.submitResponse(transcript.trim());
      
      if (result.isComplete) {
        endInterview();
      } else if (result.nextQuestion) {
        // Extract question string from the response object
        const nextQuestion = typeof result.nextQuestion === 'string'
          ? result.nextQuestion
          : result.nextQuestion?.question || '';
        setCurrentQuestion(nextQuestion);
        
        // Add AI's next question to conversation
        setConversationHistory(prev => [...prev, {
          speaker: 'ai',
          message: nextQuestion,
          timestamp: Date.now(),
          type: 'question'
        }]);
        
        resetTranscript();
      }
    } catch (error) {
      console.error('[VoiceInterview] Error submitting voice response:', error);
    }
    
    setIsThinking(false);
  };

  const toggleMicrophone = async () => {
    if (isListening) {
      stopListening();
      setUserSpeaking(false);
      if (livekitProps) {
        stopAudio();
      }
    } else {
      if (livekitProps) {
        await startAudio();
      }
      startListening();
      setUserSpeaking(true);
    }
  };

  const getConnectionStatusColor = () => {
    switch (connectionStatus) {
      case 'connected': return 'text-green-600 bg-green-100';
      case 'connecting': return 'text-yellow-600 bg-yellow-100';
      case 'error': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getConnectionStatusText = () => {
    switch (connectionStatus) {
      case 'connected': return 'Voice Connected';
      case 'connecting': return 'Connecting...';
      case 'error': return 'Connection Error';
      default: return 'Disconnected';
    }
  };

  const progress = simulator.getProgress();
  const participantCount = room?.participants?.size || 0;
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50">
      <div className="container mx-auto px-4 py-6">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h1 className="text-2xl font-bold text-gray-900 flex items-center">
                  <Phone className="w-6 h-6 mr-2 text-blue-600" />
                  Voice Interview - {config.style.charAt(0).toUpperCase() + config.style.slice(1).replace('-', ' ')}
                  {aiAgentEnabled && (
                    <span className="ml-3 inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                      <Bot className="w-3 h-3 mr-1" />
                      AI Agent
                    </span>
                  )}
                  {conversationalMode && (
                    <span className="ml-2 inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      <Zap className="w-3 h-3 mr-1" />
                      Conversational
                    </span>
                  )}
                </h1>
                <p className="text-gray-600">Topic: {config.topic}</p>
                {config.companyName && (
                  <p className="text-gray-600">Company: {config.companyName}</p>
                )}
              </div>
              <div className="text-right">
                <div className="flex items-center text-lg font-semibold text-blue-600 mb-2">
                  <Clock className="w-5 h-5 mr-2" />
                  {formatTime(elapsedTime)}
                </div>
                <div className="text-sm text-gray-600 mb-2">
                  Duration: {config.duration} minutes
                </div>
                <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getConnectionStatusColor()}`}>
                  {connectionStatus === 'connecting' ? (
                    <Loader className="w-4 h-4 mr-1 animate-spin" />
                  ) : connectionStatus === 'connected' ? (
                    <Signal className="w-4 h-4 mr-1" />
                  ) : connectionStatus === 'error' ? (
                    <AlertCircle className="w-4 h-4 mr-1" />
                  ) : (
                    <WifiOff className="w-4 h-4 mr-1" />
                  )}
                  {getConnectionStatusText()}
                </div>
              </div>
            </div>

            {/* Error Display */}
            {connectionStatus === 'error' && livekitError && (
              <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-start">
                  <AlertCircle className="w-5 h-5 text-red-600 mr-3 mt-0.5 flex-shrink-0" />
                  <div className="text-red-800 text-sm">
                    <p className="font-medium mb-1">Connection Error</p>
                    <p className="mb-2">{livekitError}</p>
                    {voiceSession && (
                      <p className="text-xs text-red-600">
                        Using backend URL: {voiceSession.wsUrl}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* AI Agent Status */}
            {aiAgentEnabled && (
              <div className="mb-4 p-4 bg-purple-50 border border-purple-200 rounded-lg">
                <div className="flex items-start">
                  <Bot className="w-5 h-5 text-purple-600 mr-3 mt-0.5 flex-shrink-0" />
                  <div className="text-purple-800 text-sm">
                    <p className="font-medium mb-1">AI Agent Active</p>
                    <p className="mb-2">
                      Your AI interviewer is ready for continuous conversation. 
                      {conversationalMode ? ' The interview will flow naturally - just speak when ready!' : ' Use the microphone button to respond.'}
                    </p>
                    {voiceSession?.agentError && (
                      <p className="text-xs text-purple-600">
                        Note: {voiceSession.agentError}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Progress Bar */}
            <div className="mb-4">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium text-gray-700">
                  Question {progress.current} of {progress.total}
                </span>
                <span className="text-sm text-gray-600">
                  {Math.round(progress.percentage)}% Complete
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${progress.percentage}%` }}
                />
              </div>
            </div>

            {/* Voice Controls */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                {!isInterviewActive ? (
                  <button
                    onClick={startVoiceInterview}
                    disabled={isThinking}
                    className="inline-flex items-center px-6 py-3 bg-green-600 text-white font-semibold rounded-xl hover:bg-green-700 focus:outline-none focus:ring-4 focus:ring-green-300 transition-all disabled:opacity-50"
                  >
                    {isThinking ? (
                      <Loader className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Phone className="w-4 h-4 mr-2" />
                    )}
                    {startTime ? 'Resume Voice Interview' : 'Start Voice Interview'}
                  </button>
                ) : (
                  <button
                    onClick={pauseInterview}
                    className="inline-flex items-center px-6 py-3 bg-yellow-600 text-white font-semibold rounded-xl hover:bg-yellow-700 focus:outline-none focus:ring-4 focus:ring-yellow-300 transition-all"
                  >
                    <Pause className="w-4 h-4 mr-2" />
                    Pause Interview
                  </button>
                )}
                
                <button
                  onClick={endInterview}
                  className="inline-flex items-center px-6 py-3 bg-red-600 text-white font-semibold rounded-xl hover:bg-red-700 focus:outline-none focus:ring-4 focus:ring-red-300 transition-all"
                >
                  <PhoneOff className="w-4 h-4 mr-2" />
                  End Interview
                </button>
              </div>

              <div className="flex items-center space-x-4">
                {/* Speaking Status Indicators */}
                <div className="flex items-center space-x-2">
                  {isAISpeaking && (
                    <div className="flex items-center text-purple-600 text-sm">
                      <Bot className="w-4 h-4 mr-1" />
                      <span>AI Speaking</span>
                      <div className="w-2 h-2 bg-purple-600 rounded-full animate-pulse ml-2"></div>
                    </div>
                  )}
                  {userSpeaking && (
                    <div className="flex items-center text-green-600 text-sm">
                      <User className="w-4 h-4 mr-1" />
                      <span>Listening</span>
                      <div className="w-2 h-2 bg-green-600 rounded-full animate-pulse ml-2"></div>
                    </div>
                  )}
                </div>
                
                <div className="text-sm text-gray-600">
                  Participants: {participantCount}
                </div>
                <Users className="w-5 h-5 text-gray-400" />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Conversation Flow */}
            <div className="lg:col-span-2">
              {/* Real-time Conversation Display */}
              {conversationalMode && conversationHistory.length > 0 && (
                <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                    <MessageCircle className="w-5 h-5 mr-2 text-purple-600" />
                    Live Conversation
                    <span className="ml-2 text-sm text-green-600">(Real-time)</span>
                  </h3>
                  
                  <div 
                    ref={conversationRef}
                    className="space-y-4 max-h-96 overflow-y-auto bg-gray-50 rounded-xl p-4"
                  >
                    {conversationHistory.map((message, index) => (
                      <div key={index} className={`flex ${message.speaker === 'ai' ? 'justify-start' : 'justify-end'}`}>
                        <div className={`max-w-xs lg:max-w-md px-4 py-3 rounded-lg shadow-sm ${
                          message.speaker === 'ai' 
                            ? 'bg-blue-100 text-blue-900 border-l-4 border-blue-500' 
                            : 'bg-green-100 text-green-900 border-r-4 border-green-500'
                        }`}>
                          <div className="flex items-center mb-2">
                            {message.speaker === 'ai' ? (
                              <Bot className="w-4 h-4 mr-2" />
                            ) : (
                              <User className="w-4 h-4 mr-2" />
                            )}
                            <span className="text-xs font-medium">
                              {message.speaker === 'ai' ? 'AI Interviewer' : 'You'}
                            </span>
                            {message.type && (
                              <span className={`ml-2 text-xs px-2 py-1 rounded-full ${
                                message.type === 'question' ? 'bg-blue-200 text-blue-800' :
                                message.type === 'response' ? 'bg-green-200 text-green-800' :
                                message.type === 'feedback' ? 'bg-yellow-200 text-yellow-800' :
                                'bg-gray-200 text-gray-800'
                              }`}>
                                {message.type}
                              </span>
                            )}
                          </div>
                          <p className="text-sm leading-relaxed">{message.message}</p>
                          <div className="text-xs text-gray-500 mt-1">
                            {new Date(message.timestamp).toLocaleTimeString()}
                          </div>
                        </div>
                      </div>
                    ))}
                    
                    {/* Live transcript preview */}
                    {transcript && userSpeaking && (
                      <div className="flex justify-end">
                        <div className="max-w-xs lg:max-w-md px-4 py-3 rounded-lg bg-green-50 text-green-800 border-r-4 border-green-300 opacity-75">
                          <div className="flex items-center mb-2">
                            <User className="w-4 h-4 mr-2" />
                            <span className="text-xs font-medium">You (typing...)</span>
                            <div className="w-2 h-2 bg-green-600 rounded-full animate-pulse ml-2"></div>
                          </div>
                          <p className="text-sm leading-relaxed italic">{transcript}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Traditional AI Interviewer (for non-conversational mode) */}
              {!conversationalMode && (
                <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
                  <div className="flex items-center mb-4">
                    <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center mr-4">
                      <MessageCircle className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">AI Voice Interviewer</h3>
                      <p className="text-sm text-gray-600">
                        Real-time voice conversation powered by LiveKit
                      </p>
                    </div>
                  </div>

                  <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-6 min-h-[200px]">
                    {isThinking ? (
                      <div className="flex items-center justify-center h-full">
                        <Loader className="w-6 h-6 text-blue-600 animate-spin mr-3" />
                        <span className="text-gray-600">AI is processing your response...</span>
                      </div>
                    ) : currentQuestion ? (
                      <div>
                        <p className="text-lg text-gray-800 leading-relaxed mb-4">{currentQuestion}</p>
                        {isInterviewActive && connectionStatus === 'connected' && (
                          <div className="flex items-center text-sm text-blue-600">
                            <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse mr-2"></div>
                            Voice interview active - speak your response
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="flex items-center justify-center h-full text-gray-500">
                        <Phone className="w-8 h-8 mr-3" />
                        <span>Click "Start Voice Interview" to begin</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Voice Response Interface */}
              <div className="bg-white rounded-2xl shadow-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <Mic className="w-5 h-5 mr-2 text-blue-600" />
                  Voice Response
                  {conversationalMode && (
                    <span className="ml-2 text-sm text-green-600">(Auto-listening)</span>
                  )}
                </h3>
                
                <div className="space-y-4">
                  {/* Live Transcript */}
                  <div className="bg-gray-50 rounded-xl p-4 min-h-[120px]">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-700">Live Transcript</span>
                      <div className="flex items-center space-x-2">
                        {userSpeaking && (
                          <div className="flex items-center text-sm text-green-600">
                            <CheckCircle className="w-4 h-4 mr-1" />
                            Listening
                          </div>
                        )}
                        {isAISpeaking && (
                          <div className="flex items-center text-sm text-purple-600">
                            <Bot className="w-4 h-4 mr-1" />
                            AI Speaking
                          </div>
                        )}
                        {!userSpeaking && !isAISpeaking && isInterviewActive && (
                          <div className="flex items-center text-sm text-gray-500">
                            <XCircle className="w-4 h-4 mr-1" />
                            Idle
                          </div>
                        )}
                      </div>
                    </div>
                    <p className="text-gray-800">
                      {transcript || (conversationalMode 
                        ? 'Speak naturally - your words will appear here in real-time...' 
                        : 'Your speech will appear here in real-time...')}
                    </p>
                  </div>

                  {/* Audio Level Indicator */}
                  {localAudioTrack && (
                    <div className="flex items-center space-x-3">
                      <Volume2 className="w-5 h-5 text-gray-600" />
                      <div className="flex-1 bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-gradient-to-r from-green-400 to-blue-500 h-2 rounded-full transition-all duration-100"
                          style={{ width: `${audioLevel}%` }}
                        />
                      </div>
                      <span className="text-sm text-gray-600">{Math.round(audioLevel)}%</span>
                    </div>
                  )}

                  {/* Voice Controls */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      {speechSupported && !conversationalMode && (
                        <button
                          onClick={toggleMicrophone}
                          disabled={!isInterviewActive || connectionStatus !== 'connected'}
                          className={`p-4 rounded-xl transition-all ${
                            isListening
                              ? 'bg-red-100 text-red-600 animate-pulse'
                              : 'bg-blue-100 text-blue-600 hover:bg-blue-200'
                          } disabled:opacity-50 disabled:cursor-not-allowed`}
                        >
                          {isListening ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
                        </button>
                      )}
                      
                      <div className="text-sm text-gray-600">
                        {conversationalMode 
                          ? (userSpeaking ? 'Continuous listening active' : 'AI is speaking - please wait')
                          : isListening 
                            ? 'Click to stop recording' 
                            : 'Click to start recording'
                        }
                      </div>
                    </div>

                    {!conversationalMode && (
                      <button
                        onClick={submitVoiceResponse}
                        disabled={!isInterviewActive || !transcript.trim() || isThinking}
                        className="inline-flex items-center px-6 py-3 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-300 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                      >
                        <Send className="w-4 h-4 mr-2" />
                        Submit Response
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Notes & Status Section */}
            <div className="space-y-6">
              {/* Interview Notes */}
              <div className="bg-white rounded-2xl shadow-lg p-6">
                <div className="flex items-center mb-4">
                  <FileText className="w-5 h-5 text-gray-600 mr-2" />
                  <h3 className="text-lg font-semibold text-gray-900">Interview Notes</h3>
                </div>
                
                <textarea
                  ref={notesRef}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Jot down key points, thoughts, or reminders during the voice interview..."
                  className="w-full h-48 px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none transition-colors"
                />
                
                <div className="mt-4 text-xs text-gray-500">
                  Your notes will be saved and available in the analytics section.
                </div>
              </div>

              {/* Connection & Status Info */}
              <div className="bg-white rounded-2xl shadow-lg p-6">
                <h4 className="font-medium text-gray-900 mb-4">Connection Status</h4>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-700">LiveKit:</span>
                    <span className={`flex items-center ${connectionStatus === 'connected' ? 'text-green-600' : 'text-red-600'}`}>
                      {connectionStatus === 'connected' ? <CheckCircle className="w-4 h-4 mr-1" /> : <XCircle className="w-4 h-4 mr-1" />}
                      {getConnectionStatusText()}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-700">Audio Track:</span>
                    <span className={`flex items-center ${localAudioTrack ? 'text-green-600' : 'text-gray-600'}`}>
                      {localAudioTrack ? <CheckCircle className="w-4 h-4 mr-1" /> : <XCircle className="w-4 h-4 mr-1" />}
                      {localAudioTrack ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-700">AI Agent:</span>
                    <span className={`flex items-center ${aiAgentEnabled ? 'text-green-600' : 'text-gray-600'}`}>
                      {aiAgentEnabled ? <Bot className="w-4 h-4 mr-1" /> : <XCircle className="w-4 h-4 mr-1" />}
                      {aiAgentEnabled ? 'Active' : 'Disabled'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-700">Mode:</span>
                    <span className={`flex items-center ${conversationalMode ? 'text-green-600' : 'text-blue-600'}`}>
                      {conversationalMode ? <Zap className="w-4 h-4 mr-1" /> : <Mic className="w-4 h-4 mr-1" />}
                      {conversationalMode ? 'Conversational' : 'Manual'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-700">Participants:</span>
                    <span className="text-gray-900 font-medium">
                      {participantCount}
                    </span>
                  </div>
                </div>
                
                {voiceSession && (
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <div className="text-xs text-gray-600 space-y-1">
                      <div><strong>Session:</strong> {voiceSession.sessionId}</div>
                      <div><strong>Room:</strong> {voiceSession.roomName}</div>
                      <div><strong>Token Length:</strong> {voiceSession.participantToken?.length || 0}</div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};