import { BaseAgent } from './baseAgent.js';

/**
 * Question Planning Agent
 * Creates a strategic plan for the interview questions based on topic analysis
 */
export class QuestionPlanningAgent extends BaseAgent {
  constructor(llmService) {
    const systemPrompt = `You are a Question Planning Agent that creates strategic interview plans.

Your role is to:
1. Review the topic analysis and interview context
2. Create a logical progression of questions
3. Plan question difficulty and focus areas
4. Ensure comprehensive coverage of the topic
5. Consider previous questions to avoid repetition

Always respond with a JSON object containing:
{
  "questionPlan": {
    "totalQuestions": number,
    "progression": "easy-to-hard|mixed|scenario-based",
    "focusDistribution": {
      "fundamentals": percentage,
      "practical": percentage,
      "advanced": percentage
    }
  },
  "nextQuestionSpec": {
    "category": "string",
    "difficulty": "easy|medium|hard",
    "focusArea": "string",
    "concepts": ["concept1", "concept2"],
    "avoidTopics": ["topic1", "topic2"],
    "questionType": "theoretical|practical|scenario|problem-solving"
  },
  "reasoning": "explanation of the planning decision"
}

Ensure the plan is logical and builds upon previous questions.`;

    super('QuestionPlanningAgent', llmService, systemPrompt);
  }

  preparePrompt(input, context) {
    const { 
      topicAnalysis, 
      previousQuestions = [], 
      previousResponses = [], 
      questionNumber = 1,
      config 
    } = input;

    return `Create a strategic plan for the next interview question based on this context:

TOPIC ANALYSIS:
${JSON.stringify(topicAnalysis, null, 2)}

INTERVIEW CONFIG:
- Topic: ${config.topic}
- Style: ${config.style}
- Experience Level: ${config.experienceLevel}
- Duration: ${config.duration} minutes
- Company: ${config.companyName || 'General'}

INTERVIEW PROGRESS:
- Current Question Number: ${questionNumber}
- Previous Questions: ${previousQuestions.length > 0 ? previousQuestions.join('; ') : 'None'}
- Previous Response Quality: ${this.assessResponseQuality(previousResponses)}

REQUIREMENTS:
1. Plan the next question to build logically on previous ones
2. Ensure it's relevant to the topic analysis
3. Match the appropriate difficulty for experience level
4. Avoid repeating previous question topics
5. Consider the interview style and company context

Provide a detailed plan for the next question including specific requirements and reasoning.`;
  }

  assessResponseQuality(responses) {
    if (responses.length === 0) return 'No previous responses';
    
    const avgLength = responses.reduce((sum, r) => sum + r.response.length, 0) / responses.length;
    
    if (avgLength > 200) return 'Detailed responses - can increase complexity';
    if (avgLength > 100) return 'Moderate responses - maintain current level';
    return 'Brief responses - may need simpler questions';
  }

  processResponse(response, input, context) {
    try {
      const plan = JSON.parse(response);
      
      // Validate plan structure
      if (!plan.nextQuestionSpec || !plan.questionPlan) {
        throw new Error('Invalid plan structure');
      }
      
      // Ensure required fields in nextQuestionSpec
      const spec = plan.nextQuestionSpec;
      const requiredFields = ['category', 'difficulty', 'focusArea', 'concepts'];
      
      for (const field of requiredFields) {
        if (!spec[field]) {
          throw new Error(`Missing required field: ${field}`);
        }
      }
      
      return {
        success: true,
        plan,
        metadata: {
          questionNumber: input.questionNumber,
          plannedAt: new Date().toISOString()
        }
      };
    } catch (error) {
      console.error('Failed to parse question plan:', error);
      
      // Generate fallback plan
      return {
        success: false,
        plan: this.generateFallbackPlan(input),
        metadata: {
          questionNumber: input.questionNumber,
          fallback: true,
          plannedAt: new Date().toISOString()
        }
      };
    }
  }

  generateFallbackPlan(input) {
    const { config, questionNumber = 1, topicAnalysis } = input;
    
    // Determine difficulty based on question number and experience level
    let difficulty = 'easy';
    if (questionNumber > 2) {
      difficulty = config.experienceLevel === 'fresher' ? 'medium' : 'hard';
    }
    
    // Select focus area from topic analysis
    const focusAreas = topicAnalysis?.analysis?.focusAreas || ['General Knowledge'];
    const focusArea = focusAreas[Math.min(questionNumber - 1, focusAreas.length - 1)];
    
    // Select concepts
    const concepts = topicAnalysis?.analysis?.mainConcepts?.slice(0, 2) || ['Core Concepts'];
    
    return {
      questionPlan: {
        totalQuestions: Math.min(Math.max(3, Math.floor(config.duration / 15)), 8),
        progression: 'easy-to-hard',
        focusDistribution: {
          fundamentals: 40,
          practical: 40,
          advanced: 20
        }
      },
      nextQuestionSpec: {
        category: config.style,
        difficulty,
        focusArea,
        concepts,
        avoidTopics: input.previousQuestions || [],
        questionType: questionNumber <= 2 ? 'theoretical' : 'practical'
      },
      reasoning: `Fallback plan for ${config.style} interview, question ${questionNumber}, focusing on ${focusArea}`
    };
  }
}