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
  onDataMessageReceived?: (data: any) => void;
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
  onAudioReceived,
  onDataMessageReceived
}: UseLiveKitProps): UseLiveKitReturn => {
  const [room, setRoom] = useState<Room | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [localAudioTrack, setLocalAudioTrack] = useState<LocalAudioTrack | null>(null);
  const [remoteAudioTracks, setRemoteAudioTracks] = useState<RemoteAudioTrack[]>([]);

  const roomRef = useRef<Room | null>(null);

  const connectToRoom = useCallback(async () => {
    console.log('[LiveKit] ========== CONNECTION ATTEMPT START ==========');
    console.log('[LiveKit] Hook called with props:');
    console.log('- wsUrl type:', typeof wsUrl);
    console.log('- wsUrl value:', `"${wsUrl}"`);
    console.log('- wsUrl length:', wsUrl?.length || 0);
    console.log('- wsUrl char codes:', wsUrl ? Array.from(wsUrl).map(c => c.charCodeAt(0)).join(',') : 'N/A');
    console.log('- token type:', typeof token);
    console.log('- token length:', token?.length || 0);
    console.log('- isConnecting:', isConnecting);
    console.log('- isConnected:', isConnected);

    if (isConnecting || isConnected) {
      console.log('[LiveKit] Already connecting or connected, skipping');
      return;
    }

    // Step 1: Basic null/undefined checks
    console.log('[LiveKit] Step 1: Basic validation');
    if (!wsUrl) {
      const errorMessage = `WebSocket URL is falsy. Received: ${wsUrl}`;
      console.error('[LiveKit] VALIDATION FAILED:', errorMessage);
      setError(errorMessage);
      onError?.(new Error(errorMessage));
      return;
    }

    if (typeof wsUrl !== 'string') {
      const errorMessage = `WebSocket URL is not a string. Type: ${typeof wsUrl}, Value: ${wsUrl}`;
      console.error('[LiveKit] VALIDATION FAILED:', errorMessage);
      setError(errorMessage);
      onError?.(new Error(errorMessage));
      return;
    }

    // Step 2: Check for empty string after trim
    console.log('[LiveKit] Step 2: Empty string check');
    const trimmedUrl = wsUrl.trim();
    console.log('- Original URL:', `"${wsUrl}"`);
    console.log('- Trimmed URL:', `"${trimmedUrl}"`);
    console.log('- Trimmed length:', trimmedUrl.length);

    if (trimmedUrl === '') {
      const errorMessage = `WebSocket URL is empty after trim. Original: "${wsUrl}"`;
      console.error('[LiveKit] VALIDATION FAILED:', errorMessage);
      setError(errorMessage);
      onError?.(new Error(errorMessage));
      return;
    }

    // Step 3: Token validation
    console.log('[LiveKit] Step 3: Token validation');
    if (!token || typeof token !== 'string' || token.trim() === '') {
      const errorMessage = `Access token is invalid. Type: ${typeof token}, Length: ${token?.length || 0}`;
      console.error('[LiveKit] VALIDATION FAILED:', errorMessage);
      setError(errorMessage);
      onError?.(new Error(errorMessage));
      return;
    }

    // Step 4: Use URL exactly as received
    console.log('[LiveKit] Step 4: Preparing for connection');
    const finalUrl = wsUrl; // No modification whatsoever
    const finalToken = token;
    
    console.log('[LiveKit] Final connection parameters:');
    console.log('- finalUrl:', `"${finalUrl}"`);
    console.log('- finalUrl === wsUrl:', finalUrl === wsUrl);
    console.log('- finalToken length:', finalToken.length);

    setIsConnecting(true);
    setError(null);

    try {
      console.log('[LiveKit] Step 5: Creating Room instance');
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

      console.log('[LiveKit] Step 6: Setting up event listeners');
      // Set up event listeners
      newRoom.on(RoomEvent.Connected, () => {
        console.log('[LiveKit] ✅ Connected to room successfully');
        setIsConnected(true);
        setIsConnecting(false);
        onConnected?.();
      });

      newRoom.on(RoomEvent.Disconnected, (reason) => {
        console.log('[LiveKit] ❌ Disconnected from room:', reason);
        setIsConnected(false);
        setIsConnecting(false);
        onDisconnected?.();
      });

      newRoom.on(RoomEvent.TrackSubscribed, (track: RemoteTrack) => {
        if (track.kind === Track.Kind.Audio) {
          console.log('[LiveKit] 🎵 Audio track subscribed from participant:', track.source);
          console.log('[LiveKit] 🎵 Track details:', {
            sid: track.sid,
            source: track.source,
            enabled: track.isEnabled,
            muted: track.isMuted
          });
          
          setRemoteAudioTracks(prev => {
            const newTracks = [...prev, track as RemoteAudioTrack];
            console.log('[LiveKit] 🎵 Total remote audio tracks:', newTracks.length);
            return newTracks;
          });
          
          // Handle audio data if callback provided
          if (onAudioReceived && track instanceof RemoteAudioTrack) {
            // You can implement audio processing here
            // This would require additional setup for audio analysis
          }
        }
      });

      newRoom.on(RoomEvent.TrackUnsubscribed, (track: RemoteTrack) => {
        if (track.kind === Track.Kind.Audio) {
          console.log('[LiveKit] 🎵 Audio track unsubscribed:', track.sid);
          setRemoteAudioTracks(prev => {
            const filtered = prev.filter(t => t.sid !== track.sid);
            console.log('[LiveKit] 🎵 Remaining remote audio tracks:', filtered.length);
            return filtered;
          });
        }
      });

      newRoom.on(RoomEvent.DataReceived, (payload: Uint8Array, participant) => {
        try {
          const data = JSON.parse(new TextDecoder().decode(payload));
          console.log('[LiveKit] 📨 Data received from', participant?.identity, data);
          
          // Pass data message to component
          if (onDataMessageReceived) {
            onDataMessageReceived(data);
          }
          
          // Handle different types of data messages
          if (data.type === 'question') {
            console.log('[LiveKit] 📨 Received question:', data.text);
          } else if (data.type === 'feedback') {
            console.log('[LiveKit] 📨 Received feedback:', data.text);
          } else if (data.type === 'greeting') {
            console.log('[LiveKit] 📨 Received greeting:', data.text);
          }
        } catch (error) {
          console.error('[LiveKit] ❌ Error parsing data message:', error);
        }
      });

      newRoom.on(RoomEvent.ConnectionQualityChanged, (quality, participant) => {
        console.log('[LiveKit] 📊 Connection quality changed:', quality, participant?.identity);
      });

      // Connect to the room
      console.log('[LiveKit] Step 7: Preparing connect options');
      const connectOptions: ConnectOptions = {
        autoSubscribe: true,
      };
      
      console.log('[LiveKit] Step 8: About to call newRoom.connect()');
      console.log('- URL being passed to connect():', `"${finalUrl}"`);
      console.log('- Token preview:', finalToken.substring(0, 20) + '...');
      
      await newRoom.connect(finalUrl, finalToken, connectOptions);
      
      console.log('[LiveKit] ✅ newRoom.connect() completed successfully');
      setRoom(newRoom);
      roomRef.current = newRoom;

    } catch (err) {
      console.error('[LiveKit] ❌ Connection failed with error:', err);
      console.error('[LiveKit] Error details:', {
        name: err instanceof Error ? err.name : 'Unknown',
        message: err instanceof Error ? err.message : 'Unknown error',
        stack: err instanceof Error ? err.stack : 'No stack trace'
      });
      
      const errorMessage = err instanceof Error ? err.message : 'Unknown connection error';
      setError(errorMessage);
      setIsConnecting(false);
      onError?.(err instanceof Error ? err : new Error(errorMessage));
    }

    console.log('[LiveKit] ========== CONNECTION ATTEMPT END ==========');
  }, [wsUrl, token, isConnecting, isConnected, onConnected, onDisconnected, onError, onAudioReceived, onDataMessageReceived]);

  const disconnectFromRoom = useCallback(() => {
    if (roomRef.current) {
      console.log('[LiveKit] 🔌 Disconnecting from room');
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

      console.log('[LiveKit] 🎤 Creating local audio track with options:', audioOptions);
      const track = await createLocalAudioTrack(audioOptions);
      
      console.log('[LiveKit] 🎤 Publishing local audio track to room');
      await room.localParticipant.publishTrack(track);
      
      setLocalAudioTrack(track);
      console.log('[LiveKit] 🎤 Audio track published successfully');
    } catch (err) {
      console.error('[LiveKit] ❌ Failed to start audio:', err);
      setError(err instanceof Error ? err.message : 'Failed to start audio');
    }
  }, [room, localAudioTrack]);

  const stopAudio = useCallback(() => {
    if (localAudioTrack) {
      console.log('[LiveKit] 🎤 Stopping local audio track');
      localAudioTrack.stop();
      room?.localParticipant.unpublishTrack(localAudioTrack);
      setLocalAudioTrack(null);
      console.log('[LiveKit] 🎤 Audio track stopped');
    }
  }, [localAudioTrack, room]);

  const sendDataMessage = useCallback((data: any) => {
    if (room && isConnected) {
      try {
        const message = JSON.stringify(data);
        const encoder = new TextEncoder();
        room.localParticipant.publishData(encoder.encode(message));
        console.log('[LiveKit] 📨 Data message sent:', data);
      } catch (err) {
        console.error('[LiveKit] ❌ Failed to send data message:', err);
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