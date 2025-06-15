import { AccessToken } from 'livekit-server-sdk';
import jwt from 'jsonwebtoken';

export class LiveKitService {
  constructor() {
    this.apiKey = process.env.LIVEKIT_API_KEY;
    this.apiSecret = process.env.LIVEKIT_API_SECRET;
    this.wsUrl = process.env.LIVEKIT_WS_URL;
    
    // Check if wsUrl is a valid URL and not a placeholder
    if (this.wsUrl && (this.wsUrl.includes('your-livekit-server.com') || !this.isValidWebSocketUrl(this.wsUrl))) {
      console.warn('LiveKit WebSocket URL is invalid or contains placeholder values. Voice interviews will be disabled.');
      this.wsUrl = null;
    }
    
    if (!this.apiKey || !this.apiSecret || !this.wsUrl) {
      console.warn('LiveKit credentials not configured properly. Voice interviews will be disabled.');
    }
  }

  isValidWebSocketUrl(url) {
    try {
      const urlObj = new URL(url);
      return urlObj.protocol === 'ws:' || urlObj.protocol === 'wss:';
    } catch {
      return false;
    }
  }

  isConfigured() {
    return !!(this.apiKey && this.apiSecret && this.wsUrl);
  }

  /**
   * Generate access token for a participant to join a LiveKit room
   */
  generateAccessToken(roomName, participantName, metadata = {}) {
    if (!this.isConfigured()) {
      throw new Error('LiveKit not configured');
    }

    const at = new AccessToken(this.apiKey, this.apiSecret, {
      identity: participantName,
      name: participantName,
      metadata: JSON.stringify(metadata)
    });

    // Grant permissions for the participant
    at.addGrant({
      roomJoin: true,
      room: roomName,
      canPublish: true,
      canSubscribe: true,
      canPublishData: true,
      canUpdateOwnMetadata: true,
    });

    return at.toJwt();
  }

  /**
   * Generate access token for the AI interviewer bot
   */
  generateInterviewerToken(roomName, interviewConfig) {
    if (!this.isConfigured()) {
      throw new Error('LiveKit not configured');
    }

    const interviewerIdentity = `ai-interviewer-${Date.now()}`;
    
    const at = new AccessToken(this.apiKey, this.apiSecret, {
      identity: interviewerIdentity,
      name: 'AI Interviewer',
      metadata: JSON.stringify({
        role: 'interviewer',
        config: interviewConfig,
        isBot: true
      })
    });

    // Grant full permissions for the AI interviewer
    at.addGrant({
      roomJoin: true,
      room: roomName,
      canPublish: true,
      canSubscribe: true,
      canPublishData: true,
      canUpdateOwnMetadata: true,
      roomAdmin: true,
    });

    return at.toJwt();
  }

  /**
   * Create a new interview room
   */
  async createInterviewRoom(interviewConfig, participantName) {
    const roomName = `interview-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    try {
      // Generate tokens for both participant and AI interviewer
      const participantToken = this.generateAccessToken(
        roomName, 
        participantName,
        {
          role: 'candidate',
          config: interviewConfig,
          joinedAt: new Date().toISOString()
        }
      );

      const interviewerToken = this.generateInterviewerToken(roomName, interviewConfig);

      return {
        roomName,
        wsUrl: this.wsUrl,
        participantToken,
        interviewerToken,
        config: interviewConfig
      };
    } catch (error) {
      console.error('Error creating interview room:', error);
      throw new Error('Failed to create interview room');
    }
  }

  /**
   * Generate a token for reconnecting to an existing room
   */
  generateReconnectToken(roomName, participantName, metadata = {}) {
    return this.generateAccessToken(roomName, participantName, {
      ...metadata,
      reconnectedAt: new Date().toISOString()
    });
  }

  /**
   * Validate and decode a LiveKit token
   */
  validateToken(token) {
    try {
      const decoded = jwt.verify(token, this.apiSecret);
      return {
        valid: true,
        payload: decoded
      };
    } catch (error) {
      return {
        valid: false,
        error: error.message
      };
    }
  }

  /**
   * Generate webhook verification token
   */
  generateWebhookToken(payload) {
    if (!this.isConfigured()) {
      throw new Error('LiveKit not configured');
    }

    return jwt.sign(payload, this.apiSecret, {
      issuer: this.apiKey,
      expiresIn: '1h'
    });
  }

  /**
   * Verify webhook signature
   */
  verifyWebhookSignature(token, expectedPayload) {
    try {
      const decoded = jwt.verify(token, this.apiSecret, {
        issuer: this.apiKey
      });
      return {
        valid: true,
        payload: decoded
      };
    } catch (error) {
      return {
        valid: false,
        error: error.message
      };
    }
  }
}