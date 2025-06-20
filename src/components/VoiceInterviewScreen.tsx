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
  XCircle,
  Brain,
  Settings,
  Cpu
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
  const [agentProvider, setAgentProvider] = useState<string>('google');
  const [selectedProvider, setSelectedProvider] = useState<'openai' | 'google'>('google');
  const [showProviderSelection, setShowProviderSelection] = useState(false);
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
  const audioElementsRef = useRef<HTMLAudioElement[]>([]);

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

  // CRITICAL: Handle remote audio tracks (AI voice output)
  useEffect(() => {
    console.log('[VoiceInterview] Remote audio tracks changed:', remoteAudioTracks.length);
    
    // Clean up existing audio elements
    audioElementsRef.current.forEach(audio => {
      audio.pause();
      audio.srcObject = null;
    });
    audioElementsRef.current = [];

    // Create audio elements for each remote track
    remoteAudioTracks.forEach((track, index) => {
      console.log(`[VoiceInterview] 🎵 Setting up audio element for remote track ${index}`);
      
      const audioElement = document.createElement('audio');
      audioElement.autoplay = true;
      audioElement.playsInline = true;
      audioElement.controls = false;
      
      // Get the MediaStreamTrack from the RemoteAudioTrack
      const mediaStreamTrack = track.mediaStreamTrack;
      if (mediaStreamTrack) {
        const mediaStream = new MediaStream([mediaStreamTrack]);
        audioElement.srcObject = mediaStream;
        
        audioElement.onloadedmetadata = () => {
          console.log(`[VoiceInterview] ✅ Audio element ${index} ready to play`);
          audioElement.play().catch(error => {
            console.error(`[VoiceInterview] ❌ Failed to play audio element ${index}:`, error);
          });
        };
        
        audioElement.onplay = () => {
          console.log(`[VoiceInterview] 🔊 Audio element ${index} started playing`);
          setIsAISpeaking(true);
        };
        
        audioElement.onended = () => {
          console.log(`[VoiceInterview] 🔇 Audio element ${index} finished playing`);
          setIsAISpeaking(false);
        };
        
        audioElement.onerror = (error) => {
          console.error(`[VoiceInterview] ❌ Audio element ${index} error:`, error);
        };
        
        // Add to DOM (hidden) and track reference
        audioElement.style.display = 'none';
        document.body.appendChild(audioElement);
        audioElementsRef.current.push(audioElement);
      }
    });

    // Cleanup function
    return () => {
      audioElementsRef.current.forEach(audio => {
        audio.pause();
        audio.srcObject = null;
        if (audio.parentNode) {
          audio.parentNode.removeChild(audio);
        }
      });
      audioElementsRef.current = [];
    };
  }, [remoteAudioTracks]);

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
      console.log('[VoiceInterview] Agent provider:', voiceSession.agentProvider || 'google');
      
      setLivekitReady(true);
      setAiAgentEnabled(voiceSession.aiAgentEnabled || false);
      setConversationalMode(voiceSession.conversationalMode || false);
      setAgentProvider(voiceSession.agentProvider || 'google');
      
      // Add initial greeting to conversation history if AI agent is enabled
      if (voiceSession.aiAgentEnabled) {
        const providerName = voiceSession.agentProvider === 'openai' ? 'OpenAI' : 'Google AI';
        setConversationHistory([{
          speaker: 'ai',
          message: `Hello! I'm your ${providerName} interviewer. I'll be conducting your interview today using advanced speech recognition and natural language processing. Please wait a moment while I prepare...`,
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
          
          // CRITICAL: Start audio immediately for conversational mode
          if (voiceSession.conversationalMode) {
            console.log('[VoiceInterview] 🎤 Starting audio for conversational mode');
            await startAudio();
          }
          
          console.log('[VoiceInterview] ✅ Voice interview started successfully');
          
          // If conversational mode is enabled, the AI agent will handle the flow
          if (voiceSession.conversationalMode) {
            setTimeout(() => {
              const providerName = voiceSession.agentProvider === 'openai' ? 'OpenAI' : 'Google AI';
              console.log(`[VoiceInterview] 🎤 ${providerName} AI agent is managing the conversation flow`);
              
              // Add system message about AI management
              setConversationHistory(prev => [...prev, {
                speaker: 'ai',
                message: `Perfect! I'm now ready to begin. The interview will flow naturally using ${providerName}'s advanced speech technology. Are you ready to start?`,
                timestamp: Date.now(),
                type: 'question'
              }]);
              
            }, 3000);
          }
          
        } catch (connectError) {
          console.error('[VoiceInterview] ❌ Failed to connect to LiveKit:', connectError);
          setConnectionStatus('error');
          setIsThinking(false);
          alert(`Failed to connect to voice interview: ${connectError instanceof Error ? connectError.message : 'Unknown error'}`);
        }
      }, 1000);
    }
  }, [voiceSession, livekitReady, connectLiveKit, startAudio]);

  // Listen for user speech in conversational mode
  useEffect(() => {
    if (conversationalMode && isInterviewActive && !isAISpeaking) {
      // In conversational mode, continuously listen for user input
      if (speechSupported && !isListening) {
        console.log('[VoiceInterview] 👂 Starting continuous listening in conversational mode');
        startListening();
        setUserSpeaking(true);
      }
    } else if (isListening) {
      // Stop listening when AI is speaking or interview is not active
      console.log('[VoiceInterview] 🔇 Stopping listening - AI speaking or interview inactive');
      stopListening();
      setUserSpeaking(false);
    }
  }, [conversationalMode, isInterviewActive, isAISpeaking, speechSupported, isListening, startListening, stopListening]);

  // Handle transcript updates in conversational mode
  useEffect(() => {
    if (conversationalMode && transcript && transcript.trim().length > 10) {
      // In conversational mode, automatically process longer transcripts
      const words = transcript.trim().split(' ');
      if (words.length >= 5) { // Process when user has said at least 5 words
        console.log('[VoiceInterview] 📝 Auto-processing transcript in conversational mode:', transcript);
        
        // Add user response to conversation
        setConversationHistory(prev => [...prev, {
          speaker: 'user',
          message: transcript,
          timestamp: Date.now(),
          type: 'response'
        }]);
        
        // Reset transcript and continue listening
        resetTranscript();
        
        // The AI agent will handle the response processing through LiveKit
      }
    }
  }, [conversationalMode, transcript, resetTranscript]);

  const formatTime = (ms: number): string => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const startVoiceInterview = async () => {
    try {
      setIsThinking(true);
      setConnectionStatus('connecting');
      
      const providerName = selectedProvider === 'openai' ? 'OpenAI' : 'Google AI';
      console.log(`[VoiceInterview] ========== STARTING ${providerName.toUpperCase()} VOICE INTERVIEW ==========`);
      
      // Start voice interview session with selected AI agent provider
      const session = await VoiceInterviewService.startVoiceInterview(
        config, 
        participantName, 
        true, // enableAIAgent
        selectedProvider // agentProvider
      );
      console.log('[VoiceInterview] Session received from backend:', session);
      
      // Validate session data before proceeding
      if (!session.participantToken) {
        throw new Error('No participant token received from backend');
      }
      
      console.log('[VoiceInterview] ✅ Session validation passed, setting voiceSession state');
      
      // Extract question string from the response object
      const firstQuestion = typeof session.firstQuestion === 'string' 
        ? session.firstQuestion 
        : session.firstQuestion?.question || `Welcome to your ${providerName} voice interview. Please wait for the first question.`;
      setCurrentQuestion(firstQuestion);
      
      // Set the session - this will trigger the useEffect above to connect to LiveKit
      setVoiceSession(session);
      
    } catch (error) {
      console.error(`[VoiceInterview] ❌ Error starting ${selectedProvider.toUpperCase()} voice interview:`, error);
      
      setConnectionStatus('error');
      setIsThinking(false);
      
      // Show user-friendly error message
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      alert(`Failed to start ${selectedProvider.toUpperCase()} voice interview: ${errorMessage}`);
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
        if (livekitProps && conversationalMode) {
          await startAudio();
        }
        
        // Add resume message to conversation
        const providerName = agentProvider === 'openai' ? 'OpenAI' : 'Google AI';
        setConversationHistory(prev => [...prev, {
          speaker: 'ai',
          message: `Great! Let's continue with the interview. The ${providerName} agent is ready to proceed.`,
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
        const providerName = agentProvider === 'openai' ? 'OpenAI' : 'Google AI';
        setConversationHistory(prev => [...prev, {
          speaker: 'ai',
          message: `Thank you for completing the interview with ${providerName}! I'll now generate your detailed analytics using advanced AI analysis.`,
          timestamp: Date.now(),
          type: 'feedback'
        }]);
      } catch (error) {
        console.error('[VoiceInterview] Error ending interview:', error);
      }
    }
    
    onEndInterview(simulator);
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

  const getProviderIcon = (provider: string) => {
    return provider === 'openai' ? <Cpu className="w-4 h-4" /> : <Brain className="w-4 h-4" />;
  };

  const getProviderColor = (provider: string) => {
    return provider === 'openai' ? 'text-green-600 bg-green-100' : 'text-purple-600 bg-purple-100';
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
                  AI Voice Interview - {config.style.charAt(0).toUpperCase() + config.style.slice(1).replace('-', ' ')}
                  {aiAgentEnabled && (
                    <span className={`ml-3 inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${getProviderColor(agentProvider)}`}>
                      {getProviderIcon(agentProvider)}
                      <span className="ml-1">{agentProvider === 'openai' ? 'OpenAI' : 'Google AI'}</span>
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
                <p className="text-xs text-blue-600 mt-1">
                  {aiAgentEnabled 
                    ? `Powered by ${agentProvider === 'openai' ? 'OpenAI GPT-4, Whisper, and TTS' : 'Google Gemini AI, Speech-to-Text, and Text-to-Speech'}`
                    : 'Manual voice control mode'
                  }
                </p>
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

            {/* Provider Selection */}
            {!isInterviewActive && !voiceSession && (
              <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-medium text-blue-900">Choose AI Provider</h4>
                  <button
                    onClick={() => setShowProviderSelection(!showProviderSelection)}
                    className="text-blue-600 hover:text-blue-800"
                  >
                    <Settings className="w-4 h-4" />
                  </button>
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setSelectedProvider('openai')}
                    className={`p-3 rounded-lg border-2 transition-all ${
                      selectedProvider === 'openai'
                        ? 'border-green-500 bg-green-50'
                        : 'border-gray-200 hover:border-green-300'
                    }`}
                  >
                    <div className="flex items-center mb-2">
                      <Cpu className="w-5 h-5 mr-2 text-green-600" />
                      <span className="font-medium text-gray-900">OpenAI</span>
                    </div>
                    <div className="text-xs text-gray-600">
                      GPT-4 + Whisper + TTS
                    </div>
                  </button>
                  
                  <button
                    onClick={() => setSelectedProvider('google')}
                    className={`p-3 rounded-lg border-2 transition-all ${
                      selectedProvider === 'google'
                        ? 'border-purple-500 bg-purple-50'
                        : 'border-gray-200 hover:border-purple-300'
                    }`}
                  >
                    <div className="flex items-center mb-2">
                      <Brain className="w-5 h-5 mr-2 text-purple-600" />
                      <span className="font-medium text-gray-900">Google AI</span>
                    </div>
                    <div className="text-xs text-gray-600">
                      Gemini + Cloud Speech
                    </div>
                  </button>
                </div>
                
                <div className="mt-3 text-xs text-blue-700">
                  Selected: <strong>{selectedProvider === 'openai' ? 'OpenAI' : 'Google AI'}</strong> - 
                  This will be used for speech recognition, natural language processing, and text-to-speech.
                </div>
              </div>
            )}

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
              <div className={`mb-4 p-4 border rounded-lg ${getProviderColor(agentProvider).replace('text-', 'border-').replace('bg-', 'bg-').replace('600', '200').replace('100', '50')}`}>
                <div className="flex items-start">
                  {getProviderIcon(agentProvider)}
                  <div className={`ml-3 text-sm ${getProviderColor(agentProvider).split(' ')[0].replace('600', '800')}`}>
                    <p className="font-medium mb-1">{agentProvider === 'openai' ? 'OpenAI' : 'Google AI'} Agent Active</p>
                    <p className="mb-2">
                      Your {agentProvider === 'openai' ? 'OpenAI' : 'Google AI'} interviewer is ready for continuous conversation using advanced speech recognition and natural language processing.
                      {conversationalMode ? ' The interview will flow naturally with intelligent turn-taking!' : ' Use the microphone button to respond.'}
                    </p>
                    <div className="flex items-center space-x-4 text-xs">
                      <span className="flex items-center">
                        <CheckCircle className="w-3 h-3 mr-1 text-green-600" />
                        {agentProvider === 'openai' ? 'GPT-4' : 'Gemini AI'}
                      </span>
                      <span className="flex items-center">
                        <CheckCircle className="w-3 h-3 mr-1 text-green-600" />
                        {agentProvider === 'openai' ? 'Whisper STT' : 'Speech-to-Text'}
                      </span>
                      <span className="flex items-center">
                        <CheckCircle className="w-3 h-3 mr-1 text-green-600" />
                        {agentProvider === 'openai' ? 'OpenAI TTS' : 'Text-to-Speech'}
                      </span>
                    </div>
                    {voiceSession?.agentError && (
                      <p className="text-xs mt-2">
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
                      getProviderIcon(selectedProvider)
                    )}
                    <span className="ml-2">
                      {startTime ? 'Resume' : 'Start'} {selectedProvider === 'openai' ? 'OpenAI' : 'Google AI'} Interview
                    </span>
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
                    <div className={`flex items-center text-sm ${getProviderColor(agentProvider).split(' ')[0]}`}>
                      {getProviderIcon(agentProvider)}
                      <span className="ml-1">{agentProvider === 'openai' ? 'OpenAI' : 'Google AI'} Speaking</span>
                      <div className={`w-2 h-2 rounded-full animate-pulse ml-2 ${getProviderColor(agentProvider).split(' ')[1].replace('bg-', 'bg-').replace('100', '600')}`}></div>
                    </div>
                  )}
                  {conversationalMode && !isAISpeaking && userSpeaking && (
                    <div className="flex items-center text-green-600 text-sm">
                      <User className="w-4 h-4 mr-1" />
                      <span>You're Speaking</span>
                      <div className="w-2 h-2 bg-green-600 rounded-full animate-pulse ml-2"></div>
                    </div>
                  )}
                  {conversationalMode && !isAISpeaking && !userSpeaking && (
                    <div className="flex items-center text-blue-600 text-sm">
                      <Mic className="w-4 h-4 mr-1" />
                      <span>AI Listening</span>
                      <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse ml-2"></div>
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
                    <MessageCircle className={`w-5 h-5 mr-2 ${getProviderColor(agentProvider).split(' ')[0]}`} />
                    Live {agentProvider === 'openai' ? 'OpenAI' : 'Google AI'} Conversation
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
                            ? `${getProviderColor(agentProvider).replace('text-', 'bg-').replace('600', '100')} ${getProviderColor(agentProvider).replace('bg-', 'text-').replace('100', '900')} border-l-4 ${getProviderColor(agentProvider).replace('text-', 'border-').replace('600', '500')}` 
                            : 'bg-green-100 text-green-900 border-r-4 border-green-500'
                        }`}>
                          <div className="flex items-center mb-2">
                            {message.speaker === 'ai' ? (
                              getProviderIcon(agentProvider)
                            ) : (
                              <User className="w-4 h-4 mr-2" />
                            )}
                            <span className="text-xs font-medium">
                              {message.speaker === 'ai' ? `${agentProvider === 'openai' ? 'OpenAI' : 'Google AI'} Interviewer` : 'You'}
                            </span>
                            {message.type && (
                              <span className={`ml-2 text-xs px-2 py-1 rounded-full ${
                                message.type === 'question' ? `${getProviderColor(agentProvider).replace('text-', 'bg-').replace('600', '200')} ${getProviderColor(agentProvider).replace('bg-', 'text-').replace('100', '800')}` :
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
                            <span className="text-xs font-medium">You (speaking...)</span>
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
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center mr-4 ${getProviderColor(agentProvider || selectedProvider).replace('text-', 'bg-').replace('600', '500')}`}>
                      {getProviderIcon(agentProvider || selectedProvider)}
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">
                        {(agentProvider || selectedProvider) === 'openai' ? 'OpenAI' : 'Google AI'} Voice Interviewer
                      </h3>
                      <p className="text-sm text-gray-600">
                        Real-time voice conversation powered by {(agentProvider || selectedProvider) === 'openai' ? 'OpenAI' : 'Google Cloud AI'}
                      </p>
                    </div>
                  </div>

                  <div className={`rounded-xl p-6 min-h-[200px] ${getProviderColor(agentProvider || selectedProvider).replace('text-', 'bg-').replace('600', '50')}`}>
                    {isThinking ? (
                      <div className="flex items-center justify-center h-full">
                        <Loader className={`w-6 h-6 animate-spin mr-3 ${getProviderColor(agentProvider || selectedProvider).split(' ')[0]}`} />
                        <span className="text-gray-600">
                          {(agentProvider || selectedProvider) === 'openai' ? 'OpenAI' : 'Google AI'} is processing your response...
                        </span>
                      </div>
                    ) : currentQuestion ? (
                      <div>
                        <p className="text-lg text-gray-800 leading-relaxed mb-4">{currentQuestion}</p>
                        {isInterviewActive && connectionStatus === 'connected' && (
                          <div className={`flex items-center text-sm ${getProviderColor(agentProvider || selectedProvider).split(' ')[0]}`}>
                            <div className={`w-2 h-2 rounded-full animate-pulse mr-2 ${getProviderColor(agentProvider || selectedProvider).split(' ')[1].replace('bg-', 'bg-').replace('100', '600')}`}></div>
                            {(agentProvider || selectedProvider) === 'openai' ? 'OpenAI' : 'Google AI'} voice interview active - speak your response
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="flex items-center justify-center h-full text-gray-500">
                        {getProviderIcon(selectedProvider)}
                        <span className="ml-3">Click "Start {selectedProvider === 'openai' ? 'OpenAI' : 'Google AI'} Interview" to begin</span>
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
                    <span className={`ml-2 text-sm ${getProviderColor(agentProvider).split(' ')[0]}`}>
                      ({agentProvider === 'openai' ? 'OpenAI' : 'Google AI'} Managed)
                    </span>
                  )}
                </h3>
                
                <div className="space-y-4">
                  {/* Live Transcript */}
                  <div className="bg-gray-50 rounded-xl p-4 min-h-[120px]">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-700">
                        Live Transcript ({(agentProvider || selectedProvider) === 'openai' ? 'OpenAI Whisper' : 'Google Speech-to-Text'})
                      </span>
                      <div className="flex items-center space-x-2">
                        {conversationalMode && (
                          <div className={`flex items-center text-sm ${getProviderColor(agentProvider).split(' ')[0]}`}>
                            {getProviderIcon(agentProvider)}
                            <span className="ml-1">AI Managed</span>
                          </div>
                        )}
                        {isAISpeaking && (
                          <div className={`flex items-center text-sm ${getProviderColor(agentProvider).split(' ')[0]}`}>
                            <Bot className="w-4 h-4 mr-1" />
                            AI Speaking
                          </div>
                        )}
                        {!isAISpeaking && !conversationalMode && isInterviewActive && (
                          <div className="flex items-center text-sm text-gray-500">
                            <Mic className="w-4 h-4 mr-1" />
                            Ready
                          </div>
                        )}
                      </div>
                    </div>
                    <p className="text-gray-800">
                      {transcript || (conversationalMode 
                        ? `${agentProvider === 'openai' ? 'OpenAI' : 'Google AI'} is managing the conversation flow. Your speech will be processed automatically...` 
                        : `Your speech will appear here in real-time using ${(agentProvider || selectedProvider) === 'openai' ? 'OpenAI Whisper' : 'Google Speech-to-Text'}...`)}
                    </p>
                  </div>

                  {/* Audio Level Indicator */}
                  {localAudioTrack && (
                    <div className="flex items-center space-x-3">
                      <Volume2 className="w-5 h-5 text-gray-600" />
                      <div className="flex-1 bg-gray-200 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full transition-all duration-100 ${
                            (agentProvider || selectedProvider) === 'openai' 
                              ? 'bg-gradient-to-r from-green-400 to-green-600' 
                              : 'bg-gradient-to-r from-purple-400 to-purple-600'
                          }`}
                          style={{ width: `${audioLevel}%` }}
                        />
                      </div>
                      <span className="text-sm text-gray-600">{Math.round(audioLevel)}%</span>
                    </div>
                  )}

                  {/* Voice Controls */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="text-sm text-gray-600">
                        {conversationalMode 
                          ? `${agentProvider === 'openai' ? 'OpenAI' : 'Google AI'} is managing the conversation flow automatically`
                          : 'Manual voice control mode'
                        }
                      </div>
                    </div>

                    {conversationalMode && (
                      <div className={`text-sm font-medium ${getProviderColor(agentProvider).split(' ')[0]}`}>
                        Powered by {agentProvider === 'openai' ? 'OpenAI' : 'Google Cloud AI'}
                      </div>
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
                  placeholder={`Jot down key points, thoughts, or reminders during the ${agentProvider === 'openai' ? 'OpenAI' : 'Google AI'} voice interview...`}
                  className="w-full h-48 px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none transition-colors"
                />
                
                <div className="mt-4 text-xs text-gray-500">
                  Your notes will be saved and available in the analytics section.
                </div>
              </div>

              {/* Connection & Status Info */}
              <div className="bg-white rounded-2xl shadow-lg p-6">
                <h4 className="font-medium text-gray-900 mb-4">
                  {agentProvider === 'openai' ? 'OpenAI' : 'Google AI'} Status
                </h4>
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
                    <span className="text-gray-700">Remote Audio:</span>
                    <span className={`flex items-center ${remoteAudioTracks.length > 0 ? 'text-green-600' : 'text-gray-600'}`}>
                      {remoteAudioTracks.length > 0 ? <CheckCircle className="w-4 h-4 mr-1" /> : <XCircle className="w-4 h-4 mr-1" />}
                      {remoteAudioTracks.length} tracks
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-700">AI Agent:</span>
                    <span className={`flex items-center ${aiAgentEnabled ? getProviderColor(agentProvider).split(' ')[0] : 'text-gray-600'}`}>
                      {aiAgentEnabled ? getProviderIcon(agentProvider) : <XCircle className="w-4 h-4 mr-1" />}
                      <span className="ml-1">{aiAgentEnabled ? 'Active' : 'Disabled'}</span>
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
                    <span className="text-gray-700">Provider:</span>
                    <span className={`font-medium ${getProviderColor(agentProvider || selectedProvider).split(' ')[0]}`}>
                      {(agentProvider || selectedProvider) === 'openai' ? 'OpenAI' : 'Google Cloud AI'}
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
                      <div><strong>AI Provider:</strong> {(agentProvider || selectedProvider) === 'openai' ? 'OpenAI' : 'Google Cloud'}</div>
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