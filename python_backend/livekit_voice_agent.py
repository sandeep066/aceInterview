"""
LiveKit Voice Agent: Joins a LiveKit room as an AI agent and converses using LLM and TTS.
See: https://docs.livekit.io/agents/start/voice-ai/
"""

import sys
import os
import asyncio
from livekit.agents import VoiceAiAgent, VoiceAiAgentOptions, RoomOptions, AudioOptions

async def main():
    # Accept room_name and agent_token as command-line arguments
    if len(sys.argv) < 3:
        print("Usage: python livekit_voice_agent.py <room_name> <agent_token>")
        sys.exit(1)

    room_name = sys.argv[1]
    agent_token = sys.argv[2]

    print(f"[Voice Agent] Connecting to room: {room_name}")
    print(f"[Voice Agent] Using agent_token: {agent_token[:10]}... (truncated)")

    # --- Room and agent options ---
    room_options = RoomOptions(
        ws_url=os.getenv("LIVEKIT_WS_URL"),
        api_key=os.getenv("LIVEKIT_API_KEY"),
        api_secret=os.getenv("LIVEKIT_API_SECRET"),
        room_name=room_name,
        agent_identity=os.getenv("AGENT_NAME", "AI-Interviewer"),
        token=agent_token,
    )

    # --- Audio/Voice options ---
    audio_options = AudioOptions(
        tts_provider=os.getenv("LLM_PROVIDER", "openai"),
        tts_api_key=os.getenv("OPENAI_API_KEY"),
        voice_id=os.getenv("VOICE_ID", "en-US-Standard-E"),
    )

    agent_options = VoiceAiAgentOptions(
        room=room_options,
        audio=audio_options,
    )

    agent = VoiceAiAgent(agent_options)

    print("[Voice Agent] Connecting to LiveKit room...")
    await agent.connect()
    print("[Voice Agent] Connected. Waiting for conversation...")

    # Print agent state for debugging
    print(f"[Voice Agent] Agent identity: {room_options.agent_identity}")
    print(f"[Voice Agent] Room name: {room_options.room_name}")
    print(f"[Voice Agent] WS URL: {room_options.ws_url}")

    await agent.wait_until_disconnected()
    print("[Voice Agent] Disconnected from room. Agent terminating.")

if __name__ == "__main__":
    asyncio.run(main())
    

    # --- Audio/Voice options ---
    audio_options = AudioOptions(
        tts_provider=LLM_PROVIDER,
        tts_api_key=OPENAI_API_KEY,
        voice_id=VOICE_ID,
        # Add other TTS/ASR/LLM config as needed
    )

    # --- Agent options ---
    agent_options = VoiceAiAgentOptions(
        room=room_options,
        audio=audio_options,
        # You can add more options here (see docs)
    )

    # --- Create and run the agent ---
    agent = VoiceAiAgent(agent_options)

    print(f"[LiveKit Voice Agent] Connecting to room '{room_name}' as '{AGENT_NAME}'...")
    await agent.connect()
    print("[LiveKit Voice Agent] Connected. Waiting for conversation...")

    # Keep the agent running until disconnected from the room
    await agent.wait_until_disconnected()
    print("[LiveKit Voice Agent] Disconnected from room. Agent terminating.")

if __name__ == "__main__":
    asyncio.run(main())
    asyncio.run(main())
