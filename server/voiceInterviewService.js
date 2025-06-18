import { LLMQuestionGenerator } from './llmService.js';

export class VoiceInterviewService {
  constructor(livekitService, llmService) {
    this.livekit = livekitService;
    this.llm = llmService || new LLMQuestionGenerator();
    this.activeInterviews = new Map(); // Store active interview sessions
  }

  /**
   * Start a new voice interview session
   */
  async startVoiceInterview(interviewConfig, participantName) {
    try {
      console.log('[VoiceInterviewService] Starting voice interview...');
      console.log('[VoiceInterviewService] LiveKit configured:', this.livekit.isConfigured());
      console.log('[VoiceInterviewService] LiveKit wsUrl:', `"${this.livekit.wsUrl}"`);
      
      // Create LiveKit room
      const roomData = await this.livekit.createInterviewRoom(interviewConfig, participantName);
      
      console.log('[VoiceInterviewService] Room data created:');
      console.log('- roomName:', roomData.roomName);
      console.log('- wsUrl:', typeof roomData.wsUrl, `"${roomData.wsUrl}"`);
      console.log('- participantToken length:', roomData.participantToken?.length || 0);
      console.log('- interviewerToken length:', roomData.interviewerToken?.length || 0);
      
      // Initialize interview session
      const sessionId = roomData.roomName;
      const interviewSession = {
        sessionId,
        roomName: roomData.roomName,
        config: interviewConfig,
        participantName,
        startTime: new Date(),
        currentQuestionIndex: 0,
        questions: [],
        responses: [],
        status: 'waiting', // waiting, active, paused, completed
        tokens: {
          participant: roomData.participantToken,
          interviewer: roomData.interviewerToken
        }
      };

      // Store session
      this.activeInterviews.set(sessionId, interviewSession);

      // Generate first question
      const firstQuestionData = await this.generateNextQuestion(sessionId);
      
      // Extract the question string properly
      let firstQuestionText;
      if (typeof firstQuestionData === 'string') {
        firstQuestionText = firstQuestionData;
      } else if (firstQuestionData && typeof firstQuestionData.question === 'string') {
        firstQuestionText = firstQuestionData.question;
      } else {
        firstQuestionText = 'Welcome to your voice interview. Please wait for the first question.';
      }
      
      console.log('[VoiceInterviewService] First question generated:', firstQuestionText);
      
      const responseData = {
        sessionId,
        roomName: roomData.roomName,
        wsUrl: roomData.wsUrl,
        participantToken: roomData.participantToken,
        firstQuestion: firstQuestionText, // Now guaranteed to be a string
        config: interviewConfig
      };
      
      console.log('[VoiceInterviewService] Final response data:');
      console.log('- sessionId:', responseData.sessionId);
      console.log('- roomName:', responseData.roomName);
      console.log('- wsUrl:', typeof responseData.wsUrl, `"${responseData.wsUrl}"`);
      console.log('- participantToken length:', responseData.participantToken?.length || 0);
      console.log('- firstQuestion type:', typeof responseData.firstQuestion);
      console.log('- firstQuestion preview:', responseData.firstQuestion?.substring(0, 50) + '...');
      
      return responseData;
    } catch (error) {
      console.error('[VoiceInterviewService] Error starting voice interview:', error);
      throw new Error('Failed to start voice interview');
    }
  }

  /**
   * Generate the next question for an interview session
   */
  async generateNextQuestion(sessionId) {
    const session = this.activeInterviews.get(sessionId);
    if (!session) {
      throw new Error('Interview session not found');
    }

    try {
      const question = await this.llm.generateQuestion({
        config: session.config,
        previousQuestions: session.questions,
        previousResponses: session.responses,
        questionNumber: session.currentQuestionIndex + 1
      });

      // Store the question - ensure it's a string
      const questionText = typeof question === 'string' ? question : question?.question || 'Default question';
      session.questions.push(questionText);
      session.currentQuestionIndex++;

      // Update session
      this.activeInterviews.set(sessionId, session);

      return {
        question: questionText,
        questionNumber: session.currentQuestionIndex,
        totalQuestions: this.calculateTotalQuestions(session.config.duration)
      };
    } catch (error) {
      console.error('Error generating question:', error);
      throw new Error('Failed to generate question');
    }
  }

  /**
   * Process voice response from participant
   */
  async processVoiceResponse(sessionId, transcription, audioMetadata = {}) {
    const session = this.activeInterviews.get(sessionId);
    if (!session) {
      throw new Error('Interview session not found');
    }

    try {
      const currentQuestion = session.questions[session.currentQuestionIndex - 1];
      
      // Store the response
      const response = {
        questionId: `q${session.currentQuestionIndex}`,
        question: currentQuestion,
        response: transcription,
        timestamp: new Date(),
        audioMetadata,
        duration: Date.now() - session.startTime
      };

      session.responses.push(response);

      // Analyze response in real-time
      let analysis = null;
      try {
        analysis = await this.llm.analyzeResponse({
          question: currentQuestion,
          response: transcription,
          config: session.config
        });
      } catch (error) {
        console.error('Error analyzing response:', error);
      }

      // Check if interview should continue
      const shouldContinue = this.shouldContinueInterview(session);
      let nextQuestion = null;

      if (shouldContinue) {
        try {
          const questionData = await this.generateNextQuestion(sessionId);
          nextQuestion = questionData;
        } catch (error) {
          console.error('Error generating next question:', error);
        }
      } else {
        session.status = 'completed';
      }

      // Update session
      this.activeInterviews.set(sessionId, session);

      return {
        responseProcessed: true,
        analysis,
        nextQuestion,
        isComplete: !shouldContinue,
        progress: {
          current: session.currentQuestionIndex,
          total: this.calculateTotalQuestions(session.config.duration),
          percentage: (session.currentQuestionIndex / this.calculateTotalQuestions(session.config.duration)) * 100
        }
      };
    } catch (error) {
      console.error('Error processing voice response:', error);
      throw new Error('Failed to process voice response');
    }
  }

