/**
 * Base Agent class for the interview system
 * Provides common functionality for all specialized agents
 */
export class BaseAgent {
  constructor(name, llmService, systemPrompt) {
    this.name = name;
    this.llmService = llmService;
    this.systemPrompt = systemPrompt;
    this.memory = new Map();
  }

  /**
   * Execute the agent's main function
   */
  async execute(input, context = {}) {
    try {
      console.log(`[${this.name}] Executing with input:`, input);
      
      // Store context in memory
      this.updateMemory(context);
      
      // Prepare the prompt with context
      const prompt = this.preparePrompt(input, context);
      
      // Call LLM
      const response = await this.llmService.makeAPICall([
        { role: 'user', content: prompt }
      ], this.systemPrompt);
      
      // Process and validate response
      const result = this.processResponse(response, input, context);
      
      console.log(`[${this.name}] Result:`, result);
      return result;
      
    } catch (error) {
      console.error(`[${this.name}] Error:`, error);
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
   * Process the LLM response
   */
  processResponse(response, input, context) {
    try {
      return JSON.parse(response);
    } catch (error) {
      // If JSON parsing fails, return as text
      return { result: response.trim() };
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