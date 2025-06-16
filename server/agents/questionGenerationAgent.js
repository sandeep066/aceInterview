import { BaseAgent } from './baseAgent.js';

/**
 * Question Generation Agent
 * Generates specific interview questions based on the planning specifications
 */
export class QuestionGenerationAgent extends BaseAgent {
  constructor(llmService) {
    const systemPrompt = `You are a Question Generation Agent that creates specific, high-quality interview questions.

Your role is to:
1. Generate questions based on the provided specifications
2. Ensure questions are relevant to the topic and concepts
3. Match the specified difficulty level and question type
4. Create engaging, realistic interview questions
5. Avoid generic or overly broad questions

CRITICAL: Always respond with ONLY a valid JSON object. Do NOT use markdown code blocks, backticks, or any other formatting. Return raw JSON only.

Always respond with a JSON object containing:
{
  "question": "The specific interview question text",
  "metadata": {
    "category": "string",
    "difficulty": "easy|medium|hard",
    "focusArea": "string",
    "concepts": ["concept1", "concept2"],
    "questionType": "theoretical|practical|scenario|problem-solving",
    "estimatedTime": "time in minutes",
    "followUpPotential": "high|medium|low"
  },
  "reasoning": "Why this question fits the specifications"
}

Generate questions that are:
- Specific and actionable
- Appropriate for the experience level
- Directly related to the specified concepts
- Realistic for actual interviews
- Clear and unambiguous`;

    super('QuestionGenerationAgent', llmService, systemPrompt);
  }

  preparePrompt(input, context) {
    const { questionSpec, topicAnalysis, config } = input;

    return `Generate a specific interview question based on these specifications:

QUESTION SPECIFICATIONS:
${JSON.stringify(questionSpec, null, 2)}

TOPIC ANALYSIS CONTEXT:
Main Concepts: ${topicAnalysis?.analysis?.mainConcepts?.join(', ') || 'N/A'}
Skills: ${topicAnalysis?.analysis?.skills?.join(', ') || 'N/A'}
Technologies: ${topicAnalysis?.analysis?.technologies?.join(', ') || 'N/A'}
Relevance Keywords: ${topicAnalysis?.analysis?.relevanceKeywords?.join(', ') || 'N/A'}

INTERVIEW CONTEXT:
- Topic: ${config.topic}
- Style: ${config.style}
- Experience Level: ${config.experienceLevel}
- Company: ${config.companyName || 'General'}

REQUIREMENTS:
1. Create a question that directly addresses the specified concepts: ${questionSpec.concepts?.join(', ')}
2. Match the difficulty level: ${questionSpec.difficulty}
3. Focus on: ${questionSpec.focusArea}
4. Question type: ${questionSpec.questionType}
5. Avoid these topics: ${questionSpec.avoidTopics?.join(', ') || 'None'}

The question should be:
- Specific to the topic "${config.topic}"
- Appropriate for ${config.experienceLevel} level
- Realistic for a ${config.style} interview
- Clear and actionable

Generate ONE high-quality question that meets all these criteria.

Remember: Return ONLY the JSON object without any markdown formatting or code blocks.`;
  }

