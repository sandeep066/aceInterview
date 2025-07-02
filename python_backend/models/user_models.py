"""
User models for authentication integration
"""
from typing import Optional
from pydantic import BaseModel, Field
from datetime import datetime

class UserProfile(BaseModel):
    """User profile model matching Supabase profiles table"""
    id: str = Field(..., description="User UUID from Supabase auth")
    email: str = Field(..., description="User email address")
    full_name: Optional[str] = Field(None, description="User's full name")
    avatar_url: Optional[str] = Field(None, description="Profile picture URL")
    created_at: datetime = Field(default_factory=datetime.now)
    updated_at: datetime = Field(default_factory=datetime.now)

class AuthenticatedUser(BaseModel):
    """Authenticated user context for API requests"""
    user_id: str = Field(..., description="User UUID")
    email: str = Field(..., description="User email")
    profile: Optional[UserProfile] = None

class InterviewSessionRequest(BaseModel):
    """Enhanced interview session request with user context"""
    config: dict = Field(..., description="Interview configuration")
    participant_name: Optional[str] = Field(None, description="Participant name")
    enable_ai_agent: bool = Field(True, description="Enable AI agent")
    agent_provider: str = Field("google", description="AI agent provider")
    user_id: Optional[str] = Field(None, description="Authenticated user ID")
    user_email: Optional[str] = Field(None, description="Authenticated user email")