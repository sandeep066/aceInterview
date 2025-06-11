# AI Interview Practice Platform

A comprehensive AI-powered interview practice application that uses Large Language Models (LLMs) to generate dynamic, contextual interview questions and provide intelligent feedback.

## Features

### 🤖 LLM-Powered Question Generation
- Dynamic question generation based on your specific topic, experience level, and interview style
- Contextual follow-up questions that adapt to your responses
- Company-specific scenarios when target company is provided
- Support for multiple LLM providers (OpenAI GPT-4, Anthropic Claude)

### 🎯 Interview Types
- **Technical Interviews**: Code problems, system design, technical concepts
- **HR Interviews**: Company culture, work-life balance, career goals
- **Behavioral Interviews**: STAR method scenarios, past experiences
- **Salary Negotiation**: Compensation discussions, benefit negotiations
- **Case Study Interviews**: Problem-solving scenarios, business cases

### 📊 Intelligent Analytics
- AI-powered response analysis and scoring
- Personalized feedback and improvement suggestions
- Detailed question-by-question review
- Performance tracking across multiple dimensions

### 🎙️ Advanced Interface
- Speech-to-text input capability
- Real-time interview simulation
- Progress tracking and timer
- Note-taking functionality
- Responsive design for all devices

## Setup Instructions

### Prerequisites
- Node.js 18+ and npm
- An API key from either OpenAI or Anthropic

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

PORT=3001
VITE_API_URL=http://localhost:3001/api
```

### 3. Start the Application

**Development Mode (with LLM backend):**
```bash
# Terminal 1: Start the LLM backend server
npm run server

# Terminal 2: Start the frontend development server
npm run dev
```

**Frontend Only (fallback mode):**
```bash
npm run dev
```

### 4. Access the Application
- Frontend: http://localhost:5173
- Backend API: http://localhost:3001
- Health Check: http://localhost:3001/api/health

## Architecture

### Frontend (React + TypeScript)
- **Configuration Screen**: Interview setup and customization
- **Interview Screen**: Real-time interview simulation
- **Analytics Screen**: Performance analysis and feedback
- **Speech Recognition**: Browser-based speech-to-text
- **API Integration**: Seamless LLM backend communication

### Backend (Node.js + Express)
- **LLM Service**: Unified interface for multiple LLM providers
- **Question Generation**: Context-aware question creation
- **Response Analysis**: AI-powered feedback generation
- **Analytics Engine**: Comprehensive performance evaluation
- **Fallback System**: Graceful degradation when LLM is unavailable

### LLM Integration
- **Multi-Provider Support**: OpenAI GPT-4 and Anthropic Claude
- **Contextual Prompting**: Sophisticated prompt engineering for realistic interviews
- **Adaptive Questioning**: Questions that build on previous responses
- **Real-time Analysis**: Immediate feedback on interview performance

## API Endpoints

### Question Generation
```
POST /api/generate-question
Body: { config, previousQuestions, previousResponses, questionNumber }
Response: { question }
```

### Follow-up Questions
```
POST /api/generate-followup
Body: { question, response, config }
Response: { followUp }
```

### Response Analysis
```
POST /api/analyze-response
Body: { question, response, config }
Response: { analysis: { score, feedback, strengths, improvements } }
```

### Comprehensive Analytics
```
POST /api/generate-analytics
Body: { responses, config }
Response: { analytics }
```

## Configuration Options

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

### Customization
- **Topic**: Specific technology or domain focus
- **Company**: Target company for customized questions
- **Duration**: 15, 30, 45, or 60 minutes
- **Difficulty**: Automatically adjusted based on experience level

## Fallback System

The application includes a robust fallback system:
- **Offline Mode**: Works without LLM backend using predefined questions
- **Connection Recovery**: Automatic retry and reconnection
- **Graceful Degradation**: Seamless transition between LLM and fallback modes
- **Error Handling**: User-friendly error messages and recovery options

## Performance Features

- **Lazy Loading**: Components loaded on demand
- **Caching**: Intelligent caching of LLM responses
- **Optimistic Updates**: Immediate UI feedback
- **Connection Monitoring**: Real-time backend status
- **Responsive Design**: Optimized for all screen sizes

## Security Considerations

- **API Key Protection**: Server-side API key management
- **Input Validation**: Comprehensive request validation
- **Rate Limiting**: Protection against API abuse
- **Error Sanitization**: Safe error message handling
- **CORS Configuration**: Proper cross-origin setup

## Future Enhancements

- **LiveKit Integration**: Video interview simulation
- **Multi-language Support**: International interview practice
- **Interview Recording**: Session playback and review
- **Team Features**: Collaborative interview preparation
- **Advanced Analytics**: ML-powered insights and trends

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License - see the LICENSE file for details.