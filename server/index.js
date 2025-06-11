import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { LLMQuestionGenerator } from './llmService.js';
import { LiveKitService } from './livekitService.js';
import { VoiceInterviewService } from './voiceInterviewService.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Initialize services
const questionGenerator = new LLMQuestionGenerator();
const livekitService = new LiveKitService();
const voiceInterviewService = new VoiceInterviewService(livekitService, questionGenerator);

// Existing text-based interview routes
app.post('/api/generate-question', async (req, res) => {
  try {
    const { config, previousQuestions, previousResponses, questionNumber } = req.body;
    
    const question = await questionGenerator.generateQuestion({
      config,
      previousQuestions: previousQuestions || [],
      previousResponses: previousResponses || [],
      questionNumber: questionNumber || 1
    });
    
    res.json({ question });
  } catch (error) {
    console.error('Error generating question:', error);
    res.status(500).json({ 
      error: 'Failed to generate question',
      message: error.message 
    });
  }
});

app.post('/api/generate-followup', async (req, res) => {
  try {
    const { question, response, config } = req.body;
    
    const followUp = await questionGenerator.generateFollowUp({
      originalQuestion: question,
      userResponse: response,
      config
    });
    
    res.json({ followUp });
  } catch (error) {
    console.error('Error generating follow-up:', error);
    res.status(500).json({ 
      error: 'Failed to generate follow-up question',
      message: error.message 
    });
  }
});

app.post('/api/analyze-response', async (req, res) => {
  try {
    const { question, response, config } = req.body;
    
    const analysis = await questionGenerator.analyzeResponse({
      question,
      response,
      config
    });
    
    res.json({ analysis });
  } catch (error) {
    console.error('Error analyzing response:', error);
    res.status(500).json({ 
      error: 'Failed to analyze response',
      message: error.message 
    });
  }
});

app.post('/api/generate-analytics', async (req, res) => {
  try {
    const { responses, config } = req.body;
    
    const analytics = await questionGenerator.generateComprehensiveAnalytics({
      responses,
      config
    });
    
    res.json({ analytics });
  } catch (error) {
    console.error('Error generating analytics:', error);
    res.status(500).json({ 
      error: 'Failed to generate analytics',
      message: error.message 
    });
  }
});

// New LiveKit voice interview routes
app.post('/api/voice-interview/start', async (req, res) => {
  try {
    const { config, participantName } = req.body;
    
    if (!livekitService.isConfigured()) {
      return res.status(503).json({
        error: 'Voice interviews not available',
        message: 'LiveKit is not configured. Please check your environment variables.'
      });
    }
    
    const interviewData = await voiceInterviewService.startVoiceInterview(config, participantName);
    res.json(interviewData);
  } catch (error) {
    console.error('Error starting voice interview:', error);
    res.status(500).json({
      error: 'Failed to start voice interview',
      message: error.message
    });
  }
});

app.post('/api/voice-interview/:sessionId/response', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { transcription, audioMetadata } = req.body;
    
    const result = await voiceInterviewService.processVoiceResponse(
      sessionId, 
      transcription, 
      audioMetadata
    );
    
    res.json(result);
  } catch (error) {
    console.error('Error processing voice response:', error);
    res.status(500).json({
      error: 'Failed to process voice response',
      message: error.message
    });
  }
});

app.post('/api/voice-interview/:sessionId/followup', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { responseText } = req.body;
    
    const followUp = await voiceInterviewService.generateFollowUp(sessionId, responseText);
    res.json(followUp);
  } catch (error) {
    console.error('Error generating follow-up:', error);
    res.status(500).json({
      error: 'Failed to generate follow-up',
      message: error.message
    });
  }
});

app.post('/api/voice-interview/:sessionId/pause', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const result = voiceInterviewService.pauseInterview(sessionId);
    res.json(result);
  } catch (error) {
    console.error('Error pausing interview:', error);
    res.status(500).json({
      error: 'Failed to pause interview',
      message: error.message
    });
  }
});

app.post('/api/voice-interview/:sessionId/resume', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const result = voiceInterviewService.resumeInterview(sessionId);
    res.json(result);
  } catch (error) {
    console.error('Error resuming interview:', error);
    res.status(500).json({
      error: 'Failed to resume interview',
      message: error.message
    });
  }
});

app.post('/api/voice-interview/:sessionId/end', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const result = await voiceInterviewService.endInterview(sessionId);
    res.json(result);
  } catch (error) {
    console.error('Error ending interview:', error);
    res.status(500).json({
      error: 'Failed to end interview',
      message: error.message
    });
  }
});

app.get('/api/voice-interview/:sessionId/status', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const status = voiceInterviewService.getSessionStatus(sessionId);
    res.json(status);
  } catch (error) {
    console.error('Error getting session status:', error);
    res.status(500).json({
      error: 'Failed to get session status',
      message: error.message
    });
  }
});

app.post('/api/voice-interview/:sessionId/reconnect', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { participantName } = req.body;
    
    const reconnectData = await voiceInterviewService.reconnectToSession(sessionId, participantName);
    res.json(reconnectData);
  } catch (error) {
    console.error('Error reconnecting to session:', error);
    res.status(500).json({
      error: 'Failed to reconnect to session',
      message: error.message
    });
  }
});

// Admin routes
app.get('/api/voice-interview/sessions/active', (req, res) => {
  try {
    const sessions = voiceInterviewService.getActiveSessions();
    res.json({ sessions });
  } catch (error) {
    console.error('Error getting active sessions:', error);
    res.status(500).json({
      error: 'Failed to get active sessions',
      message: error.message
    });
  }
});

// LiveKit configuration check
app.get('/api/livekit/config', (req, res) => {
  res.json({
    configured: livekitService.isConfigured(),
    wsUrl: livekitService.isConfigured() ? livekitService.wsUrl : null
  });
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    services: {
      llm: !!questionGenerator.apiKey,
      livekit: livekitService.isConfigured()
    }
  });
});

// LiveKit webhook endpoint (for handling room events)
app.post('/api/livekit/webhook', (req, res) => {
  try {
    // Verify webhook signature
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: 'Missing authorization header' });
    }

    const token = authHeader.replace('Bearer ', '');
    const verification = livekitService.verifyWebhookSignature(token, req.body);
    
    if (!verification.valid) {
      return res.status(401).json({ error: 'Invalid webhook signature' });
    }

    // Handle webhook events
    const { event, room, participant } = req.body;
    console.log(`LiveKit webhook: ${event}`, { room: room?.name, participant: participant?.identity });

    // You can add custom logic here to handle specific events
    // For example: participant_joined, participant_left, room_finished, etc.

    res.json({ received: true });
  } catch (error) {
    console.error('Error handling LiveKit webhook:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 AI Interview Backend running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
  console.log(`🎙️ LiveKit configured: ${livekitService.isConfigured()}`);
  if (livekitService.isConfigured()) {
    console.log(`🔗 LiveKit WebSocket URL: ${livekitService.wsUrl}`);
  } else {
    console.log(`⚠️  To enable voice interviews, configure LiveKit environment variables:`);
    console.log(`   LIVEKIT_API_KEY=your_api_key`);
    console.log(`   LIVEKIT_API_SECRET=your_api_secret`);
    console.log(`   LIVEKIT_WS_URL=wss://your-livekit-server.com`);
  }
});