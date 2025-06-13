import { InterviewConfig, Question, AnalyticsData, InterviewResponse } from '../types';
import { APIService } from '../services/apiService';

export class AIInterviewSimulator {
  private config: InterviewConfig;
  private currentQuestionIndex: number;
  private startTime: number;
  private responses: InterviewResponse[];
  private generatedQuestions: string[];
  private isUsingLLM: boolean;

  constructor(config: InterviewConfig) {
    this.config = config;
    this.currentQuestionIndex = 0;
    this.startTime = Date.now();
    this.responses = [];
    this.generatedQuestions = [];
    this.isUsingLLM = true;
  }

  async getNextQuestion(): Promise<string | null> {
    try {
      // Check if we've reached the maximum questions based on duration
      const maxQuestions = Math.min(
        Math.max(3, Math.floor(this.config.duration / 15)),
        8
      );

      if (this.currentQuestionIndex >= maxQuestions) {
        return null;
      }

      if (this.isUsingLLM) {
        console.log('🤖 Requesting question from agentic framework...');
        const startTime = Date.now();
        
        const question = await APIService.generateQuestion({
          config: this.config,
          previousQuestions: this.generatedQuestions,
          previousResponses: this.responses,
          questionNumber: this.currentQuestionIndex + 1
        });

        const duration = Date.now() - startTime;
        console.log(`✅ Agentic question received in ${duration}ms`);

        this.generatedQuestions.push(question);
        return question;
      } else {
        // Fallback to predefined questions
        return this.getFallbackQuestion();
      }
    } catch (error) {
      console.error('❌ Error getting next question from agentic framework:', error);
      console.log('🔄 Falling back to predefined questions');
      // Fallback to predefined questions if LLM fails
      this.isUsingLLM = false;
      return this.getFallbackQuestion();
    }
  }

  private getFallbackQuestion(): string | null {
    const fallbackQuestions = {
      technical: [
        "Explain the difference between synchronous and asynchronous programming.",
        "How would you optimize the performance of a web application?",
        "Describe your approach to debugging a complex issue.",
        "What are the key principles of good software design?",
        "How do you ensure code quality in your projects?"
      ],
      hr: [
        "Tell me about yourself and your career goals.",
        "Why are you interested in this position?",
        "How do you handle working under pressure?",
        "What motivates you in your work?",
        "Where do you see yourself in 5 years?"
      ],
      behavioral: [
        "Tell me about a challenging project you worked on.",
        "Describe a time when you had to work with a difficult team member.",
        "Give me an example of when you had to learn something new quickly.",
        "Tell me about a time you failed and how you handled it.",
        "Describe a situation where you had to make a difficult decision."
      ],
      'salary-negotiation': [
        "What are your salary expectations for this role?",
        "How do you evaluate the total compensation package?",
        "What factors are most important to you besides salary?",
        "How flexible are you with your compensation requirements?",
        "What would make you accept an offer below your expectations?"
      ],
      'case-study': [
        "How would you approach designing a system for handling high traffic?",
        "Walk me through how you would solve a performance issue.",
        "Describe your process for making technical decisions.",
        "How would you handle a critical production incident?",
        "What's your approach to evaluating new technologies?"
      ]
    };

    const questions = fallbackQuestions[this.config.style] || fallbackQuestions.technical;
    
    if (this.currentQuestionIndex >= questions.length) {
      return null;
    }

    console.log(`📝 Using fallback question ${this.currentQuestionIndex + 1}`);
    return questions[this.currentQuestionIndex];
  }

  async submitResponse(response: string): Promise<void> {
    const currentQuestion = this.generatedQuestions[this.currentQuestionIndex] || 
                           this.getFallbackQuestion();
    
    if (!currentQuestion) return;

    const responseData: InterviewResponse = {
      questionId: `q${this.currentQuestionIndex + 1}`,
      question: currentQuestion,
      response,
      timestamp: Date.now(),
      duration: Date.now() - this.startTime
    };

    this.responses.push(responseData);
    this.currentQuestionIndex++;

    // Optionally analyze the response in real-time
    if (this.isUsingLLM) {
      try {
        await APIService.analyzeResponse({
          question: currentQuestion,
          response,
          config: this.config
        });
      } catch (error) {
        console.error('Error analyzing response:', error);
      }
    }
  }

  async generateFollowUp(previousResponse: string): Promise<string | null> {
    if (!this.isUsingLLM) return null;

    try {
      const currentQuestion = this.generatedQuestions[this.currentQuestionIndex - 1];
      if (!currentQuestion) return null;

      return await APIService.generateFollowUp({
        question: currentQuestion,
        response: previousResponse,
        config: this.config
      });
    } catch (error) {
      console.error('Error generating follow-up:', error);
      return null;
    }
  }

  isInterviewComplete(): boolean {
    const maxQuestions = Math.min(
      Math.max(3, Math.floor(this.config.duration / 15)),
      8
    );
    return this.currentQuestionIndex >= maxQuestions;
  }

  getProgress(): { current: number; total: number; percentage: number } {
    const maxQuestions = Math.min(
      Math.max(3, Math.floor(this.config.duration / 15)),
      8
    );
    const current = Math.min(this.currentQuestionIndex + 1, maxQuestions);
    const percentage = (current / maxQuestions) * 100;
    
    return { current, total: maxQuestions, percentage };
  }

  async generateAnalytics(): Promise<AnalyticsData> {
    if (this.isUsingLLM && this.responses.length > 0) {
      try {
        return await APIService.generateAnalytics({
          responses: this.responses,
          config: this.config
        });
      } catch (error) {
        console.error('Error generating LLM analytics:', error);
      }
    }

    // Fallback analytics
    return this.generateFallbackAnalytics();
  }

