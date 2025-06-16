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

CRITICAL: Always respond with ONLY a valid JSON object. Do NOT use markdown code blocks, backticks, or any other formatting. Return raw JSON only.

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
- Specific, actionable next steps for improvement

Remember: Return ONLY the JSON object without any markdown formatting or code blocks.`;
  }

  /**
   * Comprehensive LLM response cleaning with multiple strategies
   */
  cleanLLMResponse(response) {
    let cleaned = response.trim();
    
    console.log(`[OverallAnalysisAgent] Original response length: ${cleaned.length}`);
    console.log(`[OverallAnalysisAgent] Response starts with: "${cleaned.substring(0, 100)}..."`);
    
    // Strategy 1: Remove markdown code block delimiters
    if (cleaned.startsWith('```json')) {
      cleaned = cleaned.substring(7);
      console.log('[OverallAnalysisAgent] Removed leading ```json delimiter');
    } else if (cleaned.startsWith('```')) {
      cleaned = cleaned.substring(3);
      console.log('[OverallAnalysisAgent] Removed leading ``` delimiter');
    }
    
    if (cleaned.endsWith('```')) {
      cleaned = cleaned.substring(0, cleaned.length - 3);
      console.log('[OverallAnalysisAgent] Removed trailing ``` delimiter');
    }
    
    // Strategy 2: Remove any remaining backticks at the start or end
    cleaned = cleaned.replace(/^`+|`+$/g, '');
    
    // Strategy 3: Remove any leading/trailing quotes that might wrap the entire JSON
    if ((cleaned.startsWith('"') && cleaned.endsWith('"')) || 
        (cleaned.startsWith("'") && cleaned.endsWith("'"))) {
      cleaned = cleaned.slice(1, -1);
      console.log('[OverallAnalysisAgent] Removed wrapping quotes');
    }
    
    // Strategy 4: Trim whitespace and newlines
    cleaned = cleaned.trim();
    
    console.log(`[OverallAnalysisAgent] Cleaned response length: ${cleaned.length}`);
    console.log(`[OverallAnalysisAgent] Cleaned response starts with: "${cleaned.substring(0, 100)}..."`);
    
    return cleaned;
  }

  /**
   * Extract JSON from text using multiple advanced strategies
   */
  extractJSONFromText(text) {
    console.log('[OverallAnalysisAgent] Attempting JSON extraction with multiple strategies');
    
    // Strategy 1: Look for complete JSON object (most common)
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      console.log('[OverallAnalysisAgent] Strategy 1: Found complete JSON object');
      return jsonMatch[0];
    }
    
    // Strategy 2: Look for JSON between markdown code blocks
    const markerMatch = text.match(/```json\s*(\{[\s\S]*?\})\s*```/);
    if (markerMatch) {
      console.log('[OverallAnalysisAgent] Strategy 2: Found JSON between markdown blocks');
      return markerMatch[1];
    }
    
    // Strategy 3: Look for JSON after "json" keyword
    const afterJsonMatch = text.match(/json\s*(\{[\s\S]*\})/i);
    if (afterJsonMatch) {
      console.log('[OverallAnalysisAgent] Strategy 3: Found JSON after "json" keyword');
      return afterJsonMatch[1];
    }
    
    // Strategy 4: Look for JSON between any backticks
    const backtickMatch = text.match(/```[\s\S]*?(\{[\s\S]*?\})[\s\S]*?```/);
    if (backtickMatch) {
      console.log('[OverallAnalysisAgent] Strategy 4: Found JSON between backticks');
      return backtickMatch[1];
    }
    
    // Strategy 5: Look for the largest JSON-like structure
    const allBraces = text.match(/\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}/g);
    if (allBraces && allBraces.length > 0) {
      // Return the longest match (most likely to be complete)
      const longest = allBraces.reduce((a, b) => a.length > b.length ? a : b);
      console.log('[OverallAnalysisAgent] Strategy 5: Found longest JSON-like structure');
      return longest;
    }
    
    console.log('[OverallAnalysisAgent] All extraction strategies failed');
    return null;
  }

  processResponse(response, input, context) {
    console.log('[OverallAnalysisAgent] Starting response processing');
    
    try {
      // Step 1: Clean the response
      let cleanedResponse = this.cleanLLMResponse(response);
      
      // Step 2: Try to parse the cleaned response directly
      let result;
      try {
        result = JSON.parse(cleanedResponse);
        console.log('[OverallAnalysisAgent] ✅ Successfully parsed cleaned response directly');
      } catch (parseError) {
        console.log('[OverallAnalysisAgent] ❌ Direct parsing failed, attempting JSON extraction');
        console.log('[OverallAnalysisAgent] Parse error:', parseError.message);
        
        // Step 3: Try to extract JSON from the original response
        const extractedJSON = this.extractJSONFromText(response);
        if (extractedJSON) {
          console.log(`[OverallAnalysisAgent] Extracted JSON, length: ${extractedJSON.length}`);
          try {
            result = JSON.parse(extractedJSON);
            console.log('[OverallAnalysisAgent] ✅ Successfully parsed extracted JSON');
          } catch (extractParseError) {
            console.log('[OverallAnalysisAgent] ❌ Extracted JSON also failed to parse');
            throw new Error(`JSON extraction parse failed: ${extractParseError.message}`);
          }
        } else {
          throw new Error('No valid JSON found in response using any extraction strategy');
        }
      }
      
      // Step 4: Validate and normalize the result
      console.log('[OverallAnalysisAgent] Validating parsed result structure');
      
      if (!result || typeof result !== 'object') {
        throw new Error('Parsed result is not a valid object');
      }
      
      if (!result.overallScore && !result.responseAnalysis) {
        throw new Error('Invalid overall analysis structure - missing required fields (overallScore and responseAnalysis)');
      }
      
      // Ensure overallScore exists and is valid
      if (typeof result.overallScore !== 'number' || result.overallScore < 0 || result.overallScore > 100) {
        console.log(`[OverallAnalysisAgent] Invalid overallScore: ${result.overallScore}, calculating from response analysis`);
        if (result.responseAnalysis && typeof result.responseAnalysis === 'object') {
          const scores = Object.values(result.responseAnalysis).filter(score => typeof score === 'number');
          result.overallScore = scores.length > 0 ? Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length) : 70;
        } else {
          result.overallScore = 70; // Default fallback
        }
      }
      
      // Ensure responseAnalysis exists and is valid
      if (!result.responseAnalysis || typeof result.responseAnalysis !== 'object') {
        console.log('[OverallAnalysisAgent] Missing or invalid responseAnalysis, creating default');
        result.responseAnalysis = {};
      }
      
      // Validate and normalize response analysis scores
      const scoreFields = ['clarity', 'structure', 'technical', 'communication', 'confidence'];
      const scores = result.responseAnalysis;
      
      for (const field of scoreFields) {
        if (typeof scores[field] !== 'number' || scores[field] < 0 || scores[field] > 100) {
          console.log(`[OverallAnalysisAgent] Normalizing invalid score for ${field}: ${scores[field]} -> 70`);
          scores[field] = 70; // Default to neutral score
        }
      }
      
      // Determine performance level if not provided or invalid
      const validLevels = ['excellent', 'good', 'fair', 'needs_improvement'];
      if (!result.performanceLevel || !validLevels.includes(result.performanceLevel)) {
        if (result.overallScore >= 85) result.performanceLevel = 'excellent';
        else if (result.overallScore >= 70) result.performanceLevel = 'good';
        else if (result.overallScore >= 60) result.performanceLevel = 'fair';
        else result.performanceLevel = 'needs_improvement';
        console.log(`[OverallAnalysisAgent] Set performance level to: ${result.performanceLevel}`);
      }
      
      // Ensure required arrays exist
      if (!Array.isArray(result.strengths)) {
        console.log('[OverallAnalysisAgent] Creating default strengths array');
        result.strengths = ['Shows understanding of core concepts'];
      }
      if (!Array.isArray(result.improvements)) {
        console.log('[OverallAnalysisAgent] Creating default improvements array');
        result.improvements = ['Provide more specific examples'];
      }
      if (!Array.isArray(result.recommendations)) {
        console.log('[OverallAnalysisAgent] Creating default recommendations array');
        result.recommendations = ['Practice structured responses'];
      }
      if (!Array.isArray(result.nextSteps)) {
        console.log('[OverallAnalysisAgent] Creating default nextSteps array');
        result.nextSteps = ['Continue practicing interview scenarios'];
      }
      
      // Ensure trends object exists
      if (!result.trends || typeof result.trends !== 'object') {
        console.log('[OverallAnalysisAgent] Creating default trends object');
        result.trends = {
          improvement: 'consistent',
          consistency: 'medium',
          adaptability: 'medium'
        };
      }
      
      // Ensure executiveSummary exists
      if (!result.executiveSummary || typeof result.executiveSummary !== 'string') {
        console.log('[OverallAnalysisAgent] Creating default executive summary');
        result.executiveSummary = `The candidate demonstrated ${result.performanceLevel} performance with an overall score of ${result.overallScore}%. They show understanding of the core concepts but could benefit from continued practice and improvement.`;
      }
      
      console.log(`[OverallAnalysisAgent] ✅ Successfully processed analysis with overall score: ${result.overallScore}`);
      
      return {
        success: true,
        analysis: result,
        metadata: {
          analyzedAt: new Date().toISOString(),
          totalResponses: input.responseAnalyses.length,
          averageResponseLength: input.responseAnalyses.reduce((sum, r) => sum + r.response.length, 0) / input.responseAnalyses.length,
          processingMethod: 'cleaned_and_validated',
          validationApplied: true
        }
      };
      
    } catch (error) {
      console.error('[OverallAnalysisAgent] ❌ All parsing attempts failed:', error);
      console.error('[OverallAnalysisAgent] Error details:', error.message);
      console.error('[OverallAnalysisAgent] Raw response preview (first 500 chars):', response.substring(0, 500));
      console.error('[OverallAnalysisAgent] Raw response preview (last 200 chars):', response.substring(Math.max(0, response.length - 200)));
      
      // Generate fallback analysis
      console.log('[OverallAnalysisAgent] 🔄 Using fallback analysis due to parsing failure');
      return {
        success: false,
        analysis: this.generateFallbackAnalysis(input),
        metadata: {
          analyzedAt: new Date().toISOString(),
          totalResponses: input.responseAnalyses.length,
          fallback: true,
          parseError: error.message,
          originalResponseLength: response.length,
          processingMethod: 'fallback',
          rawResponsePreview: response.substring(0, 200)
        }
      };
    }
  }

  generateFallbackAnalysis(input) {
    const { responseAnalyses, config } = input;
    
    console.log('[OverallAnalysisAgent] Generating comprehensive fallback analysis');
    
    // Calculate averages from individual analyses
    const avgScores = {
      clarity: 0,
      structure: 0,
      technical: 0,
      communication: 0,
      confidence: 0
    };
    
    let totalScore = 0;
    const allStrengths = [];
    const allImprovements = [];
    
    responseAnalyses.forEach(analysis => {
      const scores = analysis.analysis.responseAnalysis;
      Object.keys(avgScores).forEach(key => {
        avgScores[key] += scores[key] || 70;
      });
      totalScore += analysis.analysis.score || 70;
      
      // Collect strengths and improvements
      if (analysis.analysis.strengths) {
        allStrengths.push(...analysis.analysis.strengths);
      }
      if (analysis.analysis.improvements) {
        allImprovements.push(...analysis.analysis.improvements);
      }
    });
    
    Object.keys(avgScores).forEach(key => {
      avgScores[key] = Math.round(avgScores[key] / responseAnalyses.length);
    });
    
    const overallScore = Math.round(totalScore / responseAnalyses.length);
    
    let performanceLevel = 'fair';
    if (overallScore >= 85) performanceLevel = 'excellent';
    else if (overallScore >= 70) performanceLevel = 'good';
    else if (overallScore < 60) performanceLevel = 'needs_improvement';
    
    // Deduplicate and select top strengths/improvements
    const uniqueStrengths = [...new Set(allStrengths)].slice(0, 3);
    const uniqueImprovements = [...new Set(allImprovements)].slice(0, 3);
    
    console.log(`[OverallAnalysisAgent] Fallback analysis generated with overall score: ${overallScore}`);
    
    return {
      overallScore,
      performanceLevel,
      strengths: uniqueStrengths.length > 0 ? uniqueStrengths : [
        "Shows understanding of core concepts", 
        "Demonstrates relevant experience",
        "Communicates ideas clearly"
      ],
      improvements: uniqueImprovements.length > 0 ? uniqueImprovements : [
        "Provide more specific examples", 
        "Structure responses more clearly",
        "Practice confident delivery"
      ],
      responseAnalysis: avgScores,
      trends: {
        improvement: "consistent",
        consistency: "medium",
        adaptability: "medium"
      },
      recommendations: [
        "Practice structuring responses using frameworks like STAR method",
        "Prepare specific examples for common question types",
        "Work on confident delivery and clear communication",
        `Focus on improving ${config.topic} knowledge depth`
      ],
      executiveSummary: `The candidate demonstrated ${performanceLevel} performance with an overall score of ${overallScore}%. They show solid understanding of ${config.topic} concepts but could benefit from more structured responses and specific examples. The analysis shows ${responseAnalyses.length} responses with consistent performance across different question types.`,
      nextSteps: [
        "Practice mock interviews focusing on response structure",
        "Prepare a portfolio of specific examples for different scenarios",
        "Work on confident delivery and clear articulation",
        `Deepen knowledge in ${config.topic} through additional study and practice`
      ]
    };
  }
}