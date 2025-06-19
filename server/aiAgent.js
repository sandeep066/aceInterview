import { WorkerOptions, cli, defineAgent } from '@livekit/agents';
import { openai } from '@livekit/agents-plugin-openai';
import { Room, RoomEvent, RemoteAudioTrack, LocalAudioTrack } from 'livekit-server-sdk';
import dotenv from 'dotenv';
import { LLMQuestionGenerator } from './llmService.js';

dotenv.config();

/**
 * AI Interview Agent using LiveKit Agents Framework
 * This agent handles continuous voice communication for interview sessions
 */
export class AIInterviewAgent {
  constructor() {
    this.llmService = new LLMQuestionGenerator();
    this.interviewSessions = new Map();
    this.questionCache = new Map();
    
    console.log('🤖 AI Interview Agent initialized');
  }

  /**
   * Create and configure the LiveKit agent
   */
  createAgent() {
    return defineAgent({
      entry: this.handleRoomConnection.bind(this)
    });
  }

  /**
   * Handle new room connections
   */
  async handleRoomConnection(ctx) {
    const { room } = ctx;
    
    console.log(`🎙️ AI Agent connected to room: ${room.name}`);
    
    // Wait for participant to join
    await this.waitForParticipant(ctx);
    
    // Initialize interview session
    const sessionData = await this.initializeInterviewSession(ctx);
    
    if (!sessionData) {
      console.error('❌ Failed to initialize interview session');
      return;
    }

    // Create voice assistant with interview-specific configuration
    const assistant = new openai.VoiceAssistant({
      model: new openai.realtime.RealtimeModel({
        instructions: this.createInterviewInstructions(sessionData.config),
        voice: 'alloy',
        temperature: 0.7,
        modalities: ['text', 'audio'],
        turn_detection: {
          type: 'server_vad',
          threshold: 0.5,
          prefix_padding_ms: 300,
          silence_duration_ms: 500
        }
      }),
      fncs: [
        this.createQuestionGenerationFunction(sessionData),
        this.createResponseAnalysisFunction(sessionData),
        this.createInterviewControlFunction(sessionData)
      ]
    });

    // Start the voice assistant
    assistant.start(ctx, room.localParticipant);
    
    // Begin interview flow
    await this.startInterviewFlow(assistant, sessionData);
    
    console.log(`✅ Interview session started for room: ${room.name}`);
  }

  /**
   * Wait for a participant to join the room
   */
  async waitForParticipant(ctx) {
    const { room } = ctx;
    
    if (room.remoteParticipants.length === 0) {
      console.log('⏳ Waiting for participant to join...');
      
      return new Promise((resolve) => {
        const onParticipantConnected = () => {
          console.log('👤 Participant joined the room');
          room.off(RoomEvent.ParticipantConnected, onParticipantConnected);
          resolve();
        };
        
        room.on(RoomEvent.ParticipantConnected, onParticipantConnected);
      });
    }
  }

  /**
   * Initialize interview session from room metadata
   */
  async initializeInterviewSession(ctx) {
    const { room } = ctx;
    
    try {
      // Extract interview configuration from room metadata
      const roomMetadata = room.metadata ? JSON.parse(room.metadata) : {};
      const config = roomMetadata.interviewConfig;
      
      if (!config) {
        console.error('❌ No interview configuration found in room metadata');
        return null;
      }

      const sessionData = {
        sessionId: room.name,
        config,
        currentQuestionIndex: 0,
        questions: [],
        responses: [],
        startTime: Date.now(),
        status: 'greeting'
      };

      // Pre-generate first few questions
      await this.preGenerateQuestions(sessionData, 3);
      
      this.interviewSessions.set(room.name, sessionData);
      
      console.log(`📋 Interview session initialized:`, {
        topic: config.topic,
        style: config.style,
        experienceLevel: config.experienceLevel,
        duration: config.duration
      });
      
      return sessionData;
      
    } catch (error) {
      console.error('❌ Error initializing interview session:', error);
      return null;
    }
  }

