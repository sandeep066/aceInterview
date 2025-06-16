/**
 * Robust JSON Parsing Utility
 * Implements type safety methodologies similar to Pydantic for handling LLM responses
 */

export class JSONParsingUtils {
  /**
   * Comprehensive JSON cleaning and parsing with multiple strategies
   */
  static parseRobustJSON(response, context = 'unknown') {
    console.log(`[JSONUtils] Starting robust JSON parsing for context: ${context}`);
    console.log(`[JSONUtils] Original response length: ${response.length}`);
    
    // Strategy 1: Try direct parsing first
    try {
      const result = JSON.parse(response);
      console.log(`[JSONUtils] ✅ Direct parsing successful for ${context}`);
      return { success: true, data: result, method: 'direct' };
    } catch (directError) {
      console.log(`[JSONUtils] Direct parsing failed: ${directError.message}`);
    }

    // Strategy 2: Clean and parse
    try {
      const cleaned = this.cleanLLMResponse(response);
      const result = JSON.parse(cleaned);
      console.log(`[JSONUtils] ✅ Cleaned parsing successful for ${context}`);
      return { success: true, data: result, method: 'cleaned' };
    } catch (cleanError) {
      console.log(`[JSONUtils] Cleaned parsing failed: ${cleanError.message}`);
    }

    // Strategy 3: Extract and parse
    try {
      const extracted = this.extractJSONFromText(response);
      if (extracted) {
        const result = JSON.parse(extracted);
        console.log(`[JSONUtils] ✅ Extraction parsing successful for ${context}`);
        return { success: true, data: result, method: 'extracted' };
      }
    } catch (extractError) {
      console.log(`[JSONUtils] Extraction parsing failed: ${extractError.message}`);
    }

    // Strategy 4: Advanced extraction with multiple patterns
    try {
      const advancedExtracted = this.advancedJSONExtraction(response);
      if (advancedExtracted) {
        const result = JSON.parse(advancedExtracted);
        console.log(`[JSONUtils] ✅ Advanced extraction successful for ${context}`);
        return { success: true, data: result, method: 'advanced_extracted' };
      }
    } catch (advancedError) {
      console.log(`[JSONUtils] Advanced extraction failed: ${advancedError.message}`);
    }

    console.error(`[JSONUtils] ❌ All parsing strategies failed for ${context}`);
    console.error(`[JSONUtils] Response preview: "${response.substring(0, 200)}..."`);
    
    return { 
      success: false, 
      error: 'All JSON parsing strategies failed',
      originalResponse: response.substring(0, 500),
      method: 'failed'
    };
  }

  /**
   * Clean LLM response by removing markdown formatting
   */
  static cleanLLMResponse(response) {
    let cleaned = response.trim();
    
    // Remove markdown code block delimiters
    if (cleaned.startsWith('```json')) {
      cleaned = cleaned.substring(7);
    } else if (cleaned.startsWith('```')) {
      cleaned = cleaned.substring(3);
    }
    
    if (cleaned.endsWith('```')) {
      cleaned = cleaned.substring(0, cleaned.length - 3);
    }
    
    // Remove any remaining backticks at start/end
    cleaned = cleaned.replace(/^`+|`+$/g, '');
    
    // Remove wrapping quotes if entire content is quoted
    if ((cleaned.startsWith('"') && cleaned.endsWith('"')) || 
        (cleaned.startsWith("'") && cleaned.endsWith("'"))) {
      cleaned = cleaned.slice(1, -1);
    }
    
    return cleaned.trim();
  }

  /**
   * Extract JSON from text using regex patterns
   */
  static extractJSONFromText(text) {
    // Pattern 1: Complete JSON object
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return jsonMatch[0];
    }
    
    // Pattern 2: JSON between markdown blocks
    const markerMatch = text.match(/```json\s*(\{[\s\S]*?\})\s*```/);
    if (markerMatch) {
      return markerMatch[1];
    }
    
