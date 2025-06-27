"""
Performance Analysis Orchestrator using Pydantic AI
"""
from typing import List, Dict, Any
from loguru import logger

from .response_analysis_agent import ResponseAnalysisAgent
from .overall_analysis_agent import OverallAnalysisAgent
from models.interview_models import InterviewConfig, InterviewResponse, PerformanceAnalytics

class PerformanceAnalysisOrchestrator:
    """
    Performance Analysis Orchestrator using Pydantic AI
    Coordinates the multi-agent workflow for comprehensive interview performance analysis
    """
    
    def __init__(self, model_name: str = "gemini-2.5-flash"):
        self.model_name = model_name
        
        # Initialize analysis agents
        self.response_analysis_agent = ResponseAnalysisAgent("ResponseAnalysisAgent", model_name)
        self.overall_analysis_agent = OverallAnalysisAgent("OverallAnalysisAgent", model_name)
        
        # Analysis cache for performance
        self.analysis_cache: Dict[str, Any] = {}
        
        logger.info(f"📊 Performance Analysis Orchestrator initialized with Pydantic AI (model: {model_name})")
    
    async def generate_comprehensive_analytics(
        self,
        responses: List[InterviewResponse],
        config: InterviewConfig
    ) -> PerformanceAnalytics:
        """Generate comprehensive interview performance analytics"""
        session_id = self.get_session_id(config, responses)
        
        try:
            logger.info(f"[PerformanceOrchestrator] Starting comprehensive analysis for session {session_id}")
            
            # Step 1: Analyze each individual response
            response_analyses = await self.analyze_individual_responses(responses, config)
            
            # Step 2: Generate overall performance analysis
            overall_analysis = await self.generate_overall_analysis(response_analyses, config, responses)
            
            # Cache the results
            self.analysis_cache[session_id] = overall_analysis
            
            logger.info(f"[PerformanceOrchestrator] Successfully generated comprehensive analytics for session {session_id}")
            
            return overall_analysis
            
        except Exception as error:
            logger.error(f"[PerformanceOrchestrator] Error in comprehensive analysis: {error}")
            return self.generate_fallback_analytics(responses, config)
    
    async def analyze_single_response(
        self,
        question: str,
        response: str,
        config: InterviewConfig
    ) -> Dict[str, Any]:
        """Analyze a single response"""
        try:
            logger.info("[PerformanceOrchestrator] Analyzing single response")
            
            analysis_result = await self.response_analysis_agent.analyze_response(
                question=question,
                response=response,
                config=config
            )
            
            return analysis_result.model_dump()
            
        except Exception as error:
            logger.error(f"[PerformanceOrchestrator] Error analyzing single response: {error}")
            return self.generate_fallback_response_analysis(response, config)
    
    async def analyze_individual_responses(
        self,
        responses: List[InterviewResponse],
        config: InterviewConfig
    ) -> List[Dict[str, Any]]:
        """Analyze each individual response using the Response Analysis Agent"""
        logger.info(f"[PerformanceOrchestrator] Analyzing {len(responses)} individual responses")
        
        response_analyses = []
        
        for i, response in enumerate(responses):
            try:
                logger.info(f"[PerformanceOrchestrator] Analyzing response {i + 1}/{len(responses)}")
                
                analysis_result = await self.response_analysis_agent.analyze_response(
                    question=response.question,
                    response=response.response,
                    config=config,
                    question_number=i + 1
                )
                
                response_analyses.append({
                    "question_id": response.question_id,
                    "question": response.question,
                    "response": response.response,
                    "timestamp": response.timestamp,
                    "analysis": analysis_result.model_dump(),
                    "metadata": {"analyzed_at": "2024-01-01T00:00:00Z"}
                })
                
            except Exception as error:
                logger.error(f"[PerformanceOrchestrator] Error analyzing response {i + 1}: {error}")
                
                # Add fallback analysis for this response
                response_analyses.append({
                    "question_id": response.question_id,
                    "question": response.question,
                    "response": response.response,
                    "timestamp": response.timestamp,
                    "analysis": self.generate_fallback_response_analysis(response.response, config),
                    "metadata": {"fallback": True, "analyzed_at": "2024-01-01T00:00:00Z"}
                })
        
        logger.info(f"[PerformanceOrchestrator] Completed analysis of {len(response_analyses)} responses")
        return response_analyses
    
    async def generate_overall_analysis(
        self,
        response_analyses: List[Dict[str, Any]],
        config: InterviewConfig,
        responses: List[InterviewResponse]
    ) -> PerformanceAnalytics:
        """Generate overall performance analysis using the Overall Analysis Agent"""
        logger.info("[PerformanceOrchestrator] Generating overall performance analysis")
        
        try:
            session_metadata = {
                "total_questions": len(responses),
                "total_duration": responses[-1].timestamp - responses[0].timestamp if responses else 0,
                "average_response_time": sum(r.duration or 0 for r in responses) / len(responses) if responses else 0,
                "interview_style": config.style,
                "experience_level": config.experience_level
            }
            
            overall_result = await self.overall_analysis_agent.analyze_overall_performance(
                response_analyses=response_analyses,
                config=config,
                session_metadata=session_metadata
            )
            
            return overall_result
            
        except Exception as error:
            logger.error(f"[PerformanceOrchestrator] Error in overall analysis: {error}")
            return self.generate_fallback_overall_analysis(response_analyses, config)
    
    def generate_fallback_response_analysis(self, response: str, config: InterviewConfig) -> Dict[str, Any]:
        """Generate fallback response analysis"""
        response_length = len(response)
        
        return {
            "response_analysis": {
                "clarity": min(95, max(60, 70 + (response_length / 50))),
                "structure": 75 if "." in response else 65,
                "technical": 70 if config.style == "technical" else 75,
                "communication": min(90, max(60, 65 + (response_length / 40))),
                "confidence": 65 if "i think" in response.lower() else 75,
                "relevance": 75
            },
            "strengths": ["Shows understanding of the topic"],
            "improvements": ["Add more specific examples"],
            "feedback": "Good response with relevant content. Consider adding more specific examples.",
            "score": 75,
            "key_insights": ["Response demonstrates understanding"],
            "reasoning": "Fallback analysis based on response characteristics"
        }
    
    def generate_fallback_overall_analysis(
        self,
        response_analyses: List[Dict[str, Any]],
        config: InterviewConfig
    ) -> PerformanceAnalytics:
        """Generate fallback overall analysis"""
        from models.interview_models import ResponseAnalysis
        
        if not response_analyses:
            avg_score = 70
        else:
            avg_score = sum(r.get("analysis", {}).get("score", 70) for r in response_analyses) / len(response_analyses)
        
        performance_level = "good" if avg_score >= 80 else "fair" if avg_score >= 60 else "needs_improvement"
        
        return PerformanceAnalytics(
            overall_score=round(avg_score),
            performance_level=performance_level,
            strengths=["Shows understanding of core concepts"],
            improvements=["Provide more specific examples"],
            response_analysis=ResponseAnalysis(
                clarity=round(avg_score),
                structure=round(avg_score - 5),
                technical=round(avg_score),
                communication=round(avg_score),
                confidence=round(avg_score - 10),
                relevance=round(avg_score)
            ),
            trends={
                "improvement": "consistent",
                "consistency": "medium",
                "adaptability": "medium"
            },
            recommendations=["Practice structured responses"],
            executive_summary=f"Candidate demonstrated fair performance with room for improvement in {config.topic}.",
            next_steps=["Practice mock interviews"],
            question_reviews=[],
            metadata={
                "fallback": True,
                "total_responses": len(response_analyses),
                "analysis_method": "fallback"
            }
        )
    
    def generate_fallback_analytics(
        self,
        responses: List[InterviewResponse],
        config: InterviewConfig
    ) -> PerformanceAnalytics:
        """Generate fallback analytics (simplified version)"""
        logger.info("[PerformanceOrchestrator] Generating fallback analytics")
        
        from models.interview_models import ResponseAnalysis
        
        question_reviews = []
        for i, response in enumerate(responses):
            question_reviews.append({
                "question_id": response.question_id,
                "question": response.question,
                "response": response.response,
                "score": 70 + (i * 5),  # Slight variation
                "feedback": "Good response with room for improvement."
            })
        
        return PerformanceAnalytics(
            overall_score=75,
            performance_level="fair",
            strengths=["Clear communication", "Good technical understanding"],
            improvements=["Add more specific examples", "Structure responses better"],
            response_analysis=ResponseAnalysis(
                clarity=75, structure=70, technical=80,
                communication=75, confidence=70, relevance=75
            ),
            trends={
                "improvement": "consistent",
                "consistency": "medium",
                "adaptability": "medium"
            },
            recommendations=["Practice structured responses"],
            executive_summary="Candidate showed good understanding with room for improvement.",
            next_steps=["Continue practicing interview scenarios"],
            question_reviews=question_reviews,
            metadata={
                "generated_at": "2024-01-01T00:00:00Z",
                "analysis_method": "fallback",
                "total_responses": len(responses),
                "framework": "Pydantic AI"
            }
        )
    
    def get_session_id(self, config: InterviewConfig, responses: List[InterviewResponse]) -> str:
        """Generate session ID for caching"""
        timestamp = responses[0].timestamp if responses else 0
        return f"{config.topic}_{config.style}_{timestamp}".replace(" ", "_").lower()
    
    def get_analysis_stats(self) -> Dict[str, Any]:
        """Get analysis statistics"""
        return {
            "cached_analyses": len(self.analysis_cache),
            "agents_enabled": ["ResponseAnalysis", "OverallAnalysis"],
            "analysis_method": "agentic",
            "framework": "Pydantic AI"
        }
    
    def clear_cache(self) -> None:
        """Clear analysis cache"""
        self.analysis_cache.clear()