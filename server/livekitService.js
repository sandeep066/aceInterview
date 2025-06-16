import { AccessToken } from 'livekit-server-sdk';
import jwt from 'jsonwebtoken';

export class LiveKitService {
  constructor() {
    this.apiKey = process.env.LIVEKIT_API_KEY;
    this.apiSecret = process.env.LIVEKIT_API_SECRET;
    this.wsUrl = process.env.LIVEKIT_WS_URL;
    
    console.log('LiveKit Environment Variables:');
    console.log('- API_KEY:', this.apiKey ? 'Set' : 'Not set');
    console.log('- API_SECRET:', this.apiSecret ? 'Set' : 'Not set');
    console.log('- WS_URL:', this.wsUrl ? `"${this.wsUrl}"` : 'Not set');
    
    // Check if wsUrl contains placeholder values
    if (this.wsUrl && this.wsUrl.includes('your-livekit-server.com')) {
      console.warn('LiveKit WebSocket URL contains placeholder values. Voice interviews will be disabled.');
      this.wsUrl = null;
    }
    
    // Validate WebSocket URL format with improved error handling
    if (this.wsUrl && !this.isValidWebSocketUrl(this.wsUrl)) {
      console.warn('LiveKit WebSocket URL format is invalid. Voice interviews will be disabled.');
      this.wsUrl = null;
    }
    
    if (!this.apiKey || !this.apiSecret || !this.wsUrl) {
      console.warn('LiveKit credentials not configured properly. Voice interviews will be disabled.');
    }
  }

  isValidWebSocketUrl(url) {
    try {
      // Basic validation first
      if (!url || typeof url !== 'string') {
        console.warn('URL is not a valid string:', typeof url, url);
        return false;
      }
      
      const trimmedUrl = url.trim();
      console.log('Validating URL:', `"${trimmedUrl}"`);
      
      if (trimmedUrl === '') {
        console.warn('URL is empty after trimming');
        return false;
      }
      
      // Check for placeholder values
      if (trimmedUrl.includes('your-livekit-server.com')) {
        console.warn('URL contains placeholder value');
        return false;
      }
      
      // Check if it starts with ws:// or wss://
      if (!trimmedUrl.startsWith('ws://') && !trimmedUrl.startsWith('wss://')) {
        console.warn('URL does not start with ws:// or wss://');
        return false;
      }
      
      // More lenient URL parsing - handle edge cases
      let urlObj;
      try {
        // Try direct URL parsing first
        urlObj = new URL(trimmedUrl);
      } catch (directError) {
        console.warn('Direct URL parsing failed:', directError.message);
        
        // Try to fix common issues
        let fixedUrl = trimmedUrl;
        
        // Remove any extra quotes or spaces
        fixedUrl = fixedUrl.replace(/['"]/g, '').trim();
        
        // Ensure proper protocol format
        if (fixedUrl.startsWith('ws:') && !fixedUrl.startsWith('ws://')) {
          fixedUrl = fixedUrl.replace('ws:', 'ws://');
        }
        if (fixedUrl.startsWith('wss:') && !fixedUrl.startsWith('wss://')) {
          fixedUrl = fixedUrl.replace('wss:', 'wss://');
        }
        
        try {
          urlObj = new URL(fixedUrl);
          console.log('URL parsing succeeded after fixing:', fixedUrl);
        } catch (fixedError) {
          console.warn('URL parsing failed even after fixing:', fixedError.message);
          return false;
        }
      }
      
      // Validate protocol
      if (urlObj.protocol !== 'ws:' && urlObj.protocol !== 'wss:') {
        console.warn('Invalid protocol:', urlObj.protocol);
        return false;
      }
      
      // Validate hostname exists and is not placeholder
      if (!urlObj.hostname || urlObj.hostname === 'your-livekit-server.com') {
        console.warn('Invalid hostname:', urlObj.hostname);
        return false;
      }
      
      console.log('URL validation successful:', {
        protocol: urlObj.protocol,
        hostname: urlObj.hostname,
        port: urlObj.port
      });
      
      return true;
      
    } catch (error) {
      console.error('Unexpected error in URL validation:', error);
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