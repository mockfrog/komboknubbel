import React, { useEffect, useState, useRef } from 'react';
import { Video, VideoOff, Mic, MicOff, ChevronDown, ChevronUp, Users } from 'lucide-react';
import { socket } from '../services/multiplayer';

interface VideoChatProps {
  matchId: string;
  currentUser: { uid: string; nickname: string };
  players: Record<string, { userId: string; nickname: string; hasLeft?: boolean }>;
}

interface PeerMediaState {
  isMuted: boolean;
  isVideoOff: boolean;
}

interface PeerInfo {
  userId: string;
  mediaState: PeerMediaState;
}

export const VideoChat: React.FC<VideoChatProps> = ({ matchId, currentUser, players }) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [localMuted, setLocalMuted] = useState(false);
  const [localVideoOff, setLocalVideoOff] = useState(false);
  
  // Maps peer socketId -> remote MediaStream
  const [remoteStreams, setRemoteStreams] = useState<Record<string, MediaStream>>({});
  
  // Maps peer socketId -> { userId, mediaState }
  const [peerDetails, setPeerDetails] = useState<Record<string, PeerInfo>>({});
  
  const localStreamRef = useRef<MediaStream | null>(null);
  const pcs = useRef<Record<string, RTCPeerConnection>>({});

  // Initialize media devices
  useEffect(() => {
    let active = true;

    async function initMedia() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        if (active) {
          setLocalStream(stream);
          localStreamRef.current = stream;
        }
      } catch (err) {
        console.warn("Webcam and mic permissions denied, attempting audio-only", err);
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          if (active) {
            setLocalStream(stream);
            localStreamRef.current = stream;
            setLocalVideoOff(true);
            socket.emit('toggle-media', { isMuted: localMuted, isVideoOff: true });
          }
        } catch (e) {
          console.error("Audio-only permission also denied", e);
          if (active) {
            setLocalVideoOff(true);
            setLocalMuted(true);
            socket.emit('toggle-media', { isMuted: true, isVideoOff: true });
          }
        }
      }
    }

    initMedia();

    return () => {
      active = false;
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const getOrCreatePeerConnection = (peerSocketId: string, isInitiator: boolean) => {
    if (pcs.current[peerSocketId]) {
      return pcs.current[peerSocketId];
    }

    console.log(`Creating RTCPeerConnection for ${peerSocketId}, isInitiator: ${isInitiator}`);
    const pc = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:stun2.l.google.com:19302' }
      ]
    });

    pcs.current[peerSocketId] = pc;

    // Add local tracks
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => {
        pc.addTrack(track, localStreamRef.current!);
      });
    }

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit('signal', {
          to: peerSocketId,
          signal: { type: 'candidate', candidate: event.candidate }
        });
      }
    };

    pc.ontrack = (event) => {
      console.log(`Received remote track from peer ${peerSocketId}`);
      const remoteStream = event.streams[0];
      setRemoteStreams(prev => ({
        ...prev,
        [peerSocketId]: remoteStream
      }));
    };

    pc.onconnectionstatechange = () => {
      console.log(`Connection state for ${peerSocketId}: ${pc.connectionState}`);
      if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed' || pc.connectionState === 'closed') {
        cleanupPeer(peerSocketId);
      }
    };

    if (isInitiator) {
      pc.onnegotiationneeded = async () => {
        try {
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          socket.emit('signal', {
            to: peerSocketId,
            signal: { type: 'offer', sdp: offer.sdp }
          });
        } catch (err) {
          console.error("Error creating offer:", err);
        }
      };
    }

    return pc;
  };

  const cleanupPeer = (peerSocketId: string) => {
    const pc = pcs.current[peerSocketId];
    if (pc) {
      pc.close();
      delete pcs.current[peerSocketId];
    }
    setRemoteStreams(prev => {
      const next = { ...prev };
      delete next[peerSocketId];
      return next;
    });
    setPeerDetails(prev => {
      const next = { ...prev };
      delete next[peerSocketId];
      return next;
    });
  };

  // Handle socket signaling and peer discovery
  useEffect(() => {
    const handleSignal = async ({ from, signal }: { from: string; signal: any }) => {
      try {
        if (signal.type === 'offer') {
          const pc = getOrCreatePeerConnection(from, false);
          await pc.setRemoteDescription(new RTCSessionDescription({ type: 'offer', sdp: signal.sdp }));
          
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          
          socket.emit('signal', {
            to: from,
            signal: { type: 'answer', sdp: answer.sdp }
          });
        } else if (signal.type === 'answer') {
          const pc = pcs.current[from];
          if (pc) {
            await pc.setRemoteDescription(new RTCSessionDescription({ type: 'answer', sdp: signal.sdp }));
          }
        } else if (signal.type === 'candidate') {
          const pc = pcs.current[from];
          if (pc) {
            await pc.addIceCandidate(new RTCIceCandidate(signal.candidate));
          }
        }
      } catch (err) {
        console.error("Failed to handle incoming signaling:", err);
      }
    };

    const handlePeerJoined = ({ socketId, userId, mediaState }: { socketId: string; userId: string; mediaState: PeerMediaState }) => {
      console.log(`Signal: Peer joined ${socketId} (${userId})`);
      setPeerDetails(prev => ({
        ...prev,
        [socketId]: { userId, mediaState }
      }));
    };

    const handleCurrentPeers = (peersList: Array<{ socketId: string; userId: string; mediaState: PeerMediaState }>) => {
      console.log("Signal: Current peers list", peersList);
      peersList.forEach(peer => {
        setPeerDetails(prev => ({
          ...prev,
          [peer.socketId]: { userId: peer.userId, mediaState: peer.mediaState }
        }));
        // We are the initiator for existing room members
        getOrCreatePeerConnection(peer.socketId, true);
      });
    };

    const handlePeerLeft = ({ socketId }: { socketId: string }) => {
      console.log(`Signal: Peer left ${socketId}`);
      cleanupPeer(socketId);
    };

    const handlePeerMediaToggled = ({ socketId, isMuted, isVideoOff }: { socketId: string; isMuted: boolean; isVideoOff: boolean }) => {
      setPeerDetails(prev => {
        if (!prev[socketId]) return prev;
        return {
          ...prev,
          [socketId]: {
            ...prev[socketId],
            mediaState: { isMuted, isVideoOff }
          }
        };
      });
    };

    socket.on('signal', handleSignal);
    socket.on('peer-joined', handlePeerJoined);
    socket.on('current-peers', handleCurrentPeers);
    socket.on('peer-left', handlePeerLeft);
    socket.on('peer-media-toggled', handlePeerMediaToggled);

    // Re-join match room video group when this component mounts
    socket.emit('joinMatch', { inviteCode: matchId, userId: currentUser.uid });

    return () => {
      socket.off('signal', handleSignal);
      socket.off('peer-joined', handlePeerJoined);
      socket.off('current-peers', handleCurrentPeers);
      socket.off('peer-left', handlePeerLeft);
      socket.off('peer-media-toggled', handlePeerMediaToggled);
      
      // Close connections
      Object.keys(pcs.current).forEach(cleanupPeer);
    };
  }, [currentUser.uid, matchId]);

  // Negotiate if local stream tracks change
  useEffect(() => {
    if (localStream) {
      Object.keys(pcs.current).forEach(peerSocketId => {
        const pc = pcs.current[peerSocketId];
        const senders = pc.getSenders();
        senders.forEach(sender => pc.removeTrack(sender));
        
        localStream.getTracks().forEach(track => {
          pc.addTrack(track, localStream);
        });

        // Trigger negotiation offer
        pc.createOffer().then(offer => {
          pc.setLocalDescription(offer);
          socket.emit('signal', {
            to: peerSocketId,
            signal: { type: 'offer', sdp: offer.sdp }
          });
        });
      });
    }
  }, [localStream]);

  const toggleMute = () => {
    const nextVal = !localMuted;
    setLocalMuted(nextVal);
    if (localStream) {
      localStream.getAudioTracks().forEach(track => track.enabled = !nextVal);
    }
    socket.emit('toggle-media', { isMuted: nextVal, isVideoOff: localVideoOff });
  };

  const toggleVideo = () => {
    const nextVal = !localVideoOff;
    setLocalVideoOff(nextVal);
    if (localStream) {
      localStream.getVideoTracks().forEach(track => track.enabled = !nextVal);
    }
    socket.emit('toggle-media', { isMuted: localMuted, isVideoOff: nextVal });
  };

  const getNicknameByUserId = (userId: string) => {
    return players[userId]?.nickname || 'Spieler';
  };

  const activePeersCount = Object.keys(peerDetails).length;

  return (
    <div className="w-full bg-slate-800/60 backdrop-blur-md rounded-3xl border border-slate-700/50 shadow-2xl overflow-hidden transition-all duration-300">
      <header 
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="px-5 py-4 border-b border-slate-700/40 flex items-center justify-between cursor-pointer select-none bg-slate-700/20 hover:bg-slate-700/30 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 text-yellow-400" />
          <h3 className="text-xs font-black text-slate-200 font-game-title tracking-widest uppercase">
            Video-Chat ({activePeersCount + 1})
          </h3>
        </div>
        <button className="text-slate-400 hover:text-slate-200">
          {isCollapsed ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
      </header>

      {!isCollapsed && (
        <div className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3 max-h-[300px] overflow-y-auto pr-1">
            {/* Local video feed */}
            <VideoFeed 
              stream={localStream} 
              isMuted={true} // Local player is muted to prevent echo
              label={`${currentUser.nickname} (Du)`}
              isVideoOff={localVideoOff}
              isSelfMuted={localMuted}
            />

            {/* Remote video feeds */}
            {Object.entries(peerDetails).map(([socketId, info]) => {
              const stream = remoteStreams[socketId];
              return (
                <VideoFeed
                  key={socketId}
                  stream={stream}
                  isMuted={false} // Hear remote peer
                  label={getNicknameByUserId(info.userId)}
                  isVideoOff={info.mediaState.isVideoOff}
                  isSelfMuted={info.mediaState.isMuted}
                />
              );
            })}
          </div>

          <div className="flex items-center justify-center gap-2 pt-2 border-t border-slate-700/40">
            <button
              onClick={toggleMute}
              className={`p-3 rounded-full transition-all duration-200 shadow-md ${
                localMuted 
                  ? 'bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30' 
                  : 'bg-slate-700/60 text-slate-200 hover:bg-slate-600 border border-slate-600/30'
              }`}
              title={localMuted ? 'Mikrofon einschalten' : 'Stummschalten'}
            >
              {localMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            </button>
            
            <button
              onClick={toggleVideo}
              className={`p-3 rounded-full transition-all duration-200 shadow-md ${
                localVideoOff 
                  ? 'bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30' 
                  : 'bg-slate-700/60 text-slate-200 hover:bg-slate-600 border border-slate-600/30'
              }`}
              title={localVideoOff ? 'Kamera einschalten' : 'Kamera ausschalten'}
            >
              {localVideoOff ? <VideoOff className="w-4 h-4" /> : <Video className="w-4 h-4" />}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

interface VideoFeedProps {
  stream: MediaStream | null;
  isMuted: boolean;
  label: string;
  isVideoOff: boolean;
  isSelfMuted: boolean;
}

const VideoFeed: React.FC<VideoFeedProps> = ({ stream, isMuted, label, isVideoOff, isSelfMuted }) => {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  return (
    <div className="relative rounded-2xl overflow-hidden bg-slate-900 border border-slate-700/40 aspect-[4/3] flex items-center justify-center shadow-lg group">
      {isVideoOff || !stream ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/90 animate-fadeIn">
          <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center text-slate-300 font-black border border-slate-700/60 text-sm">
            {label.substring(0, 2).toUpperCase()}
          </div>
        </div>
      ) : (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={isMuted}
          className="w-full h-full object-cover rounded-2xl scale-x-[-1]"
        />
      )}

      <div className="absolute bottom-1.5 left-1.5 right-1.5 flex items-center justify-between bg-black/60 backdrop-blur-md px-2 py-0.5 rounded-xl border border-white/5">
        <span className="text-[10px] text-white font-bold truncate max-w-[80%]">{label}</span>
        {isSelfMuted && (
          <MicOff className="w-3 h-3 text-red-500 shrink-0" />
        )}
      </div>
    </div>
  );
};
