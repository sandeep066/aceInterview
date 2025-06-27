# AI Interview Practice Platform with LiveKit Voice Integration

A comprehensive AI-powered interview practice application that uses Large Language Models (LLMs) and LiveKit for real-time voice interviews, generating dynamic, contextual interview questions and providing intelligent feedback.

## 🚀 Features

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
- Support for multiple LLM providers (OpenAI GPT-4, Anthropic Claude, Google Gemini)

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

## 🛠️ Tech Stack

### Frontend
- **React 18** with TypeScript
- **Tailwind CSS** for styling
- **Vite** for build tooling
- **LiveKit Client SDK** for real-time communication
- **Lucide React** for icons

### Backend
- **Node.js** with Express
- **LiveKit Server SDK** for room management
- **Multiple LLM Providers**: OpenAI, Anthropic, Google Gemini
- **Agentic AI Framework** for intelligent question generation
- **WebSocket** support for real-time communication

### AI Agents (Python)
- **LiveKit Agents Framework** (Python)
- **OpenAI** and **Google Cloud** integration
- **Speech-to-Text** and **Text-to-Speech**
- **Real-time conversation management**

## 📋 Prerequisites

- **Node.js 18+** and npm
- **Python 3.8+** for AI agents
- **API keys** from either OpenAI, Anthropic, or Google
- **LiveKit Cloud account** or self-hosted LiveKit server
- **Microphone access** for voice interviews

## 🚀 Quick Start

### 1. Clone the Repository
```bash
git clone <repository-url>
cd ai-interview-platform
```

### 2. Install Dependencies
```bash
# Install Node.js dependencies
npm install

# Setup Python environment and dependencies
npm run setup-python
```

### 3. Environment Configuration
```bash
cp .env.example .env
```

Edit `.env` file with your configuration:
```env
# Choose your LLM provider
LLM_PROVIDER=gemini
GEMINI_API_KEY=your_gemini_api_key_here

# OR use OpenAI
# LLM_PROVIDER=openai
# OPENAI_API_KEY=your_openai_api_key_here

# OR use Anthropic
# LLM_PROVIDER=anthropic
# ANTHROPIC_API_KEY=your_anthropic_api_key_here

# LiveKit Configuration (required for voice interviews)
LIVEKIT_API_KEY=your_livekit_api_key
LIVEKIT_API_SECRET=your_livekit_api_secret
LIVEKIT_WS_URL=wss://your-livekit-server.com

# Google Cloud (for advanced voice features)
GOOGLE_APPLICATION_CREDENTIALS=path/to/your/service-account-key.json
GOOGLE_CLOUD_PROJECT_ID=your_google_cloud_project_id

# Server Configuration
PORT=3001
VITE_API_URL=http://localhost:3001/api
```

### 4. Start the Application

**Full Mode (with voice interviews):**
```bash
# Terminal 1: Start the backend server
npm run server

# Terminal 2: Start the Python AI agents
npm run agent

# Terminal 3: Start the frontend
npm run dev
```

**Text-only Mode:**
```bash
# Terminal 1: Start the backend server
npm run server

# Terminal 2: Start the frontend
npm run dev
```

### 5. Access the Application
- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:3001
- **Health Check**: http://localhost:3001/api/health

## 🔧 Configuration

### LiveKit Setup

#### Option A: LiveKit Cloud (Recommended)
1. Sign up at [LiveKit Cloud](https://cloud.livekit.io/)
2. Create a new project
3. Copy your API Key, Secret Key, and WebSocket URL
4. Add them to your `.env` file

#### Option B: Self-hosted LiveKit
1. Follow the [LiveKit deployment guide](https://docs.livekit.io/deploy/)
2. Configure your server URL in the `.env` file
3. Set up your API credentials

### LLM Provider Setup

#### Google Gemini (Recommended)
1. Get API key from [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Set `LLM_PROVIDER=gemini` and `GEMINI_API_KEY` in `.env`

#### OpenAI
1. Get API key from [OpenAI Platform](https://platform.openai.com/api-keys)
2. Set `LLM_PROVIDER=openai` and `OPENAI_API_KEY` in `.env`

#### Anthropic Claude
1. Get API key from [Anthropic Console](https://console.anthropic.com/)
2. Set `LLM_PROVIDER=anthropic` and `ANTHROPIC_API_KEY` in `.env`

## 📚 API Documentation

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

## 🏗️ Architecture

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

### AI Agents (Python + LiveKit Agents)
- **Multi-Provider Support**: OpenAI and Google Cloud integration
- **Real-time Conversation**: Natural voice interaction with AI interviewer
- **Speech Processing**: Advanced STT and TTS capabilities
- **Session Management**: Persistent interview sessions with recovery
- **Audio Quality**: Echo cancellation, noise suppression, auto-gain control

## 🚀 Deployment

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

## 🔒 Security

- **Token-based Authentication**: Secure LiveKit room access
- **API Key Protection**: Server-side credential management
- **Rate Limiting**: Protection against API abuse
- **Input Validation**: Comprehensive request validation
- **CORS Configuration**: Proper cross-origin setup

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

For issues related to:
- **LiveKit Integration**: Check [LiveKit Documentation](https://docs.livekit.io/)
- **Voice Features**: Review browser microphone permissions
- **API Issues**: Check backend logs and health endpoints
- **General Support**: Create an issue in this repository

## 🙏 Acknowledgments

- [LiveKit](https://livekit.io/) for real-time communication infrastructure
- [OpenAI](https://openai.com/) for GPT models and Whisper
- [Google Cloud](https://cloud.google.com/) for Speech and Gemini AI
- [Anthropic](https://anthropic.com/) for Claude models
- [React](https://reactjs.org/) and [Vite](https://vitejs.dev/) for the frontend framework