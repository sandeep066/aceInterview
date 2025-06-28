import { APIService, toPythonInterviewConfig } from './apiService';
import { InterviewConfig } from '../types/index';

export interface VoiceInterviewSession {
  sessionId: string;
  roomName: string;
  wsUrl: string;
  participantToken: string;
  firstQuestion?: string;
  config: InterviewConfig;
  aiAgentEnabled?: boolean;
  conversationalMode?: boolean;
  agentProvider?: string;
}

export interface VoiceResponseResult {
  responseProcessed: boolean;
  analysis?: any;
  nextQuestion?: {
    question: string;
    questionNumber: number;
    totalQuestions: number;
  };
  isComplete: boolean;
  progress: {
    current: number;
    total: number;
    percentage: number;
  };
}

export interface SessionStatus {
  found: boolean;
  sessionId?: string;
  status?: string;
  progress?: {
    current: number;
    total: number;
    percentage: number;
  };
  duration?: number;
  questionsAsked?: number;
  responsesGiven?: number;
}

export class VoiceInterviewService {
  private static readonly API_BASE = '/voice-interview';

  /**
   * Start a new voice interview session with provider selection
   */
  static async startVoiceInterview(
    config: InterviewConfig, 
    participantName: string,
    enableAIAgent: boolean = true,
    agentProvider: 'openai' | 'google' = 'google'
  ): Promise<VoiceInterviewSession> {
    try {
      // No case conversion here; APIService handles it
      const response = await APIService.post(`${this.API_BASE}/start`, {
        config,
        participantName,
        enableAIAgent,
        agentProvider
      });
      // Just return the response as-is (APIService returns camelCase)
      return response;
    } catch (error) {
      console.error('Error starting voice interview:', error);
      throw new Error('Failed to start voice interview. Please try again.');
    }
  }

  /**
   * Process voice response from participant
   */
  static async processVoiceResponse(
    sessionId: string,
    transcription: string,
    audioMetadata?: any
  ): Promise<VoiceResponseResult> {
    try {
      const response = await APIService.post(`${this.API_BASE}/${sessionId}/response`, {
        transcription,
        audioMetadata
      });
      return response.data;
    } catch (error) {
      console.error('Error processing voice response:', error);
      throw new Error('Failed to process voice response.');
    }
  }

  /**
   * Generate follow-up question
   */
  static async generateFollowUp(
    sessionId: string,
    responseText: string
  ): Promise<{ followUp: string; questionNumber: number; isFollowUp: boolean }> {
    try {
      const response = await APIService.post(`${this.API_BASE}/${sessionId}/followup`, {
        responseText
      });
      return response.data;
    } catch (error) {
      console.error('Error generating follow-up:', error);
      throw new Error('Failed to generate follow-up question.');
    }
  }

  /**
   * Pause interview session
   */
  static async pauseInterview(sessionId: string): Promise<{ paused: boolean; sessionId: string }> {
    try {
      const response = await APIService.post(`${this.API_BASE}/${sessionId}/pause`);
      return response.data;
    } catch (error) {
      console.error('Error pausing interview:', error);
      throw new Error('Failed to pause interview.');
    }
  }

  /**
   * Resume interview session
   */
  static async resumeInterview(sessionId: string): Promise<{ resumed: boolean; sessionId: string }> {
    try {
      const response = await APIService.post(`${this.API_BASE}/${sessionId}/resume`);
      return response.data;
    } catch (error) {
      console.error('Error resuming interview:', error);
      throw new Error('Failed to resume interview.');
    }
  }

  /**
   * End interview session
   */
  static async endInterview(sessionId: string): Promise<any> {
    try {
      const response = await APIService.post(`${this.API_BASE}/${sessionId}/end`);
      return response.data;
    } catch (error) {
      console.error('Error ending interview:', error);
      throw new Error('Failed to end interview.');
    }
  }

  /**
   * Get session status
   */
  static async getSessionStatus(sessionId: string): Promise<SessionStatus> {
    try {
      const response = await APIService.get(`${this.API_BASE}/${sessionId}/status`);
      return response.data;
    } catch (error) {
      console.error('Error getting session status:', error);
      throw new Error('Failed to get session status.');
    }
  }

  /**
   * Reconnect to existing session
   */
  static async reconnectToSession(
    sessionId: string,
    participantName: string
  ): Promise<VoiceInterviewSession> {
    try {
      const response = await APIService.post(`${this.API_BASE}/${sessionId}/reconnect`, {
        participantName
      });
      return response.data;
    } catch (error) {
      console.error('Error reconnecting to session:', error);
      throw new Error('Failed to reconnect to session.');
    }
  }

  /**
   * Check if LiveKit is configured
   */
  static async checkLiveKitConfig(): Promise<{ configured: boolean; wsUrl?: string; aiAgent?: any; timestamp?: string }> {
    try {
      console.log('LiveKit config Origin URL:', import.meta.env.VITE_API_URL);
      const response = await APIService.get(`${import.meta.env.VITE_API_URL}/livekit/config`);
      // The APIService.get() returns the data directly, not { data: ... }
      if (!response) {
        console.warn('LiveKit config: response is undefined');
        return { configured: false };
      }
      console.log('LiveKit Response data:', response.configured);
      return response;
    } catch (error) {
      console.error('Error checking LiveKit config:', error);
      return { configured: false };
    }
  }

  /**
   * Get AI agent status
   */
  static async getAIAgentStatus(): Promise<any> {
    try {
      const response = await APIService.get('/ai-agent/status');
      return response.data;
    } catch (error) {
      console.error('Error getting AI agent status:', error);
      return { service: { enabled: false }, activeAgents: [] };
    }
  }

  /**
   * Switch AI agent provider
   */
  static async switchAIAgentProvider(provider: 'openai' | 'google'): Promise<any> {
    try {
      const response = await APIService.post('/ai-agent/switch-provider', {
        provider
      });
      return response.data;
    } catch (error) {
      console.error('Error switching AI agent provider:', error);
      throw new Error('Failed to switch AI agent provider.');
    }
  }

  /**
   * Get active sessions (admin)
   */
  static async getActiveSessions(): Promise<any[]> {
    try {
      const response = await APIService.get(`${this.API_BASE}/sessions/active`);
      return response.data.sessions;
    } catch (error) {
      console.error('Error getting active sessions:', error);
      throw new Error('Failed to get active sessions.');
    }
  }
}