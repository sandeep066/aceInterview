"""
LiveKit Voice Agent: Joins a LiveKit room as an AI agent and converses using LLM and TTS.
Docs: https://docs.livekit.io/agents/start/voice-ai/
"""
import time
import os
from dotenv import load_dotenv

from livekit import agents
from livekit.agents import Agent, AgentSession, RoomInputOptions, JobProcess, WorkerOptions

# Import plugins from their specific packages
try:
    from livekit.plugins.openai import LLM as OpenAILLM
except ImportError:
    print("livekit-plugins-openai not installed. Install with: pip install livekit-plugins-openai")
    exit(1)

try:
    from livekit.plugins.cartesia import TTS as CartesiaTTS
except ImportError:
    print("livekit-plugins-cartesia not installed. Install with: pip install livekit-plugins-cartesia")
    exit(1)

try:
    from livekit.plugins.gladia import STT as GladiaSTT
except ImportError:
    print("livekit-plugins-gladia not installed. Install with: pip install livekit-plugins-gladia")
    exit(1)

try:
    from livekit.plugins.silero import VAD as SileroVAD
except ImportError:
    print("livekit-plugins-silero not installed. Install with: pip install livekit-plugins-silero")
    exit(1)

try:
    from livekit.plugins.noise_cancellation import BVC
except ImportError:
    print("livekit-plugins-noise-cancellation not installed. Install with: pip install livekit-plugins-noise-cancellation")
    BVC = None

try:
    from livekit.plugins.turn_detector.multilingual import MultilingualModel
except ImportError:
    print("livekit-plugins-turn-detector not installed. Install with: pip install livekit-plugins-turn-detector")
    exit(1)

load_dotenv()


class Assistant(Agent):
    def __init__(self, user_context: dict = None) -> None:
        self.user_context = user_context or {}
        instructions = "You are a expert interviewer who simulates a real interview environment hence helping users prepare for a Job interview."
        if self.user_context:
            tech = self.user_context.get("technology")
            company = self.user_context.get("company")
            experience = self.user_context.get("experience_level")
            if tech or company or experience:
                instructions += (
                f"The user is preparing for {tech or ''} interview at {company or ''} with experience level {experience or ''}." \
                "Based on this information ask questions related to the interview and get the answers. Once the user answers a question ask one " \
                "followup question if it makes sense in the conversation, else proceed to ask the next question. "
                )
        super().__init__(instructions=instructions)

    async def on_enter(self):
        self.start_time = time.monotonic()

    async def on_user_message(self, message):
        """
        Called when the user sends a message/answer.
        Checks if the interview duration has elapsed and ends the session if needed.
        """
        # Check if duration is set and time has elapsed
        if self.duration_minutes and self.start_time:
            elapsed = (time.monotonic() - self.start_time) / 60
            if elapsed >= self.duration_minutes:
                await self.session.send_reply(
                    "Thank you for your answer. The interview duration has ended. If you have any questions, feel free to ask!"
                )
                await self.session.end()
                return


def prewarm(proc: JobProcess):
    # Preload VAD model once per process
    proc.userdata["vad"] = SileroVAD.load()


async def entrypoint(ctx: agents.JobContext):
    user_context = {
        "technology": os.getenv("INTERVIEW_TECHNOLOGY"),
        "company": os.getenv("INTERVIEW_COMPANY"),
        "experience_level": os.getenv("INTERVIEW_EXPERIENCE"),
    }

    # Build room input options
    room_input_options = RoomInputOptions()
    if BVC:
        room_input_options.noise_cancellation = BVC()

    session = AgentSession(
        stt=GladiaSTT(),
        llm=OpenAILLM(model="gpt-4o-mini"),
        tts=CartesiaTTS(model="sonic-2", voice="f786b574-daa5-4673-aa0c-cbe3e8534c02"),
        vad=ctx.proc.userdata.get("vad") or SileroVAD.load(),
        turn_detection=MultilingualModel(),
    )

    await session.start(
        room=ctx.room,
        agent=Assistant(user_context=user_context),
        room_input_options=room_input_options
    )

    await ctx.connect()

    await session.generate_reply("Greet the user and offer your assistance.")


if __name__ == "__main__":
    agents.cli.run_app(
        WorkerOptions(
            entrypoint_fnc=entrypoint,
            prewarm_fnc=prewarm,
        )
    )
