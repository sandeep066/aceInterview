import { useState, useEffect, useCallback, useRef } from 'react';
import { 
  Room, 
  connect, 
  ConnectOptions, 
  RoomEvent, 
  Track,
  RemoteTrack,
  RemoteAudioTrack,
  LocalAudioTrack,
  createLocalAudioTrack,
  AudioCaptureOptions
} from 'livekit-client';

interface UseLiveKitProps {
  wsUrl: string;
  token: string;
  onConnected?: () => void;
  onDisconnected?: () => void;
  onError?: (error: Error) => void;
  onAudioReceived?: (audioData: ArrayBuffer) => void;
}

interface UseLiveKitReturn {
  room: Room | null;
  isConnected: boolean;
  isConnecting: boolean;
  error: string | null;
  localAudioTrack: LocalAudioTrack | null;
  remoteAudioTracks: RemoteAudioTrack[];
  connect: () => Promise<void>;
  disconnect: () => void;
  startAudio: () => Promise<void>;
  stopAudio: () => void;
  sendDataMessage: (data: any) => void;
}

export const useLiveKit = ({
  wsUrl,
  token,
  onConnected,
  onDisconnected,
  onError,
  onAudioReceived
}: UseLiveKitProps): UseLiveKitReturn => {
  const [room, setRoom] = useState<Room | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [localAudioTrack, setLocalAudioTrack] = useState<LocalAudioTrack | null>(null);
  const [remoteAudioTracks, setRemoteAudioTracks] = useState<RemoteAudioTrack[]>([]);

  const roomRef = useRef<Room | null>(null);

  const connectToRoom = useCallback(async () => {
    if (isConnecting || isConnected) return;
    this.wsUrl = process.env.LIVEKIT_WS_URL;
    // Comprehensive URL validation before attempting connection
    if (!wsUrl || typeof wsUrl !== 'string' || wsUrl.trim() === '') {
      const errorMessage = 'WebSocket URL is missing or empty Amit text'  ;
      console.error('[LiveKit] Connection failed:', errorMessage);
      setError(errorMessage);
      onError?.(new Error(errorMessage));
      return;
    }

    // Check if wsUrl is a valid WebSocket URL
    try {
      const url = new URL(wsUrl.trim());
      if (url.protocol !== 'ws:' && url.protocol !== 'wss:') {
        throw new Error('URL must use ws:// or wss:// protocol');
      }
      console.log('[LiveKit] Valid WebSocket URL detected:', wsUrl);
    } catch (urlError) {
      const errorMessage = `Invalid WebSocket URL format: ${wsUrl}`;
      console.error('[LiveKit] URL validation failed:', errorMessage);
      setError(errorMessage);
      onError?.(new Error(errorMessage));
      return;
    }

    // Validate token
    if (!token || typeof token !== 'string' || token.trim() === '') {
      const errorMessage = 'Access token is missing or empty';
      console.error('[LiveKit] Connection failed:', errorMessage);
      setError(errorMessage);
      onError?.(new Error(errorMessage));
      return;
    }

    setIsConnecting(true);
    setError(null);

    try {
      const newRoom = new Room({
        adaptiveStream: true,
        dynacast: true,
        videoCaptureDefaults: {
          resolution: {
            width: 1280,
            height: 720,
            frameRate: 30,
          },
        },
      });

      // Set up event listeners
      newRoom.on(RoomEvent.Connected, () => {
        console.log('[LiveKit] Connected to room successfully');
        setIsConnected(true);
        setIsConnecting(false);
        onConnected?.();
      });

      newRoom.on(RoomEvent.Disconnected, (reason) => {
        console.log('[LiveKit] Disconnected from room:', reason);
        setIsConnected(false);
        setIsConnecting(false);
        onDisconnected?.();
      });

      newRoom.on(RoomEvent.TrackSubscribed, (track: RemoteTrack) => {
        if (track.kind === Track.Kind.Audio) {
          console.log('[LiveKit] Audio track subscribed');
          setRemoteAudioTracks(prev => [...prev, track as RemoteAudioTrack]);
          
          // Handle audio data if callback provided
          if (onAudioReceived && track instanceof RemoteAudioTrack) {
            // You can implement audio processing here
            // This would require additional setup for audio analysis
          }
        }
      });

      newRoom.on(RoomEvent.TrackUnsubscribed, (track: RemoteTrack) => {
        if (track.kind === Track.Kind.Audio) {
          console.log('[LiveKit] Audio track unsubscribed');
          setRemoteAudioTracks(prev => 
            prev.filter(t => t.sid !== track.sid)
          );
        }
      });

      newRoom.on(RoomEvent.DataReceived, (payload: Uint8Array, participant) => {
        try {
          const data = JSON.parse(new TextDecoder().decode(payload));
          console.log('[LiveKit] Data received from', participant?.identity, data);
          
          // Handle different types of data messages
          if (data.type === 'question') {
            // Handle new question from AI interviewer
          } else if (data.type === 'feedback') {
            // Handle real-time feedback
          }
        } catch (error) {
          console.error('[LiveKit] Error parsing data message:', error);
        }
      });

      newRoom.on(RoomEvent.ConnectionQualityChanged, (quality, participant) => {
        console.log('[LiveKit] Connection quality changed:', quality, participant?.identity);
      });

      // Connect to the room
      const connectOptions: ConnectOptions = {
        autoSubscribe: true,
      };

      console.log('[LiveKit] Attempting to connect to:', wsUrl);
      await newRoom.connect(wsUrl.trim(), token.trim(), connectOptions);
      
      setRoom(newRoom);
      roomRef.current = newRoom;

    } catch (err) {
      console.error('[LiveKit] Failed to connect to room:', err);
      const errorMessage = err instanceof Error ? err.message : 'Unknown connection error';
      setError(errorMessage);
      setIsConnecting(false);
      onError?.(err instanceof Error ? err : new Error(errorMessage));
    }
  }, [wsUrl, token, isConnecting, isConnected, onConnected, onDisconnected, onError, onAudioReceived]);

  const disconnectFromRoom = useCallback(() => {
    if (roomRef.current) {
      console.log('[LiveKit] Disconnecting from room');
      roomRef.current.disconnect();
      roomRef.current = null;
      setRoom(null);
      setIsConnected(false);
      setLocalAudioTrack(null);
      setRemoteAudioTracks([]);
    }
  }, []);

  const startAudio = useCallback(async () => {
    if (!room || localAudioTrack) return;

    try {
      const audioOptions: AudioCaptureOptions = {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
        sampleRate: 48000,
        channelCount: 1,
      };

      const track = await createLocalAudioTrack(audioOptions);
      await room.localParticipant.publishTrack(track);
      
      setLocalAudioTrack(track);
      console.log('[LiveKit] Audio track published successfully');
    } catch (err) {
      console.error('[LiveKit] Failed to start audio:', err);
      setError(err instanceof Error ? err.message : 'Failed to start audio');
    }
  }, [room, localAudioTrack]);

  const stopAudio = useCallback(() => {
    if (localAudioTrack) {
      localAudioTrack.stop();
      room?.localParticipant.unpublishTrack(localAudioTrack);
      setLocalAudioTrack(null);
      console.log('[LiveKit] Audio track stopped');
    }
  }, [localAudioTrack, room]);

  const sendDataMessage = useCallback((data: any) => {
    if (room && isConnected) {
      try {
        const message = JSON.stringify(data);
        const encoder = new TextEncoder();
        room.localParticipant.publishData(encoder.encode(message));
        console.log('[LiveKit] Data message sent:', data);
      } catch (err) {
        console.error('[LiveKit] Failed to send data message:', err);
      }
    }
  }, [room, isConnected]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnectFromRoom();
    };
  }, [disconnectFromRoom]);

  return {
    room,
    isConnected,
    isConnecting,
    error,
    localAudioTrack,
    remoteAudioTracks,
    connect: connectToRoom,
    disconnect: disconnectFromRoom,
    startAudio,
    stopAudio,
    sendDataMessage
  };
};