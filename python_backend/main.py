"""
Main FastAPI application for AI Interview Platform with Pydantic AI
"""
import os
import asyncio
from contextlib import asynccontextmanager
from typing import List, Optional, Dict, Any
import re
import subprocess
import sys  # Add this import at the top with other imports

from fastapi import FastAPI, HTTPException, BackgroundTasks, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
from dotenv import load_dotenv
from loguru import logger

from agents.orchestrator import AgenticOrchestrator
from agents.performance_orchestrator import PerformanceAnalysisOrchestrator
from services.livekit_service import LiveKitService
from services.voice_interview_service import VoiceInterviewService
from models.interview_models import (
    InterviewConfig,
    QuestionGenerationRequest,
    FollowUpRequest,
    ResponseAnalysisRequest,
    AnalyticsRequest,
    VoiceInterviewStartRequest
)

# Load environment variables
load_dotenv()

# Configure logging
logger.add("logs/app.log", rotation="500 MB", level="INFO")

# Global services
orchestrator: Optional[AgenticOrchestrator] = None
performance_orchestrator: Optional[PerformanceAnalysisOrchestrator] = None
livekit_service: Optional[LiveKitService] = None
voice_service: Optional[VoiceInterviewService] = None

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager"""
    global orchestrator, performance_orchestrator, livekit_service, voice_service
    
    logger.info("🚀 Starting AI Interview Platform with Pydantic AI")
    
    # Initialize services
    try:
        orchestrator = AgenticOrchestrator()
        performance_orchestrator = PerformanceAnalysisOrchestrator()
        livekit_service = LiveKitService()
        voice_service = VoiceInterviewService(livekit_service)
        
        logger.info("✅ All services initialized successfully")
        
    except Exception as e:
        logger.error(f"❌ Failed to initialize services: {e}")
        raise
    
    yield
    
    # Cleanup
    logger.info("🛑 Shutting down AI Interview Platform")

# Create FastAPI app
app = FastAPI(
    title="AI Interview Practice Platform",
    description="Pydantic AI-powered interview practice with LiveKit voice integration",
    version="2.0.0",
    lifespan=lifespan
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure appropriately for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Health check endpoint
@app.get("/api/health")
def health_check():
    """Health check endpoint"""
    return {"status": "ok"}

# Question generation endpoint
@app.post("/api/generate-question")
async def generate_question(request: QuestionGenerationRequest):
    """Generate interview question using Pydantic AI agents"""
    try:
        if not orchestrator:
            raise HTTPException(status_code=503, detail="Orchestrator not initialized")
        
        logger.info(f"🤖 Generating question for topic: {request.config.topic}")
        
        question = await orchestrator.generate_question(
            config=request.config,
            previous_questions=request.previous_questions or [],
            previous_responses=request.previous_responses or [],
            question_number=request.question_number or 1
        )
        
        return {"question": question}
        
    except Exception as e:
        logger.error(f"❌ Error generating question: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Follow-up generation endpoint
@app.post("/api/generate-followup")
async def generate_followup(request: FollowUpRequest):
    """Generate follow-up question"""
    try:
        if not orchestrator:
            raise HTTPException(status_code=503, detail="Orchestrator not initialized")
        
        followup = await orchestrator.generate_followup(
            original_question=request.question,
            user_response=request.response,
            config=request.config
        )
        
        return {"followUp": followup}
        
    except Exception as e:
        logger.error(f"❌ Error generating follow-up: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Response analysis endpoint
@app.post("/api/analyze-response")
async def analyze_response(request: ResponseAnalysisRequest):
    """Analyze interview response"""
    try:
        if not performance_orchestrator:
            raise HTTPException(status_code=503, detail="Performance orchestrator not initialized")
        
        analysis = await performance_orchestrator.analyze_single_response(
            question=request.question,
            response=request.response,
            config=request.config
        )
        
        return {"analysis": analysis}
        
    except Exception as e:
        logger.error(f"❌ Error analyzing response: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Analytics generation endpoint
@app.post("/api/generate-analytics")
async def generate_analytics(request: AnalyticsRequest):
    """Generate comprehensive analytics"""
    try:
        if not performance_orchestrator:
            raise HTTPException(status_code=503, detail="Performance orchestrator not initialized")
        
        logger.info(f"📊 Generating analytics for {len(request.responses)} responses")
        
        analytics = await performance_orchestrator.generate_comprehensive_analytics(
            responses=request.responses,
            config=request.config
        )
        
        return {"analytics": analytics}
        
    except Exception as e:
        logger.error(f"❌ Error generating analytics: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Voice interview endpoints
@app.post("/api/voice-interview/start")
async def start_voice_interview(request: VoiceInterviewStartRequest):
    """Start voice interview session"""
    try:
        if not voice_service:
            raise HTTPException(status_code=503, detail="Voice service not initialized")
        
        logger.info(f"🎙️ Starting voice interview for: {request.participant_name}")
        logger.debug(f"VoiceInterviewStartRequest: {request.model_dump()}")

        # Validate required fields for identity and room
        if not hasattr(request, "participant_name") or not request.participant_name:
            logger.error("Missing participant_name in request")
            raise HTTPException(status_code=400, detail="participant_name is required")
        if not hasattr(request, "config") or not request.config:
            logger.error("Missing config in request")
            raise HTTPException(status_code=400, detail="config is required")

        session = await voice_service.start_voice_interview(
            config=request.config,
            participant_name=request.participant_name,
            enable_ai_agent=request.enable_ai_agent,
            agent_provider=request.agent_provider
        )

        # --- Start the LiveKit Voice Agent as a subprocess ---
        room_name = session.get("room_name")
        agent_token = session.get("interviewer_token") or session.get("participant_token")
        agent_script = os.path.join(os.path.dirname(__file__), "livekit_voice_agent.py")
        if room_name and agent_token:
            # Extract user context from the interview config
            interview_config = request.config
            env = os.environ.copy()
            env["LIVEKIT_ROOM_NAME"] = room_name
            env["LIVEKIT_AGENT_TOKEN"] = agent_token
            # Pass user context as environment variables
            env["INTERVIEW_TECHNOLOGY"] = getattr(interview_config, "topic", "")
            env["INTERVIEW_COMPANY"] = getattr(interview_config, "company_name", "")
            env["INTERVIEW_EXPERIENCE"] = getattr(interview_config, "experience_level", "")

            logger.info(f"LiveKit ENV for agent: LIVEKIT_WS_URL={env.get('LIVEKIT_WS_URL')}, LIVEKIT_ROOM_NAME={env.get('LIVEKIT_ROOM_NAME')}, INTERVIEW_TECHNOLOGY={env.get('INTERVIEW_TECHNOLOGY')}, INTERVIEW_COMPANY={env.get('INTERVIEW_COMPANY')}, INTERVIEW_EXPERIENCE={env.get('INTERVIEW_EXPERIENCE')}")

            subprocess.Popen(
                [sys.executable, agent_script, "start"],
                env=env,
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL,
                close_fds=True
            )
        else:
            logger.error(f"Could not launch LiveKit Voice Agent: room_name or agent_token missing in session response. room_name={room_name}, agent_token={'present' if agent_token else 'missing'}")

        # DEBUG: Print the session response to the console
        print("=== Outgoing session response ===")
        print(session)
        print("=================================")

        return session
        
    except Exception as e:
        logger.error(f"❌ Error starting voice interview: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/livekit/config")
async def get_livekit_config():
    """Get LiveKit configuration status"""
    try:
        if not livekit_service:
            return {"configured": False}
        
        return {
            "configured": livekit_service.is_configured(),
            "wsUrl": livekit_service.get_websocket_url() if livekit_service.is_configured() else None,
            "timestamp": "2024-01-01T00:00:00Z"
        }
        
    except Exception as e:
        logger.error(f"❌ Error checking LiveKit config: {e}")
        return {"configured": False, "error": str(e)}

# System info endpoint
@app.get("/api/system/info")
async def get_system_info():
    """Get system information"""
    return {
        "application": {
            "name": "AI Interview Practice Platform",
            "version": "2.0.0",
            "framework": "Pydantic AI",
            "environment": os.getenv("ENVIRONMENT", "development")
        },
        "services": {
            "orchestrator": orchestrator is not None,
            "performance_orchestrator": performance_orchestrator is not None,
            "livekit": livekit_service.is_configured() if livekit_service else False,
            "voice_service": voice_service is not None
        },
        "providers": {
            "llm_provider": os.getenv("LLM_PROVIDER", "not_set"),
            "voice_provider": os.getenv("VOICE_AGENT_PROVIDER", "google")
        }
    }

# Middleware to convert camelCase to snake_case
def camel_to_snake(name: str) -> str:
    """Convert camelCase or PascalCase to snake_case."""
    s1 = re.sub('(.)([A-Z][a-z]+)', r'\1_\2', name)
    return re.sub('([a-z0-9])([A-Z])', r'\1_\2', s1).lower()

@app.middleware("request")
async def camelcase_to_snakecase_middleware(request: Request, call_next):
    if request.headers.get("content-type", "").startswith("application/json"):
        body = await request.body()
        if body:
            import json
            try:
                data = json.loads(body)
                def convert_keys(obj):
                    if isinstance(obj, dict):
                        return {camel_to_snake(k): convert_keys(v) for k, v in obj.items()}
                    elif isinstance(obj, list):
                        return [convert_keys(i) for i in obj]
                    else:
                        return obj
                snake_data = convert_keys(data)
                # Replace the request._body attribute (FastAPI/Starlette internal)
                request._body = json.dumps(snake_data).encode("utf-8")
            except Exception:
                pass
    response = await call_next(request)
    return response

if __name__ == "__main__":
    import uvicorn
    
    port = int(os.getenv("PORT", 3001))
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=port,
        reload=True,
        log_level="info"
    )