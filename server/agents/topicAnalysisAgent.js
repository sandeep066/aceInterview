import { BaseAgent } from './baseAgent.js';

/**
 * Topic Analysis Agent
 * Analyzes the interview topic and extracts key concepts, skills, and focus areas
 */
export class TopicAnalysisAgent extends BaseAgent {
  constructor(llmService) {
    const systemPrompt = `You are a Topic Analysis Agent specialized in breaking down interview topics into structured components.

Your role is to:
1. Analyze the given topic and extract key concepts
2. Identify relevant skills and technologies
3. Determine appropriate focus areas for questions
4. Consider the experience level and interview style
5. Provide a structured analysis that guides question generation

CRITICAL: Always respond with ONLY a valid JSON object. Do NOT use markdown code blocks, backticks, or any other formatting. Return raw JSON only.

Always respond with a JSON object containing:
{
  "mainConcepts": ["concept1", "concept2", ...],
  "skills": ["skill1", "skill2", ...],
  "technologies": ["tech1", "tech2", ...],
  "focusAreas": ["area1", "area2", ...],
  "complexity": "low|medium|high",
  "questionCategories": ["category1", "category2", ...],
  "relevanceKeywords": ["keyword1", "keyword2", ...]
}

Be thorough and specific to ensure generated questions will be highly relevant.`;

    super('TopicAnalysisAgent', llmService, systemPrompt);
  }

  preparePrompt(input, context) {
    const { topic, style, experienceLevel, companyName } = input;
    
    return `Analyze this interview topic and provide a structured breakdown:

Topic: "${topic}"
Interview Style: ${style}
Experience Level: ${experienceLevel}
Company: ${companyName || 'General'}

Please provide a comprehensive analysis that will guide the generation of highly relevant interview questions. Focus on:

1. Core concepts that should be covered
2. Specific skills to assess
3. Technologies/tools that are relevant
4. Areas of focus based on experience level
5. Question categories that make sense
6. Keywords that indicate relevance

Ensure the analysis is specific to the topic and not generic.

Remember: Return ONLY the JSON object without any markdown formatting or code blocks.`;
  }

