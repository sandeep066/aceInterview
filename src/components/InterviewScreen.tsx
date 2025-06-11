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
  WifiOff
} from 'lucide-react';
import { InterviewConfig } from '../types';
import { AIInterviewSimulator } from '../utils/aiSimulator';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition';
import { APIService } from '../services/apiService';

interface InterviewScreenProps {
  config: InterviewConfig;
  onEndInterview: (simulator: AIInterviewSimulator) => void;
  onBackToConfig: () => void;
}

export const InterviewScreen: React.FC<InterviewScreenProps> = ({
  config,
  onEndInterview,
  onBackToConfig
}) => {
  const [simulator] = useState(() => new AIInterviewSimulator(config));
  const [isInterviewActive, setIsInterviewActive] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState<string>('');
  const [textResponse, setTextResponse] = useState('');
  const [notes, setNotes] = useState('');
  const [isMuted, setIsMuted] = useState(false);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [isThinking, setIsThinking] = useState(false);
  const [isConnected, setIsConnected] = useState(true);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  
  const {
    isListening,
    transcript,
    startListening,
    stopListening,
    resetTranscript,
    isSupported: speechSupported
  } = useSpeechRecognition();

  const responseRef = useRef<HTMLTextAreaElement>(null);
  const notesRef = useRef<HTMLTextAreaElement>(null);

  // Check backend connection on mount
  useEffect(() => {
    checkBackendConnection();
  }, []);

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

  // Update text response when speech transcript changes
  useEffect(() => {
    if (transcript) {
      setTextResponse(transcript);
    }
  }, [transcript]);

  const checkBackendConnection = async () => {
    try {
      const healthy = await APIService.checkHealth();
      setIsConnected(healthy);
      if (!healthy) {
        setConnectionError('Backend service is not responding');
      } else {
        setConnectionError(null);
      }
    } catch (error) {
      setIsConnected(false);
      setConnectionError('Unable to connect to AI service');
    }
  };

  const formatTime = (ms: number): string => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const startInterview = () => {
    setIsInterviewActive(true);
    setStartTime(Date.now());
    loadNextQuestion();
  };

  const pauseInterview = () => {
    setIsInterviewActive(false);
    stopListening();
  };

  const resumeInterview = () => {
    setIsInterviewActive(true);
  };

  const endInterview = () => {
    setIsInterviewActive(false);
    stopListening();
    onEndInterview(simulator);
  };

  const loadNextQuestion = async () => {
    setIsThinking(true);
    setConnectionError(null);
    
    try {
      const question = await simulator.getNextQuestion();
      if (question) {
        setCurrentQuestion(question);
        setTextResponse('');
        resetTranscript();
      } else {
        endInterview();
      }
    } catch (error) {
      console.error('Error loading question:', error);
      setConnectionError('Failed to load next question');
      setIsConnected(false);
    }
    
    setIsThinking(false);
  };

  const submitResponse = async () => {
    if (!textResponse.trim()) return;

    stopListening();
    
    try {
      await simulator.submitResponse(textResponse.trim());
      
      if (simulator.isInterviewComplete()) {
        endInterview();
      } else {
        await loadNextQuestion();
      }
    } catch (error) {
      console.error('Error submitting response:', error);
      setConnectionError('Failed to submit response');
    }
  };

  const toggleMicrophone = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  const progress = simulator.getProgress();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50">
      <div className="container mx-auto px-4 py-6">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  {config.style.charAt(0).toUpperCase() + config.style.slice(1).replace('-', ' ')} Interview
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
                <div className="text-sm text-gray-600">
                  Duration: {config.duration} minutes
                </div>
                <div className="flex items-center mt-2">
                  {isConnected ? (
                    <div className="flex items-center text-green-600 text-sm">
                      <Wifi className="w-4 h-4 mr-1" />
                      AI Connected
                    </div>
                  ) : (
                    <div className="flex items-center text-red-600 text-sm">
                      <WifiOff className="w-4 h-4 mr-1" />
                      AI Offline
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Connection Error Alert */}
            {connectionError && (
              <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="flex items-center">
                  <WifiOff className="w-5 h-5 text-yellow-600 mr-2" />
                  <span className="text-yellow-800 text-sm">
                    {connectionError}. Using fallback questions.
                  </span>
                  <button
                    onClick={checkBackendConnection}
                    className="ml-auto text-yellow-600 hover:text-yellow-800 text-sm underline"
                  >
                    Retry Connection
                  </button>
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

            {/* Controls */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                {!isInterviewActive ? (
                  <button
                    onClick={startInterview}
                    className="inline-flex items-center px-6 py-3 bg-green-600 text-white font-semibold rounded-xl hover:bg-green-700 focus:outline-none focus:ring-4 focus:ring-green-300 transition-all"
                  >
                    <Play className="w-4 h-4 mr-2" />
                    {startTime ? 'Resume' : 'Start'} Interview
                  </button>
                ) : (
                  <button
                    onClick={pauseInterview}
                    className="inline-flex items-center px-6 py-3 bg-yellow-600 text-white font-semibold rounded-xl hover:bg-yellow-700 focus:outline-none focus:ring-4 focus:ring-yellow-300 transition-all"
                  >
                    <Pause className="w-4 h-4 mr-2" />
                    Pause
                  </button>
                )}
                
                <button
                  onClick={endInterview}
                  className="inline-flex items-center px-6 py-3 bg-red-600 text-white font-semibold rounded-xl hover:bg-red-700 focus:outline-none focus:ring-4 focus:ring-red-300 transition-all"
                >
                  <Square className="w-4 h-4 mr-2" />
                  End Interview
                </button>
              </div>

              <div className="flex items-center space-x-3">
                <button
                  onClick={() => setIsMuted(!isMuted)}
                  className={`p-3 rounded-xl transition-all ${
                    isMuted ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                </button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* AI Interviewer */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
                <div className="flex items-center mb-4">
                  <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center mr-4">
                    <MessageCircle className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">AI Interviewer</h3>
                    <p className="text-sm text-gray-600">
                      {isConnected ? 'LLM-Powered Interview Assistant' : 'Fallback Interview Assistant'}
                    </p>
                  </div>
                </div>

                <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-6 min-h-[200px]">
                  {isThinking ? (
                    <div className="flex items-center justify-center h-full">
                      <Loader className="w-6 h-6 text-blue-600 animate-spin mr-3" />
                      <span className="text-gray-600">
                        {isConnected ? 'AI is generating your next question...' : 'Preparing next question...'}
                      </span>
                    </div>
                  ) : currentQuestion ? (
                    <div>
                      <p className="text-lg text-gray-800 leading-relaxed">{currentQuestion}</p>
                      {isInterviewActive && (
                        <div className="mt-4 flex items-center text-sm text-blue-600">
                          <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse mr-2"></div>
                          Waiting for your response...
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="flex items-center justify-center h-full text-gray-500">
                      <MessageCircle className="w-8 h-8 mr-3" />
                      <span>Click "Start Interview" to begin</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Response Input */}
              <div className="bg-white rounded-2xl shadow-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Your Response</h3>
                
                <div className="space-y-4">
                  <textarea
                    ref={responseRef}
                    value={textResponse}
                    onChange={(e) => setTextResponse(e.target.value)}
                    placeholder="Type your response here or use the microphone to speak..."
                    className="w-full h-32 px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none transition-colors"
                    disabled={!isInterviewActive}
                  />

                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      {speechSupported && (
                        <button
                          onClick={toggleMicrophone}
                          disabled={!isInterviewActive}
                          className={`p-3 rounded-xl transition-all ${
                            isListening
                              ? 'bg-red-100 text-red-600 animate-pulse'
                              : 'bg-blue-100 text-blue-600 hover:bg-blue-200'
                          } disabled:opacity-50`}
                        >
                          {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                        </button>
                      )}
                      
                      {isListening && (
                        <div className="flex items-center text-sm text-red-600">
                          <div className="w-2 h-2 bg-red-600 rounded-full animate-pulse mr-2"></div>
                          Recording...
                        </div>
                      )}
                    </div>

                    <button
                      onClick={submitResponse}
                      disabled={!isInterviewActive || !textResponse.trim()}
                      className="inline-flex items-center px-6 py-3 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-300 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                    >
                      <Send className="w-4 h-4 mr-2" />
                      Submit Response
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Notes Section */}
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <div className="flex items-center mb-4">
                <FileText className="w-5 h-5 text-gray-600 mr-2" />
                <h3 className="text-lg font-semibold text-gray-900">Interview Notes</h3>
              </div>
              
              <textarea
                ref={notesRef}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Jot down key points, thoughts, or reminders during the interview..."
                className="w-full h-64 px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none transition-colors"
              />
              
              <div className="mt-4 text-xs text-gray-500">
                Your notes will be saved and available in the analytics section.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};