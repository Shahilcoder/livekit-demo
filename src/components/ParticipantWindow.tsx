import React, { useEffect, useRef, useState } from 'react';
import { ParticipantEvent, RemoteParticipant, RemoteTrack, Track, TrackEvent } from 'livekit-client';

interface ParticipantWindowProps {
  participant: RemoteParticipant;
}


const ParticipantWindow: React.FC<ParticipantWindowProps> = ({ participant }) => {
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const localAudioRef = useRef<HTMLAudioElement>(null);

  const [isAudioMuted, setIsAudioMuted] = useState<boolean>(false);
  // const [isVideoMuted, setIsVideoMuted] = useState<boolean>(false);

  useEffect(() => {
    if (localVideoRef.current && localAudioRef.current) {
      participant.on(ParticipantEvent.TrackSubscribed, (track: RemoteTrack) => {
        console.log("koshish")
        if (track.kind === Track.Kind.Audio && localAudioRef.current) {
          track.on(TrackEvent.Muted, () => { setIsAudioMuted(true) });
          track.on(TrackEvent.Unmuted, () => { setIsAudioMuted(false) });
          track.attach(localAudioRef.current)
        }

        if (track.kind === Track.Kind.Video && localVideoRef.current) {
          // track.on(TrackEvent.Muted, () => { setIsVideoMuted(true); });
          // track.on(TrackEvent.Unmuted, () => { setIsVideoMuted(false); });
          track.attach(localVideoRef.current);
        }
      });
    }
  }, [participant, localVideoRef, localAudioRef])

  return (
    <div className="relative w-full h-full">
      {/* {isVideoMuted ? (
        <div className="w-full h-full flex items-center justify-center bg-gray-900 rounded-lg text-6xl scale-x-[-1]">
          <span role="img" aria-label="person">👤</span>
        </div>
      ) : ( */}
        <video
          id={participant.identity}
          ref={localVideoRef}
          className="w-full h-full scale-x-[-1] object-contain bg-gray-900 rounded-lg"
          autoPlay
        />
      {/* )} */}
      <audio id={participant.identity} ref={localAudioRef} className="absolute hidden" autoPlay />
      <div className="absolute bottom-2 left-2 text-white bg-black bg-opacity-60 px-2 py-1 rounded text-xs">
        {participant.identity}
      </div>

      <div className="absolute top-2 right-2">
        {isAudioMuted ? (
          <svg xmlns="http://www.w3.org/2000/svg" className="w-12 h-12 text-red-500 bg-black bg-opacity-60 rounded p-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path d="M9 5a3 3 0 016 0v4a3 3 0 01-6 0V5z" stroke="currentColor" strokeWidth="2" />
            <path d="M19 11v1a7 7 0 01-7 7 7 7 0 01-7-7v-1m13.5 6.5L4.5 5.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        ) : (
          <svg xmlns="http://www.w3.org/2000/svg" className="w-12 h-12 text-green-400 bg-black bg-opacity-60 rounded p-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path d="M12 19a7 7 0 007-7v-1M5 11v1a7 7 0 007 7" stroke="currentColor" strokeWidth="2" />
            <rect x="9" y="5" width="6" height="8" rx="3" stroke="currentColor" strokeWidth="2" />
          </svg>
        )}
      </div>
    </div>
  );
}

export default ParticipantWindow;
