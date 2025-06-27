import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { LLMQuestionGenerator } from './llmService.js';
import { LiveKitService } from './livekitService.js';
import { VoiceInterviewService } from './voiceInterviewService.js';
import { AIAgentService } from './aiAgentService.js';

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
const aiAgentService = new AIAgentService();

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

// Enhanced voice interview routes with AI agent support
app.post('/api/voice-interview/start', async (req, res) => {
  try {
    console.log('[API] Voice interview start request received');
    console.log('[API] Request body:', JSON.stringify(req.body, null, 2));
    
    const { config, participantName, enableAIAgent = true, agentProvider } = req.body;
    
    // Validate request body
    if (!config) {
      console.error('[API] Missing config in request body');
      return res.status(400).json({
        error: 'Missing configuration',
        message: 'Interview configuration is required'
      });
    }
    
    if (!participantName) {
      console.error('[API] Missing participantName in request body');
      return res.status(400).json({
        error: 'Missing participant name',
        message: 'Participant name is required'
      });
    }
    
    // Check LiveKit configuration
    console.log('[API] Checking LiveKit configuration...');
    if (!livekitService.isConfigured()) {
      console.error('[API] LiveKit not configured');
      return res.status(503).json({
        error: 'Voice interviews not available',
        message: 'LiveKit is not configured. Please check your environment variables.',
        details: {
          hasApiKey: !!process.env.LIVEKIT_API_KEY,
          hasApiSecret: !!process.env.LIVEKIT_API_SECRET,
          hasWsUrl: !!process.env.LIVEKIT_WS_URL
        }
      });
    }
    
    console.log('[API] LiveKit is configured, starting voice interview...');
    const interviewData = await voiceInterviewService.startVoiceInterview(config, participantName);
    
    // Switch provider if requested
    if (agentProvider && aiAgentService.isServiceEnabled()) {
      try {
        aiAgentService.switchProvider(agentProvider);
        console.log(`[API] Switched to ${agentProvider.toUpperCase()} provider`);
      } catch (switchError) {
        console.warn(`[API] Failed to switch to ${agentProvider}, using default:`, switchError.message);
      }
    }
    
    // Start AI agent if enabled and service is available
    if (enableAIAgent && aiAgentService.isServiceEnabled()) {
      try {
        console.log(`[API] Starting ${aiAgentService.getCurrentProvider().toUpperCase()} AI agent for continuous voice communication...`);
        
        await aiAgentService.startAgentForRoom(interviewData.roomName, config);
        
        interviewData.aiAgentEnabled = true;
        interviewData.conversationalMode = true;
        interviewData.agentProvider = aiAgentService.getCurrentProvider();
        
        console.log(`[API] ✅ ${aiAgentService.getCurrentProvider().toUpperCase()} AI agent started successfully`);
        
      } catch (agentError) {
        console.error('[API] ⚠️ Failed to start AI agent, continuing without:', agentError);
        interviewData.aiAgentEnabled = false;
        interviewData.conversationalMode = false;
        interviewData.agentError = agentError.message;
      }
    } else {
      console.log('[API] AI agent disabled or not configured');
      interviewData.aiAgentEnabled = false;
      interviewData.conversationalMode = false;
    }
    
    console.log('[API] Voice interview started successfully');
    console.log('[API] Response data keys:', Object.keys(interviewData));
    
    res.json(interviewData);
  } catch (error) {
    console.error('[API] Error starting voice interview:', error);
    console.error('[API] Error stack:', error.stack);
    console.error('[API] Error name:', error.name);
    console.error('[API] Error message:', error.message);
    
    res.status(500).json({
      error: 'Failed to start voice interview',
      message: error.message,
      details: {
        errorName: error.name,
        timestamp: new Date().toISOString()
      }
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
    
    // Stop AI agent if it was running
    if (aiAgentService.isServiceEnabled()) {
      try {
        await aiAgentService.stopAgentForRoom(sessionId);
        console.log(`[API] AI agent stopped for session: ${sessionId}`);
      } catch (agentError) {
        console.warn(`[API] Failed to stop AI agent for session ${sessionId}:`, agentError);
      }
    }
    
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
    
    // Add AI agent status if available
    if (aiAgentService.isServiceEnabled()) {
      const agentStatus = aiAgentService.getAgentStatus(sessionId);
      status.aiAgent = agentStatus;
    }
    
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

// AI Agent management routes
app.get('/api/ai-agent/status', (req, res) => {
  try {
    const stats = aiAgentService.getServiceStats();
    const activeAgents = aiAgentService.getActiveAgents();
    
    res.json({
      service: stats,
      activeAgents,
      currentProvider: aiAgentService.getCurrentProvider()
    });
  } catch (error) {
    console.error('Error getting AI agent status:', error);
    res.status(500).json({
      error: 'Failed to get AI agent status',
      message: error.message
    });
  }
});

app.post('/api/ai-agent/switch-provider', (req, res) => {
  try {
    const { provider } = req.body;
    
    if (!provider || (provider !== 'openai' && provider !== 'google')) {
      return res.status(400).json({
        error: 'Invalid provider',
        message: 'Provider must be either "openai" or "google"'
      });
    }
    
    const result = aiAgentService.switchProvider(provider);
    res.json(result);
  } catch (error) {
    console.error('Error switching AI agent provider:', error);
    res.status(500).json({
      error: 'Failed to switch provider',
      message: error.message
    });
  }
});

app.post('/api/ai-agent/:roomName/start', async (req, res) => {
  try {
    const { roomName } = req.params;
    const { config, provider } = req.body;
    
    // Switch provider if specified
    if (provider) {
      aiAgentService.switchProvider(provider);
    }
    
    const result = await aiAgentService.startAgentForRoom(roomName, config);
    res.json(result);
  } catch (error) {
    console.error('Error starting AI agent:', error);
    res.status(500).json({
      error: 'Failed to start AI agent',
      message: error.message
    });
  }
});

app.post('/api/ai-agent/:roomName/stop', async (req, res) => {
  try {
    const { roomName } = req.params;
    
    const result = await aiAgentService.stopAgentForRoom(roomName);
    res.json(result);
  } catch (error) {
    console.error('Error stopping AI agent:', error);
    res.status(500).json({
      error: 'Failed to stop AI agent',
      message: error.message
    });
  }
});

// Admin routes
app.get('/api/voice-interview/sessions/active', (req, res) => {
  try {
    const sessions = voiceInterviewService.getActiveSessions();
    const agents = aiAgentService.getActiveAgents();
    
    res.json({ 
      sessions,
      aiAgents: agents,
      currentProvider: aiAgentService.getCurrentProvider()
    });
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
  try {
    console.log('[API] LiveKit config check requested');
    console.log('[API] Environment variables:');
    console.log('- LIVEKIT_API_KEY:', process.env.LIVEKIT_API_KEY ? 'Set' : 'Not set');
    console.log('- LIVEKIT_API_SECRET:', process.env.LIVEKIT_API_SECRET ? 'Set' : 'Not set');
    console.log('- LIVEKIT_WS_URL:', process.env.LIVEKIT_WS_URL ? `"${process.env.LIVEKIT_WS_URL}"` : 'Not set');
    
    const configured = livekitService.isConfigured();
    const wsUrl = livekitService.getWebSocketUrl();
    const aiAgentStats = aiAgentService.getServiceStats();
    
    console.log('[API] LiveKit configured:', configured);
    console.log('[API] LiveKit wsUrl:', `"${wsUrl}"`);
    console.log('[API] AI Agent service enabled:', aiAgentStats.enabled);
    console.log('[API] AI Agent provider:', aiAgentService.getCurrentProvider());
    
    res.json({
      configured,
      wsUrl: configured ? wsUrl : null,
      aiAgent: {
        ...aiAgentStats,
        currentProvider: aiAgentService.getCurrentProvider()
      },
      timestamp: new Date().toISOString(),
      debug: {
        hasApiKey: !!process.env.LIVEKIT_API_KEY,
        hasApiSecret: !!process.env.LIVEKIT_API_SECRET,
        hasWsUrl: !!process.env.LIVEKIT_WS_URL,
        rawWsUrl: process.env.LIVEKIT_WS_URL
      }
    });
  } catch (error) {
    console.error('[API] Error checking LiveKit config:', error);
    res.status(500).json({
      error: 'Failed to check LiveKit configuration',
      message: error.message
    });
  }
});

// Enhanced Health Check Endpoint
app.get('/api/health', async (req, res) => {
  try {
    const healthStatus = {
      status: 'OK',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      services: {
        llm: {
          configured: !!questionGenerator.apiKey,
          provider: questionGenerator.provider?.toUpperCase() || 'UNKNOWN',
          status: 'operational'
        },
        livekit: {
          configured: livekitService.isConfigured(),
          status: livekitService.isConfigured() ? 'operational' : 'disabled',
          wsUrl: livekitService.isConfigured() ? livekitService.wsUrl : null
        },
        agentic: {
          questionGeneration: !!questionGenerator.agenticOrchestrator,
          performanceAnalysis: !!questionGenerator.performanceAnalysisOrchestrator,
          status: questionGenerator.agenticOrchestrator ? 'operational' : 'fallback'
        },
        aiAgent: {
          enabled: aiAgentService.isServiceEnabled(),
          provider: aiAgentService.getCurrentProvider(),
          activeAgents: aiAgentService.getActiveAgents().length,
          status: aiAgentService.isServiceEnabled() ? 'operational' : 'disabled'
        }
      },
      system: {
        nodeVersion: process.version,
        platform: process.platform,
        arch: process.arch,
        memory: {
          used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
          total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
          external: Math.round(process.memoryUsage().external / 1024 / 1024)
        },
        cpu: process.cpuUsage()
      }
    };

    // Perform basic service checks
    try {
      // Test LLM service availability
      if (questionGenerator.apiKey) {
        healthStatus.services.llm.lastCheck = new Date().toISOString();
      }

      // Test agentic framework stats
      if (questionGenerator.agenticOrchestrator) {
        const agenticStats = questionGenerator.getAgenticStats();
        healthStatus.services.agentic.stats = agenticStats;
      }

      // Test AI agent service stats
      if (aiAgentService.isServiceEnabled()) {
        const agentStats = aiAgentService.getServiceStats();
        healthStatus.services.aiAgent.stats = agentStats;
      }

    } catch (serviceError) {
      console.warn('Service check warning:', serviceError.message);
      healthStatus.warnings = healthStatus.warnings || [];
      healthStatus.warnings.push(`Service check: ${serviceError.message}`);
    }

    // Determine overall health status
    const criticalServices = [
      healthStatus.services.llm.configured
    ];

    const allCriticalServicesUp = criticalServices.every(service => service);
    
    if (!allCriticalServicesUp) {
      healthStatus.status = 'DEGRADED';
      healthStatus.message = 'Some critical services are not available';
    }

    // Set appropriate HTTP status code
    const httpStatus = healthStatus.status === 'OK' ? 200 : 
                      healthStatus.status === 'DEGRADED' ? 200 : 503;

    res.status(httpStatus).json(healthStatus);

  } catch (error) {
    console.error('Health check error:', error);
    res.status(503).json({
      status: 'ERROR',
      timestamp: new Date().toISOString(),
      error: 'Health check failed',
      message: error.message,
      services: {
        llm: { status: 'unknown' },
        livekit: { status: 'unknown' },
        agentic: { status: 'unknown' },
        aiAgent: { status: 'unknown' }
      }
    });
  }
});

// Enhanced System Info Endpoint
app.get('/api/system/info', (req, res) => {
  try {
    const systemInfo = {
      application: {
        name: 'AI Interview Practice Platform',
        version: process.env.npm_package_version || '1.0.0',
        environment: process.env.NODE_ENV || 'development',
        uptime: process.uptime(),
        startTime: new Date(Date.now() - process.uptime() * 1000).toISOString()
      },
      runtime: {
        node: process.version,
        platform: process.platform,
        arch: process.arch,
        pid: process.pid
      },
      memory: {
        heapUsed: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
        heapTotal: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
        external: Math.round(process.memoryUsage().external / 1024 / 1024),
        rss: Math.round(process.memoryUsage().rss / 1024 / 1024)
      },
      configuration: {
        port: PORT,
        llmProvider: questionGenerator.provider?.toUpperCase() || 'UNKNOWN',
        livekitConfigured: livekitService.isConfigured(),
        agenticFramework: !!questionGenerator.agenticOrchestrator,
        aiAgentService: aiAgentService.isServiceEnabled(),
        voiceAgentProvider: aiAgentService.getCurrentProvider()
      }
    };

    res.json(systemInfo);
  } catch (error) {
    console.error('System info error:', error);
    res.status(500).json({
      error: 'Failed to get system information',
      message: error.message
    });
  }
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

    res.json({ received: true });
  } catch (error) {
    console.error('Error handling LiveKit webhook:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

// Graceful shutdown handling
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully');
  
  // Stop all AI agents
  if (aiAgentService.isServiceEnabled()) {
    await aiAgentService.stopAllAgents();
  }
  
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, shutting down gracefully');
  
  // Stop all AI agents
  if (aiAgentService.isServiceEnabled()) {
    await aiAgentService.stopAllAgents();
  }
  
  process.exit(0);
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 AI Interview Backend running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
  console.log(`ℹ️  System info: http://localhost:${PORT}/api/system/info`);
  console.log(`🎙️ LiveKit configured: ${livekitService.isConfigured()}`);
  
  if (livekitService.isConfigured()) {
    console.log(`🔗 LiveKit WebSocket URL: ${livekitService.wsUrl}`);
  } else {
    console.log(`⚠️  To enable voice interviews, configure LiveKit environment variables:`);
    console.log(`   LIVEKIT_API_KEY=your_api_key`);
    console.log(`   LIVEKIT_API_SECRET=your_api_secret`);
    console.log(`   LIVEKIT_WS_URL=wss://your-livekit-server.com`);
  }

  // Log LLM configuration
  console.log(`🤖 LLM Provider: ${questionGenerator.provider?.toUpperCase() || 'NOT CONFIGURED'}`);
  console.log(`🧠 Agentic Framework: ${questionGenerator.agenticOrchestrator ? 'ENABLED' : 'DISABLED'}`);
  
  if (questionGenerator.agenticOrchestrator) {
    const stats = questionGenerator.getAgenticStats();
    console.log(`📈 Agentic Stats:`, stats);
  }

  // Log AI Agent service status
  console.log(`🤖 AI Agent Service: ${aiAgentService.isServiceEnabled() ? 'ENABLED' : 'DISABLED'}`);
  console.log(`🎙️ Voice Agent Provider: ${aiAgentService.getCurrentProvider().toUpperCase()}`);
  
  if (aiAgentService.isServiceEnabled()) {
    const agentStats = aiAgentService.getServiceStats();
    console.log(`🎙️ AI Agent Stats:`, agentStats);
  } else {
    console.log(`⚠️  To enable AI agents, ensure required API keys are configured`);
  }
});