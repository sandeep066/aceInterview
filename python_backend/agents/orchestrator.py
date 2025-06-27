"""
Agentic Orchestrator using Pydantic AI
"""
from typing import List, Dict, Any, Optional
from loguru import logger
import asyncio

from .topic_analysis_agent import TopicAnalysisAgent
from .question_generation_agent import QuestionGenerationAgent
from models.interview_models import InterviewConfig, InterviewResponse, TopicAnalysis

class AgenticOrchestrator:
    """
    Agentic Orchestrator using Pydantic AI
    Streamlined workflow with topic analysis and question generation for maximum speed
    """
    
    def __init__(self, model_name: str = "gemini-1.5-flash"):
        self.model_name = model_name
        
        # Initialize only essential agents for speed
        self.topic_analysis_agent = TopicAnalysisAgent("TopicAnalysisAgent", model_name)
        self.question_generation_agent = QuestionGenerationAgent("QuestionGenerationAgent", model_name)
        
        # Session memory for maintaining context
        self.session_memory: Dict[str, Any] = {}
        
        logger.info(f"🤖 Agentic Orchestrator initialized with Pydantic AI (model: {model_name})")
    
    async def generate_question(
        self,
        config: InterviewConfig,
        previous_questions: List[str] = None,
        previous_responses: List[InterviewResponse] = None,
        question_number: int = 1
    ) -> str:
        """Generate a high-quality, topic-relevant interview question"""
        session_id = self.get_session_id(config)
        
        try:
            logger.info(f"[Orchestrator] Starting question generation for session {session_id}, question {question_number}")
            
            # Step 1: Topic Analysis (cached after first call)
            topic_analysis = await self.get_or_create_topic_analysis(config, session_id)
            
            # Step 2: Direct Question Generation
            final_question = await self.generate_question_streamlined(
                topic_analysis=topic_analysis,
                config=config,
                previous_questions=previous_questions or [],
                previous_responses=previous_responses or [],
                question_number=question_number
            )
            
            # Store in session memory
            self.update_session_memory(session_id, {
                "last_question": final_question,
                "question_number": question_number
            })
            
            logger.info(f"[Orchestrator] Successfully generated question {question_number}: \"{final_question[:50]}...\"")
            
            return final_question
            
        except Exception as error:
            logger.error(f"[Orchestrator] Error in question generation: {error}")
            return self.generate_fallback_question(config, question_number)
    
    async def generate_followup(
        self,
        original_question: str,
        user_response: str,
        config: InterviewConfig
    ) -> str:
        """Generate follow-up question based on user response"""
        try:
            logger.info("[Orchestrator] Generating follow-up question")
            
            # Create a simple follow-up using the question generation agent
            topic_analysis = await self.get_or_create_topic_analysis(config, self.get_session_id(config))
            
            question_spec = {
                "category": "follow-up",
                "difficulty": "medium",
                "focus_area": "Response Clarification",
                "concepts": ["Follow-up", "Clarification"],
                "question_type": "practical",
                "context": {
                    "original_question": original_question,
                    "user_response": user_response
                }
            }
            
            result = await self.question_generation_agent.generate_question(
                question_spec=question_spec,
                topic_analysis=topic_analysis,
                config=config
            )
            
            return result.question
            
        except Exception as error:
            logger.error(f"[Orchestrator] Error generating follow-up: {error}")
            return "Can you elaborate on that point a bit more?"
    
    async def get_or_create_topic_analysis(self, config: InterviewConfig, session_id: str) -> TopicAnalysis:
        """Get or create topic analysis (cached per session)"""
        cache_key = f"{session_id}_topic_analysis"
        
        if cache_key in self.session_memory:
            logger.info("[Orchestrator] Using cached topic analysis")
            return TopicAnalysis(**self.session_memory[cache_key])
        
        logger.info("[Orchestrator] Performing topic analysis")
        analysis_result = await self.topic_analysis_agent.analyze_topic(config)
        
        # Cache the analysis
        self.session_memory[cache_key] = analysis_result.model_dump()
        
        return analysis_result
    
    async def generate_question_streamlined(
        self,
        topic_analysis: TopicAnalysis,
        config: InterviewConfig,
        previous_questions: List[str],
        previous_responses: List[InterviewResponse],
        question_number: int
    ) -> str:
        """Generate question with streamlined approach"""
        logger.info("[Orchestrator] Generating question with streamlined approach")
        
        try:
            # Create a simple question specification based on topic analysis
            question_spec = self.create_simple_question_spec(
                topic_analysis=topic_analysis,
                config=config,
                previous_questions=previous_questions,
                question_number=question_number
            )
            
            generation_result = await self.question_generation_agent.generate_question(
                question_spec=question_spec,
                topic_analysis=topic_analysis,
                config=config
            )
            
            logger.info("[Orchestrator] Question generated successfully in streamlined mode")
            return generation_result.question
            
        except Exception as error:
            logger.error(f"[Orchestrator] Streamlined generation failed: {error}")
            return self.generate_fallback_question(config, question_number)
    
    def create_simple_question_spec(
        self,
        topic_analysis: TopicAnalysis,
        config: InterviewConfig,
        previous_questions: List[str],
        question_number: int
    ) -> Dict[str, Any]:
        """Create a simple question specification without planning agent"""
        
        # Determine difficulty based on question number and experience level
        difficulty = "easy"
        if question_number > 2:
            difficulty = "medium" if config.experience_level == "fresher" else "hard"
        elif question_number > 1:
            difficulty = "medium"
        
        # Select focus area from topic analysis
        focus_areas = topic_analysis.focus_areas or ["General Knowledge"]
        focus_area = focus_areas[min(question_number - 1, len(focus_areas) - 1)]
        
        # Select concepts from topic analysis
        concepts = topic_analysis.main_concepts[:2] if topic_analysis.main_concepts else ["Core Concepts"]
        
        # Determine question type based on style and question number
        question_type = "theoretical"
        if config.style == "behavioral":
            question_type = "scenario"
        elif config.style == "case-study":
            question_type = "problem-solving"
        elif question_number > 1:
            question_type = "practical"
        
        return {
            "category": config.style,
            "difficulty": difficulty,
            "focus_area": focus_area,
            "concepts": concepts,
            "avoid_topics": previous_questions,
            "question_type": question_type
        }
    
    def get_session_id(self, config: InterviewConfig) -> str:
        """Generate session ID for caching"""
        return f"{config.topic}_{config.style}_{config.experience_level}".replace(" ", "_").lower()
    
    def update_session_memory(self, session_id: str, data: Dict[str, Any]) -> None:
        """Update session memory"""
        if session_id not in self.session_memory:
            self.session_memory[session_id] = {}
        self.session_memory[session_id].update(data)
    
    def generate_fallback_question(self, config: InterviewConfig, question_number: int) -> str:
        """Generate fallback question"""
        fallbacks = {
            "technical": [
                f"What are the key concepts and best practices in {config.topic}?",
                f"How would you approach solving a complex problem using {config.topic}?",
                f"Explain the architecture and design patterns you would use for a {config.topic} project.",
                f"What are the performance considerations when working with {config.topic}?",
                f"How do you ensure code quality and maintainability in {config.topic} development?"
            ],
            "hr": [
                f"Why are you passionate about working with {config.topic}?",
                f"How do you stay current with developments in {config.topic}?",
                f"Describe your experience and growth in {config.topic}.",
                f"What challenges have you faced while working with {config.topic}?",
                f"How do you see your career developing in the {config.topic} field?"
            ],
            "behavioral": [
                f"Tell me about a successful project you completed using {config.topic}.",
                f"Describe a time when you had to learn {config.topic} quickly for a project.",
                f"How did you handle a difficult technical challenge involving {config.topic}?",
                f"Tell me about a time you had to collaborate with others on a {config.topic} project.",
                f"Describe how you've improved your {config.topic} skills over time."
            ]
        }
        
        style_questions = fallbacks.get(config.style, fallbacks["technical"])
        index = min(question_number - 1, len(style_questions) - 1)
        
        return style_questions[index]
    
    def clear_session(self, session_id: str) -> None:
        """Clear session memory for a specific session"""
        keys_to_remove = [key for key in self.session_memory.keys() if key.startswith(session_id)]
        for key in keys_to_remove:
            del self.session_memory[key]
    
    def get_session_stats(self) -> Dict[str, Any]:
        """Get session statistics"""
        active_sessions = set()
        for key in self.session_memory.keys():
            if "_" in key:
                session_id = key.split("_")[0]
                active_sessions.add(session_id)
        
        return {
            "active_sessions": len(active_sessions),
            "total_cached_items": len(self.session_memory),
            "memory_usage": len(str(self.session_memory)),
            "agents_enabled": ["TopicAnalysis", "QuestionGeneration"],
            "planning_enabled": False,
            "validation_enabled": False,
            "streamlined_mode": True,
            "framework": "Pydantic AI"
        }