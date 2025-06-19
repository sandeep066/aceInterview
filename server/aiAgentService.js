import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Google AI Agent Service Manager
 * Manages the lifecycle of LiveKit AI agents for voice interviews using Google services
 */
export class AIAgentService {
  constructor() {
    this.agents = new Map();
    this.isEnabled = this.checkConfiguration();
    
    if (this.isEnabled) {
      console.log('🤖 Google AI Agent Service initialized and ready');
    } else {
      console.warn('⚠️ Google AI Agent Service disabled - missing configuration');
    }
  }

  /**
   * Check if required configuration is available
   */
  checkConfiguration() {
    const required = [
      'LIVEKIT_API_KEY',
      'LIVEKIT_API_SECRET', 
      'LIVEKIT_WS_URL'
    ];
    
    const recommended = [
      'GEMINI_API_KEY',
      'GOOGLE_APPLICATION_CREDENTIALS',
      'GOOGLE_CLOUD_PROJECT_ID'
    ];
    
    const missing = required.filter(key => !process.env[key]);
    const missingRecommended = recommended.filter(key => !process.env[key]);
    
    if (missing.length > 0) {
      console.warn(`⚠️ Missing required environment variables for AI Agent: ${missing.join(', ')}`);
      return false;
    }
    
    if (missingRecommended.length > 0) {
      console.warn(`⚠️ Missing recommended Google Cloud variables: ${missingRecommended.join(', ')}`);
      console.warn('⚠️ Agent will use fallback methods for speech processing');
    }
    
    return true;
  }

  /**
   * Start an AI agent for a specific room
   */
  async startAgentForRoom(roomName, interviewConfig) {
    if (!this.isEnabled) {
      throw new Error('Google AI Agent Service is not properly configured');
    }

    try {
      console.log(`🚀 Starting Google AI agent for room: ${roomName}`);
      
      // Prepare environment variables for the agent
      const agentEnv = {
        ...process.env,
        LIVEKIT_URL: process.env.LIVEKIT_WS_URL,
        LIVEKIT_API_KEY: process.env.LIVEKIT_API_KEY,
        LIVEKIT_API_SECRET: process.env.LIVEKIT_API_SECRET,
        GEMINI_API_KEY: process.env.GEMINI_API_KEY,
        GOOGLE_APPLICATION_CREDENTIALS: process.env.GOOGLE_APPLICATION_CREDENTIALS,
        GOOGLE_CLOUD_PROJECT_ID: process.env.GOOGLE_CLOUD_PROJECT_ID,
        INTERVIEW_ROOM: roomName,
        INTERVIEW_CONFIG: JSON.stringify(interviewConfig),
        LLM_PROVIDER: 'gemini'
      };

      // Start the agent process
      const agentPath = join(__dirname, 'aiAgent.js');
      const agentProcess = spawn('node', [agentPath, '--room', roomName], {
        env: agentEnv,
        stdio: ['pipe', 'pipe', 'pipe']
      });

      // Handle agent output
      agentProcess.stdout.on('data', (data) => {
        console.log(`[GoogleAgent-${roomName}] ${data.toString().trim()}`);
      });

      agentProcess.stderr.on('data', (data) => {
        console.error(`[GoogleAgent-${roomName}] ERROR: ${data.toString().trim()}`);
      });

      agentProcess.on('close', (code) => {
        console.log(`[GoogleAgent-${roomName}] Process exited with code ${code}`);
        this.agents.delete(roomName);
      });

      agentProcess.on('error', (error) => {
        console.error(`[GoogleAgent-${roomName}] Process error:`, error);
        this.agents.delete(roomName);
      });

      // Store agent reference
      this.agents.set(roomName, {
        process: agentProcess,
        roomName,
        config: interviewConfig,
        startTime: Date.now(),
        provider: 'google'
      });

      console.log(`✅ Google AI agent started for room: ${roomName}`);
      
      return {
        success: true,
        agentId: roomName,
        provider: 'google',
        message: 'Google AI agent started successfully'
      };

    } catch (error) {
      console.error(`❌ Failed to start Google AI agent for room ${roomName}:`, error);
      throw new Error(`Failed to start Google AI agent: ${error.message}`);
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
      console.log(`🛑 Stopping Google AI agent for room: ${roomName}`);
      
      // Gracefully terminate the agent process
      agent.process.kill('SIGTERM');
      
      // Force kill after timeout
      setTimeout(() => {
        if (!agent.process.killed) {
          console.warn(`⚠️ Force killing Google AI agent for room: ${roomName}`);
          agent.process.kill('SIGKILL');
        }
      }, 5000);

      this.agents.delete(roomName);
      
      console.log(`✅ Google AI agent stopped for room: ${roomName}`);
      
      return {
        success: true,
        message: 'Google AI agent stopped successfully'
      };

    } catch (error) {
      console.error(`❌ Failed to stop Google AI agent for room ${roomName}:`, error);
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
    console.log('🛑 Stopping all Google AI agents...');
    
    const stopPromises = Array.from(this.agents.keys()).map(roomName => 
      this.stopAgentForRoom(roomName)
    );
    
    await Promise.all(stopPromises);
    
    console.log('✅ All Google AI agents stopped');
  }

  /**
   * Check if service is enabled and configured
   */
  isServiceEnabled() {
    return this.isEnabled;
  }

  /**
   * Get service statistics
   */
  getServiceStats() {
    return {
      enabled: this.isEnabled,
      provider: 'google',
      activeAgents: this.agents.size,
      totalAgentsStarted: this.agents.size,
      configuration: {
        hasLiveKitConfig: !!(process.env.LIVEKIT_API_KEY && process.env.LIVEKIT_API_SECRET && process.env.LIVEKIT_WS_URL),
        hasGeminiConfig: !!process.env.GEMINI_API_KEY,
        hasGoogleCloudConfig: !!(process.env.GOOGLE_APPLICATION_CREDENTIALS && process.env.GOOGLE_CLOUD_PROJECT_ID),
        speechToText: !!process.env.GOOGLE_APPLICATION_CREDENTIALS,
        textToSpeech: !!process.env.GOOGLE_APPLICATION_CREDENTIALS
      }
    };
  }
}