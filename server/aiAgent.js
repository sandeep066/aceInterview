import { WorkerOptions, cli, defineAgent } from '@livekit/agents';
import { Room, RoomEvent, RemoteAudioTrack, LocalAudioTrack, AudioFrame } from 'livekit-server-sdk';
import { GoogleGenerativeAI } from '@google/generative-ai';
import speech from '@google/cloud-speech';
import textToSpeech from '@google/cloud-text-to-speech';
import WebSocket from 'ws';
import { Readable } from 'stream';
import dotenv from 'dotenv';
import { LLMQuestionGenerator } from './llmService.js';

dotenv.config();

/**
 * Google-powered AI Interview Agent using LiveKit Agents Framework
 * This agent handles continuous voice communication for interview sessions using Google services
 */
export class GoogleAIInterviewAgent {
  constructor() {
    this.llmService = new LLMQuestionGenerator();
    this.interviewSessions = new Map();
    this.questionCache = new Map();
    
    // Initialize Google services
    this.initializeGoogleServices();
    
    console.log('🤖 Google AI Interview Agent initialized');
  }

  /**
   * Initialize Google Cloud services
   */
  initializeGoogleServices() {
    try {
      // Initialize Gemini AI
      if (process.env.GEMINI_API_KEY) {
        this.geminiAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        this.geminiModel = this.geminiAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });
        console.log('✅ Gemini AI initialized');
      } else {
        console.warn('⚠️ GEMINI_API_KEY not found, using fallback LLM service');
      }

      // Initialize Google Cloud Speech-to-Text
      this.speechClient = new speech.SpeechClient({
        keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS,
        projectId: process.env.GOOGLE_CLOUD_PROJECT_ID
      });
      console.log('✅ Google Speech-to-Text initialized');

