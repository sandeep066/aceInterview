"""
LiveKit Voice Agent: Joins a LiveKit room as an AI agent and converses using LLM and TTS.
See: https://docs.livekit.io/agents/start/voice-ai/
"""

import sys
import os
import asyncio

from dotenv import load_dotenv

from livekit import agents
from livekit.agents import AgentSession, Agent, RoomInputOptions,JobProcess, RoomOutputOptions, RunContext, WorkerOptions
from livekit.plugins import (
    openai,
    cartesia,
    gladia,
    noise_cancellation,
    silero,
)
from livekit.plugins.turn_detector.multilingual import MultilingualModel

load_dotenv()


class Assistant(Agent):
    def __init__(self, user_context: dict = None) -> None:
        # You can pass user_context (e.g., interview config, user info) to the agent
        self.user_context = user_context or {}
        instructions = "You are a expert interviewer who helps users to prepare for a Job interview."
        # Optionally, customize instructions based on user_context
        if self.user_context:
            tech = self.user_context.get("technology")
            company = self.user_context.get("company")
            experience = self.user_context.get("experience_level")
            if tech or company or experience:
                instructions += f"The user is preparing for {tech or ''} interview at {company or ''} with experience level {experience or ''}." \
                "Based on this information ask questions related to the interview and get the answers. "
        super().__init__(instructions=instructions)
        
    async def on_enter(self):
        # You can use self.user_context here as needed
        self.session.generate_reply()


def prewarm(proc: JobProcess):
    proc.userdata["vad"] = silero.VAD.load()


async def entrypoint(ctx: agents.JobContext):
    # Example: get custom info from environment variables (set by backend)
    user_context = {
        "technology": os.getenv("INTERVIEW_TECHNOLOGY"),
        "company": os.getenv("INTERVIEW_COMPANY"),
        "experience_level": os.getenv("INTERVIEW_EXPERIENCE"),
        # Add more as needed
    }
    session = AgentSession(
        stt=gladia.STT(),
        llm=openai.LLM(model="gpt-4o-mini"),
        tts=cartesia.TTS(model="sonic-2", voice="f786b574-daa5-4673-aa0c-cbe3e8534c02"),
        vad=silero.VAD.load(),
        turn_detection=MultilingualModel(),
    )

    await session.start(
        room=ctx.room,
        agent=Assistant(user_context=user_context),
        room_input_options=RoomInputOptions(
            # LiveKit Cloud enhanced noise cancellation
            # - If self-hosting, omit this parameter
            # - For telephony applications, use `BVCTelephony` for best results
            noise_cancellation=noise_cancellation.BVC(), 
        ),
    )

    await ctx.connect()

    await session.generate_reply(
        instructions="Greet the user and offer your assistance."
    )

if __name__ == "__main__":
    # Ensure the agent is started with the correct command, e.g.:
    # python livekit_voice_agent.py start
    #import sys
    #if len(sys.argv) > 1 and sys.argv[1] == "start":
    agents.cli.run_app(agents.WorkerOptions(entrypoint_fnc=entrypoint))
    #else:
    #    print("Usage: python livekit_voice_agent.py start")
    #    sys.exit(1)
    #     env={**os.environ, "LIVEKIT_ROOM_NAME": room_name, "LIVEKIT_AGENT_TOKEN": agent_token},
    #     ...
    # )

