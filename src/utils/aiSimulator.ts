import { InterviewConfig, Question, AnalyticsData, InterviewResponse } from '../types';
import { questionBank } from '../data/questions';

export class AIInterviewSimulator {
  private config: InterviewConfig;
  private currentQuestions: Question[];
  private currentQuestionIndex: number;
  private startTime: number;
  private responses: InterviewResponse[];

  constructor(config: InterviewConfig) {
    this.config = config;
    this.currentQuestions = this.generateQuestions();
    this.currentQuestionIndex = 0;
    this.startTime = Date.now();
    this.responses = [];
  }

  private generateQuestions(): Question[] {
    const questions = questionBank[this.config.style][this.config.experienceLevel] || [];
    // Shuffle and take first 3-5 questions based on duration
    const numQuestions = Math.min(
      Math.max(3, Math.floor(this.config.duration / 15)),
      questions.length
    );
    
    return questions
      .sort(() => Math.random() - 0.5)
      .slice(0, numQuestions)
      .map((q, index) => ({
        ...q,
        text: this.customizeQuestion(q.text)
      }));
  }

  private customizeQuestion(question: string): string {
    if (this.config.companyName && Math.random() > 0.5) {
      // 50% chance to customize with company name
      const companyVariations = [
        `At ${this.config.companyName}, ${question.toLowerCase()}`,
        `${question} Specifically in the context of ${this.config.companyName}.`,
        `Considering ${this.config.companyName}'s business model, ${question.toLowerCase()}`
      ];
      return companyVariations[Math.floor(Math.random() * companyVariations.length)];
    }
    return question;
  }

  getCurrentQuestion(): Question | null {
    if (this.currentQuestionIndex >= this.currentQuestions.length) {
      return null;
    }
    return this.currentQuestions[this.currentQuestionIndex];
  }

  submitResponse(response: string): void {
    const currentQuestion = this.getCurrentQuestion();
    if (!currentQuestion) return;

    const responseData: InterviewResponse = {
      questionId: currentQuestion.id,
      question: currentQuestion.text,
      response,
      timestamp: Date.now(),
      duration: Date.now() - this.startTime
    };

    this.responses.push(responseData);
    this.currentQuestionIndex++;
  }

  getNextQuestion(): string | null {
    const question = this.getCurrentQuestion();
    if (!question) return null;

    // Generate contextual follow-up or next question
    const responses = [
      question.text,
      "That's interesting. " + question.text,
      "I see. Let me ask you this: " + question.text,
      "Good point. Building on that, " + question.text.toLowerCase()
    ];

    return responses[Math.floor(Math.random() * responses.length)];
  }

  getFollowUpQuestion(previousResponse: string): string | null {
    const currentQuestion = this.getCurrentQuestion();
    if (!currentQuestion?.followUp) return null;

    const followUps = currentQuestion.followUp;
    return followUps[Math.floor(Math.random() * followUps.length)];
  }

  isInterviewComplete(): boolean {
    return this.currentQuestionIndex >= this.currentQuestions.length;
  }

  getProgress(): { current: number; total: number; percentage: number } {
    const total = this.currentQuestions.length;
    const current = Math.min(this.currentQuestionIndex + 1, total);
    const percentage = (current / total) * 100;
    
    return { current, total, percentage };
  }

  generateAnalytics(): AnalyticsData {
    const totalResponses = this.responses.length;
    
    // Simulate AI analysis with realistic scoring
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
    // Simulate clarity scoring based on response length and structure
    const avgLength = this.responses.reduce((sum, r) => sum + r.response.length, 0) / this.responses.length;
    const clarityScore = Math.min(95, Math.max(60, 70 + (avgLength / 50)));
    return Math.round(clarityScore);
  }

  private calculateStructureScore(): number {
    // Check for structured responses (keywords like "first", "second", "because", etc.)
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
    if (this.config.style !== 'technical') return 75; // Default for non-technical

    // Simulate technical accuracy based on response content
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
    // Based on response completeness and engagement
    const avgResponseLength = this.responses.reduce((sum, r) => sum + r.response.length, 0) / this.responses.length;
    const communicationScore = Math.min(95, Math.max(55, 65 + (avgResponseLength / 40)));
    return Math.round(communicationScore);
  }

  private calculateConfidenceScore(): number {
    // Simulate confidence based on response length and certainty indicators
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
    
    // Add experience-level specific strengths
    if (this.config.experienceLevel === 'senior' || this.config.experienceLevel === 'lead-manager') {
      strengths.push("Demonstrates leadership potential");
    }
    
    if (this.config.style === 'behavioral') {
      strengths.push("Good use of specific examples and situations");
    }

    return strengths.length > 0 ? strengths : ["Shows enthusiasm and willingness to learn"];
  }

  private generateImprovements(analysis: any): string[] {
    const improvements = [];
    
    if (analysis.clarity < 70) improvements.push("Work on articulating thoughts more clearly and concisely");
    if (analysis.structure < 70) improvements.push("Structure responses using frameworks like STAR method");
    if (analysis.technical < 70) improvements.push("Strengthen technical knowledge in core areas");
    if (analysis.communication < 70) improvements.push("Practice active listening and more engaging responses");
    if (analysis.confidence < 70) improvements.push("Build confidence through more practice and preparation");
    
    // Add style-specific improvements
    if (this.config.style === 'behavioral') {
      improvements.push("Include more specific examples with quantifiable results");
    }
    
    if (this.config.style === 'technical') {
      improvements.push("Consider edge cases and scalability in technical solutions");
    }

    return improvements.length > 0 ? improvements : ["Continue practicing interview scenarios"];
  }

  private generateQuestionReviews() {
    return this.responses.map((response, index) => {
      const question = this.currentQuestions[index];
      const score = Math.round(60 + Math.random() * 35); // Random score between 60-95
      
      const feedbacks = [
        "Good response with relevant examples. Consider adding more specific details.",
        "Well-structured answer. Could benefit from mentioning potential challenges.",
        "Solid technical understanding shown. Try to explain concepts more simply.",
        "Great use of specific examples. Consider discussing lessons learned.",
        "Clear communication demonstrated. Could explore alternative approaches.",
        "Good problem-solving approach. Think about scalability considerations.",
        "Nice personal insight shared. Could strengthen with metrics or outcomes."
      ];

      return {
        questionId: question.id,
        question: question.text,
        response: response.response,
        score,
        feedback: feedbacks[Math.floor(Math.random() * feedbacks.length)]
      };
    });
  }
}