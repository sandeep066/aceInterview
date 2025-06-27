"""
LiveKit Service for Python backend
"""
import os
from typing import Optional, Dict, Any
from livekit import api
from loguru import logger

class LiveKitService:
    """LiveKit service for managing rooms and tokens"""
    
    def __init__(self):
        self.api_key = os.getenv("LIVEKIT_API_KEY")
        self.api_secret = os.getenv("LIVEKIT_API_SECRET")
        self.ws_url = os.getenv("LIVEKIT_WS_URL")
        
        logger.info("[LiveKitService] Initializing LiveKit service")
        logger.info(f"[LiveKitService] API Key: {'Set' if self.api_key else 'Not set'}")
        logger.info(f"[LiveKitService] API Secret: {'Set' if self.api_secret else 'Not set'}")
        logger.info(f"[LiveKitService] WS URL: {self.ws_url if self.ws_url else 'Not set'}")
        
        if not self.is_configured():
            logger.warning("[LiveKitService] LiveKit credentials not configured properly. Voice interviews will be disabled.")
        else:
            logger.info("[LiveKitService] LiveKit service initialized successfully")
    
    def is_configured(self) -> bool:
        """Check if LiveKit is properly configured"""
        return bool(self.api_key and self.api_secret and self.ws_url)
    
    def get_websocket_url(self) -> Optional[str]:
        """Get the WebSocket URL"""
        return self.ws_url
    
    async def generate_access_token(
        self,
        room_name: str,
        participant_name: str,
        metadata: Optional[Dict[str, Any]] = None
    ) -> str:
        """Generate access token for a participant"""
        if not self.is_configured():
            raise Exception("LiveKit not configured")
        
        logger.info(f"[LiveKitService] Generating access token for {participant_name} in room {room_name}")
        
        try:
            token = api.AccessToken(self.api_key, self.api_secret)
            # Set the participant's identity (required)
            token.with_identity(participant_name)
            # Optionally set a display name
            token.with_name(participant_name)
            
            if metadata:
                token.with_metadata(str(metadata))
            
            # Set room and permissions via VideoGrants
            token.with_grants(api.VideoGrants(
                room_join=True,      # Allow joining the room
                room=room_name,      # Specify the room name (required for agent dispatch)
                can_publish=True,
                can_subscribe=True,
                can_publish_data=True,
                can_update_own_metadata=True
            ))

            # Log for verification
            logger.debug(f"[LiveKitService] AccessToken identity set to: {participant_name}")
            logger.debug(f"[LiveKitService] AccessToken grants: room={room_name}, room_join=True")

            jwt_token = token.to_jwt()
            logger.info(f"[LiveKitService] Token generated successfully, length: {len(jwt_token)}")
            
            return jwt_token
            
        except Exception as error:
            logger.error(f"[LiveKitService] Error generating access token: {error}")
            raise Exception(f"Failed to generate access token: {error}")
    
    async def create_interview_room(
        self,
        interview_config: Dict[str, Any],
        participant_name: str
    ) -> Dict[str, Any]:
        """Create a new interview room"""
        import time
        import random
        import string
        
        room_name = f"interview-{int(time.time())}-{''.join(random.choices(string.ascii_lowercase, k=9))}"
        
        try:
            # Generate tokens for both participant and AI interviewer
            participant_token = await self.generate_access_token(
                room_name,
                participant_name,
                {
                    "role": "candidate",
                    "config": interview_config,
                    "joined_at": "2024-01-01T00:00:00Z"
                }
            )
            
            interviewer_token = await self.generate_access_token(
                room_name,
                f"ai-interviewer-{int(time.time())}",
                {
                    "role": "interviewer",
                    "config": interview_config,
                    "is_bot": True
                }
            )
            
            room_data = {
                "room_name": room_name,
                "ws_url": self.ws_url,
                "participant_token": participant_token,
                "interviewer_token": interviewer_token,
                "config": interview_config
            }
            
            logger.info(f"[LiveKitService] Room created: {room_name}")
            return room_data
            
        except Exception as error:
            logger.error(f"[LiveKitService] Error creating interview room: {error}")
            raise Exception(f"Failed to create interview room: {error}")