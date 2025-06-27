"""
Base agent class using Pydantic AI
"""
from typing import Any, Dict, Optional, Type, TypeVar, Generic
from abc import ABC, abstractmethod
from pydantic import BaseModel
from pydantic_ai import Agent, RunContext
from loguru import logger
import json

T = TypeVar('T', bound=BaseModel)

class BaseAgent(ABC, Generic[T]):
    """Base agent class for interview system using Pydantic AI"""
    
    def __init__(self, name: str, model_name: str = "gemini-2.5-flash"):
        self.name = name
        self.model_name = model_name
        self.memory: Dict[str, Any] = {}
        
        # Create Pydantic AI agent
        self.agent = Agent(
            model=model_name,
            result_type=self.get_result_type(),
            system_prompt=self.get_system_prompt()
        )
        
        logger.info(f"🤖 Initialized {self.name} with model {model_name}")
    
    @abstractmethod
    def get_result_type(self) -> Type[T]:
        """Get the result type for this agent"""
        pass
    
    @abstractmethod
    def get_system_prompt(self) -> str:
        """Get the system prompt for this agent"""
        pass
    
    async def execute(self, input_data: Dict[str, Any], context: Optional[Dict[str, Any]] = None) -> T:
        """Execute the agent with input data"""
        try:
            logger.info(f"[{self.name}] Executing with input keys: {list(input_data.keys())}")
            
            # Store context in memory
            if context:
                self.update_memory(context)
            
            # Prepare the prompt
            prompt = self.prepare_prompt(input_data, context or {})
            
            # Run the agent
            result = await self.agent.run(prompt)
            
            logger.info(f"[{self.name}] Execution completed successfully")
            return result.data
            
        except Exception as error:
            logger.error(f"[{self.name}] Execution error: {error}")
            return self.generate_fallback_result(input_data, context or {})
    
    def prepare_prompt(self, input_data: Dict[str, Any], context: Dict[str, Any]) -> str:
        """Prepare the prompt for the agent"""
        prompt_parts = []
        
        if context:
            prompt_parts.append(f"Context: {json.dumps(context, indent=2)}")
        
        prompt_parts.append(f"Input: {json.dumps(input_data, indent=2)}")
        
        return "\n\n".join(prompt_parts)
    
    def update_memory(self, context: Dict[str, Any]) -> None:
        """Update agent memory with context"""
        self.memory.update(context)
    
    def get_memory(self, key: str) -> Any:
        """Get value from memory"""
        return self.memory.get(key)
    
    def clear_memory(self) -> None:
        """Clear agent memory"""
        self.memory.clear()
    
    @abstractmethod
    def generate_fallback_result(self, input_data: Dict[str, Any], context: Dict[str, Any]) -> T:
        """Generate fallback result when agent execution fails"""
        pass

class AgentContext(BaseModel):
    """Context for agent execution"""
    session_id: Optional[str] = None
    user_id: Optional[str] = None
    timestamp: Optional[str] = None
    metadata: Dict[str, Any] = {}