"""
LiveKit Voice Agent: Joins a LiveKit room as an AI agent and converses using LLM and TTS.
Docs: https://docs.livekit.io/agents/start/voice-ai/
"""

import os
from dotenv import load_dotenv
import json
import asyncio

# Suppress INFO logs from livekit.agents
import logging
logging.getLogger("livekit.agents").setLevel(logging.WARNING)

from livekit import agents
from livekit.agents import Agent, AgentSession, RoomInputOptions, JobProcess, WorkerOptions

# Import plugins from their specific packages
try:
    from livekit.plugins import google
except ImportError:
    print("livekit-plugins not installed. Install with: pip install livekit-plugins-google")
    exit(1)

try:
    from livekit.plugins import elevenlabs
except ImportError:
    print("livekit-plugins-elevenlabs not installed. Install with: pip install livekit-plugins-elevenlabs")
    exit(1)

try:
    from livekit.plugins.gladia import STT as GladiaSTT
except ImportError:
    print("livekit-plugins-gladia not installed. Install with: pip install livekit-plugins-gladia")
    exit(1)

try:
    from livekit.plugins import silero
except ImportError:
    print("livekit-plugins-silero not installed. Install with: pip install livekit-plugins-silero")
    exit(1)

try:
    from livekit.plugins.noise_cancellation import BVC
except ImportError:
    print("livekit-plugins-noise-cancellation not installed. Install with: pip install livekit-plugins-noise-cancellation")
    BVC = None

try:
    from livekit.plugins.turn_detector.english import EnglishModel
except ImportError:
    print("livekit-plugins-turn-detector not installed. Install with: pip install livekit-plugins-turn-detector")
    exit(1)

load_dotenv()


class Assistant(Agent):
    def __init__(self, ctx: agents.JobContext, user_context: dict = None) -> None:
        self.ctx = ctx
        self.user_context = user_context or {}
        tech = self.user_context.get("interview_technology")
        company = self.user_context.get("interview_company")
        experience = self.user_context.get("interview_experience")
        instructions = (
            "You are an expert interviewer who simulates a real interview environment to help users prepare for job interviews."
        )
        if tech or company or experience:
            instructions += (
                f" The user is preparing for a {tech or ''} interview at {company or 'a company'} with experience level {experience or 'unspecified'}."
                " Ask relevant interview questions. After each answer, ask a follow-up if appropriate, then continue with the next."
            )
        super().__init__(instructions=instructions)
        try:
            self.duration_minutes = float(self.user_context.get("interview_duration", 10))
        except Exception:
            self.duration_minutes = 10

    async def on_enter(self):
        await self.session.generate_reply()

async def entrypoint(ctx: agents.JobContext):
    user_context = {}
    if ctx.job.metadata:
        try:
            user_context = json.loads(ctx.job.metadata)
        except json.JSONDecodeError:
            print("Warning: ctx.job.metadata is not valid JSON. Using empty user_context.")

    session = AgentSession(
        stt=GladiaSTT(),
        #llm=openai.LLM(model="gpt-4o-mini"),
        #tts=CartesiaTTS(model="sonic-2", voice="f786b574-daa5-4673-aa0c-cbe3e8534c02"),
        llm=google.LLM(model="gemini-2.0-flash-exp", temperature=0.8),
        tts=elevenlabs.TTS(voice_id="Xb7hH8MSUJpSbSDYk0k2", model="eleven_multilingual_v2"),
        vad=silero.VAD.load(),
    )

    await session.start(
            room=ctx.room,
            agent=Assistant(ctx=ctx, user_context=user_context),
        )
    await ctx.connect()

    await session.generate_reply()


if __name__ == "__main__":
    agents.cli.run_app(
        WorkerOptions(
            entrypoint_fnc=entrypoint,
            agent_name=os.environ.get("LIVEKIT_AGENT_ID", "voice-agent"),  # <-- add this line
            ws_url=os.environ.get("LIVEKIT_WS_URL"),
            api_key=os.environ["LIVEKIT_API_KEY"],
            api_secret=os.environ["LIVEKIT_API_SECRET"],
        )
    )
