import { AccessToken } from 'livekit-server-sdk';
import jwt from 'jsonwebtoken';

export class LiveKitService {
  constructor() {
    this.apiKey = process.env.LIVEKIT_API_KEY;
    this.apiSecret = process.env.LIVEKIT_API_SECRET;
    this.wsUrl = process.env.LIVEKIT_WS_URL;
    
    console.log('[LiveKitService] Environment Variables:');
    console.log('- API_KEY:', this.apiKey ? 'Set' : 'Not set');
    console.log('- API_SECRET:', this.apiSecret ? 'Set' : 'Not set');
    console.log('- WS_URL:', this.wsUrl ? `"${this.wsUrl}"` : 'Not set');
    
    // Clean the WebSocket URL but don't invalidate it
    if (this.wsUrl) {
      this.wsUrl = this.wsUrl.trim().replace(/['"]/g, '');
      console.log('- WS_URL (cleaned):', `"${this.wsUrl}"`);
    }
    
    if (!this.apiKey || !this.apiSecret || !this.wsUrl) {
      console.warn('[LiveKitService] LiveKit credentials not configured properly. Voice interviews will be disabled.');
    } else {
      console.log('[LiveKitService] LiveKit service initialized successfully');
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
      
      // Check if it starts with ws:// or wss://
      if (!trimmedUrl.startsWith('ws://') && !trimmedUrl.startsWith('wss://')) {
        console.warn('URL does not start with ws:// or wss://');
        return false;
      }
      
      // Parse URL to validate format
      let urlObj;
      try {
        urlObj = new URL(trimmedUrl);
      } catch (parseError) {
        console.warn('URL parsing failed:', parseError.message);
        return false;
      }
      
      // Validate protocol
      if (urlObj.protocol !== 'ws:' && urlObj.protocol !== 'wss:') {
        console.warn('Invalid protocol:', urlObj.protocol);
        return false;
      }
      
      // Validate hostname exists
      if (!urlObj.hostname) {
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
    const configured = !!(this.apiKey && this.apiSecret && this.wsUrl);
    console.log('[LiveKitService] Configuration check:', {
      apiKey: !!this.apiKey,
      apiSecret: !!this.apiSecret,
      wsUrl: !!this.wsUrl,
      configured
    });
    return configured;
  }

  getWebSocketUrl() {
    console.log('[LiveKitService] getWebSocketUrl() called, returning:', `"${this.wsUrl}"`);
    return this.wsUrl;
  }

  /**
   * Generate access token for a participant to join a LiveKit room
   */
  generateAccessToken(roomName, participantName, metadata = {}) {
    if (!this.isConfigured()) {
      console.error('[LiveKitService] Cannot generate token - not configured');
      throw new Error('LiveKit not configured');
    }

    console.log('[LiveKitService] Generating access token for:', {
      roomName,
      participantName,
      apiKeyLength: this.apiKey?.length || 0,
      apiSecretLength: this.apiSecret?.length || 0
    });

    try {
      // Validate API key format - LiveKit API keys should start with 'API'
      if (!this.apiKey.startsWith('API')) {
        console.error('[LiveKitService] Invalid API key format - should start with "API"');
        throw new Error('Invalid LiveKit API key format');
      }

      // Validate API secret length - should be a reasonable length
      if (this.apiSecret.length < 32) {
        console.error('[LiveKitService] API secret appears too short');
        throw new Error('Invalid LiveKit API secret - too short');
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

      const token = at.toJwt();
      
      // Validate that the token is actually a string
      if (typeof token !== 'string' || token.length === 0) {
        console.error('[LiveKitService] Generated token is not a valid string:', {
          type: typeof token,
          length: token?.length || 0,
          token: token
        });
        throw new Error(`Invalid token generated: expected string, got ${typeof token} with length ${token?.length || 0}`);
      }
      
      console.log('[LiveKitService] Token generated successfully, length:', token.length);
      return token;
    } catch (error) {
      console.error('[LiveKitService] Error generating access token:', error);
      throw new Error(`Failed to generate access token: ${error.message}`);
    }
  }

  /**
   * Generate access token for the AI interviewer bot
   */
  generateInterviewerToken(roomName, interviewConfig) {
    if (!this.isConfigured()) {
      console.error('[LiveKitService] Cannot generate interviewer token - not configured');
      throw new Error('LiveKit not configured');
    }

    const interviewerIdentity = `ai-interviewer-${Date.now()}`;
    
    console.log('[LiveKitService] Generating interviewer token for:', {
      roomName,
      interviewerIdentity
    });

    try {
      // Validate API key format - LiveKit API keys should start with 'API'
      if (!this.apiKey.startsWith('API')) {
        console.error('[LiveKitService] Invalid API key format - should start with "API"');
        throw new Error('Invalid LiveKit API key format');
      }

      // Validate API secret length - should be a reasonable length
      if (this.apiSecret.length < 32) {
        console.error('[LiveKitService] API secret appears too short');
        throw new Error('Invalid LiveKit API secret - too short');
      }

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

      const token = at.toJwt();
      
      // Validate that the token is actually a string
      if (typeof token !== 'string' || token.length === 0) {
        console.error('[LiveKitService] Generated interviewer token is not a valid string:', {
          type: typeof token,
          length: token?.length || 0,
          token: token
        });
        throw new Error(`Invalid interviewer token generated: expected string, got ${typeof token} with length ${token?.length || 0}`);
      }
      
      console.log('[LiveKitService] Interviewer token generated successfully, length:', token.length);
      return token;
    } catch (error) {
      console.error('[LiveKitService] Error generating interviewer token:', error);
      throw new Error(`Failed to generate interviewer token: ${error.message}`);
    }
  }

  /**
   * Create a new interview room
   */
  async createInterviewRoom(interviewConfig, participantName) {
    console.log('[LiveKitService] createInterviewRoom() called');
    console.log('[LiveKitService] Current wsUrl:', `"${this.wsUrl}"`);
    
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

      const roomData = {
        roomName,
        wsUrl: this.wsUrl,
        participantToken,
        interviewerToken,
        config: interviewConfig
      };
      
      console.log('[LiveKitService] Room data created:');
      console.log('- roomName:', roomData.roomName);
      console.log('- wsUrl:', typeof roomData.wsUrl, `"${roomData.wsUrl}"`);
      console.log('- participantToken length:', roomData.participantToken?.length || 0);
      console.log('- interviewerToken length:', roomData.interviewerToken?.length || 0);

      return roomData;
    } catch (error) {
      console.error('[LiveKitService] Error creating interview room:', error);
      throw new Error(`Failed to create interview room: ${error.message}`);
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