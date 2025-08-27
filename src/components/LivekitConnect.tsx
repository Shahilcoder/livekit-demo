import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  LocalTrackPublication,
  RemoteParticipant,
  RemoteTrack,
  RemoteTrackPublication,
  Room,
  RoomEvent,
  Track,
  VideoPresets,
} from 'livekit-client';
import { getToken } from '../services/livekit.service';
import ParticipantWindow from './ParticipantWindow';

const url: string = "wss://dev.netclan.com/devApi/livekit/";

function handleTrackUnsubscribed(
  track: RemoteTrack,
) {
  // remove tracks from all attached elements
  console.log("HATA DIYA", track);
  // track.detach();
}

function handleDisconnect() {
  console.log('disconnected from room');
}

interface TokenResponse {
  token: string,
  liveKitUrl: string,
  roomName: string
};

const LiveKitConnect: React.FC = () => {
  const localVideoRef = useRef<HTMLVideoElement>(null);

  const [isJoined, setIsJoined] = useState<boolean>(false);
  const [room] = useState<Room>(new Room({
    adaptiveStream: true,
    dynacast: true,
    videoCaptureDefaults: {
      resolution: VideoPresets.h360.resolution
    }
  }));

  const [remoteParticipants, setRemoteParticipants] = useState<Array<RemoteParticipant>>([]);
  const [roomName, setRoomName] = useState<string>("test1");
  const [participantName, setParticipantName] = useState<string>("A");
  const [isAudioMuted, setIsAudioMuted] = useState<boolean>(false);
  const [isVideoMuted, setIsVideoMuted] = useState<boolean>(false);

  useEffect(() => {
    console.log("RemoteParticipantsDetails:", remoteParticipants);
  }, [remoteParticipants]);

  const handleParticipantConnected = (participant: RemoteParticipant) => {
    setRemoteParticipants(prev => [...prev, participant]);
  };

  const setupRoom = useCallback(async () => {
    const tokenResponse: TokenResponse | undefined = await getToken(roomName, participantName);

    if (!tokenResponse) {
      return;
    }

    // Room configs, and event listeners
    room.prepareConnection(url, tokenResponse.token);

    room
      .on(RoomEvent.Connected, () => {
        setIsJoined(true);
        room.localParticipant.enableCameraAndMicrophone();

        setRemoteParticipants(Array.from(room.remoteParticipants.values()));

        room.remoteParticipants.forEach((participant) => {
          participant.trackPublications.forEach((publication) => {
            publication.setSubscribed(true);
          });
        });
      })
      .on(RoomEvent.LocalTrackPublished, (publication: LocalTrackPublication) => {
        if (publication.track?.kind === Track.Kind.Video)
          publication.track.attach(localVideoRef.current!);
      })
      .on(RoomEvent.ParticipantActive, (p) => console.log(p))
      .on(RoomEvent.ParticipantConnected, handleParticipantConnected)
      .on(RoomEvent.TrackPublished, (publication: RemoteTrackPublication) => {
        publication.setSubscribed(true);
      })
      .on(RoomEvent.TrackUnsubscribed, handleTrackUnsubscribed)
      .on(RoomEvent.TrackUnpublished, (publication: RemoteTrackPublication) => {
        console.log("HATA DIYA PUB", publication);
      })
      .on(RoomEvent.Disconnected, handleDisconnect)

    try {
      await room.connect(url, tokenResponse.token, { autoSubscribe: false });
    } catch (error) {
      console.log("Room connect error:", error);
    }
  }, [roomName, participantName]);


  return !isJoined ? (
    <div className="h-full w-full flex items-center justify-center bg-gray-50">
      <div className="w-full max-w-md bg-white rounded-xl shadow p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Join a Room</h2>
        <div className="space-y-4">
          <div>
            <label htmlFor="roomName" className="block text-sm font-medium text-gray-700 mb-1">Room name</label>
            <input
              id="roomName"
              type="text"
              value={roomName}
              onChange={(e) => setRoomName(e.target.value)}
              placeholder="Enter room name"
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label htmlFor="participantName" className="block text-sm font-medium text-gray-700 mb-1">Your name</label>
            <input
              id="participantName"
              type="text"
              value={participantName}
              onChange={(e) => setParticipantName(e.target.value)}
              placeholder="Enter your name"
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <button
            onClick={setupRoom}
            type="button"
            className="w-full inline-flex items-center justify-center rounded-md bg-blue-600 px-4 py-2 text-white font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
          >
            Join room
          </button>
        </div>
      </div>
    </div>
  ) : (
    <div className="w-full h-full flex flex-col items-center bg-gray-50 text-gray-800 px-3">
      <h2 className="text-xl font-semibold p-6">
        Room: <span className="font-mono">{roomName}</span>
      </h2>

      <div
        className="w-full h-full grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 p-6 bg-black"
        style={{ borderRadius: "0.75rem" }}
      >
        <div className="relative w-full h-full">
          <video
            ref={localVideoRef}
            className="w-full h-full scale-x-[-1] object-contain bg-gray-900 rounded-lg"
            autoPlay
            muted
          />
          <div className="absolute bottom-2 left-2 text-white bg-black bg-opacity-60 px-2 py-1 rounded text-xs">
            {participantName}
          </div>
        </div>

        {remoteParticipants.map((participant) => <ParticipantWindow
          key={participant.identity}
          participant={participant}
        />)}
      </div>

      <div className="flex gap-4 mt-4 px-6 pb-6">
        <button
          type='button'
          className={`px-4 py-2 rounded ${isAudioMuted ? 'bg-red-600' : 'bg-gray-600'} text-white font-medium hover:${isAudioMuted ? 'bg-red-700' : 'bg-gray-700'} cursor-pointer`}
          onClick={() => {
            room.localParticipant.setMicrophoneEnabled(isAudioMuted);
            setIsAudioMuted((prev: boolean) => !prev);
          }}
        >
          {isAudioMuted ? (
            <svg xmlns="http://www.w3.org/2000/svg" className="inline w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path d="M9 5a3 3 0 016 0v4a3 3 0 01-6 0V5z" stroke="currentColor" strokeWidth="2" />
              <path d="M19 11v1a7 7 0 01-7 7 7 7 0 01-7-7v-1m13.5 6.5L4.5 5.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" className="inline w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path d="M12 19a7 7 0 007-7v-1M5 11v1a7 7 0 007 7" stroke="currentColor" strokeWidth="2" />
              <rect x="9" y="5" width="6" height="8" rx="3" stroke="currentColor" strokeWidth="2" />
            </svg>
          )}
        </button>

        <button
          type='button'
          className={`px-4 py-2 rounded ${isVideoMuted ? 'bg-red-600' : 'bg-gray-600'} text-white font-medium hover:${isVideoMuted ? 'bg-red-700' : 'bg-gray-700'} cursor-pointer`}
          onClick={() => {
            room.localParticipant.setCameraEnabled(isVideoMuted);
            setIsVideoMuted((prev: boolean) => !prev);
          }}
        >
          {isVideoMuted ? (
            <svg xmlns="http://www.w3.org/2000/svg" className="inline w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path d="M15 10.5V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-3.5l4 4v-11l-4 4z" stroke="currentColor" strokeWidth="2" fill="none" />
              <line x1="3" y1="3" x2="21" y2="21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" className="inline w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <rect x="3" y="5" width="12" height="14" rx="2" stroke="currentColor" strokeWidth="2" fill="none" />
              <polygon points="17 8 21 12 17 16 17 8" stroke="currentColor" strokeWidth="2" fill="none" />
            </svg>
          )}
        </button>

        <button
          type='button'
          className="px-4 py-2 rounded bg-red-600 text-white font-medium hover:bg-red-700 cursor-pointer"
          onClick={() => window.location.reload()}
        >
          Leave Room
        </button>
      </div>
    </div>
  )
};

export default LiveKitConnect;