      // Initialize Google Cloud Text-to-Speech
      this.ttsClient = new textToSpeech.TextToSpeechClient({
        keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS,
        projectId: process.env.GOOGLE_CLOUD_PROJECT_ID
      });
      console.log('✅ Google Text-to-Speech initialized');

    } catch (error) {
      console.warn('⚠️ Google Cloud services not fully configured, using fallback methods:', error.message);
      this.useGoogleCloud = false;
    }
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
    
    console.log(`🎙️ Google AI Agent connected to room: ${room.name}`);
    
    // Wait for participant to join
    await this.waitForParticipant(ctx);
    
    // Initialize interview session
    const sessionData = await this.initializeInterviewSession(ctx);
    
    if (!sessionData) {
      console.error('❌ Failed to initialize interview session');
      return;
    }

    // Set up audio processing
    await this.setupAudioProcessing(ctx, sessionData);
    
    // Begin interview flow
    await this.startInterviewFlow(ctx, sessionData);
    
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
      // Extract interview configuration from room metadata or environment
      let config;
      
      if (room.metadata) {
        const roomMetadata = JSON.parse(room.metadata);
        config = roomMetadata.interviewConfig;
      } else if (process.env.INTERVIEW_CONFIG) {
        config = JSON.parse(process.env.INTERVIEW_CONFIG);
      }
      
      if (!config) {
        console.error('❌ No interview configuration found');
        return null;
      }

      const sessionData = {
        sessionId: room.name,
        config,
        currentQuestionIndex: 0,
        questions: [],
        responses: [],
        startTime: Date.now(),
        status: 'greeting',
        conversationHistory: [],
        isAISpeaking: false,
        isListening: false
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
   * Set up audio processing for speech recognition and synthesis
   */
  async setupAudioProcessing(ctx, sessionData) {
    const { room } = ctx;
    
    try {
      // Set up speech recognition stream
      this.setupSpeechRecognition(room, sessionData);
      
      // Set up audio output for TTS
      this.setupAudioOutput(ctx, sessionData);
      
      console.log('🎵 Audio processing setup complete');
      
    } catch (error) {
      console.error('❌ Error setting up audio processing:', error);
    }
  }

  /**
   * Set up Google Speech-to-Text recognition
   */
  setupSpeechRecognition(room, sessionData) {
    if (!this.speechClient) {
      console.warn('⚠️ Speech client not available, using fallback');
      return;
    }

    // Configure speech recognition
    const recognizeStream = this.speechClient
      .streamingRecognize({
        config: {
          encoding: 'LINEAR16',
          sampleRateHertz: 48000,
          languageCode: 'en-US',
          enableAutomaticPunctuation: true,
          enableWordTimeOffsets: true,
          model: 'latest_long'
        },
        interimResults: true,
        singleUtterance: false
      })
      .on('data', (data) => {
        this.handleSpeechRecognitionResult(data, sessionData);
      })
      .on('error', (error) => {
        console.error('❌ Speech recognition error:', error);
      });

    // Listen for audio from participants
    room.on(RoomEvent.TrackSubscribed, (track, publication, participant) => {
      if (track.kind === 'audio' && participant.identity !== 'ai-interviewer') {
        console.log('🎤 Subscribed to participant audio track');
        
        track.on('audioFrame', (frame) => {
          if (sessionData.isListening && !sessionData.isAISpeaking) {
            // Send audio frame to speech recognition
            recognizeStream.write(frame.data);
          }
        });
      }
    });

    sessionData.recognizeStream = recognizeStream;
  }

  /**
   * Handle speech recognition results
   */
  async handleSpeechRecognitionResult(data, sessionData) {
    if (data.results[0] && data.results[0].alternatives[0]) {
      const transcript = data.results[0].alternatives[0].transcript;
      const isFinal = data.results[0].isFinal;
      
      console.log(`🎤 Speech recognized: "${transcript}" (final: ${isFinal})`);
      
      if (isFinal && transcript.trim().length > 0) {
        // Process the final transcript
        await this.processUserResponse(transcript, sessionData);
      }
    }
  }

  /**
   * Set up audio output for text-to-speech
   */
  setupAudioOutput(ctx, sessionData) {
    // Create local audio track for AI speech
    sessionData.audioTrack = ctx.room.localParticipant.publishTrack(
      new LocalAudioTrack('ai-speech', {
        source: 'microphone'
      })
    );
  }

  /**
   * Start the interview flow
   */
  async startInterviewFlow(ctx, sessionData) {
    // Send initial greeting
    const greeting = this.createGreeting(sessionData.config);
    await this.speakText(greeting, sessionData);
    
    // Add to conversation history
    sessionData.conversationHistory.push({
      speaker: 'ai',
      message: greeting,
      timestamp: Date.now(),
      type: 'greeting'
    });
    
    sessionData.status = 'ready_check';
    sessionData.isListening = true;
    
    console.log('🎙️ Interview flow started, waiting for participant response');
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
    const readyCheck = "Are you ready to begin? Just say 'yes' or 'I'm ready' when you'd like to start!";
    
    return `${greeting} ${readyCheck}`;
  }

  /**
   * Convert text to speech using Google TTS
   */
  async speakText(text, sessionData) {
    try {
      sessionData.isAISpeaking = true;
      sessionData.isListening = false;
      
      console.log(`🗣️ AI speaking: "${text.substring(0, 50)}..."`);
      
      if (this.ttsClient) {
        // Use Google Cloud Text-to-Speech
        const [response] = await this.ttsClient.synthesizeSpeech({
          input: { text },
          voice: {
            languageCode: 'en-US',
            name: 'en-US-Neural2-F',
            ssmlGender: 'FEMALE'
          },
          audioConfig: {
            audioEncoding: 'LINEAR16',
            sampleRateHertz: 48000
          }
        });
        
        // Play the audio through LiveKit
        if (sessionData.audioTrack && response.audioContent) {
          await this.playAudioBuffer(response.audioContent, sessionData);
        }
        
      } else {
        // Fallback: simulate speaking delay
        await new Promise(resolve => setTimeout(resolve, text.length * 50));
      }
      
      // Resume listening after speaking
      setTimeout(() => {
        sessionData.isAISpeaking = false;
        sessionData.isListening = true;
        console.log('👂 AI finished speaking, now listening...');
      }, 1000);
      
    } catch (error) {
      console.error('❌ Error in text-to-speech:', error);
      sessionData.isAISpeaking = false;
      sessionData.isListening = true;
    }
  }

  /**
   * Play audio buffer through LiveKit
   */
  async playAudioBuffer(audioBuffer, sessionData) {
    try {
      // Convert audio buffer to audio frames and send through LiveKit
      const audioData = new Uint8Array(audioBuffer);
      const frameSize = 1920; // 40ms at 48kHz
      
      for (let i = 0; i < audioData.length; i += frameSize) {
        const frameData = audioData.slice(i, i + frameSize);
        const audioFrame = new AudioFrame(frameData, 48000, 1, frameData.length / 2);
        
        if (sessionData.audioTrack) {
          await sessionData.audioTrack.publishAudioFrame(audioFrame);
        }
        
        // Small delay to maintain real-time playback
        await new Promise(resolve => setTimeout(resolve, 40));
      }
      
    } catch (error) {
      console.error('❌ Error playing audio buffer:', error);
    }
  }

  /**
   * Process user response
   */
  async processUserResponse(transcript, sessionData) {
    try {
      console.log(`📝 Processing user response: "${transcript}"`);
      
      // Add to conversation history
      sessionData.conversationHistory.push({
        speaker: 'user',
        message: transcript,
        timestamp: Date.now(),
        type: 'response'
      });
      
      // Determine next action based on current status
      if (sessionData.status === 'ready_check') {
        if (this.isReadyResponse(transcript)) {
          await this.startMainInterview(sessionData);
        } else {
          await this.handleNotReadyResponse(sessionData);
        }
      } else if (sessionData.status === 'interviewing') {
        await this.handleInterviewResponse(transcript, sessionData);
      }
      
    } catch (error) {
      console.error('❌ Error processing user response:', error);
    }
  }

  /**
   * Check if user is ready to start
   */
  isReadyResponse(transcript) {
    const readyKeywords = ['yes', 'ready', 'start', 'begin', 'sure', 'okay', 'ok', 'let\'s go'];
    const lowerTranscript = transcript.toLowerCase();
    
    return readyKeywords.some(keyword => lowerTranscript.includes(keyword));
  }

  /**
   * Start the main interview
   */
  async startMainInterview(sessionData) {
    sessionData.status = 'interviewing';
    
    const startMessage = "Excellent! Let's begin the interview. Here's your first question:";
    await this.speakText(startMessage, sessionData);
    
    // Ask first question
    await this.askNextQuestion(sessionData);
  }

  /**
   * Handle when user is not ready
   */
  async handleNotReadyResponse(sessionData) {
    const encouragement = "No problem! Take your time. When you're ready to start the interview, just let me know by saying 'I'm ready' or 'yes'.";
    await this.speakText(encouragement, sessionData);
  }

  /**
   * Handle interview response
   */
  async handleInterviewResponse(transcript, sessionData) {
    // Store the response
    const currentQuestion = sessionData.questions[sessionData.currentQuestionIndex - 1];
    
    sessionData.responses.push({
      question: currentQuestion,
      response: transcript,
      timestamp: Date.now(),
      duration: Date.now() - sessionData.startTime
    });
    
    // Generate feedback using Gemini
    const feedback = await this.generateResponseFeedback(currentQuestion, transcript, sessionData.config);
    
    if (feedback) {
      await this.speakText(feedback, sessionData);
      
      sessionData.conversationHistory.push({
        speaker: 'ai',
        message: feedback,
        timestamp: Date.now(),
        type: 'feedback'
      });
    }
    
    // Check if interview should continue
    if (this.shouldContinueInterview(sessionData)) {
      await this.askNextQuestion(sessionData);
    } else {
      await this.endInterview(sessionData);
    }
  }

  /**
   * Ask the next question
   */
  async askNextQuestion(sessionData) {
    try {
      let question;
      
      // Use pre-generated question if available
      if (sessionData.questions.length > sessionData.currentQuestionIndex) {
        question = sessionData.questions[sessionData.currentQuestionIndex];
      } else {
        // Generate new question
        question = await this.generateNextQuestion(sessionData);
        sessionData.questions.push(question);
      }
      
      sessionData.currentQuestionIndex++;
      
      await this.speakText(question, sessionData);
      
      sessionData.conversationHistory.push({
        speaker: 'ai',
        message: question,
        timestamp: Date.now(),
        type: 'question'
      });
      
      console.log(`❓ Asked question ${sessionData.currentQuestionIndex}: ${question.substring(0, 50)}...`);
      
    } catch (error) {
      console.error('❌ Error asking next question:', error);
    }
  }

  /**
   * Generate response feedback using Gemini
   */
  async generateResponseFeedback(question, response, config) {
    try {
      if (!this.geminiModel) {
        return "Thank you for your response. Let's continue with the next question.";
      }
      
      const prompt = `As an AI interviewer, provide brief, encouraging feedback (1-2 sentences) for this interview response:

Question: "${question}"
Response: "${response}"
Interview Context: ${config.style} interview for ${config.topic}, ${config.experienceLevel} level

Provide constructive, positive feedback that acknowledges their response and transitions to the next question. Keep it conversational and encouraging.`;

      const result = await this.geminiModel.generateContent(prompt);
      const feedback = result.response.text().trim();
      
      return feedback;
      
    } catch (error) {
      console.error('❌ Error generating feedback:', error);
      return "Thank you for that response. Let's move on to the next question.";
    }
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
  async generateNextQuestion(sessionData) {
    try {
      const question = await this.llmService.generateQuestion({
        config: sessionData.config,
        previousQuestions: sessionData.questions,
        previousResponses: sessionData.responses,
        questionNumber: sessionData.currentQuestionIndex + 1
      });
      
      console.log(`🆕 Generated new question: ${question.substring(0, 50)}...`);
      return question;
      
    } catch (error) {
      console.error('❌ Error generating question:', error);
      return "Can you tell me about your experience with this technology?";
    }
  }

  /**
   * Check if interview should continue
   */
  shouldContinueInterview(sessionData) {
    const timeElapsed = Date.now() - sessionData.startTime;
    const maxDuration = sessionData.config.duration * 60 * 1000;
    const maxQuestions = Math.min(Math.max(3, Math.floor(sessionData.config.duration / 5)), 10);
    
    return sessionData.status === 'interviewing' && 
           timeElapsed < maxDuration && 
           sessionData.currentQuestionIndex < maxQuestions;
  }

  /**
   * End the interview
   */
  async endInterview(sessionData) {
    sessionData.status = 'completed';
    sessionData.endTime = Date.now();
    
    const closingMessage = "Thank you for completing the interview! You did a great job. I'll now generate your detailed analytics and feedback.";
    await this.speakText(closingMessage, sessionData);
    
    sessionData.conversationHistory.push({
      speaker: 'ai',
      message: closingMessage,
      timestamp: Date.now(),
      type: 'feedback'
    });
    
    console.log(`✅ Interview completed for session: ${sessionData.sessionId}`);
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
      config: session.config,
      conversationHistory: session.conversationHistory
    };
  }
}

// Create and export the agent
const googleAiAgent = new GoogleAIInterviewAgent();
export const agent = googleAiAgent.createAgent();

// CLI entry point for running the agent
if (import.meta.url === `file://${process.argv[1]}`) {
  cli.runApp(new WorkerOptions({
    agent,
    logLevel: 'info'
  }));
}