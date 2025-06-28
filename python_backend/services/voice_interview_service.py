"""
Voice Interview Service for Python backend
"""
from typing import Dict, Any, Optional
from loguru import logger

from .livekit_service import LiveKitService
from models.interview_models import InterviewConfig

class VoiceInterviewService:
    """Voice interview service for managing voice interview sessions"""
    
    def __init__(self, livekit_service: LiveKitService):
        self.livekit = livekit_service
        self.active_interviews: Dict[str, Dict[str, Any]] = {}
        
        logger.info("[VoiceInterviewService] Voice interview service initialized")
    
    async def start_voice_interview(
        self,
        config: InterviewConfig,
        participant_name: str,
        enable_ai_agent: bool = True,
        agent_provider: str = "google"
    ) -> Dict[str, Any]:
        """Start a new voice interview session"""
        try:
            logger.info(f"[VoiceInterviewService] Starting voice interview for {participant_name}")
            print(f"[VoiceInterviewService] participant_name: {participant_name}")  # <-- Add this line

            # Validate InterviewConfig
            config_data = config.model_dump()
            logger.debug(f"[VoiceInterviewService] InterviewConfig data: {config_data}")
            required_fields = ["experience_level"]  # adjust as needed , "position", "language"
            missing_fields = [f for f in required_fields if f not in config_data or config_data[f] is None]
            if missing_fields:
                logger.error(f"[VoiceInterviewService] Missing required config fields: {missing_fields}")
                raise ValueError(f"Missing required config fields: {missing_fields}")
            
            # Log identity and room before room creation
            logger.debug(f"[VoiceInterviewService] About to create LiveKit room for participant: {participant_name}")
            logger.debug(f"[VoiceInterviewService] LiveKit config_data: {config_data}")

            # Create LiveKit room
            room_data = await self.livekit.create_interview_room(
                config_data,
                participant_name
            )
            logger.debug(f"[VoiceInterviewService] LiveKit room_data: {room_data}")
            logger.debug(f"[VoiceInterviewService] participant_token: {room_data.get('participant_token')}, interviewer_token: {room_data.get('interviewer_token')}, room_name: {room_data.get('room_name')}")

            # Initialize interview session
            session_id = room_data["room_name"]
            interview_session = {
                "session_id": session_id,
                "room_name": room_data["room_name"],
                "config": config.model_dump(),
                "participant_name": participant_name,
                "start_time": "2024-01-01T00:00:00Z",
                "current_question_index": 0,
                "questions": [],
                "responses": [],
                "status": "waiting",  # waiting, active, paused, completed
                "tokens": {
                    "participant": room_data["participant_token"],
                    "interviewer": room_data["interviewer_token"]
                }
            }
            
            # Store session
            self.active_interviews[session_id] = interview_session
            
            response_data = {
                "session_id": session_id,
                "room_name": room_data["room_name"],
                "ws_url": room_data["ws_url"],
                "participant_token": room_data["participant_token"],
                "first_question": "Welcome to your voice interview. Please wait for the first question.",
                "config": config.model_dump(),
                "ai_agent_enabled": enable_ai_agent,
                "conversational_mode": enable_ai_agent,
                "agent_provider": agent_provider
            }
            
            logger.info(f"[VoiceInterviewService] Voice interview started successfully: {session_id}")

            # --- Debug: Check LiveKit audio agent setup ---
            if not room_data.get("participant_token") or not room_data.get("ws_url"):
                logger.error("[VoiceInterviewService] LiveKit room missing participant_token or ws_url. Audio will not work.")
            else:
                logger.info(f"[VoiceInterviewService] LiveKit participant_token and ws_url present for audio.")

            # --- Debug: Log interviewer token and agent status ---
            if not room_data.get("interviewer_token"):
                logger.warning("[VoiceInterviewService] interviewer_token missing. AI agent may not be connected.")
            else:
                logger.info(f"[VoiceInterviewService] interviewer_token present: {room_data.get('interviewer_token')}")

            # --- Debug: Log agent provider and AI agent enabled status ---
            logger.info(f"[VoiceInterviewService] AI Agent enabled: {enable_ai_agent}, Provider: {agent_provider}")

            return response_data
            
        except Exception as error:
            logger.error(f"[VoiceInterviewService] Error starting voice interview: {error}")
            raise Exception(f"Failed to start voice interview: {error}")
    
    def get_session_status(self, session_id: str) -> Dict[str, Any]:
        """Get interview session status"""
        session = self.active_interviews.get(session_id)
        if not session:
            return {"found": False}
        
        return {
            "found": True,
            "session_id": session_id,
            "status": session["status"],
            "progress": {
                "current": session["current_question_index"],
                "total": 5,  # Default total questions
                "percentage": (session["current_question_index"] / 5) * 100
            },
            "duration": 0,  # Calculate based on timestamps
            "questions_asked": len(session["questions"]),
            "responses_given": len(session["responses"])
        }
    
    def get_active_sessions(self) -> list:
        """Get all active sessions"""
        sessions = []
        for session_id, session in self.active_interviews.items():
            sessions.append({
                "session_id": session_id,
                "participant_name": session["participant_name"],
                "status": session["status"],
                "start_time": session["start_time"],
                "config": session["config"],
                "progress": {
                    "current": session["current_question_index"],
                    "total": 5
                }
            })
        return sessions