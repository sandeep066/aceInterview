"""
Overall Analysis Agent using Pydantic AI
"""
from typing import Type, Dict, Any, List
from pydantic import BaseModel
from loguru import logger

from .base_agent import BaseAgent
from models.interview_models import InterviewConfig, ResponseAnalysis, PerformanceAnalytics

class OverallAnalysisAgent(BaseAgent[PerformanceAnalytics]):
    """Agent for overall interview performance analysis"""
    
    def get_result_type(self) -> Type[PerformanceAnalytics]:
        return PerformanceAnalytics
    
    def get_system_prompt(self) -> str:
        return """You are an Overall Analysis Agent that synthesizes interview performance data.

Your role is to:
1. Analyze patterns across all interview responses
2. Identify overall strengths and improvement areas
3. Calculate comprehensive performance metrics
4. Provide strategic recommendations for improvement
5. Generate executive summary of interview performance

Provide strategic, actionable insights for interview improvement. Focus on:
- Performance consistency across questions
- Improvement or decline trends during the interview
- Adaptability to different question types
- Overall readiness for the target role
- Specific, actionable next steps for improvement"""
    
    async def analyze_overall_performance(
        self,
        response_analyses: List[Dict[str, Any]],
        config: InterviewConfig,
        session_metadata: Dict[str, Any]
    ) -> PerformanceAnalytics:
        """Analyze overall interview performance"""
        input_data = {
            "response_analyses": response_analyses,
            "config": config.model_dump(),
            "session_metadata": session_metadata
        }
        
        context = {
            "analysis_type": "overall_performance",
            "total_responses": len(response_analyses),
            "interview_style": config.style
        }
        
        return await self.execute(input_data, context)
    
    def generate_fallback_result(self, input_data: Dict[str, Any], context: Dict[str, Any]) -> PerformanceAnalytics:
        """Generate fallback overall analysis"""
        response_analyses = input_data.get("response_analyses", [])
        config_data = input_data.get("config", {})
        
        logger.warning(f"[{self.name}] Using fallback overall analysis")
        
        if not response_analyses:
            # Default analysis when no responses
            return PerformanceAnalytics(
                overall_score=70,
                performance_level="fair",
                strengths=["Shows willingness to participate"],
                improvements=["Complete more interview questions"],
                response_analysis=ResponseAnalysis(
                    clarity=70, structure=70, technical=70,
                    communication=70, confidence=70, relevance=70
                ),
                trends={"improvement": "consistent", "consistency": "medium", "adaptability": "medium"},
                recommendations=["Practice more interview scenarios"],
                executive_summary="Limited data available for comprehensive analysis.",
                next_steps=["Complete full interview sessions"],
                question_reviews=[],
                metadata={"fallback": True, "total_responses": 0}
            )
        
        # Calculate averages from individual analyses
        avg_scores = {
            "clarity": 0, "structure": 0, "technical": 0,
            "communication": 0, "confidence": 0, "relevance": 0
        }
        
        total_score = 0
        all_strengths = []
        all_improvements = []
        question_reviews = []
        
        for i, analysis in enumerate(response_analyses):
            analysis_data = analysis.get("analysis", {})
            scores = analysis_data.get("response_analysis", {})
            
            # Accumulate scores
            for key in avg_scores:
                avg_scores[key] += scores.get(key, 70)
            
            total_score += analysis_data.get("score", 70)
            
            # Collect strengths and improvements
            if analysis_data.get("strengths"):
                all_strengths.extend(analysis_data["strengths"])
            if analysis_data.get("improvements"):
                all_improvements.extend(analysis_data["improvements"])
            
            # Create question review
            question_reviews.append({
                "question_id": analysis.get("question_id", f"q{i+1}"),
                "question": analysis.get("question", ""),
                "response": analysis.get("response", ""),
                "score": analysis_data.get("score", 70),
                "feedback": analysis_data.get("feedback", "Good response")
            })
        
        # Calculate averages
        num_responses = len(response_analyses)
        for key in avg_scores:
            avg_scores[key] = round(avg_scores[key] / num_responses)
        
        overall_score = round(total_score / num_responses)
        
        # Determine performance level
        if overall_score >= 85:
            performance_level = "excellent"
        elif overall_score >= 70:
            performance_level = "good"
        elif overall_score >= 60:
            performance_level = "fair"
        else:
            performance_level = "needs_improvement"
        
        # Deduplicate strengths and improvements
        unique_strengths = list(set(all_strengths))[:3] if all_strengths else [
            "Shows understanding of core concepts",
            "Demonstrates relevant experience",
            "Communicates ideas clearly"
        ]
        
        unique_improvements = list(set(all_improvements))[:3] if all_improvements else [
            "Provide more specific examples",
            "Structure responses more clearly",
            "Practice confident delivery"
        ]
        
        return PerformanceAnalytics(
            overall_score=overall_score,
            performance_level=performance_level,
            strengths=unique_strengths,
            improvements=unique_improvements,
            response_analysis=ResponseAnalysis(**avg_scores),
            trends={
                "improvement": "consistent",
                "consistency": "medium",
                "adaptability": "medium"
            },
            recommendations=[
                "Practice structuring responses using frameworks like STAR method",
                "Prepare specific examples for common question types",
                "Work on confident delivery and clear communication",
                f"Focus on improving {config_data.get('topic', 'technical')} knowledge depth"
            ],
            executive_summary=f"The candidate demonstrated {performance_level} performance with an overall score of {overall_score}%. They show solid understanding of {config_data.get('topic', 'the subject')} concepts but could benefit from more structured responses and specific examples.",
            next_steps=[
                "Practice mock interviews focusing on response structure",
                "Prepare a portfolio of specific examples for different scenarios",
                "Work on confident delivery and clear articulation",
                f"Deepen knowledge in {config_data.get('topic', 'the subject')} through additional study and practice"
            ],
            question_reviews=question_reviews,
            metadata={
                "fallback": True,
                "total_responses": num_responses,
                "analysis_method": "fallback"
            }
        )