import { TopicAnalysisAgent } from './topicAnalysisAgent.js';
import { QuestionPlanningAgent } from './questionPlanningAgent.js';
import { QuestionGenerationAgent } from './questionGenerationAgent.js';

/**
 * Agentic Orchestrator
 * Coordinates the multi-agent workflow for interview question generation
 */
export class AgenticOrchestrator {
  constructor(llmService) {
    this.llmService = llmService;
    
    // Initialize agents (removed ValidationAgent)
    this.topicAnalysisAgent = new TopicAnalysisAgent(llmService);
    this.questionPlanningAgent = new QuestionPlanningAgent(llmService);
    this.questionGenerationAgent = new QuestionGenerationAgent(llmService);
    
    // Session memory for maintaining context
    this.sessionMemory = new Map();
    
    console.log('Agentic Orchestrator initialized without validation agent for faster processing');
  }

  /**
   * Generate a high-quality, topic-relevant interview question
   */
  async generateQuestion({ config, previousQuestions = [], previousResponses = [], questionNumber = 1 }) {
    const sessionId = this.getSessionId(config);
    
    try {
      console.log(`[Orchestrator] Starting question generation for session ${sessionId}, question ${questionNumber}`);
      
      // Step 1: Topic Analysis (cached after first call)
      const topicAnalysis = await this.getOrCreateTopicAnalysis(config, sessionId);
      
      // Step 2: Question Planning
      const questionPlan = await this.planNextQuestion({
        topicAnalysis,
        previousQuestions,
        previousResponses,
        questionNumber,
        config
      });
      
      // Step 3: Question Generation (removed validation step)
      const finalQuestion = await this.generateQuestionDirect({
        questionSpec: questionPlan.plan.nextQuestionSpec,
        topicAnalysis,
        config
      });
      
      // Store in session memory
      this.updateSessionMemory(sessionId, {
        lastQuestion: finalQuestion.question,
        lastQuestionMetadata: finalQuestion.metadata,
        questionNumber
      });
      
      console.log(`[Orchestrator] Successfully generated question ${questionNumber}: "${finalQuestion.question}"`);
      
      return finalQuestion.question;
      
    } catch (error) {
      console.error(`[Orchestrator] Error in question generation:`, error);
      
      // Fallback to simple generation
      return this.generateFallbackQuestion(config, questionNumber);
    }
  }

  /**
   * Get or create topic analysis (cached per session)
   */
  async getOrCreateTopicAnalysis(config, sessionId) {
    const cached = this.sessionMemory.get(`${sessionId}_topicAnalysis`);
    
    if (cached) {
      console.log('[Orchestrator] Using cached topic analysis');
      return cached;
    }
    
    console.log('[Orchestrator] Performing topic analysis');
    const analysisResult = await this.topicAnalysisAgent.execute({
      topic: config.topic,
      style: config.style,
      experienceLevel: config.experienceLevel,
      companyName: config.companyName
    });
    
    // Cache the analysis
    this.sessionMemory.set(`${sessionId}_topicAnalysis`, analysisResult);
    
    return analysisResult;
  }

  /**
   * Plan the next question based on context
   */
  async planNextQuestion(input) {
    console.log('[Orchestrator] Planning next question');
    
    const planResult = await this.questionPlanningAgent.execute(input);
    
    if (!planResult.success) {
      console.warn('[Orchestrator] Question planning failed, using fallback');
    }
    
    return planResult;
  }

  /**
   * Generate question directly without validation (for speed)
   */
  async generateQuestionDirect({ questionSpec, topicAnalysis, config }) {
    console.log('[Orchestrator] Generating question directly (no validation)');
    
    try {
      const generationResult = await this.questionGenerationAgent.execute({
        questionSpec,
        topicAnalysis,
        config
      });
      
      if (!generationResult.success) {
        throw new Error('Question generation failed');
      }
      
      console.log('[Orchestrator] Question generated successfully without validation');
      
      return {
        question: generationResult.question,
        metadata: {
          ...generationResult.metadata,
          validationSkipped: true,
          fastGeneration: true,
          generatedAt: new Date().toISOString()
        }
      };
      
    } catch (error) {
      console.error('[Orchestrator] Direct generation failed:', error);
      
      return {
        question: this.generateFallbackQuestion(config, 1),
        metadata: {
          fallback: true,
          validationSkipped: true,
          fastGeneration: true,
          error: error.message,
          generatedAt: new Date().toISOString()
        }
      };
    }
  }

  /**
   * Generate session ID for caching
   */
  getSessionId(config) {
    return `${config.topic}_${config.style}_${config.experienceLevel}`.replace(/\s+/g, '_').toLowerCase();
  }

  /**
   * Update session memory
   */
  updateSessionMemory(sessionId, data) {
    const existing = this.sessionMemory.get(sessionId) || {};
    this.sessionMemory.set(sessionId, { ...existing, ...data });
  }

  /**
   * Fallback question generation
   */
  generateFallbackQuestion(config, questionNumber) {
    const fallbacks = {
      technical: [
        `What are the key concepts and best practices in ${config.topic}?`,
        `How would you approach solving a complex problem using ${config.topic}?`,
        `Explain the architecture and design patterns you would use for a ${config.topic} project.`,
        `What are the performance considerations when working with ${config.topic}?`,
        `How do you ensure code quality and maintainability in ${config.topic} development?`
      ],
      hr: [
        `Why are you passionate about working with ${config.topic}?`,
        `How do you stay current with developments in ${config.topic}?`,
        `Describe your experience and growth in ${config.topic}.`,
        `What challenges have you faced while working with ${config.topic}?`,
        `How do you see your career developing in the ${config.topic} field?`
      ],
      behavioral: [
        `Tell me about a successful project you completed using ${config.topic}.`,
        `Describe a time when you had to learn ${config.topic} quickly for a project.`,
        `How did you handle a difficult technical challenge involving ${config.topic}?`,
        `Tell me about a time you had to collaborate with others on a ${config.topic} project.`,
        `Describe how you've improved your ${config.topic} skills over time.`
      ]
    };
    
    const styleQuestions = fallbacks[config.style] || fallbacks.technical;
    const index = Math.min(questionNumber - 1, styleQuestions.length - 1);
    
    return styleQuestions[index];
  }

  /**
   * Clear session memory for a specific session
   */
  clearSession(sessionId) {
    const keys = Array.from(this.sessionMemory.keys()).filter(key => key.startsWith(sessionId));
    keys.forEach(key => this.sessionMemory.delete(key));
  }

  /**
   * Get session statistics
   */
  getSessionStats() {
    return {
      activeSessions: new Set(Array.from(this.sessionMemory.keys()).map(key => key.split('_')[0])).size,
      totalCachedItems: this.sessionMemory.size,
      memoryUsage: JSON.stringify(Array.from(this.sessionMemory.entries())).length,
      validationEnabled: false // Validation is now disabled
    };
  }
}