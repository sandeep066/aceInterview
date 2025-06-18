import { APIService } from './apiService';
import { InterviewConfig } from '../types';

export interface VoiceInterviewSession {
  sessionId: string;
  roomName: string;
  wsUrl: string;
  participantToken: string;
  firstQuestion?: string;
  config: InterviewConfig;
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
   * Start a new voice interview session
   */
  static async startVoiceInterview(
    config: InterviewConfig, 
    participantName: string
  ): Promise<VoiceInterviewSession> {
    try {
      const response = await APIService.post(`${this.API_BASE}/start`, {
        config,
        participantName
      });
      return response.data;
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
  static async checkLiveKitConfig(): Promise<{ configured: boolean; wsUrl?: string }> {
    try {
      const response = await APIService.get('/livekit/config');
      return response.data;
    } catch (error) {
      console.error('Error checking LiveKit config:', error);
      return { configured: false };
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