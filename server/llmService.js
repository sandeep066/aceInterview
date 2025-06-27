export class LLMQuestionGenerator {
  constructor() {
    this.apiKey = process.env.OPENAI_API_KEY || process.env.ANTHROPIC_API_KEY || process.env.GEMINI_API_KEY;
    this.provider = process.env.LLM_PROVIDER || 'openai'; // 'openai', 'anthropic', or 'gemini'
    this.baseURL = this.getBaseURL();
    
    // Debug API key loading
    console.log('=== API KEY DEBUGGING ===');
    console.log(`[LLMService] Provider: ${this.provider}`);
    console.log(`[LLMService] API Key (first 5 chars): ${this.apiKey ? this.apiKey.substring(0, 5) : 'Not Set'}`);
    console.log(`[LLMService] API Key length: ${this.apiKey ? this.apiKey.length : 0}`);
    console.log(`[LLMService] Raw process.env.GEMINI_API_KEY (first 5 chars): ${process.env.GEMINI_API_KEY ? process.env.GEMINI_API_KEY.substring(0, 5) : 'Not Set'}`);
    console.log(`[LLMService] Raw process.env.GEMINI_API_KEY length: ${process.env.GEMINI_API_KEY ? process.env.GEMINI_API_KEY.length : 0}`);
    console.log(`[LLMService] Raw process.env.OPENAI_API_KEY (first 5 chars): ${process.env.OPENAI_API_KEY ? process.env.OPENAI_API_KEY.substring(0, 5) : 'Not Set'}`);
    console.log(`[LLMService] Raw process.env.ANTHROPIC_API_KEY (first 5 chars): ${process.env.ANTHROPIC_API_KEY ? process.env.ANTHROPIC_API_KEY.substring(0, 5) : 'Not Set'}`);
    console.log(`[LLMService] Raw process.env.LLM_PROVIDER: ${process.env.LLM_PROVIDER || 'Not Set'}`);
    console.log('=== END API KEY DEBUGGING ===');
    
    // Initialize Gemini if using Google's API
    if (this.provider === 'gemini') {
      this.initializeGemini();
    }
    
    // Initialize agentic frameworks
    this.initializeAgenticFrameworks();
  }

  async initializeGemini() {
    try {
      console.log('[LLMService] Initializing Gemini with API key...');
      console.log(`[LLMService] Using API key (first 5 chars): ${this.apiKey ? this.apiKey.substring(0, 5) : 'Not Set'}`);
      
      const { GoogleGenerativeAI } = await import('@google/generative-ai');
      this.geminiAI = new GoogleGenerativeAI(this.apiKey);
      this.geminiModel = this.geminiAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
      console.log('✅ Gemini 2.5 Flash initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize Gemini AI:', error);
      console.error('❌ Error details:', {
        name: error.name,
        message: error.message,
        stack: error.stack
      });
      this.geminiAI = null;
      this.geminiModel = null;
    }
  }

  async initializeAgenticFrameworks() {
    try {
      // Initialize question generation framework
      const { AgenticOrchestrator } = await import('./agents/agenticOrchestrator.js');
      this.agenticOrchestrator = new AgenticOrchestrator(this);
      console.log('✅ Question generation agentic framework initialized successfully');
      
      // Initialize performance analysis framework
      const { PerformanceAnalysisOrchestrator } = await import('./agents/performanceAnalysisOrchestrator.js');
      this.performanceAnalysisOrchestrator = new PerformanceAnalysisOrchestrator(this);
      console.log('✅ Performance analysis agentic framework initialized successfully');
      
    } catch (error) {
      console.error('❌ Failed to initialize agentic frameworks:', error);
      this.agenticOrchestrator = null;
      this.performanceAnalysisOrchestrator = null;
    }
  }

  getBaseURL() {
    switch (this.provider) {
      case 'anthropic':
        return 'https://api.anthropic.com/v1/messages';
      case 'gemini':
        return 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';
      case 'openai':
      default:
        return 'https://api.openai.com/v1/chat/completions';
    }
  }

  async makeAPICall(messages, systemPrompt = '') {
    console.log(`[LLM] Making API call using ${this.provider.toUpperCase()}`);
    
    // Add explicit instruction to avoid markdown formatting
    const enhancedSystemPrompt = systemPrompt + '\n\nIMPORTANT: Always respond with ONLY valid JSON. Do NOT use markdown code blocks, backticks (```), or any other formatting. Return raw JSON only.';
    
    switch (this.provider) {
      case 'gemini':
        return await this.makeGeminiCall(messages, enhancedSystemPrompt);
      case 'anthropic':
        return await this.makeAnthropicCall(messages, enhancedSystemPrompt);
      case 'openai':
      default:
        return await this.makeOpenAICall(messages, enhancedSystemPrompt);
    }
  }

  async makeGeminiCall(messages, systemPrompt = '') {
    if (!this.geminiModel) {
      throw new Error('Gemini model not initialized');
    }

    try {
      console.log('[LLMService] Making Gemini API call...');
      console.log(`[LLMService] API Key being used (first 5 chars): ${this.apiKey ? this.apiKey.substring(0, 5) : 'Not Set'}`);
      
      // Combine system prompt and messages for Gemini
      let fullPrompt = '';
      
      if (systemPrompt) {
        fullPrompt += `System Instructions: ${systemPrompt}\n\n`;
      }
      
      // Convert messages to a single prompt for Gemini
      messages.forEach(msg => {
        if (msg.role === 'user') {
          fullPrompt += `User: ${msg.content}\n`;
        } else if (msg.role === 'assistant') {
          fullPrompt += `Assistant: ${msg.content}\n`;
        }
      });
      
      fullPrompt += '\nAssistant:';

      console.log(`[Gemini 2.5 Flash] Sending request with prompt length: ${fullPrompt.length}`);
      
      const result = await this.geminiModel.generateContent(fullPrompt);
      const response = await result.response;
      const text = response.text();
      
      console.log(`[Gemini 2.5 Flash] Received response with length: ${text.length}`);
      return text;
      
    } catch (error) {
      console.error('[Gemini 2.5 Flash] API call failed:', error);
      console.error('[Gemini 2.5 Flash] Error details:', {
        name: error.name,
        message: error.message,
        stack: error.stack
      });
      throw new Error(`Gemini API error: ${error.message}`);
    }
  }

  async makeAnthropicCall(messages, systemPrompt = '') {
    const headers = {
      'Content-Type': 'application/json',
      'x-api-key': this.apiKey,
      'anthropic-version': '2023-06-01'
    };
    
    const requestBody = {
      model: 'claude-3-sonnet-20240229',
      max_tokens: 1000,
      system: systemPrompt,
      messages: messages.map(msg => ({
        role: msg.role === 'system' ? 'user' : msg.role,
        content: msg.content
      }))
    };

    console.log(`[Anthropic] Sending request`);

    const response = await fetch(this.baseURL, {
      method: 'POST',
      headers,
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      throw new Error(`Anthropic API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    console.log(`[Anthropic] Received response`);
    return data.content[0].text;
  }

  async makeOpenAICall(messages, systemPrompt = '') {
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.apiKey}`
    };
    
    const allMessages = systemPrompt 
      ? [{ role: 'system', content: systemPrompt }, ...messages]
      : messages;
    
    const requestBody = {
      model: 'gpt-4o-mini',
      messages: allMessages,
      max_tokens: 1000,
      temperature: 0.7
    };

    console.log(`[OpenAI] Sending request`);

    const response = await fetch(this.baseURL, {
      method: 'POST',
      headers,
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    console.log(`[OpenAI] Received response`);
    return data.choices[0].message.content;
  }

  async generateQuestion({ config, previousQuestions, previousResponses, questionNumber }) {
    // Try agentic approach first
    if (this.agenticOrchestrator) {
      try {
        console.log(`🤖 Using agentic framework with ${this.provider.toUpperCase()} for question generation`);
        const question = await this.agenticOrchestrator.generateQuestion({
          config,
          previousQuestions,
          previousResponses,
          questionNumber
        });
        
        console.log('✅ Agentic question generated successfully');
        return question;
      } catch (error) {
        console.error('❌ Agentic generation failed, falling back to traditional method:', error);
      }
    }

    // Fallback to traditional method
    console.log(`📝 Using traditional ${this.provider.toUpperCase()} approach`);
    return this.generateQuestionTraditional({ config, previousQuestions, previousResponses, questionNumber });
  }

  async generateQuestionTraditional({ config, previousQuestions, previousResponses, questionNumber }) {
    const systemPrompt = `You are an expert AI interviewer conducting a ${config.style} interview for a ${config.experienceLevel} level candidate interested in ${config.topic}. ${config.companyName ? `The interview is for ${config.companyName}.` : ''}

Your role is to:
1. Generate realistic, contextual interview questions
2. Adapt difficulty based on experience level
3. Consider previous questions to avoid repetition
4. Make questions specific to the topic and company when provided
5. Follow industry best practices for ${config.style} interviews

Interview Context:
- Topic: ${config.topic}
- Style: ${config.style}
- Experience Level: ${config.experienceLevel}
- Company: ${config.companyName || 'General'}
- Duration: ${config.duration} minutes
- Question Number: ${questionNumber}

Previous Questions Asked: ${previousQuestions.join(', ') || 'None'}

Generate ONE interview question that is:
- Appropriate for the experience level
- Relevant to the topic
- Different from previous questions
- Realistic for the interview style
- Engaging and thought-provoking

CRITICAL: Return ONLY the question text without any markdown formatting, code blocks, or additional text.`;

    const messages = [
      {
        role: 'user',
        content: `Generate the next interview question for this context. Make it challenging but fair for a ${config.experienceLevel} level candidate.`
      }
    ];

    try {
      const question = await this.makeAPICall(messages, systemPrompt);
      
      // Clean the response to remove any markdown formatting
      let cleanedQuestion = question.trim();
      
      // Remove any markdown code block delimiters
      if (cleanedQuestion.startsWith('```')) {
        const lines = cleanedQuestion.split('\n');
        lines.shift(); // Remove first line with ```
        if (lines[lines.length - 1].trim() === '```') {
          lines.pop(); // Remove last line with ```
        }
        cleanedQuestion = lines.join('\n').trim();
      }
      
      // Remove any quotes if the entire question is wrapped in quotes
      if ((cleanedQuestion.startsWith('"') && cleanedQuestion.endsWith('"')) ||
          (cleanedQuestion.startsWith("'") && cleanedQuestion.endsWith("'"))) {
        cleanedQuestion = cleanedQuestion.slice(1, -1);
      }
      
      return cleanedQuestion;
    } catch (error) {
      console.error('Error generating question:', error);
      // Fallback to predefined questions if LLM fails
      return this.getFallbackQuestion(config, questionNumber);
    }
  }

  async generateFollowUp({ originalQuestion, userResponse, config }) {
    const systemPrompt = `You are an expert interviewer conducting a follow-up question based on the candidate's response.

Original Question: "${originalQuestion}"
Candidate's Response: "${userResponse}"

Interview Context:
- Topic: ${config.topic}
- Style: ${config.style}
- Experience Level: ${config.experienceLevel}
- Company: ${config.companyName || 'General'}

Generate a natural follow-up question that:
1. Builds on their response
2. Probes deeper into their answer
3. Tests their understanding further
4. Feels conversational and natural
5. Is appropriate for the interview style

CRITICAL: Return ONLY the follow-up question text without any markdown formatting, code blocks, or additional text.`;

    const messages = [
      {
        role: 'user',
        content: 'Generate an appropriate follow-up question based on the context provided.'
      }
    ];

    try {
      const followUp = await this.makeAPICall(messages, systemPrompt);
      
      // Clean the response similar to generateQuestion
      let cleanedFollowUp = followUp.trim();
      
      if (cleanedFollowUp.startsWith('```')) {
        const lines = cleanedFollowUp.split('\n');
        lines.shift();
        if (lines[lines.length - 1].trim() === '```') {
          lines.pop();
        }
        cleanedFollowUp = lines.join('\n').trim();
      }
      
      if ((cleanedFollowUp.startsWith('"') && cleanedFollowUp.endsWith('"')) ||
          (cleanedFollowUp.startsWith("'") && cleanedFollowUp.endsWith("'"))) {
        cleanedFollowUp = cleanedFollowUp.slice(1, -1);
      }
      
      return cleanedFollowUp;
    } catch (error) {
      console.error('Error generating follow-up:', error);
      return "Can you elaborate on that point a bit more?";
    }
  }

  async analyzeResponse({ question, response, config }) {
    const systemPrompt = `You are an expert interview assessor analyzing a candidate's response.

Question: "${question}"
Response: "${response}"

Interview Context:
- Topic: ${config.topic}
- Style: ${config.style}
- Experience Level: ${config.experienceLevel}

Analyze the response and provide:
1. A score from 0-100
2. Brief feedback (2-3 sentences)
3. Key strengths identified
4. Areas for improvement

CRITICAL: Return ONLY a valid JSON object without any markdown formatting or code blocks.

Return a JSON object with this structure:
{
  "score": number,
  "feedback": "string",
  "strengths": ["string"],
  "improvements": ["string"]
}`;

    const messages = [
      {
        role: 'user',
        content: 'Analyze this interview response and provide structured feedback.'
      }
    ];

    try {
      const analysis = await this.makeAPICall(messages, systemPrompt);
      
      // Clean the response to remove markdown code block delimiters and stray backticks
      let cleanedAnalysis = analysis.trim();
      
      if (cleanedAnalysis.startsWith('```json')) {
        cleanedAnalysis = cleanedAnalysis.substring(7);
      } else if (cleanedAnalysis.startsWith('```')) {
        cleanedAnalysis = cleanedAnalysis.substring(3);
      }
      
      if (cleanedAnalysis.endsWith('```')) {
        cleanedAnalysis = cleanedAnalysis.substring(0, cleanedAnalysis.length - 3);
      }
      
      cleanedAnalysis = cleanedAnalysis.trim();
      // Add general backtick removal
      cleanedAnalysis = cleanedAnalysis.replace(/^`+|`+$/g, '');
      
      return JSON.parse(cleanedAnalysis);
    } catch (error) {
      console.error('Error analyzing response:', error);
      return {
        score: 75,
        feedback: "Good response with room for improvement.",
        strengths: ["Clear communication"],
        improvements: ["Add more specific examples"]
      };
    }
  }

  async generateComprehensiveAnalytics({ responses, config }) {
    // Try agentic performance analysis first
    if (this.performanceAnalysisOrchestrator) {
      try {
        console.log(`🧠 Using agentic framework with ${this.provider.toUpperCase()} for performance analysis`);
        console.log(`📊 Analyzing ${responses.length} responses for comprehensive analytics`);
        
        const analytics = await this.performanceAnalysisOrchestrator.generateComprehensiveAnalytics({
          responses,
          config
        });
        
        console.log('✅ Agentic performance analysis completed successfully');
        console.log(`📈 Overall score: ${analytics.overallScore}%`);
        return analytics;
      } catch (error) {
        console.error('❌ Agentic performance analysis failed, falling back to traditional method:', error);
        console.error('Error details:', error.message);
      }
    } else {
      console.log('⚠️ Performance Analysis Orchestrator not initialized, using traditional method');
    }

    // Fallback to traditional analysis
    console.log(`📊 Using traditional ${this.provider.toUpperCase()} analytics approach`);
    return this.generateComprehensiveAnalyticsTraditional({ responses, config });
  }

  async generateComprehensiveAnalyticsTraditional({ responses, config }) {
    const systemPrompt = `You are an expert interview analyst providing comprehensive feedback on an entire interview session.

Interview Context:
- Topic: ${config.topic}
- Style: ${config.style}
- Experience Level: ${config.experienceLevel}
- Total Questions: ${responses.length}

Interview Q&A:
${responses.map((r, i) => `Q${i+1}: ${r.question}\nA${i+1}: ${r.response}\n`).join('\n')}

CRITICAL: Return ONLY a valid JSON object without any markdown formatting or code blocks.

Provide comprehensive analytics in this JSON format:
{
  "overallScore": number (0-100),
  "strengths": ["string"],
  "improvements": ["string"],
  "responseAnalysis": {
    "clarity": number (0-100),
    "structure": number (0-100),
    "technical": number (0-100),
    "communication": number (0-100),
    "confidence": number (0-100)
  },
  "questionReviews": [
    {
      "questionId": "string",
      "question": "string",
      "response": "string",
      "score": number (0-100),
      "feedback": "string"
    }
  ]
}`;

    const messages = [
      {
        role: 'user',
        content: 'Analyze this complete interview session and provide comprehensive analytics.'
      }
    ];

    try {
      const analytics = await this.makeAPICall(messages, systemPrompt);
      
      // Clean the response to remove markdown code block delimiters and stray backticks
      let cleanedAnalytics = analytics.trim();
      
      if (cleanedAnalytics.startsWith('```json')) {
        cleanedAnalytics = cleanedAnalytics.substring(7);
      } else if (cleanedAnalytics.startsWith('```')) {
        cleanedAnalytics = cleanedAnalytics.substring(3);
      }
      
      if (cleanedAnalytics.endsWith('```')) {
        cleanedAnalytics = cleanedAnalytics.substring(0, cleanedAnalytics.length - 3);
      }
      
      cleanedAnalytics = cleanedAnalytics.trim();
      // Add general backtick removal
      cleanedAnalytics = cleanedAnalytics.replace(/^`+|`+$/g, '');
      
      return JSON.parse(cleanedAnalytics);
    } catch (error) {
      console.error('Error generating analytics:', error);
      return this.getFallbackAnalytics(responses);
    }
  }

  getFallbackQuestion(config, questionNumber) {
    const fallbackQuestions = {
      technical: [
        "Explain the difference between synchronous and asynchronous programming.",
        "How would you optimize the performance of a web application?",
        "Describe your approach to debugging a complex issue."
      ],
      hr: [
        "Tell me about yourself and your career goals.",
        "Why are you interested in this position?",
        "How do you handle working under pressure?"
      ],
      behavioral: [
        "Tell me about a challenging project you worked on.",
        "Describe a time when you had to work with a difficult team member.",
        "Give me an example of when you had to learn something new quickly."
      ]
    };

    const questions = fallbackQuestions[config.style] || fallbackQuestions.technical;
    return questions[(questionNumber - 1) % questions.length];
  }

  getFallbackAnalytics(responses) {
    return {
      overallScore: 75,
      strengths: ["Clear communication", "Good technical understanding"],
      improvements: ["Add more specific examples", "Structure responses better"],
      responseAnalysis: {
        clarity: 75,
        structure: 70,
        technical: 80,
        communication: 75,
        confidence: 70
      },
      questionReviews: responses.map((r, i) => ({
        questionId: `q${i+1}`,
        question: r.question,
        response: r.response,
        score: 70 + Math.random() * 25,
        feedback: "Good response with room for improvement."
      }))
    };
  }

  // Get agentic framework statistics
  getAgenticStats() {
    const questionStats = this.agenticOrchestrator ? this.agenticOrchestrator.getSessionStats() : { status: 'not_initialized' };
    const analysisStats = this.performanceAnalysisOrchestrator ? this.performanceAnalysisOrchestrator.getAnalysisStats() : { status: 'not_initialized' };
    
    return {
      provider: this.provider.toUpperCase(),
      questionGeneration: questionStats,
      performanceAnalysis: analysisStats
    };
  }
}