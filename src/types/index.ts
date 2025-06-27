export interface InterviewConfig {
  topic: string;
  style: InterviewStyle;
  experienceLevel: ExperienceLevel;
  companyName: string;
  duration: number;
}

export type InterviewStyle = 
  | 'technical' 
  | 'hr' 
  | 'behavioral' 
  | 'salary-negotiation' 
  | 'case-study';

export type ExperienceLevel = 
  | 'fresher' 
  | 'junior' 
  | 'mid-level' 
  | 'senior' 
  | 'lead-manager';

export interface Question {
  id: string;
  text: string;
  followUp?: string[];
  category: string;
  difficulty: 'easy' | 'medium' | 'hard';
}

export interface InterviewResponse {
  questionId: string;
  question: string;
  response: string;
  timestamp: number;
  duration: number;
}

export interface AnalyticsData {
  overallScore: number;
  strengths: string[];
  improvements: string[];
  responseAnalysis: {
    clarity: number;
    structure: number;
    technical: number;
    communication: number;
    confidence: number;
  };
  questionReviews: {
    questionId: string;
    question: string;
    response: string;
    score: number;
    feedback: string;
  }[];
  metadata: {
    generatedAt: string;
    analysisMethod: string;
    totalResponses: number;
    wasEndedEarly: boolean;
    completionRate: number;
    maxQuestionsCalculated: number;
    [key: string]: any;
  };
}

export type AppScreen = 'config' | 'interview' | 'analytics';