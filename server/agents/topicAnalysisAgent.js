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

Ensure the analysis is specific to the topic and not generic.`;
  }

  processResponse(response, input, context) {
    try {
      const analysis = JSON.parse(response);
      
      // Validate required fields
      const requiredFields = ['mainConcepts', 'skills', 'focusAreas', 'relevanceKeywords'];
      for (const field of requiredFields) {
        if (!analysis[field] || !Array.isArray(analysis[field])) {
          throw new Error(`Missing or invalid field: ${field}`);
        }
      }
      
      return {
        success: true,
        analysis,
        metadata: {
          topic: input.topic,
          analyzedAt: new Date().toISOString()
        }
      };
    } catch (error) {
      console.error('Failed to parse topic analysis:', error);
      
      // Fallback analysis
      return {
        success: false,
        analysis: this.generateFallbackAnalysis(input),
        metadata: {
          topic: input.topic,
          fallback: true,
          analyzedAt: new Date().toISOString()
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
    
    return {
      ...analysis,
      complexity: experienceLevel === 'fresher' ? 'low' : experienceLevel === 'senior' ? 'high' : 'medium',
      questionCategories: [style, 'fundamentals', 'practical']
    };
  }
}