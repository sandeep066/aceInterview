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
    console.log('- WS_URL (raw):', this.wsUrl ? `"${this.wsUrl}"` : 'Not set');
    
    // Robust cleaning of the WebSocket URL
    if (this.wsUrl) {
      const originalUrl = this.wsUrl;
      
      try {
        // First, try to parse the URL to get a canonical clean URL
        const urlObj = new URL(this.wsUrl.trim().replace(/['"]/g, ''));
        this.wsUrl = urlObj.toString();
        console.log('- WS_URL (cleaned via URL constructor):', `"${this.wsUrl}"`);
      } catch (parseError) {
        console.warn('- URL parsing failed, falling back to aggressive string cleaning:', parseError.message);
        
        // Fall back to aggressive string replacement
        this.wsUrl = this.wsUrl
          .trim()
          .replace(/^['"]|['"]$/g, '') // Remove leading/trailing quotes
          .replace(/['"\\]/g, ''); // Remove any remaining quotes or backslashes
        
        console.log('- WS_URL (cleaned via string replacement):', `"${this.wsUrl}"`);
      }
      
      // Final validation
      if (originalUrl !== this.wsUrl) {
        console.log('- URL was modified during cleaning');
        console.log('- Original:', `"${originalUrl}"`);
        console.log('- Cleaned:', `"${this.wsUrl}"`);
      }
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
  async generateAccessToken(roomName, participantName, metadata = {}) {
    if (!this.isConfigured()) {
      console.error('[LiveKitService] Cannot generate token - not configured');
      throw new Error('LiveKit not configured');
    }

    console.log('[LiveKit] Generating AccessToken...');
    console.log('[LiveKit] participantName:', participantName);
    console.log('[LiveKit] metadata:', JSON.stringify(metadata, null, 2));
    console.log('[LiveKit] apiKey:', this.apiKey ? '[SET]' : '[NOT SET]');
    console.log('[LiveKit] apiSecret:', this.apiSecret ? '[SET]' : '[NOT SET]');

    try {
      const at = new AccessToken(this.apiKey, this.apiSecret, {
        identity: participantName,
        name: participantName,
        metadata: JSON.stringify(metadata)
      });

      // Grant permissions for the participant - use the correct method names
      at.addGrant({
        roomJoin: true,
        room: roomName,
        canPublish: true,
        canSubscribe: true,
        canPublishData: true,
        canUpdateOwnMetadata: true,
      });

      console.log('[LiveKit] AccessToken created:', at);

      // Generate the token with await (this was the fix for the Promise issue)
      const token = await at.toJwt();
      
      console.log('[LiveKit] Generated JWT token:', token);
      
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
  async generateInterviewerToken(roomName, interviewConfig) {
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
      const at = new AccessToken(this.apiKey, this.apiSecret, {
        identity: interviewerIdentity,
        name: 'AI Interviewer',
        metadata: JSON.stringify({
          role: 'interviewer',
          config: interviewConfig,
          isBot: true
        })
      });

      // Grant full permissions for the AI interviewer - use the correct method names
      at.addGrant({
        roomJoin: true,
        room: roomName,
        canPublish: true,
        canSubscribe: true,
        canPublishData: true,
        canUpdateOwnMetadata: true,
      });

      // Generate the token with await (this was the fix for the Promise issue)
      const token = await at.toJwt();
      
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
      const participantToken = await this.generateAccessToken(
        roomName, 
        participantName,
        {
          role: 'candidate',
          config: interviewConfig,
          joinedAt: new Date().toISOString()
        }
      );

      const interviewerToken = await this.generateInterviewerToken(roomName, interviewConfig);

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
  async generateReconnectToken(roomName, participantName, metadata = {}) {
    return await this.generateAccessToken(roomName, participantName, {
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