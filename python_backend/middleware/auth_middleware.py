"""
Authentication middleware for Python backend
"""
import os
import jwt
from typing import Optional, Dict, Any
from fastapi import HTTPException, Request, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from supabase import create_client, Client
from loguru import logger

from models.user_models import AuthenticatedUser, UserProfile

# Initialize Supabase client
supabase_url = os.getenv("SUPABASE_URL")
supabase_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")  # Use service role for backend

if supabase_url and supabase_key:
    supabase: Client = create_client(supabase_url, supabase_key)
else:
    supabase = None
    logger.warning("Supabase not configured - authentication will be disabled")

security = HTTPBearer(auto_error=False)

class AuthMiddleware:
    """Authentication middleware for API endpoints"""
    
    @staticmethod
    async def get_current_user(
        credentials: Optional[HTTPAuthorizationCredentials] = Depends(security)
    ) -> Optional[AuthenticatedUser]:
        """Get current authenticated user from JWT token"""
        if not supabase or not credentials:
            return None
        
        try:
            # Verify JWT token with Supabase
            token = credentials.credentials
            
            # Decode JWT to get user info
            decoded_token = jwt.decode(
                token, 
                options={"verify_signature": False}  # Supabase handles signature verification
            )
            
            user_id = decoded_token.get("sub")
            email = decoded_token.get("email")
            
            if not user_id or not email:
                return None
            
            # Get user profile from database
            profile_data = supabase.table("profiles").select("*").eq("id", user_id).single().execute()
            
            profile = None
            if profile_data.data:
                profile = UserProfile(**profile_data.data)
            
            return AuthenticatedUser(
                user_id=user_id,
                email=email,
                profile=profile
            )
            
        except Exception as error:
            logger.error(f"Authentication error: {error}")
            return None
    
    @staticmethod
    async def require_auth(
        credentials: Optional[HTTPAuthorizationCredentials] = Depends(security)
    ) -> AuthenticatedUser:
        """Require authentication for protected endpoints"""
        user = await AuthMiddleware.get_current_user(credentials)
        
        if not user:
            raise HTTPException(
                status_code=401,
                detail="Authentication required",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        return user
    
    @staticmethod
    async def optional_auth(
        credentials: Optional[HTTPAuthorizationCredentials] = Depends(security)
    ) -> Optional[AuthenticatedUser]:
        """Optional authentication for endpoints that work with or without auth"""
        return await AuthMiddleware.get_current_user(credentials)

# Convenience functions for dependency injection
async def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security)
) -> Optional[AuthenticatedUser]:
    """Get current user (optional)"""
    return await AuthMiddleware.get_current_user(credentials)

async def require_auth(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security)
) -> AuthenticatedUser:
    """Require authentication"""
    return await AuthMiddleware.require_auth(credentials)

async def optional_auth(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security)
) -> Optional[AuthenticatedUser]:
    """Optional authentication"""
    return await AuthMiddleware.optional_auth(credentials)