  processResponse(response, input, context) {
    try {
      // Clean the response to remove markdown code block delimiters
      let cleanedResponse = response.trim();
      
      console.log(`[TopicAnalysisAgent] Original response length: ${cleanedResponse.length}`);
      
      // Remove leading ```json or ``` and trailing ```
      let cleaningApplied = false;
      
      if (cleanedResponse.startsWith('```json')) {
        cleanedResponse = cleanedResponse.substring(7);
        cleaningApplied = true;
        console.log('[TopicAnalysisAgent] Removed leading ```json delimiter');
      } else if (cleanedResponse.startsWith('```')) {
        cleanedResponse = cleanedResponse.substring(3);
        cleaningApplied = true;
        console.log('[TopicAnalysisAgent] Removed leading ``` delimiter');
      }
      
      if (cleanedResponse.endsWith('```')) {
        cleanedResponse = cleanedResponse.substring(0, cleanedResponse.length - 3);
        cleaningApplied = true;
        console.log('[TopicAnalysisAgent] Removed trailing ``` delimiter');
      }
      
      // Trim any remaining whitespace
      cleanedResponse = cleanedResponse.trim();
      
      console.log(`[TopicAnalysisAgent] Cleaned response length: ${cleanedResponse.length}`);
      console.log(`[TopicAnalysisAgent] Cleaning applied: ${cleaningApplied}`);
      
      const analysis = JSON.parse(cleanedResponse);
      
      // Validate required fields
      const requiredFields = ['mainConcepts', 'skills', 'focusAreas', 'relevanceKeywords'];
      for (const field of requiredFields) {
        if (!analysis[field] || !Array.isArray(analysis[field])) {
          throw new Error(`Missing or invalid field: ${field}`);
        }
      }
      
      console.log(`[TopicAnalysisAgent] Successfully parsed topic analysis for: ${input.topic}`);
      
      return {
        success: true,
        analysis,
        metadata: {
          topic: input.topic,
          analyzedAt: new Date().toISOString(),
          cleaningApplied
        }
      };
    } catch (error) {
      console.error('[TopicAnalysisAgent] Failed to parse topic analysis:', error);
      console.error('[TopicAnalysisAgent] Raw response preview:', response.substring(0, 200) + '...');
      
      // Try to extract JSON from the response if it's embedded in text
      try {
        console.log('[TopicAnalysisAgent] Attempting to extract JSON from response...');
        
        const jsonMatch = response.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const extractedJson = jsonMatch[0];
          console.log(`[TopicAnalysisAgent] Found potential JSON, length: ${extractedJson.length}`);
          
          const analysis = JSON.parse(extractedJson);
          
          // Validate required fields
          const requiredFields = ['mainConcepts', 'skills', 'focusAreas', 'relevanceKeywords'];
          let validStructure = true;
          
          for (const field of requiredFields) {
            if (!analysis[field] || !Array.isArray(analysis[field])) {
              validStructure = false;
              break;
            }
          }
          
          if (validStructure) {
            console.log('[TopicAnalysisAgent] Successfully extracted and validated JSON from response');
            return {
              success: true,
              analysis,
              metadata: {
                topic: input.topic,
                analyzedAt: new Date().toISOString(),
                extractedFromText: true
              }
            };
          }
        }
      } catch (extractError) {
        console.error('[TopicAnalysisAgent] JSON extraction also failed:', extractError);
      }
      
      // Fallback analysis
      console.log('[TopicAnalysisAgent] Using fallback analysis');
      return {
        success: false,
        analysis: this.generateFallbackAnalysis(input),
        metadata: {
          topic: input.topic,
          fallback: true,
          analyzedAt: new Date().toISOString(),
          parseError: error.message
        }
      };
    }
  }

  generateFallbackAnalysis(input) {
    const { topic, style, experienceLevel } = input;
    
    const fallbackMappings = {
      'frontend': {
        mainConcepts: ['User Interface', 'User Experience', 'Web Development', 'Client-side Programming'],
        skills: ['HTML', 'CSS', 'JavaScript', 'React', 'Vue', 'Angular'],
        technologies: ['React', 'Vue.js', 'Angular', 'TypeScript', 'Webpack', 'Sass'],
        focusAreas: ['Component Design', 'State Management', 'Performance Optimization', 'Responsive Design'],
        relevanceKeywords: ['component', 'state', 'props', 'DOM', 'CSS', 'responsive', 'performance']
      },
      'backend': {
        mainConcepts: ['Server-side Development', 'API Design', 'Database Management', 'System Architecture'],
        skills: ['Node.js', 'Python', 'Java', 'SQL', 'API Development', 'Database Design'],
        technologies: ['Express.js', 'Django', 'Spring Boot', 'PostgreSQL', 'MongoDB', 'Redis'],
        focusAreas: ['API Design', 'Database Optimization', 'Security', 'Scalability'],
        relevanceKeywords: ['API', 'database', 'server', 'authentication', 'security', 'scalability']
      },
      'javascript': {
        mainConcepts: ['Programming Fundamentals', 'Asynchronous Programming', 'Object-Oriented Programming'],
        skills: ['ES6+', 'Async/Await', 'Promises', 'Closures', 'Prototypes'],
        technologies: ['Node.js', 'React', 'Express', 'TypeScript'],
        focusAreas: ['Language Features', 'Best Practices', 'Performance', 'Modern JavaScript'],
        relevanceKeywords: ['function', 'async', 'promise', 'closure', 'prototype', 'ES6', 'arrow function']
      }
    };
    
    // Try to match topic with predefined mappings
    const topicLower = topic.toLowerCase();
    let analysis = null;
    
    for (const [key, mapping] of Object.entries(fallbackMappings)) {
      if (topicLower.includes(key)) {
        analysis = mapping;
        break;
      }
    }
    
    // Generic fallback if no match found
    if (!analysis) {
      analysis = {
        mainConcepts: ['Technical Knowledge', 'Problem Solving', 'Best Practices'],
        skills: ['Programming', 'Debugging', 'Testing', 'Documentation'],
        technologies: ['Version Control', 'IDEs', 'Testing Frameworks'],
        focusAreas: ['Core Concepts', 'Practical Application', 'Industry Standards'],
        relevanceKeywords: ['code', 'programming', 'development', 'software', 'technical']
      };
    }
    
    console.log(`[TopicAnalysisAgent] Generated fallback analysis for topic: ${topic}`);
    
    return {
      ...analysis,
      complexity: experienceLevel === 'fresher' ? 'low' : experienceLevel === 'senior' ? 'high' : 'medium',
      questionCategories: [style, 'fundamentals', 'practical']
    };
  }
}