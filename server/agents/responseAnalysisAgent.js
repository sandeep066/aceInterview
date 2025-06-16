import { BaseAgent } from './baseAgent.js';

/**
 * Response Analysis Agent
 * Analyzes individual interview responses for quality, structure, and content
 */
export class ResponseAnalysisAgent extends BaseAgent {
  constructor(llmService) {
    const systemPrompt = `You are a Response Analysis Agent specialized in evaluating interview responses.

Your role is to:
1. Analyze response quality, clarity, and structure
2. Evaluate technical accuracy and depth
3. Assess communication effectiveness
4. Identify strengths and areas for improvement
5. Provide specific, actionable feedback

CRITICAL: Always respond with ONLY a valid JSON object. Do NOT use markdown code blocks, backticks, or any other formatting. Return raw JSON only.

Always respond with a JSON object containing:
{
  "responseAnalysis": {
    "clarity": number (0-100),
    "structure": number (0-100),
    "technical": number (0-100),
    "communication": number (0-100),
    "confidence": number (0-100),
    "relevance": number (0-100)
  },
  "strengths": ["specific strength 1", "specific strength 2"],
  "improvements": ["specific improvement 1", "specific improvement 2"],
  "feedback": "detailed feedback paragraph",
  "score": number (0-100),
  "keyInsights": ["insight 1", "insight 2"],
  "reasoning": "explanation of the analysis"
}

Be specific and constructive in your analysis.`;

    super('ResponseAnalysisAgent', llmService, systemPrompt);
  }

  preparePrompt(input, context) {
    const { question, response, config, questionNumber } = input;

    return `Analyze this interview response in detail:

QUESTION: "${question}"

RESPONSE: "${response}"

INTERVIEW CONTEXT:
- Topic: ${config.topic}
- Style: ${config.style}
- Experience Level: ${config.experienceLevel}
- Question Number: ${questionNumber}
- Company: ${config.companyName || 'General'}

ANALYSIS REQUIREMENTS:
1. Clarity: How clear and understandable is the response?
2. Structure: Is the response well-organized and logical?
3. Technical: How accurate and deep is the technical content?
4. Communication: How effective is the communication style?
5. Confidence: How confident and decisive does the candidate sound?
6. Relevance: How well does the response address the question?

Provide specific examples from the response to support your analysis. Focus on actionable feedback that will help the candidate improve.

Remember: Return ONLY the JSON object without any markdown formatting or code blocks.`;
  }