  private generateFallbackAnalytics(): AnalyticsData {
    const totalResponses = this.responses.length;
    
    const responseAnalysis = {
      clarity: this.calculateClarityScore(),
      structure: this.calculateStructureScore(),
      technical: this.calculateTechnicalScore(),
      communication: this.calculateCommunicationScore(),
      confidence: this.calculateConfidenceScore()
    };

    const overallScore = Math.round(
      Object.values(responseAnalysis).reduce((sum, score) => sum + score, 0) / 5
    );

    const strengths = this.generateStrengths(responseAnalysis);
    const improvements = this.generateImprovements(responseAnalysis);
    const questionReviews = this.generateQuestionReviews();

    return {
      overallScore,
      strengths,
      improvements,
      responseAnalysis,
      questionReviews
    };
  }

  private calculateClarityScore(): number {
    const avgLength = this.responses.reduce((sum, r) => sum + r.response.length, 0) / this.responses.length;
    const clarityScore = Math.min(95, Math.max(60, 70 + (avgLength / 50)));
    return Math.round(clarityScore);
  }

  private calculateStructureScore(): number {
    const structureKeywords = ['first', 'second', 'third', 'because', 'therefore', 'however', 'additionally'];
    let structuredResponses = 0;

    this.responses.forEach(response => {
      const hasStructure = structureKeywords.some(keyword => 
        response.response.toLowerCase().includes(keyword)
      );
      if (hasStructure) structuredResponses++;
    });

    const structureScore = Math.round(65 + (structuredResponses / this.responses.length) * 30);
    return Math.min(95, structureScore);
  }

  private calculateTechnicalScore(): number {
    if (this.config.style !== 'technical') return 75;

    const technicalKeywords = ['function', 'variable', 'class', 'method', 'algorithm', 'data structure', 'performance', 'optimization'];
    let technicalResponses = 0;

    this.responses.forEach(response => {
      const hasTechnical = technicalKeywords.some(keyword => 
        response.response.toLowerCase().includes(keyword)
      );
      if (hasTechnical) technicalResponses++;
    });

    const technicalScore = Math.round(60 + (technicalResponses / this.responses.length) * 35);
    return Math.min(95, technicalScore);
  }

  private calculateCommunicationScore(): number {
    const avgResponseLength = this.responses.reduce((sum, r) => sum + r.response.length, 0) / this.responses.length;
    const communicationScore = Math.min(95, Math.max(55, 65 + (avgResponseLength / 40)));
    return Math.round(communicationScore);
  }

  private calculateConfidenceScore(): number {
    const confidenceIndicators = ['definitely', 'certainly', 'confident', 'sure', 'absolutely', 'clearly'];
    const uncertaintyIndicators = ['maybe', 'perhaps', 'might', 'not sure', 'think', 'probably'];
    
    let confidencePoints = 0;
    this.responses.forEach(response => {
      const text = response.response.toLowerCase();
      confidenceIndicators.forEach(indicator => {
        if (text.includes(indicator)) confidencePoints += 2;
      });
      uncertaintyIndicators.forEach(indicator => {
        if (text.includes(indicator)) confidencePoints -= 1;
      });
    });

    const baseScore = 70;
    const confidenceScore = Math.max(45, Math.min(95, baseScore + confidencePoints * 2));
    return Math.round(confidenceScore);
  }

  private generateStrengths(analysis: any): string[] {
    const strengths = [];
    
    if (analysis.clarity >= 80) strengths.push("Clear and articulate communication");
    if (analysis.structure >= 80) strengths.push("Well-structured responses using logical flow");
    if (analysis.technical >= 80) strengths.push("Strong technical knowledge and accuracy");
    if (analysis.communication >= 80) strengths.push("Excellent communication skills");
    if (analysis.confidence >= 80) strengths.push("Confident and decisive responses");
    
    return strengths.length > 0 ? strengths : ["Shows enthusiasm and willingness to learn"];
  }

  private generateImprovements(analysis: any): string[] {
    const improvements = [];
    
    if (analysis.clarity < 70) improvements.push("Work on articulating thoughts more clearly and concisely");
    if (analysis.structure < 70) improvements.push("Structure responses using frameworks like STAR method");
    if (analysis.technical < 70) improvements.push("Strengthen technical knowledge in core areas");
    if (analysis.communication < 70) improvements.push("Practice active listening and more engaging responses");
    if (analysis.confidence < 70) improvements.push("Build confidence through more practice and preparation");
    
    return improvements.length > 0 ? improvements : ["Continue practicing interview scenarios"];
  }

  private generateQuestionReviews() {
    return this.responses.map((response, index) => {
      const score = Math.round(60 + Math.random() * 35);
      
      const feedbacks = [
        "Good response with relevant examples. Consider adding more specific details.",
        "Well-structured answer. Could benefit from mentioning potential challenges.",
        "Solid understanding shown. Try to explain concepts more simply.",
        "Great use of specific examples. Consider discussing lessons learned.",
        "Clear communication demonstrated. Could explore alternative approaches."
      ];

      return {
        questionId: response.questionId,
        question: response.question,
        response: response.response,
        score,
        feedback: feedbacks[Math.floor(Math.random() * feedbacks.length)]
      };
    });
  }

  // Add method to check if using LLM
  isUsingAgentic(): boolean {
    return this.isUsingLLM;
  }

  // Add method to force fallback mode
  forceFallbackMode(): void {
    console.log('🔄 Forcing fallback mode');
    this.isUsingLLM = false;
  }
}