  /**
   * Create interview-specific instructions for the AI
   */
  createInterviewInstructions(config) {
    return `You are an expert AI interviewer conducting a ${config.style} interview for a ${config.experienceLevel} level candidate.

INTERVIEW CONTEXT:
- Topic: ${config.topic}
- Style: ${config.style}
- Experience Level: ${config.experienceLevel}
- Company: ${config.companyName || 'General'}
- Duration: ${config.duration} minutes

YOUR ROLE:
1. Conduct a professional, engaging interview
2. Ask relevant questions based on the topic and experience level
3. Listen actively to responses and ask appropriate follow-up questions
4. Maintain a conversational, friendly tone
5. Provide encouragement and guidance when appropriate
6. Keep track of time and pace the interview accordingly

CONVERSATION FLOW:
1. Start with a warm greeting and brief introduction
2. Ask if the candidate is ready to begin
3. Proceed with interview questions in a natural flow
4. Allow natural pauses for the candidate to think
5. Ask follow-up questions based on responses
6. Conclude professionally when time is up

IMPORTANT GUIDELINES:
- Speak clearly and at a moderate pace
- Wait for complete responses before asking follow-up questions
- Be encouraging and supportive
- Keep questions relevant to the specified topic
- Adapt difficulty based on the candidate's experience level
- Maintain professional boundaries while being personable

Begin by greeting the candidate and asking if they're ready to start the interview.`;
  }

  /**
   * Create function for generating interview questions
   */
  createQuestionGenerationFunction(sessionData) {
    return {
      name: 'generate_next_question',
      description: 'Generate the next interview question based on the conversation flow',
      parameters: {
        type: 'object',
        properties: {
          questionType: {
            type: 'string',
            enum: ['opening', 'technical', 'behavioral', 'follow-up', 'closing'],
            description: 'Type of question to generate'
          },
          previousResponse: {
            type: 'string',
            description: 'The candidate\'s previous response (for follow-up questions)'
          }
        },
        required: ['questionType']
      },
      handler: async (args) => {
        return await this.generateNextQuestion(sessionData, args);
      }
    };
  }

  /**
   * Create function for analyzing responses
   */
  createResponseAnalysisFunction(sessionData) {
    return {
      name: 'analyze_response',
      description: 'Analyze the candidate\'s response for quality and content',
      parameters: {
        type: 'object',
        properties: {
          response: {
            type: 'string',
            description: 'The candidate\'s response to analyze'
          },
          question: {
            type: 'string',
            description: 'The question that was asked'
          }
        },
        required: ['response', 'question']
      },
      handler: async (args) => {
        return await this.analyzeResponse(sessionData, args);
      }
    };
  }

  /**
   * Create function for interview control
   */
  createInterviewControlFunction(sessionData) {
    return {
      name: 'control_interview',
      description: 'Control interview flow (pause, resume, end)',
      parameters: {
        type: 'object',
        properties: {
          action: {
            type: 'string',
            enum: ['pause', 'resume', 'end', 'extend'],
            description: 'Action to take'
          },
          reason: {
            type: 'string',
            description: 'Reason for the action'
          }
        },
        required: ['action']
      },
      handler: async (args) => {
        return await this.controlInterview(sessionData, args);
      }
    };
  }

  /**
   * Start the interview flow
   */
  async startInterviewFlow(assistant, sessionData) {
    // Send initial greeting
    const greeting = this.createGreeting(sessionData.config);
    await assistant.say(greeting);
    
    sessionData.status = 'ready_check';
    
    // The conversation will continue based on the candidate's responses
    // and the AI's function calls
  }

  /**
   * Create personalized greeting
   */
  createGreeting(config) {
    const greetings = [
      `Hello! Welcome to your ${config.style} interview practice session. I'm your AI interviewer, and I'm excited to help you practice for your ${config.topic} interview.`,
      `Hi there! I'm your AI interview coach. Today we'll be conducting a ${config.style} interview focused on ${config.topic}. This will be great practice for you!`,
      `Welcome! I'm here to help you practice your interview skills. We'll be doing a ${config.style} interview about ${config.topic} today.`
    ];
    
    const greeting = greetings[Math.floor(Math.random() * greetings.length)];
    const readyCheck = "Are you ready to begin? Just let me know when you'd like to start!";
    
    return `${greeting} ${readyCheck}`;
  }

