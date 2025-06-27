export interface AnalyticsMetadata {
  generatedAt: string;
  analysisMethod: string;
  totalResponses: number;
  wasEndedEarly: boolean;
  completionRate: number;
  maxQuestionsCalculated: number;
  [key: string]: any;
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
    // ...add more if needed
  };
  questionReviews: Array<{
    questionId: string;
    question: string;
    response: string;
    score: number;
    feedback: string;
  }>;
  metadata: AnalyticsMetadata;
}