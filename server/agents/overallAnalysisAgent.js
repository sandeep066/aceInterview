import { BaseAgent } from './baseAgent.js';

/**
 * Overall Analysis Agent
 * Synthesizes individual response analyses into comprehensive interview performance insights
 */
export class OverallAnalysisAgent extends BaseAgent {
  constructor(llmService) {
    const systemPrompt = `You are an Overall Analysis Agent that synthesizes interview performance data.

Your role is to:
1. Analyze patterns across all interview responses
2. Identify overall strengths and improvement areas
3. Calculate comprehensive performance metrics
4. Provide strategic recommendations for improvement
5. Generate executive summary of interview performance

Always respond with a JSON object containing:
{
  "overallScore": number (0-100),
  "performanceLevel": "excellent|good|fair|needs_improvement",
  "strengths": ["overall strength 1", "overall strength 2"],
  "improvements": ["strategic improvement 1", "strategic improvement 2"],
  "responseAnalysis": {
    "clarity": number (0-100),
    "structure": number (0-100),
    "technical": number (0-100),
    "communication": number (0-100),
    "confidence": number (0-100)
  },
  "trends": {
    "improvement": "improving|declining|consistent",
    "consistency": "high|medium|low",
    "adaptability": "high|medium|low"
  },
  "recommendations": ["recommendation 1", "recommendation 2"],
  "executiveSummary": "comprehensive summary paragraph",
  "nextSteps": ["next step 1", "next step 2"]
}

Provide strategic, actionable insights for interview improvement.`;

    super('OverallAnalysisAgent', llmService, systemPrompt);
  }

  preparePrompt(input, context) {
    const { responseAnalyses, config, sessionMetadata } = input;

    const analysisData = responseAnalyses.map((analysis, index) => ({
      questionNumber: index + 1,
      question: analysis.question,
      response: analysis.response,
      scores: analysis.analysis.responseAnalysis,
      overallScore: analysis.analysis.score,
      strengths: analysis.analysis.strengths,
      improvements: analysis.analysis.improvements
    }));

    return `Analyze the overall interview performance based on individual response analyses:

INTERVIEW CONTEXT:
- Topic: ${config.topic}
- Style: ${config.style}
- Experience Level: ${config.experienceLevel}
- Company: ${config.companyName || 'General'}
- Duration: ${config.duration} minutes
- Total Questions: ${responseAnalyses.length}

INDIVIDUAL RESPONSE ANALYSES:
${JSON.stringify(analysisData, null, 2)}

SESSION METADATA:
${JSON.stringify(sessionMetadata, null, 2)}

ANALYSIS REQUIREMENTS:
1. Calculate overall performance metrics across all responses
2. Identify patterns and trends in performance
3. Synthesize strengths that appear consistently
4. Identify improvement areas that need attention
5. Provide strategic recommendations for future interviews
6. Generate an executive summary of the candidate's performance

Focus on:
- Performance consistency across questions
- Improvement or decline trends during the interview
- Adaptability to different question types
- Overall readiness for the target role
- Specific, actionable next steps for improvement`;
  }

  processResponse(response, input, context) {
    try {
      const result = JSON.parse(response);
      
      // Validate response structure
      if (!result.overallScore || !result.responseAnalysis) {
        throw new Error('Invalid overall analysis structure');
      }
      
      // Ensure scores are within valid range
      const scores = result.responseAnalysis;
      const scoreFields = ['clarity', 'structure', 'technical', 'communication', 'confidence'];
      
      for (const field of scoreFields) {
        if (typeof scores[field] !== 'number' || scores[field] < 0 || scores[field] > 100) {
          scores[field] = 70; // Default to neutral score
        }
      }
      
      // Validate overall score
      if (typeof result.overallScore !== 'number' || result.overallScore < 0 || result.overallScore > 100) {
        result.overallScore = Math.round(Object.values(scores).reduce((sum, score) => sum + score, 0) / scoreFields.length);
      }
      
      // Determine performance level if not provided
      if (!result.performanceLevel) {
        if (result.overallScore >= 85) result.performanceLevel = 'excellent';
        else if (result.overallScore >= 70) result.performanceLevel = 'good';
        else if (result.overallScore >= 60) result.performanceLevel = 'fair';
        else result.performanceLevel = 'needs_improvement';
      }
      
      return {
        success: true,
        analysis: result,
        metadata: {
          analyzedAt: new Date().toISOString(),
          totalResponses: input.responseAnalyses.length,
          averageResponseLength: input.responseAnalyses.reduce((sum, r) => sum + r.response.length, 0) / input.responseAnalyses.length
        }
      };
    } catch (error) {
      console.error('Failed to parse overall analysis:', error);
      
      // Generate fallback analysis
      return {
        success: false,
        analysis: this.generateFallbackAnalysis(input),
        metadata: {
          analyzedAt: new Date().toISOString(),
          totalResponses: input.responseAnalyses.length,
          fallback: true
        }
      };
    }
  }

  generateFallbackAnalysis(input) {
    const { responseAnalyses, config } = input;
    
    // Calculate averages from individual analyses
    const avgScores = {
      clarity: 0,
      structure: 0,
      technical: 0,
      communication: 0,
      confidence: 0
    };
    
    let totalScore = 0;
    
    responseAnalyses.forEach(analysis => {
      const scores = analysis.analysis.responseAnalysis;
      Object.keys(avgScores).forEach(key => {
        avgScores[key] += scores[key] || 70;
      });
      totalScore += analysis.analysis.score || 70;
    });
    
    Object.keys(avgScores).forEach(key => {
      avgScores[key] = Math.round(avgScores[key] / responseAnalyses.length);
    });
    
    const overallScore = Math.round(totalScore / responseAnalyses.length);
    
    let performanceLevel = 'fair';
    if (overallScore >= 85) performanceLevel = 'excellent';
    else if (overallScore >= 70) performanceLevel = 'good';
    else if (overallScore < 60) performanceLevel = 'needs_improvement';
    
    return {
      overallScore,
      performanceLevel,
      strengths: ["Shows understanding of core concepts", "Demonstrates relevant experience"],
      improvements: ["Provide more specific examples", "Structure responses more clearly"],
      responseAnalysis: avgScores,
      trends: {
        improvement: "consistent",
        consistency: "medium",
        adaptability: "medium"
      },
      recommendations: [
        "Practice structuring responses using frameworks like STAR method",
        "Prepare specific examples for common question types",
        "Work on confident delivery and clear communication"
      ],
      executiveSummary: `The candidate demonstrated ${performanceLevel} performance with an overall score of ${overallScore}%. They show solid understanding of ${config.topic} concepts but could benefit from more structured responses and specific examples.`,
      nextSteps: [
        "Practice mock interviews focusing on response structure",
        "Prepare a portfolio of specific examples for different scenarios",
        "Work on confident delivery and clear articulation"
      ]
    };
  }
}