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
        console.log('Connected to LiveKit room');
        setIsConnected(true);
        setIsConnecting(false);
        onConnected?.();
      });

      newRoom.on(RoomEvent.Disconnected, (reason) => {
        console.log('Disconnected from LiveKit room:', reason);
        setIsConnected(false);
        setIsConnecting(false);
        onDisconnected?.();
      });

      newRoom.on(RoomEvent.TrackSubscribed, (track: RemoteTrack) => {
        if (track.kind === Track.Kind.Audio) {
          console.log('Audio track subscribed');
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
          console.log('Audio track unsubscribed');
          setRemoteAudioTracks(prev => 
            prev.filter(t => t.sid !== track.sid)
          );
        }
      });

      newRoom.on(RoomEvent.DataReceived, (payload: Uint8Array, participant) => {
        try {
          const data = JSON.parse(new TextDecoder().decode(payload));
          console.log('Data received from', participant?.identity, data);
          
          // Handle different types of data messages
          if (data.type === 'question') {
            // Handle new question from AI interviewer
          } else if (data.type === 'feedback') {
            // Handle real-time feedback
          }
        } catch (error) {
          console.error('Error parsing data message:', error);
        }
      });

      newRoom.on(RoomEvent.ConnectionQualityChanged, (quality, participant) => {
        console.log('Connection quality changed:', quality, participant?.identity);
      });

      // Connect to the room
      const connectOptions: ConnectOptions = {
        autoSubscribe: true,
      };

      await newRoom.connect(wsUrl, token, connectOptions);
      
      setRoom(newRoom);
      roomRef.current = newRoom;

    } catch (err) {
      console.error('Failed to connect to LiveKit room:', err);
      const errorMessage = err instanceof Error ? err.message : 'Unknown connection error';
      setError(errorMessage);
      setIsConnecting(false);
      onError?.(err instanceof Error ? err : new Error(errorMessage));
    }
  }, [wsUrl, token, isConnecting, isConnected, onConnected, onDisconnected, onError, onAudioReceived]);

  const disconnectFromRoom = useCallback(() => {
    if (roomRef.current) {
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
      console.log('Audio track published');
    } catch (err) {
      console.error('Failed to start audio:', err);
      setError(err instanceof Error ? err.message : 'Failed to start audio');
    }
  }, [room, localAudioTrack]);

  const stopAudio = useCallback(() => {
    if (localAudioTrack) {
      localAudioTrack.stop();
      room?.localParticipant.unpublishTrack(localAudioTrack);
      setLocalAudioTrack(null);
      console.log('Audio track stopped');
    }
  }, [localAudioTrack, room]);

  const sendDataMessage = useCallback((data: any) => {
    if (room && isConnected) {
      try {
        const message = JSON.stringify(data);
        const encoder = new TextEncoder();
        room.localParticipant.publishData(encoder.encode(message));
      } catch (err) {
        console.error('Failed to send data message:', err);
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