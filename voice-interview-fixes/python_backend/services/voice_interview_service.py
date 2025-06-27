"""
Enhanced Voice Interview Service with proper Google AI agent integration
"""
from typing import Dict, Any, Optional
from loguru import logger
import subprocess
import sys
import os

from .livekit_service import LiveKitService
from models.interview_models import InterviewConfig

class VoiceInterviewService:
    """Enhanced voice interview service with Google AI agent support"""
    
    def __init__(self, livekit_service: LiveKitService):
        self.livekit = livekit_service
        self.active_interviews: Dict[str, Dict[str, Any]] = {}
        self.active_agents: Dict[str, subprocess.Popen] = {}
        
        logger.info("[VoiceInterviewService] Enhanced voice interview service initialized")
    
    async def start_voice_interview(
        self,
        config: InterviewConfig,
        participant_name: str,
        enable_ai_agent: bool = True,
        agent_provider: str = "google"
    ) -> Dict[str, Any]:
        """Start a new voice interview session with enhanced Google AI agent"""
        try:
            logger.info(f"[VoiceInterviewService] Starting voice interview for {participant_name}")
            logger.info(f"[VoiceInterviewService] Provider: {agent_provider}, AI Agent: {enable_ai_agent}")

            # Validate required fields
            if not participant_name:
                raise ValueError("participant_name is required")
            
            # Create LiveKit room
            config_data = config.model_dump()
            room_data = await self.livekit.create_interview_room(
                config_data,
                participant_name
            )
            
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
                "status": "waiting",
                "provider": agent_provider,
                "ai_agent_enabled": enable_ai_agent,
                "tokens": {
                    "participant": room_data["participant_token"],
                    "interviewer": room_data["interviewer_token"]
                }
            }
            
            # Store session
            self.active_interviews[session_id] = interview_session
            
            # Start AI agent if enabled
            if enable_ai_agent:
                await self.start_ai_agent(session_id, room_data, agent_provider)
            
            response_data = {
                "session_id": session_id,
                "room_name": room_data["room_name"],
                "ws_url": room_data["ws_url"],
                "participant_token": room_data["participant_token"],
                "interviewer_token": room_data["interviewer_token"],  # Include for agent
                "first_question": "Welcome to your voice interview. The AI agent will greet you shortly.",
                "config": config.model_dump(),
                "ai_agent_enabled": enable_ai_agent,
                "conversational_mode": enable_ai_agent,
                "agent_provider": agent_provider
            }
            
            logger.info(f"[VoiceInterviewService] Voice interview started successfully: {session_id}")
            return response_data
            
        except Exception as error:
            logger.error(f"[VoiceInterviewService] Error starting voice interview: {error}")
            raise Exception(f"Failed to start voice interview: {error}")
    
    async def start_ai_agent(self, session_id: str, room_data: Dict[str, Any], provider: str):
        """Start the AI agent process for the interview"""
        try:
            logger.info(f"[VoiceInterviewService] Starting {provider.upper()} AI agent for session: {session_id}")
            
            # Path to the enhanced voice agent script
            agent_script = os.path.join(os.path.dirname(__file__), "..", "livekit_voice_agent.py")
            
            # Prepare environment variables
            env = os.environ.copy()
            env.update({
                "LIVEKIT_WS_URL": room_data["ws_url"],
                "LIVEKIT_API_KEY": os.getenv("LIVEKIT_API_KEY"),
                "LIVEKIT_API_SECRET": os.getenv("LIVEKIT_API_SECRET"),
                "VOICE_AGENT_PROVIDER": provider,
                "GEMINI_API_KEY": os.getenv("GEMINI_API_KEY"),
                "GOOGLE_APPLICATION_CREDENTIALS": os.getenv("GOOGLE_APPLICATION_CREDENTIALS"),
                "GOOGLE_CLOUD_PROJECT_ID": os.getenv("GOOGLE_CLOUD_PROJECT_ID"),
            })
            
            # Start the agent process
            process = subprocess.Popen(
                [sys.executable, agent_script, room_data["room_name"], room_data["interviewer_token"]],
                env=env,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True
            )
            
            # Store the process
            self.active_agents[session_id] = process
            
            logger.info(f"[VoiceInterviewService] {provider.upper()} AI agent started with PID: {process.pid}")
            
            # Monitor the process in background
            self._monitor_agent_process(session_id, process, provider)
            
        except Exception as error:
            logger.error(f"[VoiceInterviewService] Error starting AI agent: {error}")
            raise
    
    def _monitor_agent_process(self, session_id: str, process: subprocess.Popen, provider: str):
        """Monitor AI agent process in background"""
        import threading
        
        def monitor():
            try:
                stdout, stderr = process.communicate()
                if process.returncode != 0:
                    logger.error(f"[VoiceInterviewService] {provider.upper()} AI agent exited with code {process.returncode}")
                    logger.error(f"[VoiceInterviewService] STDERR: {stderr}")
                else:
                    logger.info(f"[VoiceInterviewService] {provider.upper()} AI agent completed successfully")
                    
                # Clean up
                if session_id in self.active_agents:
                    del self.active_agents[session_id]
                    
            except Exception as e:
                logger.error(f"[VoiceInterviewService] Error monitoring agent process: {e}")
        
        thread = threading.Thread(target=monitor, daemon=True)
        thread.start()
    
    def get_session_status(self, session_id: str) -> Dict[str, Any]:
        """Get interview session status"""
        session = self.active_interviews.get(session_id)
        if not session:
            return {"found": False}
        
        # Check if AI agent is still running
        agent_status = "unknown"
        if session_id in self.active_agents:
            process = self.active_agents[session_id]
            if process.poll() is None:
                agent_status = "running"
            else:
                agent_status = "stopped"
        else:
            agent_status = "not_started"
        
        return {
            "found": True,
            "session_id": session_id,
            "status": session["status"],
            "provider": session.get("provider", "unknown"),
            "ai_agent_enabled": session.get("ai_agent_enabled", False),
            "ai_agent_status": agent_status,
            "progress": {
                "current": session["current_question_index"],
                "total": 5,
                "percentage": (session["current_question_index"] / 5) * 100
            },
            "duration": 0,
            "questions_asked": len(session["questions"]),
            "responses_given": len(session["responses"])
        }
    
    async def end_interview(self, session_id: str) -> Dict[str, Any]:
        """End interview and clean up AI agent"""
        try:
            session = self.active_interviews.get(session_id)
            if not session:
                return {"error": "Session not found"}
            
            # Stop AI agent if running
            if session_id in self.active_agents:
                process = self.active_agents[session_id]
                try:
                    process.terminate()
                    process.wait(timeout=5)
                    logger.info(f"[VoiceInterviewService] AI agent terminated for session: {session_id}")
                except subprocess.TimeoutExpired:
                    process.kill()
                    logger.warning(f"[VoiceInterviewService] AI agent killed for session: {session_id}")
                except Exception as e:
                    logger.error(f"[VoiceInterviewService] Error stopping AI agent: {e}")
                finally:
                    del self.active_agents[session_id]
            
            # Update session status
            session["status"] = "completed"
            session["end_time"] = "2024-01-01T00:00:00Z"
            
            return {
                "completed": True,
                "session_id": session_id,
                "provider": session.get("provider", "unknown"),
                "ai_agent_was_enabled": session.get("ai_agent_enabled", False)
            }
            
        except Exception as error:
            logger.error(f"[VoiceInterviewService] Error ending interview: {error}")
            return {"error": str(error)}
    
    def get_active_sessions(self) -> list:
        """Get all active sessions with AI agent status"""
        sessions = []
        for session_id, session in self.active_interviews.items():
            agent_status = "unknown"
            if session_id in self.active_agents:
                process = self.active_agents[session_id]
                agent_status = "running" if process.poll() is None else "stopped"
            
            sessions.append({
                "session_id": session_id,
                "participant_name": session["participant_name"],
                "status": session["status"],
                "start_time": session["start_time"],
                "config": session["config"],
                "provider": session.get("provider", "unknown"),
                "ai_agent_enabled": session.get("ai_agent_enabled", False),
                "ai_agent_status": agent_status,
                "progress": {
                    "current": session["current_question_index"],
                    "total": 5
                }
            })
        return sessions