  processResponse(response, input, context) {
    try {
      // Clean the response to remove markdown code block delimiters
      let cleanedResponse = response.trim();
      
      console.log(`[ResponseAnalysisAgent] Original response length: ${cleanedResponse.length}`);
      
      // Remove leading ```json or ``` and trailing ```
      let cleaningApplied = false;
      
      if (cleanedResponse.startsWith('```json')) {
        cleanedResponse = cleanedResponse.substring(7);
        cleaningApplied = true;
        console.log('[ResponseAnalysisAgent] Removed leading ```json delimiter');
      } else if (cleanedResponse.startsWith('```')) {
        cleanedResponse = cleanedResponse.substring(3);
        cleaningApplied = true;
        console.log('[ResponseAnalysisAgent] Removed leading ``` delimiter');
      }
      
      if (cleanedResponse.endsWith('```')) {
        cleanedResponse = cleanedResponse.substring(0, cleanedResponse.length - 3);
        cleaningApplied = true;
        console.log('[ResponseAnalysisAgent] Removed trailing ``` delimiter');
      }
      
      // Trim any remaining whitespace
      cleanedResponse = cleanedResponse.trim();
      
      console.log(`[ResponseAnalysisAgent] Cleaned response length: ${cleanedResponse.length}`);
      console.log(`[ResponseAnalysisAgent] Cleaning applied: ${cleaningApplied}`);
      
      const result = JSON.parse(cleanedResponse);
      
      // Validate response structure
      if (!result.responseAnalysis || !result.score) {
        throw new Error('Invalid analysis structure');
      }
      
      // Ensure scores are within valid range
      const scores = result.responseAnalysis;
      const scoreFields = ['clarity', 'structure', 'technical', 'communication', 'confidence', 'relevance'];
      
      for (const field of scoreFields) {
        if (typeof scores[field] !== 'number' || scores[field] < 0 || scores[field] > 100) {
          scores[field] = 70; // Default to neutral score
        }
      }
      
      // Validate overall score
      if (typeof result.score !== 'number' || result.score < 0 || result.score > 100) {
        result.score = Math.round(Object.values(scores).reduce((sum, score) => sum + score, 0) / scoreFields.length);
      }
      
      console.log(`[ResponseAnalysisAgent] Successfully parsed response analysis with score: ${result.score}`);
      
      return {
        success: true,
        analysis: result,
        metadata: {
          analyzedAt: new Date().toISOString(),
          question: input.question,
          responseLength: input.response.length,
          cleaningApplied
        }
      };
    } catch (error) {
      console.error('[ResponseAnalysisAgent] Failed to parse response analysis:', error);
      console.error('[ResponseAnalysisAgent] Raw response preview:', response.substring(0, 200) + '...');
      
      // Try to extract JSON from the response if it's embedded in text
      try {
        console.log('[ResponseAnalysisAgent] Attempting to extract JSON from response...');
        
        const jsonMatch = response.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const extractedJson = jsonMatch[0];
          console.log(`[ResponseAnalysisAgent] Found potential JSON, length: ${extractedJson.length}`);
          
          const result = JSON.parse(extractedJson);
          
          // Apply same validation as above
          if (result.responseAnalysis && result.score) {
            console.log('[ResponseAnalysisAgent] Successfully extracted and parsed JSON from response');
            
            // Ensure scores are within valid range
            const scores = result.responseAnalysis;
            const scoreFields = ['clarity', 'structure', 'technical', 'communication', 'confidence', 'relevance'];
            
            for (const field of scoreFields) {
              if (typeof scores[field] !== 'number' || scores[field] < 0 || scores[field] > 100) {
                scores[field] = 70;
              }
            }
            
            if (typeof result.score !== 'number' || result.score < 0 || result.score > 100) {
              result.score = Math.round(Object.values(scores).reduce((sum, score) => sum + score, 0) / scoreFields.length);
            }
            
            return {
              success: true,
              analysis: result,
              metadata: {
                analyzedAt: new Date().toISOString(),
                question: input.question,
                responseLength: input.response.length,
                extractedFromText: true
              }
            };
          }
        }
      } catch (extractError) {
        console.error('[ResponseAnalysisAgent] JSON extraction also failed:', extractError);
      }
      
      // Generate fallback analysis
      console.log('[ResponseAnalysisAgent] Using fallback analysis');
      return {
        success: false,
        analysis: this.generateFallbackAnalysis(input),
        metadata: {
          analyzedAt: new Date().toISOString(),
          question: input.question,
          responseLength: input.response.length,
          fallback: true,
          parseError: error.message
        }
      };
    }
  }

  generateFallbackAnalysis(input) {
    const { response, config } = input;
    const responseLength = response.length;
    
    console.log('[ResponseAnalysisAgent] Generating fallback analysis');
    
    // Basic scoring based on response characteristics
    const clarity = Math.min(95, Math.max(60, 70 + (responseLength / 50)));
    const structure = response.includes('.') && responseLength > 50 ? 75 : 65;
    const technical = config.style === 'technical' ? 70 : 75;
    const communication = Math.min(90, Math.max(60, 65 + (responseLength / 40)));
    const confidence = response.toLowerCase().includes('i think') ? 65 : 75;
    const relevance = 75;
    
    const overallScore = Math.round((clarity + structure + technical + communication + confidence + relevance) / 6);
    
    return {
      responseAnalysis: {
        clarity: Math.round(clarity),
        structure: Math.round(structure),
        technical: Math.round(technical),
        communication: Math.round(communication),
        confidence: Math.round(confidence),
        relevance: Math.round(relevance)
      },
      strengths: ["Shows understanding of the topic", "Provides relevant information"],
      improvements: ["Add more specific examples", "Structure response more clearly"],
      feedback: "Good response with relevant content. Consider adding more specific examples and structuring your answer more clearly.",
      score: overallScore,
      keyInsights: ["Response demonstrates basic understanding", "Could benefit from more detailed examples"],
      reasoning: "Fallback analysis based on response characteristics"
    };
  }
}