import { ResponseAnalysisAgent } from './responseAnalysisAgent.js';
import { OverallAnalysisAgent } from './overallAnalysisAgent.js';

/**
 * Performance Analysis Orchestrator
 * Coordinates the multi-agent workflow for comprehensive interview performance analysis
 */
export class PerformanceAnalysisOrchestrator {
  constructor(llmService) {
    this.llmService = llmService;
    
    // Initialize analysis agents
    this.responseAnalysisAgent = new ResponseAnalysisAgent(llmService);
    this.overallAnalysisAgent = new OverallAnalysisAgent(llmService);
    
    // Analysis cache for performance
    this.analysisCache = new Map();
    
    console.log('Performance Analysis Orchestrator initialized with specialized agents');
  }

  /**
   * Generate comprehensive interview performance analytics
   */
  async generateComprehensiveAnalytics({ responses, config }) {
    const sessionId = this.getSessionId(config, responses);
    
    try {
      console.log(`[PerformanceOrchestrator] Starting comprehensive analysis for session ${sessionId}`);
      
      // Step 1: Analyze each individual response
      const responseAnalyses = await this.analyzeIndividualResponses(responses, config);
      
      // Step 2: Generate overall performance analysis
      const overallAnalysis = await this.generateOverallAnalysis(responseAnalyses, config, responses);
      
      // Step 3: Synthesize final analytics
      const finalAnalytics = this.synthesizeFinalAnalytics(responseAnalyses, overallAnalysis, config);
      
      // Cache the results
      this.analysisCache.set(sessionId, finalAnalytics);
      
      console.log(`[PerformanceOrchestrator] Successfully generated comprehensive analytics for session ${sessionId}`);
      
      return finalAnalytics;
      
    } catch (error) {
      console.error(`[PerformanceOrchestrator] Error in comprehensive analysis:`, error);
      
      // Fallback to basic analysis
      return this.generateFallbackAnalytics(responses, config);
    }
  }

  /**
   * Analyze each individual response using the Response Analysis Agent
   */
  async analyzeIndividualResponses(responses, config) {
    console.log('[PerformanceOrchestrator] Analyzing individual responses');
    
    const responseAnalyses = [];
    
    for (let i = 0; i < responses.length; i++) {
      const response = responses[i];
      
      try {
        console.log(`[PerformanceOrchestrator] Analyzing response ${i + 1}/${responses.length}`);
        
        const analysisResult = await this.responseAnalysisAgent.execute({
          question: response.question,
          response: response.response,
          config,
          questionNumber: i + 1
        });
        
        responseAnalyses.push({
          questionId: response.questionId,
          question: response.question,
          response: response.response,
          timestamp: response.timestamp,
          analysis: analysisResult.analysis,
          metadata: analysisResult.metadata
        });
        
      } catch (error) {
        console.error(`[PerformanceOrchestrator] Error analyzing response ${i + 1}:`, error);
        
        // Add fallback analysis for this response
        responseAnalyses.push({
          questionId: response.questionId,
          question: response.question,
          response: response.response,
          timestamp: response.timestamp,
          analysis: this.generateFallbackResponseAnalysis(response, config),
          metadata: { fallback: true, analyzedAt: new Date().toISOString() }
        });
      }
    }
    
    console.log(`[PerformanceOrchestrator] Completed analysis of ${responseAnalyses.length} responses`);
    return responseAnalyses;
  }

  /**
   * Generate overall performance analysis using the Overall Analysis Agent
   */
  async generateOverallAnalysis(responseAnalyses, config, responses) {
    console.log('[PerformanceOrchestrator] Generating overall performance analysis');
    
    try {
      const sessionMetadata = {
        totalQuestions: responses.length,
        totalDuration: responses.length > 0 ? responses[responses.length - 1].timestamp - responses[0].timestamp : 0,
        averageResponseTime: responses.reduce((sum, r) => sum + (r.duration || 0), 0) / responses.length,
        interviewStyle: config.style,
        experienceLevel: config.experienceLevel
      };
      
      const overallResult = await this.overallAnalysisAgent.execute({
        responseAnalyses,
        config,
        sessionMetadata
      });
      
      return overallResult.analysis;
      
    } catch (error) {
      console.error('[PerformanceOrchestrator] Error in overall analysis:', error);
      
      // Generate fallback overall analysis
      return this.generateFallbackOverallAnalysis(responseAnalyses, config);
    }
  }

