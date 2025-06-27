"""
Response Analysis Agent using Pydantic AI
"""
from typing import Type, Dict, Any
from pydantic import BaseModel
from loguru import logger

from .base_agent import BaseAgent
from models.interview_models import InterviewConfig, ResponseAnalysis

class ResponseAnalysisResult(BaseModel):
    """Response analysis result"""
    response_analysis: ResponseAnalysis
    strengths: list[str]
    improvements: list[str]
    feedback: str
    score: int
    key_insights: list[str]
    reasoning: str

class ResponseAnalysisAgent(BaseAgent[ResponseAnalysisResult]):
    """Agent for analyzing interview responses"""
    
    def get_result_type(self) -> Type[ResponseAnalysisResult]:
        return ResponseAnalysisResult
    
    def get_system_prompt(self) -> str:
        return """You are a Response Analysis Agent specialized in evaluating interview responses.

Your role is to:
1. Analyze response quality, clarity, and structure
2. Evaluate technical accuracy and depth
3. Assess communication effectiveness
4. Identify strengths and areas for improvement
5. Provide specific, actionable feedback

Analyze the response across these dimensions:
- Clarity: How clear and understandable is the response?
- Structure: Is the response well-organized and logical?
- Technical: How accurate and deep is the technical content?
- Communication: How effective is the communication style?
- Confidence: How confident and decisive does the candidate sound?
- Relevance: How well does the response address the question?

Provide specific examples from the response to support your analysis. Focus on actionable feedback that will help the candidate improve."""
    
    async def analyze_response(
        self,
        question: str,
        response: str,
        config: InterviewConfig,
        question_number: int = 1
    ) -> ResponseAnalysisResult:
        """Analyze interview response"""
        input_data = {
            "question": question,
            "response": response,
            "config": config.model_dump(),
            "question_number": question_number
        }
        
        context = {
            "analysis_type": "response_analysis",
            "interview_style": config.style,
            "experience_level": config.experience_level
        }
        
        return await self.execute(input_data, context)
    
    def generate_fallback_result(self, input_data: Dict[str, Any], context: Dict[str, Any]) -> ResponseAnalysisResult:
        """Generate fallback response analysis"""
        response = input_data.get("response", "")
        config_data = input_data.get("config", {})
        style = config_data.get("style", "technical")
        
        logger.warning(f"[{self.name}] Using fallback response analysis")
        
        # Basic scoring based on response characteristics
        response_length = len(response)
        
        clarity = min(95, max(60, 70 + (response_length / 50)))
        structure = 75 if '.' in response and response_length > 50 else 65
        technical = 70 if style == 'technical' else 75
        communication = min(90, max(60, 65 + (response_length / 40)))
        confidence = 65 if 'i think' in response.lower() else 75
        relevance = 75
        
        overall_score = round((clarity + structure + technical + communication + confidence + relevance) / 6)
        
        return ResponseAnalysisResult(
            response_analysis=ResponseAnalysis(
                clarity=round(clarity),
                structure=round(structure),
                technical=round(technical),
                communication=round(communication),
                confidence=round(confidence),
                relevance=round(relevance)
            ),
            strengths=["Shows understanding of the topic", "Provides relevant information"],
            improvements=["Add more specific examples", "Structure response more clearly"],
            feedback="Good response with relevant content. Consider adding more specific examples and structuring your answer more clearly.",
            score=overall_score,
            key_insights=["Response demonstrates basic understanding", "Could benefit from more detailed examples"],
            reasoning="Fallback analysis based on response characteristics"
        )