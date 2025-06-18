import axios from 'axios';
import { InterviewConfig, AnalyticsData, InterviewResponse } from '../types';

const API_BASE_URL = import.meta.env.VITE_API_URL;

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 120000, // Increase this value to 120 seconds (2 minutes)
  headers: {
    'Content-Type': 'application/json',
  },
});

export interface QuestionGenerationRequest {
  config: InterviewConfig;
  previousQuestions?: string[];
  previousResponses?: InterviewResponse[];
  questionNumber?: number;
}

export interface FollowUpRequest {
  question: string;
  response: string;
  config: InterviewConfig;
}

export interface ResponseAnalysisRequest {
  question: string;
  response: string;
  config: InterviewConfig;
}

export interface AnalyticsRequest {
  responses: InterviewResponse[];
  config: InterviewConfig;
}

export class APIService {
  static async generateQuestion(request: QuestionGenerationRequest): Promise<string> {
    try {
      const response = await apiClient.post('/generate-question', request);
      return response.data.question;
    } catch (error) {
      console.error('Error generating question:', error);
      throw new Error('Failed to generate question. Please try again.');
    }
  }

  static async generateFollowUp(request: FollowUpRequest): Promise<string> {
    try {
      const response = await apiClient.post('/generate-followup', request);
      return response.data.followUp;
    } catch (error) {
      console.error('Error generating follow-up:', error);
      throw new Error('Failed to generate follow-up question.');
    }
  }

  static async analyzeResponse(request: ResponseAnalysisRequest): Promise<any> {
    try {
      const response = await apiClient.post('/analyze-response', request);
      return response.data.analysis;
    } catch (error) {
      console.error('Error analyzing response:', error);
      throw new Error('Failed to analyze response.');
    }
  }

  static async generateAnalytics(request: AnalyticsRequest): Promise<AnalyticsData> {
    try {
      const response = await apiClient.post('/generate-analytics', request);
      return response.data.analytics;
    } catch (error) {
      console.error('Error generating analytics:', error);
      throw new Error('Failed to generate analytics.');
    }
  }

  static async checkHealth(): Promise<boolean> {
    try {
      const response = await apiClient.get('/health');
      return response.data.status === 'OK';
    } catch (error) {
      // Silently handle network errors for health checks
      // This is expected when backend is not running
      return false;
    }
  }

  // Generic HTTP methods for voice interview service
  static async get(url: string): Promise<any> {
    try {
      return await apiClient.get(url);
    } catch (error) {
      console.error(`GET ${url} failed:`, error);
      throw error;
    }
  }

  static async post(url: string, data?: any): Promise<any> {
    try {
      console.log(`pmr URL ${url}` );
      console.dir(`pmr DATA ${data}` );
      console.log('pmr Object', JSON.stringify(data, null, 2));
      return await apiClient.post(url, data);
      
    } catch (error) {
      console.error(`POST ${url} failed:`, error);
      throw error;
    }
  }

  static async put(url: string, data?: any): Promise<any> {
    try {
      return await apiClient.put(url, data);
    } catch (error) {
      console.error(`PUT ${url} failed:`, error);
      throw error;
    }
  }

  static async delete(url: string): Promise<any> {
    try {
      return await apiClient.delete(url);
    } catch (error) {
      console.error(`DELETE ${url} failed:`, error);
      throw error;
    }
  }
}