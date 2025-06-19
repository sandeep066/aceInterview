import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * AI Agent Service Manager
 * Manages the lifecycle of LiveKit AI agents for voice interviews
 */
export class AIAgentService {
  constructor() {
    this.agents = new Map();
    this.isEnabled = this.checkConfiguration();
    
    if (this.isEnabled) {
      console.log('🤖 AI Agent Service initialized and ready');
    } else {
      console.warn('⚠️ AI Agent Service disabled - missing configuration');
    }
  }

  /**
   * Check if required configuration is available
   */
  checkConfiguration() {
    const required = [
      'LIVEKIT_API_KEY',
      'LIVEKIT_API_SECRET', 
      'LIVEKIT_WS_URL',
      'OPENAI_API_KEY'
    ];
    
    const missing = required.filter(key => !process.env[key]);
    
    if (missing.length > 0) {
      console.warn(`⚠️ Missing required environment variables for AI Agent: ${missing.join(', ')}`);
      return false;
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
      console.log(`🚀 Starting AI agent for room: ${roomName}`);
      
      // Prepare environment variables for the agent
      const agentEnv = {
        ...process.env,
        LIVEKIT_URL: process.env.LIVEKIT_WS_URL,
        LIVEKIT_API_KEY: process.env.LIVEKIT_API_KEY,
        LIVEKIT_API_SECRET: process.env.LIVEKIT_API_SECRET,
        OPENAI_API_KEY: process.env.OPENAI_API_KEY,
        INTERVIEW_ROOM: roomName,
        INTERVIEW_CONFIG: JSON.stringify(interviewConfig)
      };

      // Start the agent process
      const agentPath = join(__dirname, 'aiAgent.js');
      const agentProcess = spawn('node', [agentPath, '--room', roomName], {
        env: agentEnv,
        stdio: ['pipe', 'pipe', 'pipe']
      });

      // Handle agent output
      agentProcess.stdout.on('data', (data) => {
        console.log(`[Agent-${roomName}] ${data.toString().trim()}`);
      });

      agentProcess.stderr.on('data', (data) => {
        console.error(`[Agent-${roomName}] ERROR: ${data.toString().trim()}`);
      });

      agentProcess.on('close', (code) => {
        console.log(`[Agent-${roomName}] Process exited with code ${code}`);
        this.agents.delete(roomName);
      });

      agentProcess.on('error', (error) => {
        console.error(`[Agent-${roomName}] Process error:`, error);
        this.agents.delete(roomName);
      });

      // Store agent reference
      this.agents.set(roomName, {
        process: agentProcess,
        roomName,
        config: interviewConfig,
        startTime: Date.now()
      });

      console.log(`✅ AI agent started for room: ${roomName}`);
      
      return {
        success: true,
        agentId: roomName,
        message: 'AI agent started successfully'
      };

    } catch (error) {
      console.error(`❌ Failed to start AI agent for room ${roomName}:`, error);
      throw new Error(`Failed to start AI agent: ${error.message}`);
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
      console.log(`🛑 Stopping AI agent for room: ${roomName}`);
      
      // Gracefully terminate the agent process
      agent.process.kill('SIGTERM');
      
      // Force kill after timeout
      setTimeout(() => {
        if (!agent.process.killed) {
          console.warn(`⚠️ Force killing agent for room: ${roomName}`);
          agent.process.kill('SIGKILL');
        }
      }, 5000);

      this.agents.delete(roomName);
      
      console.log(`✅ AI agent stopped for room: ${roomName}`);
      
      return {
        success: true,
        message: 'AI agent stopped successfully'
      };

    } catch (error) {
      console.error(`❌ Failed to stop AI agent for room ${roomName}:`, error);
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
      startTime: agent.startTime,
      uptime: Date.now() - agent.startTime,
      pid: agent.process.pid
    };
  }

  /**
   * Stop all active agents
   */
  async stopAllAgents() {
    console.log('🛑 Stopping all AI agents...');
    
    const stopPromises = Array.from(this.agents.keys()).map(roomName => 
      this.stopAgentForRoom(roomName)
    );
    
    await Promise.all(stopPromises);
    
    console.log('✅ All AI agents stopped');
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
      activeAgents: this.agents.size,
      totalAgentsStarted: this.agents.size, // This could be tracked separately
      configuration: {
        hasLiveKitConfig: !!(process.env.LIVEKIT_API_KEY && process.env.LIVEKIT_API_SECRET && process.env.LIVEKIT_WS_URL),
        hasOpenAIConfig: !!process.env.OPENAI_API_KEY
      }
    };
  }
}