  /**
   * Generate follow-up question based on response
   */
  async generateFollowUp(sessionId, responseText) {
    const session = this.activeInterviews.get(sessionId);
    if (!session) {
      throw new Error('Interview session not found');
    }

    try {
      const currentQuestion = session.questions[session.currentQuestionIndex - 1];
      
      const followUp = await this.llm.generateFollowUp({
        originalQuestion: currentQuestion,
        userResponse: responseText,
        config: session.config
      });

      return {
        followUp,
        questionNumber: session.currentQuestionIndex,
        isFollowUp: true
      };
    } catch (error) {
      console.error('Error generating follow-up:', error);
      throw new Error('Failed to generate follow-up question');
    }
  }

  /**
   * Pause an interview session
   */
  pauseInterview(sessionId) {
    const session = this.activeInterviews.get(sessionId);
    if (!session) {
      throw new Error('Interview session not found');
    }

    session.status = 'paused';
    session.pausedAt = new Date();
    this.activeInterviews.set(sessionId, session);

    return { paused: true, sessionId };
  }

  /**
   * Resume an interview session
   */
  resumeInterview(sessionId) {
    const session = this.activeInterviews.get(sessionId);
    if (!session) {
      throw new Error('Interview session not found');
    }

    session.status = 'active';
    if (session.pausedAt) {
      session.pauseDuration = (session.pauseDuration || 0) + (Date.now() - session.pausedAt.getTime());
      delete session.pausedAt;
    }
    this.activeInterviews.set(sessionId, session);

    return { resumed: true, sessionId };
  }

  /**
   * End an interview session and generate analytics
   */
  async endInterview(sessionId) {
    const session = this.activeInterviews.get(sessionId);
    if (!session) {
      throw new Error('Interview session not found');
    }

    try {
      session.status = 'completed';
      session.endTime = new Date();

      // Generate comprehensive analytics
      const analytics = await this.llm.generateComprehensiveAnalytics({
        responses: session.responses,
        config: session.config
      });

      // Add session metadata to analytics
      const sessionAnalytics = {
        ...analytics,
        sessionMetadata: {
          sessionId,
          duration: session.endTime - session.startTime,
          pauseDuration: session.pauseDuration || 0,
          questionsAsked: session.questions.length,
          responsesGiven: session.responses.length,
          completionRate: (session.responses.length / session.questions.length) * 100
        }
      };

      // Clean up session (optional - you might want to keep for history)
      // this.activeInterviews.delete(sessionId);

      return {
        completed: true,
        sessionId,
        analytics: sessionAnalytics,
        session: {
          ...session,
          tokens: undefined // Don't return tokens in final result
        }
      };
    } catch (error) {
      console.error('Error ending interview:', error);
      throw new Error('Failed to end interview');
    }
  }

  /**
   * Get interview session status
   */
  getSessionStatus(sessionId) {
    const session = this.activeInterviews.get(sessionId);
    if (!session) {
      return { found: false };
    }

    return {
      found: true,
      sessionId,
      status: session.status,
      progress: {
        current: session.currentQuestionIndex,
        total: this.calculateTotalQuestions(session.config.duration),
        percentage: (session.currentQuestionIndex / this.calculateTotalQuestions(session.config.duration)) * 100
      },
      duration: Date.now() - session.startTime.getTime(),
      questionsAsked: session.questions.length,
      responsesGiven: session.responses.length
    };
  }

  /**
   * Reconnect to an existing interview session
   */
  async reconnectToSession(sessionId, participantName) {
    const session = this.activeInterviews.get(sessionId);
    if (!session) {
      throw new Error('Interview session not found');
    }

    try {
      // Generate new token for reconnection
      const reconnectToken = this.livekit.generateReconnectToken(
        session.roomName,
        participantName,
        {
          role: 'candidate',
          reconnection: true,
          originalSession: sessionId
        }
      );

      return {
        sessionId,
        roomName: session.roomName,
        wsUrl: this.livekit.wsUrl,
        participantToken: reconnectToken,
        currentQuestion: session.questions[session.currentQuestionIndex - 1],
        progress: {
          current: session.currentQuestionIndex,
          total: this.calculateTotalQuestions(session.config.duration)
        }
      };
    } catch (error) {
      console.error('Error reconnecting to session:', error);
      throw new Error('Failed to reconnect to session');
    }
  }

  /**
   * Helper method to determine if interview should continue
   */
  shouldContinueInterview(session) {
    const maxQuestions = this.calculateTotalQuestions(session.config.duration);
    const timeElapsed = Date.now() - session.startTime.getTime();
    const maxDuration = session.config.duration * 60 * 1000; // Convert to milliseconds

    return session.currentQuestionIndex < maxQuestions && timeElapsed < maxDuration;
  }

  /**
   * Calculate total questions based on duration
   */
  calculateTotalQuestions(duration) {
    return Math.min(Math.max(3, Math.floor(duration / 15)), 8);
  }

  /**
   * Get all active sessions (for monitoring/admin purposes)
   */
  getActiveSessions() {
    const sessions = [];
    for (const [sessionId, session] of this.activeInterviews) {
      sessions.push({
        sessionId,
        participantName: session.participantName,
        status: session.status,
        startTime: session.startTime,
        config: session.config,
        progress: {
          current: session.currentQuestionIndex,
          total: this.calculateTotalQuestions(session.config.duration)
        }
      });
    }
    return sessions;
  }
}