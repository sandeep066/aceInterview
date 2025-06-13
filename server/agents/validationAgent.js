import { BaseAgent } from './baseAgent.js';

/**
 * Validation Agent
 * Validates generated questions for topic relevance, quality, and appropriateness
 */
export class ValidationAgent extends BaseAgent {
  constructor(llmService) {
    const systemPrompt = `You are a Validation Agent that ensures interview questions meet quality standards.

Your role is to:
1. Validate topic relevance of generated questions
2. Check appropriateness for experience level and interview style
3. Ensure question quality and clarity
4. Identify potential issues or improvements
5. Provide validation scores and recommendations

Always respond with a JSON object containing:
{
  "validation": {
    "isValid": boolean,
    "topicRelevance": number (0-100),
    "difficultyMatch": number (0-100),
    "clarity": number (0-100),
    "overallScore": number (0-100)
  },
  "issues": ["issue1", "issue2", ...],
  "suggestions": ["suggestion1", "suggestion2", ...],
  "decision": "approve|reject|revise",
  "reasoning": "detailed explanation of the validation decision"
}

Be thorough and critical in your validation to ensure only high-quality questions pass.`;

    super('ValidationAgent', llmService, systemPrompt);
  }

  preparePrompt(input, context) {
    const { question, questionSpec, topicAnalysis, config } = input;

    return `Validate this interview question against the specifications and requirements:

GENERATED QUESTION:
"${question}"

ORIGINAL SPECIFICATIONS:
${JSON.stringify(questionSpec, null, 2)}

TOPIC ANALYSIS:
${JSON.stringify(topicAnalysis?.analysis, null, 2)}

INTERVIEW CONTEXT:
- Topic: ${config.topic}
- Style: ${config.style}
- Experience Level: ${config.experienceLevel}
- Company: ${config.companyName || 'General'}

VALIDATION CRITERIA:
1. Topic Relevance: Does the question directly relate to "${config.topic}"?
2. Difficulty Match: Is it appropriate for ${config.experienceLevel} level?
3. Style Alignment: Does it fit the ${config.style} interview style?
4. Clarity: Is the question clear and unambiguous?
5. Specificity: Is it specific enough to generate meaningful responses?
6. Keyword Relevance: Does it include relevant keywords: ${topicAnalysis?.analysis?.relevanceKeywords?.join(', ')}

Provide a thorough validation with specific scores and actionable feedback.`;
  }

  processResponse(response, input, context) {
    try {
      const validation = JSON.parse(response);
      
      // Validate response structure
      if (!validation.validation || typeof validation.validation.isValid !== 'boolean') {
        throw new Error('Invalid validation structure');
      }
      
      // Ensure scores are within valid range
      const scores = validation.validation;
      const scoreFields = ['topicRelevance', 'difficultyMatch', 'clarity', 'overallScore'];
      
      for (const field of scoreFields) {
        if (typeof scores[field] !== 'number' || scores[field] < 0 || scores[field] > 100) {
          scores[field] = 50; // Default to neutral score
        }
      }
      
      // Calculate overall score if not provided or invalid
      if (!scores.overallScore || scores.overallScore === 50) {
        scores.overallScore = Math.round(
          (scores.topicRelevance + scores.difficultyMatch + scores.clarity) / 3
        );
      }
      
      return {
        success: true,
        validation: validation.validation,
        issues: validation.issues || [],
        suggestions: validation.suggestions || [],
        decision: validation.decision || (scores.overallScore >= 70 ? 'approve' : 'revise'),
        reasoning: validation.reasoning || 'Validation completed',
        metadata: {
          validatedAt: new Date().toISOString(),
          question: input.question
        }
      };
    } catch (error) {
      console.error('Failed to parse validation result:', error);
      
      // Perform basic validation as fallback
      return this.performBasicValidation(input);
    }
  }

  performBasicValidation(input) {
    const { question, config, topicAnalysis } = input;
    
    // Basic topic relevance check
    const topicKeywords = topicAnalysis?.analysis?.relevanceKeywords || [];
    const questionLower = question.toLowerCase();
    const topicLower = config.topic.toLowerCase();
    
    let topicRelevance = 50;
    
    // Check if question contains topic name
    if (questionLower.includes(topicLower)) {
      topicRelevance += 30;
    }
    
    // Check for relevant keywords
    const keywordMatches = topicKeywords.filter(keyword => 
      questionLower.includes(keyword.toLowerCase())
    ).length;
    
    if (keywordMatches > 0) {
      topicRelevance += Math.min(20, keywordMatches * 10);
    }
    
    // Basic quality checks
    const clarity = question.length > 20 && question.includes('?') ? 80 : 60;
    const difficultyMatch = 75; // Default assumption
    
    const overallScore = Math.round((topicRelevance + clarity + difficultyMatch) / 3);
    
    const issues = [];
    const suggestions = [];
    
    if (topicRelevance < 70) {
      issues.push('Low topic relevance');
      suggestions.push(`Include more specific references to ${config.topic}`);
    }
    
    if (question.length < 30) {
      issues.push('Question may be too brief');
      suggestions.push('Add more context or specificity to the question');
    }
    
    return {
      success: false,
      validation: {
        isValid: overallScore >= 70,
        topicRelevance,
        difficultyMatch,
        clarity,
        overallScore
      },
      issues,
      suggestions,
      decision: overallScore >= 70 ? 'approve' : 'revise',
      reasoning: 'Basic validation performed due to parsing error',
      metadata: {
        validatedAt: new Date().toISOString(),
        question,
        fallback: true
      }
    };
  }
}