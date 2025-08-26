import React, { useEffect, useRef } from 'react';
import { Track } from 'livekit-client';

interface VideoProps {
  tracks: Track[];
  name: string;
}

const Video: React.FC<VideoProps> = ({ name, tracks }) => {
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const localAudioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    console.log(tracks);

    tracks.forEach((track: Track) => {
      if (track.kind === Track.Kind.Audio && localAudioRef.current)
        track.attach(localAudioRef.current)
      else if (track.kind === Track.Kind.Video && localVideoRef.current) {
        track.attach(localVideoRef.current);
      }
    });
  }, [tracks]);

  return (
    <div className="relative w-full h-full">
      <video
        id={name}
        ref={localVideoRef}
        className="w-full h-full scale-x-[-1] object-contain bg-gray-900 rounded-lg"
        autoPlay
      />
      <audio id={name} ref={localAudioRef} className="absolute hidden" autoPlay />
      <div className="absolute bottom-2 left-2 text-white bg-black bg-opacity-60 px-2 py-1 rounded text-xs">
        {name}
      </div>
    </div>
  );
};

export default Video;
