import { JSONParsingUtils } from '../utils/jsonUtils.js';

/**
 * Base Agent class for the interview system
 * Provides common functionality for all specialized agents with robust JSON parsing
 */
export class BaseAgent {
  constructor(name, llmService, systemPrompt) {
    this.name = name;
    this.llmService = llmService;
    this.systemPrompt = systemPrompt;
    this.memory = new Map();
  }

  /**
   * Execute the agent's main function with robust error handling
   */
  async execute(input, context = {}) {
    try {
      console.log(`[${this.name}] Executing with input:`, Object.keys(input));
      
      // Store context in memory
      this.updateMemory(context);
      
      // Prepare the prompt with context
      const prompt = this.preparePrompt(input, context);
      
      // Call LLM with enhanced system prompt
      const enhancedSystemPrompt = this.systemPrompt + '\n\nCRITICAL: Always respond with ONLY valid JSON. Do NOT use markdown code blocks, backticks (```), or any other formatting. Return raw JSON only.';
      
      const response = await this.llmService.makeAPICall([
        { role: 'user', content: prompt }
      ], enhancedSystemPrompt);
      
      // Process and validate response with robust parsing
      const result = this.processResponse(response, input, context);
      
      console.log(`[${this.name}] Execution completed successfully`);
      return result;
      
    } catch (error) {
      console.error(`[${this.name}] Execution error:`, error);
      throw new Error(`Agent ${this.name} failed: ${error.message}`);
    }
  }

  /**
   * Prepare the prompt with input and context
   */
  preparePrompt(input, context) {
    return JSON.stringify({ input, context });
  }

  /**
   * Process the LLM response with robust JSON parsing
   * This method should be overridden by subclasses for specific parsing logic
   */
  processResponse(response, input, context) {
    try {
      // Use robust JSON parsing
      const parseResult = JSONParsingUtils.parseRobustJSON(response, this.name);
      
      if (parseResult.success) {
        return {
          success: true,
          data: parseResult.data,
          metadata: {
            agent: this.name,
            parseMethod: parseResult.method,
            processedAt: new Date().toISOString()
          }
        };
      } else {
        console.error(`[${this.name}] JSON parsing failed:`, parseResult.error);
        return {
          success: false,
          error: parseResult.error,
          fallback: true,
          metadata: {
            agent: this.name,
            parseMethod: 'failed',
            processedAt: new Date().toISOString()
          }
        };
      }
    } catch (error) {
      console.error(`[${this.name}] Response processing error:`, error);
      return {
        success: false,
        error: error.message,
        fallback: true,
        metadata: {
          agent: this.name,
          processedAt: new Date().toISOString()
        }
      };
    }
  }

  /**
   * Update agent memory
   */
  updateMemory(context) {
    Object.entries(context).forEach(([key, value]) => {
      this.memory.set(key, value);
    });
  }

  /**
   * Get value from memory
   */
  getMemory(key) {
    return this.memory.get(key);
  }

  /**
   * Clear agent memory
   */
  clearMemory() {
    this.memory.clear();
  }
}