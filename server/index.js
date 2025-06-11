import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { LLMQuestionGenerator } from './llmService.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Initialize LLM service
const questionGenerator = new LLMQuestionGenerator();

// Routes
app.post('/api/generate-question', async (req, res) => {
  try {
    const { config, previousQuestions, previousResponses, questionNumber } = req.body;
    
    const question = await questionGenerator.generateQuestion({
      config,
      previousQuestions: previousQuestions || [],
      previousResponses: previousResponses || [],
      questionNumber: questionNumber || 1
    });
    
    res.json({ question });
  } catch (error) {
    console.error('Error generating question:', error);
    res.status(500).json({ 
      error: 'Failed to generate question',
      message: error.message 
    });
  }
});

app.post('/api/generate-followup', async (req, res) => {
  try {
    const { question, response, config } = req.body;
    
    const followUp = await questionGenerator.generateFollowUp({
      originalQuestion: question,
      userResponse: response,
      config
    });
    
    res.json({ followUp });
  } catch (error) {
    console.error('Error generating follow-up:', error);
    res.status(500).json({ 
      error: 'Failed to generate follow-up question',
      message: error.message 
    });
  }
});

app.post('/api/analyze-response', async (req, res) => {
  try {
    const { question, response, config } = req.body;
    
    const analysis = await questionGenerator.analyzeResponse({
      question,
      response,
      config
    });
    
    res.json({ analysis });
  } catch (error) {
    console.error('Error analyzing response:', error);
    res.status(500).json({ 
      error: 'Failed to analyze response',
      message: error.message 
    });
  }
});

app.post('/api/generate-analytics', async (req, res) => {
  try {
    const { responses, config } = req.body;
    
    const analytics = await questionGenerator.generateComprehensiveAnalytics({
      responses,
      config
    });
    
    res.json({ analytics });
  } catch (error) {
    console.error('Error generating analytics:', error);
    res.status(500).json({ 
      error: 'Failed to generate analytics',
      message: error.message 
    });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`🚀 LLM Interview Backend running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
});