  /**
   * Pre-generate questions for better performance
   */
  async preGenerateQuestions(sessionData, count = 3) {
    try {
      console.log(`🔄 Pre-generating ${count} questions for session ${sessionData.sessionId}`);
      
      for (let i = 0; i < count; i++) {
        const question = await this.llmService.generateQuestion({
          config: sessionData.config,
          previousQuestions: sessionData.questions,
          previousResponses: sessionData.responses,
          questionNumber: i + 1
        });
        
        sessionData.questions.push(question);
        console.log(`✅ Pre-generated question ${i + 1}: ${question.substring(0, 50)}...`);
      }
      
    } catch (error) {
      console.error('❌ Error pre-generating questions:', error);
    }
  }

  /**
   * Generate next question
   */
  async generateNextQuestion(sessionData, args) {
    try {
      const { questionType, previousResponse } = args;
      
      // If we have pre-generated questions, use them
      if (sessionData.questions.length > sessionData.currentQuestionIndex) {
        const question = sessionData.questions[sessionData.currentQuestionIndex];
        sessionData.currentQuestionIndex++;
        
        console.log(`📝 Using pre-generated question: ${question.substring(0, 50)}...`);
        return { question, source: 'pre-generated' };
      }
      
      // Generate new question
      const question = await this.llmService.generateQuestion({
        config: sessionData.config,
        previousQuestions: sessionData.questions,
        previousResponses: sessionData.responses,
        questionNumber: sessionData.currentQuestionIndex + 1
      });
      
      sessionData.questions.push(question);
      sessionData.currentQuestionIndex++;
      
      console.log(`🆕 Generated new question: ${question.substring(0, 50)}...`);
      return { question, source: 'generated' };
      
    } catch (error) {
      console.error('❌ Error generating question:', error);
      return { 
        question: "Can you tell me about your experience with this technology?", 
        source: 'fallback' 
      };
    }
  }

  /**
   * Analyze candidate response
   */
  async analyzeResponse(sessionData, args) {
    try {
      const { response, question } = args;
      
      // Store the response
      sessionData.responses.push({
        question,
        response,
        timestamp: Date.now(),
        duration: Date.now() - sessionData.startTime
      });
      
      // Analyze with LLM service
      const analysis = await this.llmService.analyzeResponse({
        question,
        response,
        config: sessionData.config
      });
      
      console.log(`📊 Response analyzed - Score: ${analysis.score}`);
      return analysis;
      
    } catch (error) {
      console.error('❌ Error analyzing response:', error);
      return {
        score: 75,
        feedback: "Good response. Keep up the good work!",
        strengths: ["Clear communication"],
        improvements: ["Add more specific examples"]
      };
    }
  }

  /**
   * Control interview flow
   */
  async controlInterview(sessionData, args) {
    const { action, reason } = args;
    
    console.log(`🎛️ Interview control: ${action} - ${reason || 'No reason provided'}`);
    
    switch (action) {
      case 'pause':
        sessionData.status = 'paused';
        return { success: true, message: 'Interview paused' };
        
      case 'resume':
        sessionData.status = 'active';
        return { success: true, message: 'Interview resumed' };
        
      case 'end':
        sessionData.status = 'completed';
        sessionData.endTime = Date.now();
        return { success: true, message: 'Interview completed' };
        
      case 'extend':
        sessionData.config.duration += 5; // Extend by 5 minutes
        return { success: true, message: 'Interview extended by 5 minutes' };
        
      default:
        return { success: false, message: 'Unknown action' };
    }
  }

  /**
   * Check if interview should continue
   */
  shouldContinueInterview(sessionData) {
    const timeElapsed = Date.now() - sessionData.startTime;
    const maxDuration = sessionData.config.duration * 60 * 1000;
    const maxQuestions = Math.min(Math.max(3, Math.floor(sessionData.config.duration / 5)), 10);
    
    return sessionData.status === 'active' && 
           timeElapsed < maxDuration && 
           sessionData.currentQuestionIndex < maxQuestions;
  }

  /**
   * Get session statistics
   */
  getSessionStats(sessionId) {
    const session = this.interviewSessions.get(sessionId);
    if (!session) return null;
    
    return {
      sessionId,
      status: session.status,
      questionsAsked: session.currentQuestionIndex,
      responsesReceived: session.responses.length,
      duration: Date.now() - session.startTime,
      config: session.config
    };
  }
}

// Create and export the agent
const aiAgent = new AIInterviewAgent();
export const agent = aiAgent.createAgent();

// CLI entry point for running the agent
if (import.meta.url === `file://${process.argv[1]}`) {
  cli.runApp(new WorkerOptions({
    agent,
    logLevel: 'info'
  }));
}