    // Pattern 3: JSON after "json" keyword
    const afterJsonMatch = text.match(/json\s*(\{[\s\S]*\})/i);
    if (afterJsonMatch) {
      return afterJsonMatch[1];
    }
    
    return null;
  }

  /**
   * Advanced JSON extraction with multiple sophisticated patterns
   */
  static advancedJSONExtraction(text) {
    // Pattern 1: Find all potential JSON objects and return the largest
    const allBraces = text.match(/\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}/g);
    if (allBraces && allBraces.length > 0) {
      return allBraces.reduce((a, b) => a.length > b.length ? a : b);
    }
    
    // Pattern 2: Look for JSON between any type of code blocks
    const codeBlockMatch = text.match(/```[\w]*\s*(\{[\s\S]*?\})\s*```/);
    if (codeBlockMatch) {
      return codeBlockMatch[1];
    }
    
    // Pattern 3: Find JSON after common prefixes
    const prefixes = ['response:', 'result:', 'output:', 'json:', 'data:'];
    for (const prefix of prefixes) {
      const prefixMatch = text.match(new RegExp(`${prefix}\\s*(\\{[\\s\\S]*\\})`, 'i'));
      if (prefixMatch) {
        return prefixMatch[1];
      }
    }
    
    return null;
  }

  /**
   * Validate and normalize parsed JSON data (Pydantic-like validation)
   */
  static validateAndNormalize(data, schema, context = 'unknown') {
    console.log(`[JSONUtils] Validating and normalizing data for ${context}`);
    
    if (!data || typeof data !== 'object') {
      console.error(`[JSONUtils] Invalid data type for ${context}: ${typeof data}`);
      return { valid: false, error: 'Data is not an object' };
    }

    const normalized = { ...data };
    const validationErrors = [];

    // Apply schema validation
    if (schema) {
      for (const [field, rules] of Object.entries(schema)) {
        try {
          if (rules.required && !(field in normalized)) {
            if (rules.default !== undefined) {
              normalized[field] = rules.default;
              console.log(`[JSONUtils] Applied default value for ${field}: ${rules.default}`);
            } else {
              validationErrors.push(`Required field '${field}' is missing`);
            }
          }

          if (field in normalized) {
            // Type validation
            if (rules.type && typeof normalized[field] !== rules.type) {
              if (rules.coerce) {
                normalized[field] = this.coerceType(normalized[field], rules.type);
                console.log(`[JSONUtils] Coerced ${field} to ${rules.type}`);
              } else {
                validationErrors.push(`Field '${field}' should be ${rules.type}, got ${typeof normalized[field]}`);
              }
            }

            // Range validation for numbers
            if (rules.type === 'number' && typeof normalized[field] === 'number') {
              if (rules.min !== undefined && normalized[field] < rules.min) {
                normalized[field] = rules.min;
                console.log(`[JSONUtils] Normalized ${field} to minimum value: ${rules.min}`);
              }
              if (rules.max !== undefined && normalized[field] > rules.max) {
                normalized[field] = rules.max;
                console.log(`[JSONUtils] Normalized ${field} to maximum value: ${rules.max}`);
              }
            }

            // Array validation
            if (rules.type === 'array' && !Array.isArray(normalized[field])) {
              if (rules.default) {
                normalized[field] = rules.default;
                console.log(`[JSONUtils] Applied default array for ${field}`);
              } else {
                validationErrors.push(`Field '${field}' should be an array`);
              }
            }
          }
        } catch (error) {
          validationErrors.push(`Validation error for '${field}': ${error.message}`);
        }
      }
    }

    if (validationErrors.length > 0) {
      console.warn(`[JSONUtils] Validation warnings for ${context}:`, validationErrors);
    }

    console.log(`[JSONUtils] ✅ Validation completed for ${context} with ${validationErrors.length} warnings`);
    
    return {
      valid: validationErrors.length === 0,
      data: normalized,
      errors: validationErrors,
      warnings: validationErrors.length
    };
  }

  /**
   * Type coercion utility
   */
  static coerceType(value, targetType) {
    switch (targetType) {
      case 'number':
        const num = Number(value);
        return isNaN(num) ? 0 : num;
      case 'string':
        return String(value);
      case 'boolean':
        return Boolean(value);
      case 'array':
        return Array.isArray(value) ? value : [value];
      default:
        return value;
    }
  }

  /**
   * Create validation schema for common response types
   */
  static createSchema(type) {
    const schemas = {
      topicAnalysis: {
        mainConcepts: { type: 'array', required: true, default: ['Core Concepts'] },
        skills: { type: 'array', required: true, default: ['General Skills'] },
        focusAreas: { type: 'array', required: true, default: ['General Knowledge'] },
        relevanceKeywords: { type: 'array', required: true, default: ['relevant', 'important'] },
        complexity: { type: 'string', required: false, default: 'medium' },
        technologies: { type: 'array', required: false, default: [] },
        questionCategories: { type: 'array', required: false, default: ['general'] }
      },
      
      questionGeneration: {
        question: { type: 'string', required: true },
        metadata: { type: 'object', required: false, default: {} },
        reasoning: { type: 'string', required: false, default: 'Generated question' }
      },
      
      responseAnalysis: {
        responseAnalysis: { type: 'object', required: true, default: {} },
        score: { type: 'number', required: true, min: 0, max: 100, default: 70, coerce: true },
        feedback: { type: 'string', required: true, default: 'Good response' },
        strengths: { type: 'array', required: true, default: ['Shows understanding'] },
        improvements: { type: 'array', required: true, default: ['Add more details'] }
      },
      
      overallAnalysis: {
        overallScore: { type: 'number', required: true, min: 0, max: 100, default: 70, coerce: true },
        performanceLevel: { type: 'string', required: true, default: 'fair' },
        strengths: { type: 'array', required: true, default: ['Shows understanding'] },
        improvements: { type: 'array', required: true, default: ['Practice more'] },
        responseAnalysis: { type: 'object', required: true, default: {} },
        executiveSummary: { type: 'string', required: false, default: 'Performance summary' },
        recommendations: { type: 'array', required: false, default: ['Continue practicing'] },
        nextSteps: { type: 'array', required: false, default: ['Keep improving'] }
      }
    };

    return schemas[type] || {};
  }

  /**
   * Parse with automatic schema validation
   */
  static parseWithValidation(response, schemaType, context = 'unknown') {
    console.log(`[JSONUtils] Parsing with validation for ${schemaType} in context: ${context}`);
    
    // Step 1: Parse the JSON
    const parseResult = this.parseRobustJSON(response, context);
    
    if (!parseResult.success) {
      return {
        success: false,
        error: parseResult.error,
        method: parseResult.method,
        originalResponse: parseResult.originalResponse
      };
    }

    // Step 2: Validate and normalize
    const schema = this.createSchema(schemaType);
    const validationResult = this.validateAndNormalize(parseResult.data, schema, context);

    return {
      success: validationResult.valid || validationResult.warnings < 3, // Allow minor warnings
      data: validationResult.data,
      method: parseResult.method,
      validation: {
        valid: validationResult.valid,
        errors: validationResult.errors,
        warnings: validationResult.warnings
      },
      metadata: {
        parsedAt: new Date().toISOString(),
        context,
        schemaType,
        parseMethod: parseResult.method
      }
    };
  }
}

/**
 * Convenience functions for common use cases
 */
export const parseTopicAnalysis = (response, context) => 
  JSONParsingUtils.parseWithValidation(response, 'topicAnalysis', context);

export const parseQuestionGeneration = (response, context) => 
  JSONParsingUtils.parseWithValidation(response, 'questionGeneration', context);

export const parseResponseAnalysis = (response, context) => 
  JSONParsingUtils.parseWithValidation(response, 'responseAnalysis', context);

export const parseOverallAnalysis = (response, context) => 
  JSONParsingUtils.parseWithValidation(response, 'overallAnalysis', context);

export const parseRobustJSON = (response, context) => 
  JSONParsingUtils.parseRobustJSON(response, context);