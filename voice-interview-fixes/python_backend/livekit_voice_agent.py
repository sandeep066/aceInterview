"""
LiveKit Voice Agent: Enhanced Google AI integration with proper audio streaming
"""

import sys
import os
import asyncio
import json
import io
import wave
from typing import Optional, Dict, Any
from livekit.agents import VoiceAiAgent, VoiceAiAgentOptions, RoomOptions, AudioOptions
from livekit import rtc
import numpy as np

class GoogleAIVoiceAgent:
    def __init__(self):
        self.room_name = None
        self.agent_token = None
        self.room = None
        self.audio_source = None
        self.audio_track = None
        self.is_speaking = False
        self.is_listening = False
        self.conversation_history = []
        
        # Initialize Google services
        self.setup_google_services()
        
    def setup_google_services(self):
        """Initialize Google Cloud services"""
        try:
            # Google Gemini AI
            if os.getenv("GEMINI_API_KEY"):
                from google.generativeai import GenerativeModel
                import google.generativeai as genai
                genai.configure(api_key=os.getenv("GEMINI_API_KEY"))
                self.gemini_model = GenerativeModel('gemini-2.0-flash-exp')
                print("✅ Google Gemini AI initialized")
            
            # Google Cloud Text-to-Speech
            if os.getenv("GOOGLE_APPLICATION_CREDENTIALS"):
                from google.cloud import texttospeech
                self.tts_client = texttospeech.TextToSpeechClient()
                print("✅ Google Cloud TTS initialized")
            
            # Google Cloud Speech-to-Text
            if os.getenv("GOOGLE_APPLICATION_CREDENTIALS"):
                from google.cloud import speech
                self.speech_client = speech.SpeechClient()
                print("✅ Google Cloud STT initialized")
                
        except Exception as e:
            print(f"❌ Error initializing Google services: {e}")
            
    async def connect_to_room(self, room_name: str, agent_token: str):
        """Connect to LiveKit room as AI agent"""
        self.room_name = room_name
        self.agent_token = agent_token
        
        try:
            print(f"🤖 Google AI Agent connecting to room: {room_name}")
            
            # Connect to room
            self.room = rtc.Room()
            
            # Set up event handlers
            self.room.on("participant_connected", self.on_participant_connected)
            self.room.on("track_subscribed", self.on_track_subscribed)
            self.room.on("data_received", self.on_data_received)
            
            # Connect to the room
            await self.room.connect(
                url=os.getenv("LIVEKIT_WS_URL"),
                token=agent_token
            )
            
            # Create and publish audio track
            await self.setup_audio_track()
            
            print("✅ Google AI Agent connected successfully")
            
            # Send initial greeting
            await self.send_greeting()
            
        except Exception as e:
            print(f"❌ Error connecting to room: {e}")
            raise
            
    async def setup_audio_track(self):
        """Set up audio track for AI speech output"""
        try:
            # Create audio source
            self.audio_source = rtc.AudioSource(
                sample_rate=24000,  # Google TTS default
                num_channels=1
            )
            
            # Create audio track
            self.audio_track = rtc.LocalAudioTrack.create_audio_track(
                "ai-speech",
                self.audio_source
            )
            
            # Publish the track
            await self.room.local_participant.publish_track(
                self.audio_track,
                rtc.TrackPublishOptions(name="ai-speech", source=rtc.TrackSource.SOURCE_MICROPHONE)
            )
            
            print("🎵 AI audio track published successfully")
            
        except Exception as e:
            print(f"❌ Error setting up audio track: {e}")
            
    async def send_greeting(self):
        """Send initial greeting to participant"""
        greeting = "Hello! Welcome to your Google AI-powered voice interview. I'm ready to begin when you are. Please let me know when you'd like to start!"
        
        # Send as data message
        await self.send_data_message({
            "type": "greeting",
            "text": greeting,
            "timestamp": asyncio.get_event_loop().time()
        })
        
        # Speak the greeting
        await self.speak_text(greeting)
        
    async def speak_text(self, text: str):
        """Convert text to speech using Google TTS and stream to LiveKit"""
        if not hasattr(self, 'tts_client') or not self.audio_source:
            print("⚠️ TTS client or audio source not available")
            return
            
        try:
            self.is_speaking = True
            print(f"🗣️ Google AI speaking: {text[:50]}...")
            
            # Configure TTS request
            synthesis_input = {"text": text}
            voice = {
                "language_code": "en-US",
                "name": "en-US-Neural2-F",  # Female voice
                "ssml_gender": "FEMALE"
            }
            audio_config = {
                "audio_encoding": "LINEAR16",
                "sample_rate_hertz": 24000,
                "speaking_rate": 1.0,
                "pitch": 0.0,
                "volume_gain_db": 0.0
            }
            
            # Synthesize speech
            response = self.tts_client.synthesize_speech(
                input=synthesis_input,
                voice=voice,
                audio_config=audio_config
            )
            
            # Convert audio to proper format for LiveKit
            await self.stream_audio_to_livekit(response.audio_content)
            
        except Exception as e:
            print(f"❌ Error in Google TTS: {e}")
        finally:
            self.is_speaking = False
            
    async def stream_audio_to_livekit(self, audio_data: bytes):
        """Stream audio data to LiveKit room"""
        try:
            # Convert audio data to numpy array
            audio_array = np.frombuffer(audio_data, dtype=np.int16)
            
            # Convert to float32 and normalize
            audio_float = audio_array.astype(np.float32) / 32768.0
            
            # Stream in chunks
            chunk_size = 480  # 20ms at 24kHz
            for i in range(0, len(audio_float), chunk_size):
                chunk = audio_float[i:i + chunk_size]
                
                # Pad if necessary
                if len(chunk) < chunk_size:
                    chunk = np.pad(chunk, (0, chunk_size - len(chunk)))
                
                # Create audio frame
                frame = rtc.AudioFrame(
                    data=chunk.tobytes(),
                    sample_rate=24000,
                    num_channels=1,
                    samples_per_channel=len(chunk)
                )
                
                # Capture frame to audio source
                await self.audio_source.capture_frame(frame)
                
                # Small delay to maintain real-time playback
                await asyncio.sleep(0.02)  # 20ms
                
            print("✅ Audio streaming completed")
            
        except Exception as e:
            print(f"❌ Error streaming audio: {e}")
            
    async def on_participant_connected(self, participant):
        """Handle participant connection"""
        print(f"👤 Participant connected: {participant.identity}")
        
    async def on_track_subscribed(self, track, publication, participant):
        """Handle track subscription (audio from participant)"""
        if track.kind == rtc.TrackKind.KIND_AUDIO:
            print(f"🎤 Subscribed to audio track from: {participant.identity}")
            
            # Set up audio processing for speech recognition
            track.on("frame_received", self.on_audio_frame)
            
    async def on_audio_frame(self, frame):
        """Process incoming audio frame for speech recognition"""
        if self.is_speaking or not self.is_listening:
            return
            
        try:
            # Convert frame to format suitable for Google STT
            # This is a simplified version - you might need more sophisticated buffering
            audio_data = frame.data
            
            # Process with Google Speech-to-Text
            await self.process_speech_recognition(audio_data)
            
        except Exception as e:
            print(f"❌ Error processing audio frame: {e}")
            
    async def process_speech_recognition(self, audio_data: bytes):
        """Process audio with Google Speech-to-Text"""
        if not hasattr(self, 'speech_client'):
            return
            
        try:
            # Configure recognition
            config = {
                "encoding": "LINEAR16",
                "sample_rate_hertz": 24000,
                "language_code": "en-US",
                "enable_automatic_punctuation": True,
                "model": "latest_long"
            }
            
            audio = {"content": audio_data}
            
            # Recognize speech
            response = self.speech_client.recognize(
                config=config,
                audio=audio
            )
            
            # Process results
            for result in response.results:
                if result.alternatives:
                    transcript = result.alternatives[0].transcript
                    confidence = result.alternatives[0].confidence
                    
                    if confidence > 0.7:  # Only process high-confidence results
                        await self.handle_user_speech(transcript)
                        
        except Exception as e:
            print(f"❌ Error in speech recognition: {e}")
            
    async def handle_user_speech(self, transcript: str):
        """Handle recognized user speech"""
        print(f"👤 User said: {transcript}")
        
        # Add to conversation history
        self.conversation_history.append({
            "speaker": "user",
            "message": transcript,
            "timestamp": asyncio.get_event_loop().time()
        })
        
        # Send data message to frontend
        await self.send_data_message({
            "type": "user_speech",
            "text": transcript,
            "timestamp": asyncio.get_event_loop().time()
        })
        
        # Generate AI response
        await self.generate_ai_response(transcript)
        
    async def generate_ai_response(self, user_input: str):
        """Generate AI response using Google Gemini"""
        if not hasattr(self, 'gemini_model'):
            return
            
        try:
            # Create context from conversation history
            context = self.build_conversation_context()
            
            # Generate response
            prompt = f"""
            You are an AI interviewer conducting a professional interview. 
            
            Context: {context}
            
            User just said: "{user_input}"
            
            Respond naturally as an interviewer. Keep responses conversational and engaging.
            Ask follow-up questions or provide the next interview question as appropriate.
            """
            
            response = await self.gemini_model.generate_content_async(prompt)
            ai_response = response.text
            
            # Add to conversation history
            self.conversation_history.append({
                "speaker": "ai",
                "message": ai_response,
                "timestamp": asyncio.get_event_loop().time()
            })
            
            # Send data message
            await self.send_data_message({
                "type": "ai_response",
                "text": ai_response,
                "timestamp": asyncio.get_event_loop().time()
            })
            
            # Speak the response
            await self.speak_text(ai_response)
            
        except Exception as e:
            print(f"❌ Error generating AI response: {e}")
            
    def build_conversation_context(self) -> str:
        """Build conversation context from history"""
        context_parts = []
        for entry in self.conversation_history[-5:]:  # Last 5 exchanges
            speaker = "Interviewer" if entry["speaker"] == "ai" else "Candidate"
            context_parts.append(f"{speaker}: {entry['message']}")
        return "\n".join(context_parts)
        
    async def send_data_message(self, data: Dict[str, Any]):
        """Send data message to room participants"""
        try:
            message = json.dumps(data)
            await self.room.local_participant.publish_data(
                message.encode('utf-8'),
                reliable=True
            )
            print(f"📨 Data message sent: {data['type']}")
        except Exception as e:
            print(f"❌ Error sending data message: {e}")
            
    async def on_data_received(self, data, participant):
        """Handle incoming data messages"""
        try:
            message = json.loads(data.decode('utf-8'))
            print(f"📨 Received data message: {message}")
            
            # Handle different message types
            if message.get('type') == 'start_listening':
                self.is_listening = True
                print("👂 Started listening for user speech")
            elif message.get('type') == 'stop_listening':
                self.is_listening = False
                print("🔇 Stopped listening for user speech")
                
        except Exception as e:
            print(f"❌ Error processing data message: {e}")

async def main():
    """Main function to run the Google AI voice agent"""
    if len(sys.argv) < 3:
        print("Usage: python livekit_voice_agent.py <room_name> <agent_token>")
        sys.exit(1)

    room_name = sys.argv[1]
    agent_token = sys.argv[2]

    print(f"🚀 Starting Google AI Voice Agent for room: {room_name}")

    # Create and run agent
    agent = GoogleAIVoiceAgent()
    
    try:
        await agent.connect_to_room(room_name, agent_token)
        
        # Keep the agent running
        print("✅ Google AI Voice Agent is running...")
        while True:
            await asyncio.sleep(1)
            
    except KeyboardInterrupt:
        print("🛑 Agent stopped by user")
    except Exception as e:
        print(f"❌ Agent error: {e}")
    finally:
        if agent.room:
            await agent.room.disconnect()
        print("👋 Google AI Voice Agent disconnected")

if __name__ == "__main__":
    asyncio.run(main())