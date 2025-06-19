import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Multi-Provider AI Agent Service Manager
 * Manages the lifecycle of LiveKit AI agents for voice interviews using OpenAI or Google services
 */
export class AIAgentService {
  constructor() {
    this.agents = new Map();
    this.provider = process.env.VOICE_AGENT_PROVIDER || 'google';
    this.isEnabled = this.checkConfiguration();
    
    if (this.isEnabled) {
      console.log(`🤖 AI Agent Service initialized with ${this.provider.toUpperCase()} provider`);
    } else {
      console.warn('⚠️ AI Agent Service disabled - missing configuration');
    }
  }

  /**
   * Check if required configuration is available for the selected provider
   */
  checkConfiguration() {
    const required = [
      'LIVEKIT_API_KEY',
      'LIVEKIT_API_SECRET', 
      'LIVEKIT_WS_URL'
    ];
    
    const openaiRequired = ['OPENAI_API_KEY'];
    const googleRecommended = [
      'GEMINI_API_KEY',
      'GOOGLE_APPLICATION_CREDENTIALS',
      'GOOGLE_CLOUD_PROJECT_ID'
    ];
    
    const missing = required.filter(key => !process.env[key]);
    
    if (missing.length > 0) {
      console.warn(`⚠️ Missing required environment variables for AI Agent: ${missing.join(', ')}`);
      return false;
    }
    
    // Check provider-specific requirements
    if (this.provider === 'openai') {
      const missingOpenAI = openaiRequired.filter(key => !process.env[key]);
      if (missingOpenAI.length > 0) {
        console.warn(`⚠️ Missing OpenAI variables: ${missingOpenAI.join(', ')}`);
        console.warn('⚠️ Falling back to Google provider');
        this.provider = 'google';
      }
    }
    
    if (this.provider === 'google') {
      const missingGoogle = googleRecommended.filter(key => !process.env[key]);
      if (missingGoogle.length > 0) {
        console.warn(`⚠️ Missing Google Cloud variables: ${missingGoogle.join(', ')}`);
        console.warn('⚠️ Agent will use fallback methods for speech processing');
      }
    }
    
    return true;
  }

  /**
   * Start an AI agent for a specific room
   */
  async startAgentForRoom(roomName, interviewConfig) {
    if (!this.isEnabled) {
      throw new Error('AI Agent Service is not properly configured');
    }

    try {
      console.log(`🚀 Starting ${this.provider.toUpperCase()} AI agent for room: ${roomName}`);
      
      // Prepare environment variables for the agent
      const agentEnv = {
        ...process.env,
        LIVEKIT_URL: process.env.LIVEKIT_WS_URL,
        LIVEKIT_API_KEY: process.env.LIVEKIT_API_KEY,
        LIVEKIT_API_SECRET: process.env.LIVEKIT_API_SECRET,
        VOICE_AGENT_PROVIDER: this.provider,
        INTERVIEW_ROOM: roomName,
        INTERVIEW_CONFIG: JSON.stringify(interviewConfig),
        LLM_PROVIDER: process.env.LLM_PROVIDER || 'gemini'
      };

      // Add provider-specific environment variables
      if (this.provider === 'openai') {
        agentEnv.OPENAI_API_KEY = process.env.OPENAI_API_KEY;
      } else if (this.provider === 'google') {
        agentEnv.GEMINI_API_KEY = process.env.GEMINI_API_KEY;
        agentEnv.GOOGLE_APPLICATION_CREDENTIALS = process.env.GOOGLE_APPLICATION_CREDENTIALS;
        agentEnv.GOOGLE_CLOUD_PROJECT_ID = process.env.GOOGLE_CLOUD_PROJECT_ID;
      }

      // Start the agent process
      const agentPath = join(__dirname, 'aiAgent.js');
      const agentProcess = spawn('node', [agentPath, '--room', roomName], {
        env: agentEnv,
        stdio: ['pipe', 'pipe', 'pipe']
      });

      // Handle agent output
      agentProcess.stdout.on('data', (data) => {
        console.log(`[${this.provider.toUpperCase()}Agent-${roomName}] ${data.toString().trim()}`);
      });

      agentProcess.stderr.on('data', (data) => {
        console.error(`[${this.provider.toUpperCase()}Agent-${roomName}] ERROR: ${data.toString().trim()}`);
      });

      agentProcess.on('close', (code) => {
        console.log(`[${this.provider.toUpperCase()}Agent-${roomName}] Process exited with code ${code}`);
        this.agents.delete(roomName);
      });

      agentProcess.on('error', (error) => {
        console.error(`[${this.provider.toUpperCase()}Agent-${roomName}] Process error:`, error);
        this.agents.delete(roomName);
      });

      // Store agent reference
      this.agents.set(roomName, {
        process: agentProcess,
        roomName,
        config: interviewConfig,
        startTime: Date.now(),
        provider: this.provider
      });

      console.log(`✅ ${this.provider.toUpperCase()} AI agent started for room: ${roomName}`);
      
      return {
        success: true,
        agentId: roomName,
        provider: this.provider,
        message: `${this.provider.toUpperCase()} AI agent started successfully`
      };

    } catch (error) {
      console.error(`❌ Failed to start ${this.provider.toUpperCase()} AI agent for room ${roomName}:`, error);
      throw new Error(`Failed to start ${this.provider.toUpperCase()} AI agent: ${error.message}`);
    }
  }

