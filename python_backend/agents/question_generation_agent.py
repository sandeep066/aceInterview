"""
Question Generation Agent using Pydantic AI
"""
from typing import Type, Dict, Any
from pydantic import BaseModel
from loguru import logger

from .base_agent import BaseAgent
from models.interview_models import InterviewConfig, TopicAnalysis, QuestionMetadata

class QuestionResult(BaseModel):
    """Question generation result"""
    question: str
    metadata: QuestionMetadata
    reasoning: str

class QuestionGenerationAgent(BaseAgent[QuestionResult]):
    """Agent for generating interview questions"""
    
    def get_result_type(self) -> Type[QuestionResult]:
        return QuestionResult
    
    def get_system_prompt(self) -> str:
        return """You are a Question Generation Agent that creates specific, high-quality interview questions.

Your role is to:
1. Generate questions based on the provided specifications
2. Ensure questions are relevant to the topic and concepts
3. Match the specified difficulty level and question type
4. Create engaging, realistic interview questions
5. Avoid generic or overly broad questions

Generate questions that are:
- Specific and actionable
- Appropriate for the experience level
- Directly related to the specified concepts
- Realistic for actual interviews
- Clear and unambiguous

Provide the question text, metadata about the question, and reasoning for why this question fits the specifications."""
    
    async def generate_question(
        self,
        question_spec: Dict[str, Any],
        topic_analysis: TopicAnalysis,
        config: InterviewConfig
    ) -> QuestionResult:
        """Generate interview question"""
        input_data = {
            "question_spec": question_spec,
            "topic_analysis": topic_analysis.model_dump(),
            "config": config.model_dump()
        }
        
        context = {
            "generation_type": "interview_question",
            "topic": config.topic,
            "style": config.style
        }
        
        return await self.execute(input_data, context)
    
    def generate_fallback_result(self, input_data: Dict[str, Any], context: Dict[str, Any]) -> QuestionResult:
        """Generate fallback question"""
        config_data = input_data.get("config", {})
        topic = config_data.get("topic", "Technology")
        style = config_data.get("style", "technical")
        experience_level = config_data.get("experience_level", "junior")
        
        logger.warning(f"[{self.name}] Using fallback question generation for {topic}")
        
        fallback_questions = {
            "technical": {
                "easy": [
                    f"What are the basic concepts of {topic}?",
                    f"How would you explain {topic} to a beginner?",
                    f"What tools do you use for {topic} development?"
                ],
                "medium": [
                    f"Describe a challenging problem you solved using {topic}.",
                    f"How do you optimize performance in {topic} applications?",
                    f"What are the best practices for {topic} development?"
                ],
                "hard": [
                    f"Design a scalable architecture for a {topic} system.",
                    f"How would you handle complex state management in {topic}?",
                    f"Explain advanced concepts and patterns in {topic}."
                ]
            },
            "hr": {
                "easy": [
                    f"Why are you interested in {topic}?",
                    f"What motivates you to work with {topic}?",
                    f"How do you stay updated with {topic} trends?"
                ],
                "medium": [
                    f"Describe a project where you used {topic} successfully.",
                    f"How do you handle challenges when working with {topic}?",
                    f"What's your approach to learning new {topic} technologies?"
                ],
                "hard": [
                    f"How would you lead a team working on {topic} projects?",
                    f"What's your vision for the future of {topic}?",
                    f"How do you balance innovation and stability in {topic} work?"
                ]
            },
            "behavioral": {
                "easy": [
                    f"Tell me about a time you learned {topic}.",
                    f"Describe your experience working with {topic}.",
                    f"How do you approach {topic} problems?"
                ],
                "medium": [
                    f"Tell me about a challenging {topic} project you worked on.",
                    f"Describe a time you had to debug a complex {topic} issue.",
                    f"How did you handle a situation where {topic} requirements changed?"
                ],
                "hard": [
                    f"Tell me about a time you had to make a critical decision about {topic} architecture.",
                    f"Describe how you influenced others to adopt {topic} best practices.",
                    f"How did you handle a major {topic} system failure?"
                ]
            }
        }
        
        # Determine difficulty based on experience level
        difficulty_map = {
            'fresher': 'easy',
            'junior': 'medium',
            'mid-level': 'medium',
            'senior': 'hard',
            'lead-manager': 'hard'
        }
        
        difficulty = difficulty_map.get(experience_level, 'medium')
        style_questions = fallback_questions.get(style, fallback_questions["technical"])
        difficulty_questions = style_questions.get(difficulty, style_questions["medium"])
        
        import random
        selected_question = random.choice(difficulty_questions)
        
        return QuestionResult(
            question=selected_question,
            metadata=QuestionMetadata(
                category=style,
                difficulty=difficulty,
                focus_area="General Knowledge",
                concepts=["Core Concepts"],
                question_type="theoretical",
                estimated_time="5 minutes"
            ),
            reasoning=f"Fallback question for {style} interview at {difficulty} level"
        )