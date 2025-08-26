import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  createLocalTracks,
  LocalTrack,
  LocalTrackPublication,
  Participant,
  RemoteParticipant,
  RemoteTrack,
  RemoteTrackPublication,
  Room,
  RoomEvent,
  Track,
  VideoPresets,
} from 'livekit-client';
import { getToken } from '../services/livekit.service';
import { flushSync } from 'react-dom';
import Video from './Video';

const url: string = "wss://dev.netclan.com/devApi/livekit/";

function handleTrackUnsubscribed(
  track: RemoteTrack,
  // publication: RemoteTrackPublication,
  // participant: RemoteParticipant,
) {
  // remove tracks from all attached elements
  track.detach();
}

function handleLocalTrackUnpublished(
  publication: LocalTrackPublication,
  // participant: LocalParticipant,
) {
  // when local tracks are ended, update UI to remove them from rendering
  publication?.track?.detach();
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function handleActiveSpeakerChange(_: Participant[]) {
  // console.log(speakers);
  // show UI indicators when participant is speaking
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
  const [room, setRoom] = useState<Room | null>(null);
  const [remoteParticipantsTracks, setRemoteParticipantsTracks] = useState<Map<string, Map<string, RemoteTrack>>>(new Map());
  const [roomName, setRoomName] = useState<string>("");
  const [participantName, setParticipantName] = useState<string>("");


  function handleTrackSubscribed(
    track: RemoteTrack,
    _: RemoteTrackPublication,
    participant: RemoteParticipant,
  ) {
    // console.log("track subscribed", track, publication, participant);
    if (track.kind === Track.Kind.Video || track.kind === Track.Kind.Audio) {
      setRemoteParticipantsTracks(prev => {
        if (!prev.has(participant.identity)) {
          prev.set(participant.identity, new Map<string, RemoteTrack>());
        }

        if (track.sid)
          prev.get(participant.identity)?.set(track.sid, track);

        return new Map(prev);
      });
    }

  }

  const setupRoom = useCallback(async () => {
    const tokenResponse: TokenResponse | undefined = await getToken(roomName, participantName);

    if (!tokenResponse) {
      return;
    }

    // Room configs, and event listeners
    const room = new Room({
      adaptiveStream: true,
      dynacast: true,
      videoCaptureDefaults: {
        resolution: VideoPresets.h360.resolution
      }
    });

    room.prepareConnection(url, tokenResponse.token);

    room
      .on(RoomEvent.TrackSubscribed, handleTrackSubscribed)
      .on(RoomEvent.TrackUnsubscribed, handleTrackUnsubscribed)
      .on(RoomEvent.ActiveSpeakersChanged, handleActiveSpeakerChange)
      .on(RoomEvent.Disconnected, handleDisconnect)
      .on(RoomEvent.LocalTrackUnpublished, handleLocalTrackUnpublished);

    try {
      await room.connect(url, tokenResponse.token);
      console.log('connected to room', room);

      flushSync(() => {
        setIsJoined(true);
      });

      setRoom(room);
    } catch (error) {
      console.log("Room connect error:", error);
    }
  }, [roomName, participantName]);

  useEffect(() => {
    if (isJoined && room) {
      createLocalTracks({
        audio: true,
        video: true
      }).then((tracks: LocalTrack[]) => {
        const localVideoTrack: LocalTrack | undefined = tracks.find(track => track.kind === Track.Kind.Video);
        if (localVideoRef.current && localVideoTrack)
          localVideoTrack.attach(localVideoRef.current);

        tracks.forEach(track => room.localParticipant.publishTrack(track));
      })
    }

    return () => {
      if (isJoined && room) {
        room.disconnect();
        setRoom(null);
      }
    }
  }, [isJoined, room]);

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
            className="w-full inline-flex items-center justify-center rounded-md bg-blue-600 px-4 py-2 text-white font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
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

        {Array.from(remoteParticipantsTracks.entries()).map(([identity, tracks]) => <Video
          key={identity}
          name={identity}
          tracks={Array.from(tracks.values())}
        />)}
      </div>

      <div className="flex gap-4 mt-4 px-6 pb-6">
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