  /**
   * Stop an AI agent for a specific room
   */
  async stopAgentForRoom(roomName) {
    const agent = this.agents.get(roomName);
    
    if (!agent) {
      console.warn(`⚠️ No agent found for room: ${roomName}`);
      return { success: false, message: 'Agent not found' };
    }

    try {
      console.log(`🛑 Stopping ${agent.provider.toUpperCase()} AI agent for room: ${roomName}`);
      
      // Gracefully terminate the agent process
      agent.process.kill('SIGTERM');
      
      // Force kill after timeout
      setTimeout(() => {
        if (!agent.process.killed) {
          console.warn(`⚠️ Force killing ${agent.provider.toUpperCase()} AI agent for room: ${roomName}`);
          agent.process.kill('SIGKILL');
        }
      }, 5000);

      this.agents.delete(roomName);
      
      console.log(`✅ ${agent.provider.toUpperCase()} AI agent stopped for room: ${roomName}`);
      
      return {
        success: true,
        message: `${agent.provider.toUpperCase()} AI agent stopped successfully`
      };

    } catch (error) {
      console.error(`❌ Failed to stop ${agent.provider.toUpperCase()} AI agent for room ${roomName}:`, error);
      return {
        success: false,
        message: `Failed to stop agent: ${error.message}`
      };
    }
  }

  /**
   * Get status of all active agents
   */
  getActiveAgents() {
    const activeAgents = [];
    
    for (const [roomName, agent] of this.agents) {
      activeAgents.push({
        roomName,
        config: agent.config,
        provider: agent.provider,
        startTime: agent.startTime,
        uptime: Date.now() - agent.startTime,
        pid: agent.process.pid
      });
    }
    
    return activeAgents;
  }

  /**
   * Get agent status for a specific room
   */
  getAgentStatus(roomName) {
    const agent = this.agents.get(roomName);
    
    if (!agent) {
      return { active: false, message: 'Agent not found' };
    }
    
    return {
      active: true,
      roomName,
      config: agent.config,
      provider: agent.provider,
      startTime: agent.startTime,
      uptime: Date.now() - agent.startTime,
      pid: agent.process.pid
    };
  }

  /**
   * Stop all active agents
   */
  async stopAllAgents() {
    console.log(`🛑 Stopping all ${this.provider.toUpperCase()} AI agents...`);
    
    const stopPromises = Array.from(this.agents.keys()).map(roomName => 
      this.stopAgentForRoom(roomName)
    );
    
    await Promise.all(stopPromises);
    
    console.log(`✅ All ${this.provider.toUpperCase()} AI agents stopped`);
  }

  /**
   * Switch provider (for runtime configuration)
   */
  switchProvider(newProvider) {
    if (newProvider !== 'openai' && newProvider !== 'google') {
      throw new Error(`Unsupported provider: ${newProvider}`);
    }
    
    console.log(`🔄 Switching AI agent provider from ${this.provider.toUpperCase()} to ${newProvider.toUpperCase()}`);
    
    this.provider = newProvider;
    process.env.VOICE_AGENT_PROVIDER = newProvider;
    
    // Re-check configuration for new provider
    this.isEnabled = this.checkConfiguration();
    
    console.log(`✅ Provider switched to ${this.provider.toUpperCase()}`);
    
    return {
      success: true,
      provider: this.provider,
      enabled: this.isEnabled
    };
  }

  /**
   * Check if service is enabled and configured
   */
  isServiceEnabled() {
    return this.isEnabled;
  }

  /**
   * Get current provider
   */
  getCurrentProvider() {
    return this.provider;
  }

  /**
   * Get service statistics
   */
  getServiceStats() {
    return {
      enabled: this.isEnabled,
      provider: this.provider,
      activeAgents: this.agents.size,
      totalAgentsStarted: this.agents.size,
      configuration: {
        hasLiveKitConfig: !!(process.env.LIVEKIT_API_KEY && process.env.LIVEKIT_API_SECRET && process.env.LIVEKIT_WS_URL),
        openai: {
          available: !!process.env.OPENAI_API_KEY,
          hasApiKey: !!process.env.OPENAI_API_KEY
        },
        google: {
          available: !!(process.env.GEMINI_API_KEY || process.env.GOOGLE_APPLICATION_CREDENTIALS),
          hasGeminiConfig: !!process.env.GEMINI_API_KEY,
          hasGoogleCloudConfig: !!(process.env.GOOGLE_APPLICATION_CREDENTIALS && process.env.GOOGLE_CLOUD_PROJECT_ID),
          speechToText: !!process.env.GOOGLE_APPLICATION_CREDENTIALS,
          textToSpeech: !!process.env.GOOGLE_APPLICATION_CREDENTIALS
        }
      }
    };
  }
}