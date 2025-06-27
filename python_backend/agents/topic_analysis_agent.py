"""
Topic Analysis Agent using Pydantic AI
"""
from typing import Type, Dict, Any
from pydantic_ai import Agent
from loguru import logger

from .base_agent import BaseAgent
from models.interview_models import TopicAnalysis, InterviewConfig

class TopicAnalysisAgent(BaseAgent[TopicAnalysis]):
    """Agent for analyzing interview topics"""
    
    def get_result_type(self) -> Type[TopicAnalysis]:
        return TopicAnalysis
    
    def get_system_prompt(self) -> str:
        return """You are a Topic Analysis Agent specialized in breaking down interview topics into structured components.

Your role is to:
1. Analyze the given topic and extract key concepts
2. Identify relevant skills and technologies
3. Determine appropriate focus areas for questions
4. Consider the experience level and interview style
5. Provide a structured analysis that guides question generation

Analyze the topic thoroughly and provide:
- Main concepts that should be covered
- Specific skills to assess
- Technologies/tools that are relevant
- Areas of focus based on experience level
- Question categories that make sense
- Keywords that indicate relevance

Be thorough and specific to ensure generated questions will be highly relevant."""
    
    async def analyze_topic(self, config: InterviewConfig) -> TopicAnalysis:
        """Analyze interview topic"""
        input_data = {
            "topic": config.topic,
            "style": config.style,
            "experience_level": config.experience_level,
            "company_name": config.company_name
        }
        
        context = {
            "analysis_type": "topic_analysis",
            "interview_context": config.model_dump()
        }
        
        return await self.execute(input_data, context)
    
    def generate_fallback_result(self, input_data: Dict[str, Any], context: Dict[str, Any]) -> TopicAnalysis:
        """Generate fallback topic analysis"""
        topic = input_data.get("topic", "General Technology")
        style = input_data.get("style", "technical")
        experience_level = input_data.get("experience_level", "junior")
        
        logger.warning(f"[{self.name}] Using fallback analysis for topic: {topic}")
        
        # Fallback mappings based on common topics
        fallback_mappings = {
            'frontend': {
                'main_concepts': ['User Interface', 'User Experience', 'Web Development', 'Client-side Programming'],
                'skills': ['HTML', 'CSS', 'JavaScript', 'React', 'Vue', 'Angular'],
                'technologies': ['React', 'Vue.js', 'Angular', 'TypeScript', 'Webpack', 'Sass'],
                'focus_areas': ['Component Design', 'State Management', 'Performance Optimization', 'Responsive Design'],
                'relevance_keywords': ['component', 'state', 'props', 'DOM', 'CSS', 'responsive', 'performance']
            },
            'backend': {
                'main_concepts': ['Server-side Development', 'API Design', 'Database Management', 'System Architecture'],
                'skills': ['Node.js', 'Python', 'Java', 'SQL', 'API Development', 'Database Design'],
                'technologies': ['Express.js', 'Django', 'Spring Boot', 'PostgreSQL', 'MongoDB', 'Redis'],
                'focus_areas': ['API Design', 'Database Optimization', 'Security', 'Scalability'],
                'relevance_keywords': ['API', 'database', 'server', 'authentication', 'security', 'scalability']
            },
            'javascript': {
                'main_concepts': ['Programming Fundamentals', 'Asynchronous Programming', 'Object-Oriented Programming'],
                'skills': ['ES6+', 'Async/Await', 'Promises', 'Closures', 'Prototypes'],
                'technologies': ['Node.js', 'React', 'Express', 'TypeScript'],
                'focus_areas': ['Language Features', 'Best Practices', 'Performance', 'Modern JavaScript'],
                'relevance_keywords': ['function', 'async', 'promise', 'closure', 'prototype', 'ES6', 'arrow function']
            }
        }
        
        # Try to match topic with predefined mappings
        topic_lower = topic.lower()
        analysis_data = None
        
        for key, mapping in fallback_mappings.items():
            if key in topic_lower:
                analysis_data = mapping
                break
        
        # Generic fallback if no match found
        if not analysis_data:
            analysis_data = {
                'main_concepts': ['Technical Knowledge', 'Problem Solving', 'Best Practices'],
                'skills': ['Programming', 'Debugging', 'Testing', 'Documentation'],
                'technologies': ['Version Control', 'IDEs', 'Testing Frameworks'],
                'focus_areas': ['Core Concepts', 'Practical Application', 'Industry Standards'],
                'relevance_keywords': ['code', 'programming', 'development', 'software', 'technical']
            }
        
        # Determine complexity based on experience level
        complexity_map = {
            'fresher': 'low',
            'junior': 'medium',
            'mid-level': 'medium',
            'senior': 'high',
            'lead-manager': 'high'
        }
        
        return TopicAnalysis(
            main_concepts=analysis_data['main_concepts'],
            skills=analysis_data['skills'],
            technologies=analysis_data['technologies'],
            focus_areas=analysis_data['focus_areas'],
            complexity=complexity_map.get(experience_level, 'medium'),
            question_categories=[style, 'fundamentals', 'practical'],
            relevance_keywords=analysis_data['relevance_keywords']
        )