  processResponse(response, input, context) {
    try {
      // Clean the response to remove markdown code block delimiters
      let cleanedResponse = response.trim();
      
      // Remove leading ```json or ``` and trailing ```
      if (cleanedResponse.startsWith('```json')) {
        cleanedResponse = cleanedResponse.substring(7);
        console.log('[QuestionGenerationAgent] Removed leading ```json delimiter');
      } else if (cleanedResponse.startsWith('```')) {
        cleanedResponse = cleanedResponse.substring(3);
        console.log('[QuestionGenerationAgent] Removed leading ``` delimiter');
      }
      
      if (cleanedResponse.endsWith('```')) {
        cleanedResponse = cleanedResponse.substring(0, cleanedResponse.length - 3);
        console.log('[QuestionGenerationAgent] Removed trailing ``` delimiter');
      }
      
      // Trim any remaining whitespace
      cleanedResponse = cleanedResponse.trim();
      
      console.log(`[QuestionGenerationAgent] Cleaned response length: ${cleanedResponse.length}`);
      
      const result = JSON.parse(cleanedResponse);
      
      // Validate response structure
      if (!result.question || typeof result.question !== 'string') {
        throw new Error('Invalid question format');
      }
      
      // Ensure question is not too short or generic
      if (result.question.length < 20) {
        throw new Error('Question too short or generic');
      }
      
      // Check if question contains topic-relevant keywords
      const topicKeywords = input.topicAnalysis?.analysis?.relevanceKeywords || [];
      const questionLower = result.question.toLowerCase();
      const hasRelevantKeywords = topicKeywords.some(keyword => 
        questionLower.includes(keyword.toLowerCase())
      );
      
      if (topicKeywords.length > 0 && !hasRelevantKeywords) {
        console.warn('[QuestionGenerationAgent] Generated question may not be topic-relevant');
      }
      
      console.log(`[QuestionGenerationAgent] Successfully parsed and validated question: "${result.question.substring(0, 100)}..."`);
      
      return {
        success: true,
        question: result.question,
        metadata: {
          ...result.metadata,
          topicRelevance: hasRelevantKeywords ? 'high' : 'medium',
          generatedAt: new Date().toISOString(),
          cleaningApplied: cleanedResponse !== response.trim()
        },
        reasoning: result.reasoning
      };
    } catch (error) {
      console.error('[QuestionGenerationAgent] Failed to parse generated question:', error);
      console.error('[QuestionGenerationAgent] Raw response preview:', response.substring(0, 200) + '...');
      
      // Generate fallback question
      return {
        success: false,
        question: this.generateFallbackQuestion(input),
        metadata: {
          fallback: true,
          generatedAt: new Date().toISOString(),
          parseError: error.message
        },
        reasoning: 'Fallback question due to parsing error'
      };
    }
  }

  generateFallbackQuestion(input) {
    const { config, questionSpec } = input;
    
    const fallbackQuestions = {
      technical: {
        easy: [
          `What are the basic concepts of ${config.topic}?`,
          `How would you explain ${config.topic} to a beginner?`,
          `What tools do you use for ${config.topic} development?`
        ],
        medium: [
          `Describe a challenging problem you solved using ${config.topic}.`,
          `How do you optimize performance in ${config.topic} applications?`,
          `What are the best practices for ${config.topic} development?`
        ],
        hard: [
          `Design a scalable architecture for a ${config.topic} system.`,
          `How would you handle complex state management in ${config.topic}?`,
          `Explain advanced concepts and patterns in ${config.topic}.`
        ]
      },
      hr: {
        easy: [
          `Why are you interested in ${config.topic}?`,
          `What motivates you to work with ${config.topic}?`,
          `How do you stay updated with ${config.topic} trends?`
        ],
        medium: [
          `Describe a project where you used ${config.topic} successfully.`,
          `How do you handle challenges when working with ${config.topic}?`,
          `What's your approach to learning new ${config.topic} technologies?`
        ],
        hard: [
          `How would you lead a team working on ${config.topic} projects?`,
          `What's your vision for the future of ${config.topic}?`,
          `How do you balance innovation and stability in ${config.topic} work?`
        ]
      },
      behavioral: {
        easy: [
          `Tell me about a time you learned ${config.topic}.`,
          `Describe your experience working with ${config.topic}.`,
          `How do you approach ${config.topic} problems?`
        ],
        medium: [
          `Tell me about a challenging ${config.topic} project you worked on.`,
          `Describe a time you had to debug a complex ${config.topic} issue.`,
          `How did you handle a situation where ${config.topic} requirements changed?`
        ],
        hard: [
          `Tell me about a time you had to make a critical decision about ${config.topic} architecture.`,
          `Describe how you influenced others to adopt ${config.topic} best practices.`,
          `How did you handle a major ${config.topic} system failure?`
        ]
      }
    };
    
    const styleQuestions = fallbackQuestions[config.style] || fallbackQuestions.technical;
    const difficultyQuestions = styleQuestions[questionSpec?.difficulty || 'medium'];
    
    const selectedQuestion = difficultyQuestions[Math.floor(Math.random() * difficultyQuestions.length)];
    console.log(`[QuestionGenerationAgent] Generated fallback question: "${selectedQuestion}"`);
    
    return selectedQuestion;
  }
}