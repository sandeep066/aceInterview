# AI Interview Practice Platform with LiveKit Voice Integration

A comprehensive AI-powered interview practice application that uses Large Language Models (LLMs) and LiveKit for real-time voice interviews, generating dynamic, contextual interview questions and providing intelligent feedback.

## Features

### 🎙️ **LiveKit Voice Interviews**
- **Real-time voice communication** using LiveKit WebRTC infrastructure
- **AI-powered voice interviewer** that speaks questions and listens to responses
- **Speech-to-text transcription** for response analysis
- **Low-latency audio streaming** for natural conversation flow
- **Connection recovery** and session management
- **Multi-participant support** for group interviews (future enhancement)

### 🤖 **LLM-Powered Question Generation**
- Dynamic question generation based on your specific topic, experience level, and interview style
- Contextual follow-up questions that adapt to your responses
- Company-specific scenarios when target company is provided
- Support for multiple LLM providers (OpenAI GPT-4, Anthropic Claude)

### 🎯 **Interview Types**
- **Technical Interviews**: Code problems, system design, technical concepts
- **HR Interviews**: Company culture, work-life balance, career goals
- **Behavioral Interviews**: STAR method scenarios, past experiences
- **Salary Negotiation**: Compensation discussions, benefit negotiations
- **Case Study Interviews**: Problem-solving scenarios, business cases

### 📊 **Intelligent Analytics**
- AI-powered response analysis and scoring
- Personalized feedback and improvement suggestions
- Detailed question-by-question review
- Performance tracking across multiple dimensions
- Voice interview session recordings and playback

### 🎙️ **Advanced Interface**
- **Voice-first interview experience** with LiveKit integration
- Speech-to-text input capability with fallback text input
- Real-time interview simulation with audio feedback
- Progress tracking and timer
- Note-taking functionality during voice interviews
- Responsive design for all devices

## Setup Instructions

### Prerequisites
- Node.js 18+ and npm
- An API key from either OpenAI or Anthropic
- LiveKit Cloud account or self-hosted LiveKit server
- Microphone access for voice interviews

### 1. Clone and Install Dependencies
```bash
git clone <repository-url>
cd ai-interview-platform
npm install
```

### 2. Environment Configuration
```bash
cp .env.example .env
```

Edit `.env` file with your configuration:
```env
# Choose your LLM provider
LLM_PROVIDER=openai
OPENAI_API_KEY=your_openai_api_key_here

# OR use Anthropic Claude
# LLM_PROVIDER=anthropic
# ANTHROPIC_API_KEY=your_anthropic_api_key_here

# LiveKit Configuration (required for voice interviews)
LIVEKIT_API_KEY=your_livekit_api_key
LIVEKIT_API_SECRET=your_livekit_api_secret
LIVEKIT_WS_URL=wss://your-livekit-server.com

# Server Configuration
PORT=3001
VITE_API_URL=http://localhost:3001/api
```

### 3. LiveKit Setup

