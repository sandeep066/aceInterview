"""
Pydantic models for interview system
"""
from typing import List, Optional, Dict, Any, Literal
from pydantic import BaseModel, Field
from datetime import datetime

class InterviewConfig(BaseModel):
    """Interview configuration model"""
    topic: str = Field(..., description="Interview topic")
    style: Literal["technical", "hr", "behavioral", "salary-negotiation", "case-study"] = Field(..., description="Interview style")
    experience_level: Literal["fresher", "junior", "mid-level", "senior", "lead-manager"] = Field(..., description="Experience level")
    company_name: Optional[str] = Field(None, description="Target company name")
    duration: int = Field(..., ge=15, le=120, description="Interview duration in minutes")

class InterviewResponse(BaseModel):
    """Interview response model"""
    question_id: str = Field(..., description="Question identifier")
    question: str = Field(..., description="Interview question")
    response: str = Field(..., description="User response")
    timestamp: int = Field(..., description="Response timestamp")
    duration: Optional[int] = Field(None, description="Response duration in ms")

class QuestionGenerationRequest(BaseModel):
    """Request for question generation"""
    config: InterviewConfig
    previous_questions: Optional[List[str]] = Field(default_factory=list)
    previous_responses: Optional[List[InterviewResponse]] = Field(default_factory=list)
    question_number: Optional[int] = Field(1, ge=1)

class FollowUpRequest(BaseModel):
    """Request for follow-up question generation"""
    question: str = Field(..., description="Original question")
    response: str = Field(..., description="User response")
    config: InterviewConfig

class ResponseAnalysisRequest(BaseModel):
    """Request for response analysis"""
    question: str = Field(..., description="Interview question")
    response: str = Field(..., description="User response")
    config: InterviewConfig

class AnalyticsRequest(BaseModel):
    """Request for analytics generation"""
    responses: List[InterviewResponse] = Field(..., description="Interview responses")
    config: InterviewConfig

class VoiceInterviewStartRequest(BaseModel):
    """Request to start voice interview"""
    config: InterviewConfig
    participant_name: Optional[str] = Field(None, description="Participant name")
    enable_ai_agent: bool = Field(True, description="Enable AI agent")
    agent_provider: Literal["openai", "google"] = Field("google", description="AI agent provider")

class ResponseAnalysis(BaseModel):
    """Response analysis result"""
    clarity: int = Field(..., ge=0, le=100, description="Clarity score")
    structure: int = Field(..., ge=0, le=100, description="Structure score")
    technical: int = Field(..., ge=0, le=100, description="Technical score")
    communication: int = Field(..., ge=0, le=100, description="Communication score")
    confidence: int = Field(..., ge=0, le=100, description="Confidence score")
    relevance: int = Field(..., ge=0, le=100, description="Relevance score")

class QuestionMetadata(BaseModel):
    """Question metadata"""
    category: str = Field(..., description="Question category")
    difficulty: Literal["easy", "medium", "hard"] = Field(..., description="Question difficulty")
    focus_area: str = Field(..., description="Focus area")
    concepts: List[str] = Field(..., description="Key concepts")
    question_type: Literal["theoretical", "practical", "scenario", "problem-solving"] = Field(..., description="Question type")
    estimated_time: Optional[str] = Field(None, description="Estimated time to answer")

class TopicAnalysis(BaseModel):
    """Topic analysis result"""
    main_concepts: List[str] = Field(..., description="Main concepts")
    skills: List[str] = Field(..., description="Required skills")
    technologies: List[str] = Field(..., description="Relevant technologies")
    focus_areas: List[str] = Field(..., description="Focus areas")
    complexity: Literal["low", "medium", "high"] = Field(..., description="Topic complexity")
    question_categories: List[str] = Field(..., description="Question categories")
    relevance_keywords: List[str] = Field(..., description="Relevance keywords")

class PerformanceAnalytics(BaseModel):
    """Performance analytics result"""
    overall_score: int = Field(..., ge=0, le=100, description="Overall score")
    performance_level: Literal["excellent", "good", "fair", "needs_improvement"] = Field(..., description="Performance level")
    strengths: List[str] = Field(..., description="Identified strengths")
    improvements: List[str] = Field(..., description="Areas for improvement")
    response_analysis: ResponseAnalysis = Field(..., description="Response analysis scores")
    trends: Dict[str, str] = Field(..., description="Performance trends")
    recommendations: List[str] = Field(..., description="Recommendations")
    executive_summary: str = Field(..., description="Executive summary")
    next_steps: List[str] = Field(..., description="Next steps")
    question_reviews: List[Dict[str, Any]] = Field(..., description="Question-by-question reviews")
    metadata: Dict[str, Any] = Field(..., description="Analysis metadata")