  /**
   * Synthesize final analytics from individual and overall analyses
   */
  synthesizeFinalAnalytics(responseAnalyses, overallAnalysis, config) {
    console.log('[PerformanceOrchestrator] Synthesizing final analytics');
    
    // Create question reviews from individual analyses
    const questionReviews = responseAnalyses.map(analysis => ({
      questionId: analysis.questionId,
      question: analysis.question,
      response: analysis.response,
      score: analysis.analysis.score,
      feedback: analysis.analysis.feedback,
      strengths: analysis.analysis.strengths,
      improvements: analysis.analysis.improvements,
      detailedScores: analysis.analysis.responseAnalysis
    }));
    
    // Combine everything into final analytics
    return {
      overallScore: overallAnalysis.overallScore,
      performanceLevel: overallAnalysis.performanceLevel,
      strengths: overallAnalysis.strengths,
      improvements: overallAnalysis.improvements,
      responseAnalysis: overallAnalysis.responseAnalysis,
      trends: overallAnalysis.trends,
      recommendations: overallAnalysis.recommendations,
      executiveSummary: overallAnalysis.executiveSummary,
      nextSteps: overallAnalysis.nextSteps,
      questionReviews,
      metadata: {
        generatedAt: new Date().toISOString(),
        analysisMethod: 'agentic',
        agentsUsed: ['ResponseAnalysis', 'OverallAnalysis'],
        totalResponses: responseAnalyses.length,
        config
      }
    };
  }

  /**
   * Generate fallback response analysis
   */
  generateFallbackResponseAnalysis(response, config) {
    const responseLength = response.response.length;
    
    return {
      responseAnalysis: {
        clarity: Math.min(95, Math.max(60, 70 + (responseLength / 50))),
        structure: response.response.includes('.') ? 75 : 65,
        technical: config.style === 'technical' ? 70 : 75,
        communication: Math.min(90, Math.max(60, 65 + (responseLength / 40))),
        confidence: response.response.toLowerCase().includes('i think') ? 65 : 75,
        relevance: 75
      },
      strengths: ["Shows understanding of the topic"],
      improvements: ["Add more specific examples"],
      feedback: "Good response with relevant content. Consider adding more specific examples.",
      score: 75,
      keyInsights: ["Response demonstrates understanding"],
      reasoning: "Fallback analysis based on response characteristics"
    };
  }

  /**
   * Generate fallback overall analysis
   */
  generateFallbackOverallAnalysis(responseAnalyses, config) {
    const avgScore = responseAnalyses.reduce((sum, r) => sum + (r.analysis.score || 70), 0) / responseAnalyses.length;
    
    return {
      overallScore: Math.round(avgScore),
      performanceLevel: avgScore >= 80 ? 'good' : avgScore >= 60 ? 'fair' : 'needs_improvement',
      strengths: ["Shows understanding of core concepts"],
      improvements: ["Provide more specific examples"],
      responseAnalysis: {
        clarity: Math.round(avgScore),
        structure: Math.round(avgScore - 5),
        technical: Math.round(avgScore),
        communication: Math.round(avgScore),
        confidence: Math.round(avgScore - 10)
      },
      trends: {
        improvement: "consistent",
        consistency: "medium",
        adaptability: "medium"
      },
      recommendations: ["Practice structured responses"],
      executiveSummary: `Candidate demonstrated fair performance with room for improvement in ${config.topic}.`,
      nextSteps: ["Practice mock interviews"]
    };
  }

  /**
   * Generate session ID for caching
   */
  getSessionId(config, responses) {
    const timestamp = responses.length > 0 ? responses[0].timestamp : Date.now();
    return `${config.topic}_${config.style}_${timestamp}`.replace(/\s+/g, '_').toLowerCase();
  }

  /**
   * Generate fallback analytics (simplified version)
   */
  generateFallbackAnalytics(responses, config) {
    console.log('[PerformanceOrchestrator] Generating fallback analytics');
    
    const questionReviews = responses.map((response, index) => ({
      questionId: response.questionId,
      question: response.question,
      response: response.response,
      score: 70 + Math.random() * 25,
      feedback: "Good response with room for improvement."
    }));
    
    return {
      overallScore: 75,
      strengths: ["Clear communication", "Good technical understanding"],
      improvements: ["Add more specific examples", "Structure responses better"],
      responseAnalysis: {
        clarity: 75,
        structure: 70,
        technical: 80,
        communication: 75,
        confidence: 70
      },
      questionReviews,
      metadata: {
        generatedAt: new Date().toISOString(),
        analysisMethod: 'fallback',
        totalResponses: responses.length
      }
    };
  }

  /**
   * Get analysis statistics
   */
  getAnalysisStats() {
    return {
      cachedAnalyses: this.analysisCache.size,
      agentsEnabled: ['ResponseAnalysis', 'OverallAnalysis'],
      analysisMethod: 'agentic'
    };
  }

  /**
   * Clear analysis cache
   */
  clearCache() {
    this.analysisCache.clear();
  }
}