#### Option A: LiveKit Cloud (Recommended)
1. Sign up at [LiveKit Cloud](https://cloud.livekit.io/)
2. Create a new project
3. Copy your API Key, Secret Key, and WebSocket URL
4. Add them to your `.env` file

#### Option B: Self-hosted LiveKit
1. Follow the [LiveKit deployment guide](https://docs.livekit.io/deploy/)
2. Configure your server URL in the `.env` file
3. Set up your API credentials

### 4. Start the Application

**Full Mode (with LLM backend and LiveKit):**
```bash
# Terminal 1: Start the backend server with LiveKit support
npm run server

# Terminal 2: Start the frontend development server
npm run dev
```

**Text-only Mode (without LiveKit):**
```bash
# Set LIVEKIT_API_KEY="" in .env to disable voice features
npm run server  # Terminal 1
npm run dev     # Terminal 2
```

### 5. Access the Application
- Frontend: http://localhost:5173
- Backend API: http://localhost:3001
- Health Check: http://localhost:3001/api/health
- LiveKit Config Check: http://localhost:3001/api/livekit/config

## Architecture

### Frontend (React + TypeScript + LiveKit)
- **Configuration Screen**: Interview setup and voice/text mode selection
- **Voice Interview Screen**: Real-time voice communication with AI interviewer
- **Text Interview Screen**: Traditional text-based interview (fallback)
- **Analytics Screen**: Performance analysis with voice session insights
- **LiveKit Integration**: Real-time audio streaming and communication
- **Speech Recognition**: Browser-based speech-to-text with LiveKit audio

### Backend (Node.js + Express + LiveKit Server SDK)
- **LLM Service**: Unified interface for multiple LLM providers
- **LiveKit Service**: Room management, token generation, webhook handling
- **Voice Interview Service**: Session management, audio processing, real-time question flow
- **Question Generation**: Context-aware question creation with voice timing
- **Response Analysis**: AI-powered feedback with audio quality metrics
- **Analytics Engine**: Comprehensive performance evaluation including voice metrics

### LiveKit Integration
- **Real-time Communication**: WebRTC-based audio streaming
- **Room Management**: Dynamic interview room creation and management
- **Token-based Authentication**: Secure participant access control
- **Webhook Integration**: Real-time event handling and session monitoring
- **Audio Quality Optimization**: Echo cancellation, noise suppression, auto-gain control

## API Endpoints

### Text-based Interview Endpoints
```
POST /api/generate-question          # Generate interview questions
POST /api/generate-followup          # Generate follow-up questions
POST /api/analyze-response           # Analyze text responses
POST /api/generate-analytics         # Generate comprehensive analytics
```

### Voice Interview Endpoints
```
POST /api/voice-interview/start                    # Start voice interview session
POST /api/voice-interview/:sessionId/response      # Process voice response
POST /api/voice-interview/:sessionId/followup      # Generate voice follow-up
POST /api/voice-interview/:sessionId/pause         # Pause voice session
POST /api/voice-interview/:sessionId/resume        # Resume voice session
POST /api/voice-interview/:sessionId/end           # End voice session
GET  /api/voice-interview/:sessionId/status        # Get session status
POST /api/voice-interview/:sessionId/reconnect     # Reconnect to session
```

### LiveKit Management
```
GET  /api/livekit/config            # Check LiveKit configuration
POST /api/livekit/webhook           # Handle LiveKit webhooks
GET  /api/voice-interview/sessions/active  # Get active sessions (admin)
```

## Voice Interview Features

### Real-time Communication
- **Low-latency audio**: Sub-100ms audio transmission
- **Adaptive bitrate**: Automatic quality adjustment based on connection
- **Echo cancellation**: Advanced audio processing for clear communication
- **Noise suppression**: Background noise filtering
- **Connection recovery**: Automatic reconnection on network issues

### AI Voice Interviewer
- **Natural conversation flow**: AI responds with appropriate timing
- **Voice synthesis**: Text-to-speech for AI questions (future enhancement)
- **Contextual responses**: AI adapts based on voice tone and pace
- **Real-time transcription**: Speech-to-text for immediate analysis

### Session Management
- **Persistent sessions**: Resume interrupted interviews
- **Session recording**: Audio recording for later review (optional)
- **Multi-device support**: Switch devices during interview
- **Session analytics**: Detailed voice interaction metrics

## Configuration Options

### Interview Modes
- **Voice Interview**: Full LiveKit-powered voice communication
- **Text Interview**: Traditional text-based interview (fallback)
- **Hybrid Mode**: Voice input with text backup

### Voice Settings
- **Audio Quality**: Configurable bitrate and sample rate
- **Noise Suppression**: Adjustable noise filtering
- **Echo Cancellation**: Configurable echo removal
- **Auto Gain Control**: Automatic volume adjustment

### Interview Styles
- Technical Interview
- HR Interview  
- Behavioral Interview
- Salary Negotiation
- Case Study Interview

### Experience Levels
- Fresher (0-1 years)
- Junior (1-3 years)
- Mid-Level (3-6 years)
- Senior (6+ years)
- Lead/Manager (8+ years)

## Deployment

### Production Deployment
1. **Backend Deployment**:
   ```bash
   npm run build
   # Deploy to your preferred platform (AWS, GCP, Azure, etc.)
   ```

2. **LiveKit Configuration**:
   - Use LiveKit Cloud for production
   - Configure proper CORS and security settings
   - Set up webhook endpoints for monitoring

3. **Environment Variables**:
   ```env
   NODE_ENV=production
   LIVEKIT_WS_URL=wss://your-production-livekit-server.com
   # Add production API keys
   ```

### Docker Deployment
```dockerfile
# Dockerfile example for backend
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 3001
CMD ["npm", "run", "server"]
```

## Monitoring and Analytics

### LiveKit Monitoring
- **Connection Quality**: Real-time connection metrics
- **Audio Quality**: Bitrate, packet loss, jitter monitoring
- **Session Duration**: Interview length and completion rates
- **Error Tracking**: Connection failures and recovery metrics

### Interview Analytics
- **Voice Metrics**: Speaking pace, pause analysis, confidence indicators
- **Response Quality**: AI-powered content analysis
- **Technical Performance**: Audio quality impact on interview performance
- **Completion Rates**: Success metrics for voice vs text interviews

## Security Considerations

### LiveKit Security
- **Token-based Authentication**: Secure room access control
- **Time-limited Tokens**: Automatic token expiration
- **Room Isolation**: Secure participant separation
- **Webhook Verification**: Signed webhook payloads

### API Security
- **API Key Protection**: Server-side credential management
- **Rate Limiting**: Protection against API abuse
- **Input Validation**: Comprehensive request validation
- **CORS Configuration**: Proper cross-origin setup

## Troubleshooting

### Common Issues

1. **LiveKit Connection Failed**:
   ```bash
   # Check LiveKit configuration
   curl http://localhost:3001/api/livekit/config
   
   # Verify environment variables
   echo $LIVEKIT_API_KEY
   echo $LIVEKIT_WS_URL
   ```

2. **Audio Not Working**:
   - Check microphone permissions in browser
   - Verify HTTPS connection (required for microphone access)
   - Test audio devices in browser settings

3. **Voice Interview Not Starting**:
   - Ensure LiveKit credentials are configured
   - Check backend logs for connection errors
   - Verify WebSocket URL is accessible

### Debug Mode
```bash
# Enable debug logging
DEBUG=livekit* npm run server
```

## Future Enhancements

### Planned Features
- **Video Interviews**: Full video communication support
- **AI Voice Synthesis**: Text-to-speech for AI interviewer
- **Multi-language Support**: International interview practice
- **Group Interviews**: Multi-participant interview scenarios
- **Interview Recording**: Session playback and review
- **Advanced Analytics**: ML-powered voice analysis and insights
- **Mobile App**: Native mobile application with voice support

### Integration Roadmap
- **Calendar Integration**: Schedule voice interviews
- **CRM Integration**: Connect with recruitment platforms
- **Learning Management**: Structured interview training programs
- **Enterprise Features**: Team management and analytics dashboards

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for voice features if applicable
5. Submit a pull request

### Development Setup
```bash
# Install dependencies
npm install

# Start development with hot reload
npm run dev

# Run tests
npm test

# Test LiveKit integration
npm run test:livekit
```

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For issues related to:
- **LiveKit Integration**: Check [LiveKit Documentation](https://docs.livekit.io/)
- **Voice Features**: Review browser microphone permissions
- **API Issues**: Check backend logs and health endpoints
- **General Support**: Create an issue in this repository