# LiveKit Video Conferencing - Step-by-Step Implementation Guide

## Prerequisites
- React + TypeScript project setup
- LiveKit client library installed: `npm install livekit-client`
- Axios for HTTP requests: `npm install axios`
- (Optional) mkcert for TLS certificates generation: `npm install -g mkcert`

## (Optional) Enable TLS/HTTPS
In the root directory:

```bash
mkcert create-ca
```

```bash
mkcert create-cert
```

Then uncomment the `server` object in the `vite.config.ts` file:
```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss()
  ],
  // server: {
  //   https: {
  //     key: './cert.key',
  //     cert: './cert.crt'
  //   }
  // }
})
```

## Step 1: Set Up Token Service
**File: `src/services/livekit.service.ts`**

First, create the authentication service that will fetch tokens from your server, as we need authentication before any LiveKit operations.

```typescript
import axios, { type AxiosResponse } from "axios";

const token_url: string = "https://dev.netclan.com/devChat/api/conferencing/token";

export const getToken = async (roomName: string, participantName: string) => {
  try {
    if (!roomName || !participantName) {
      throw Error("Room Name and Participant Name are required");
    }

    const response: AxiosResponse = await axios.post(token_url, {
      roomName,
      participantName
    });

    return response.data;
  } catch (error) {
    console.log("Get token error:", error);
  }
};
```

## Step 2: Create Basic Connection Component Structure
**File: `src/components/LivekitConnect.tsx`**

Start with the basic React component structure and state management:

```typescript
import React, { useEffect, useState } from 'react';
import { Room, VideoPresets } from 'livekit-client';
import { getToken } from '../services/livekit.service';

const url: string = "wss://dev.netclan.com/devApi/livekit/";

interface TokenResponse {
  token: string,
  liveKitUrl: string,
  roomName: string
};

const LiveKitConnect: React.FC = () => {
  // Step 2a: Basic state management
  const [isJoined, setIsJoined] = useState<boolean>(false);
  const [roomName, setRoomName] = useState<string>("test2");
  const [participantName, setParticipantName] = useState<string>("A");

  // Step 2b: Room initialization
  const [room] = useState<Room>(new Room({
    adaptiveStream: true,
    dynacast: true,
    videoCaptureDefaults: {
      resolution: VideoPresets.h360.resolution
    }
  }));

  return null; // replace null with the UI you want to show
};

export default LiveKitConnect;
```

## Step 3: Add Connection Form State Handlers
**File: `src/components/LivekitConnect.tsx`**

Add the state handlers for the connection form:

```typescript
// Add these handler functions inside the component
const handleRoomNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
  setRoomName(e.target.value);
};

const handleParticipantNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
  setParticipantName(e.target.value);
};

const setupRoom = async () => {
  // Connection logic will go here in next step
};
```

## Step 4: Implement Basic Room Connection
**File: `src/components/LivekitConnect.tsx`**

Add the core connection logic to the `setupRoom` function:

```typescript
const setupRoom = async () => {
  // Step 4a: Get authentication token
  const tokenResponse: TokenResponse | undefined = await getToken(roomName, participantName);

  if (!tokenResponse) {
    return;
  }

  // Step 4b: Prepare and connect to room
  room.prepareConnection(url, tokenResponse.token);

  try {
    await room.connect(url, tokenResponse.token, { autoSubscribe: false });
  } catch (error) {
    console.log("Room connect error:", error);
  }
};
```

This establishes the basic WebSocket connection to LiveKit.

## Step 5: Add Room Event Listeners
**File: `src/components/LivekitConnect.tsx`**

Add event handling for room state changes:

```typescript
// Add these imports at the top
import {
  RemoteParticipant,
  RemoteTrackPublication,
  RoomEvent,
} from 'livekit-client';

// Add this state for tracking remote participants
const [remoteParticipants, setRemoteParticipants] = useState<Array<RemoteParticipant>>([]);

// Update the setupRoom function to include event listeners:
const setupRoom = async () => {
  const tokenResponse: TokenResponse | undefined = await getToken(roomName, participantName);

  if (!tokenResponse) {
    return;
  }

  room.prepareConnection(url, tokenResponse.token);

  // Step 5a: Set up event listeners BEFORE connecting
  room
    .on(RoomEvent.Connected, () => {
      setIsJoined(true);
      room.localParticipant.enableCameraAndMicrophone();
      setRemoteParticipants(Array.from(room.remoteParticipants.values()));
    })
    .on(RoomEvent.ParticipantConnected, (participant: RemoteParticipant) => {
      setRemoteParticipants(prev => [...prev, participant]);
    })
    .on(RoomEvent.ParticipantDisconnected, (participant: RemoteParticipant) => {
      setRemoteParticipants(prev => prev.filter(p => p.identity !== participant.identity));
    })
    .on(RoomEvent.Disconnected, () => {
      setIsJoined(false);
    });

  try {
    await room.connect(url, tokenResponse.token, { autoSubscribe: false });
  } catch (error) {
    console.log("Room connect error:", error);
  }
};
```

You need to handle participant join/leave events before they can be displayed.

## Step 6: Create Participant Display Component Structure
**File: `src/components/ParticipantWindow.tsx`**

Create the component that will display individual participants:

```typescript
import React, { useEffect, useRef, useState } from 'react';
import { LocalTrackPublication, Participant, ParticipantEvent, RemoteTrack, Track, TrackEvent } from 'livekit-client';

interface ParticipantWindowProps {
  participant: Participant;
  isLocalAudioMuted?: boolean;
  isLocalVideoMuted?: boolean; 
}

const ParticipantWindow: React.FC<ParticipantWindowProps> = ({ participant, isLocalAudioMuted = false, isLocalVideoMuted = false }) => {
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const localAudioRef = useRef<HTMLAudioElement>(null);

  const [isAudioMuted, setIsAudioMuted] = useState<boolean>(false);
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);
  const [isVideoMuted, setIsVideoMuted] = useState<boolean>(false);

  return null; // replace null with the UI you want to show
};

export default ParticipantWindow;
```

## Step 7: Add Track Subscription Logic
**File: `src/components/LivekitConnect.tsx`**

Add track subscription to receive media from other participants:

```typescript
// Update the RoomEvent.Connected listener in setupRoom:
.on(RoomEvent.Connected, () => {
  setIsJoined(true);
  room.localParticipant.enableCameraAndMicrophone();

  setRemoteParticipants(Array.from(room.remoteParticipants.values()));

  // Step 7a: Subscribe to existing participants' tracks
  room.remoteParticipants.forEach((participant) => {
    participant.trackPublications.forEach((publication) => {
      publication.setSubscribed(true);
    });
  });
})

// Add track published event listener:
.on(RoomEvent.TrackPublished, (publication: RemoteTrackPublication) => {
  publication.setSubscribed(true);
})
```

## Step 8: Implement Track Attachment in ParticipantWindow
**File: `src/components/ParticipantWindow.tsx`**

Add the logic to attach media tracks to video/audio elements:

```typescript
useEffect(() => {
  if (localVideoRef.current && localAudioRef.current) {
    // Step 8a: Handle speaking detection
    participant.on(ParticipantEvent.IsSpeakingChanged, (isSpeaking: boolean) => setIsSpeaking(isSpeaking));

    if (participant.isLocal) {
      // Step 8b: Handle local participant tracks
      participant.on(ParticipantEvent.LocalTrackPublished, (publication: LocalTrackPublication) => {
        if (publication.track?.kind === Track.Kind.Video)
          publication.track.attach(localVideoRef.current!);
      });
    } else {
      // Step 8c: Handle remote participant tracks
      participant.on(ParticipantEvent.TrackSubscribed, (track: RemoteTrack) => {
        if (track.kind === Track.Kind.Audio && localAudioRef.current) {
          track.on(TrackEvent.Muted, () => { setIsAudioMuted(true) });
          track.on(TrackEvent.Unmuted, () => { setIsAudioMuted(false) });
          track.attach(localAudioRef.current)
        }

        if (track.kind === Track.Kind.Video && localVideoRef.current) {
          track.on(TrackEvent.Muted, () => { setIsVideoMuted(true); });
          track.on(TrackEvent.Unmuted, () => { setIsVideoMuted(false); });
          track.attach(localVideoRef.current);
        }
      });

      participant.on(ParticipantEvent.TrackUnsubscribed, (track: RemoteTrack) => {
        track.detach();
      });
    }
  }
}, [participant, localVideoRef, localAudioRef])
```

## Step 9: Add Local Media Controls State
**File: `src/components/LivekitConnect.tsx`**

Add state and event handlers for local media controls:

```typescript
// Add these state variables
const [isAudioMuted, setIsAudioMuted] = useState<boolean>(false);
const [isVideoMuted, setIsVideoMuted] = useState<boolean>(false);

// Add these handler functions
const handleAudioToggle = () => {
  room.localParticipant.setMicrophoneEnabled(isAudioMuted);
  setIsAudioMuted((prev: boolean) => !prev);
};

const handleVideoToggle = () => {
  room.localParticipant.setCameraEnabled(isVideoMuted);
  setIsVideoMuted((prev: boolean) => !prev);
};

const handleLeaveRoom = async () => {
  await room.localParticipant.unpublishTracks(
    room.localParticipant.getTrackPublications().map(
      pub => pub.track as LocalTrack
    )
  );
  room.disconnect(true);
};
```

## Step 10: Add Participant List Management
**File: `src/components/LivekitConnect.tsx`**

Add logic to manage the participant list:

```typescript
// Add this function to handle participant connections
const handleParticipantConnected = (participant: RemoteParticipant) => {
  setRemoteParticipants(prev => [...prev, participant]);
};

// Add this function to handle participant disconnections
const handleParticipantDisconnected = (participant: RemoteParticipant) => {
  console.log("disconnecting guy", participant.identity);
  setRemoteParticipants(prev => prev.filter(p => p.identity !== participant.identity));
};

// Add this function to handle disconnection
const handleDisconnect = () => {
  setIsJoined(false);
};

// Update the event listeners in setupRoom to use these functions:
.on(RoomEvent.ParticipantConnected, handleParticipantConnected)
.on(RoomEvent.ParticipantDisconnected, handleParticipantDisconnected)
.on(RoomEvent.Disconnected, handleDisconnect)
```

## Step 11: Add Track Cleanup Logic
**File: `src/components/ParticipantWindow.tsx`**

Add cleanup logic for when tracks are unsubscribed:\
You need to clean up resources when tracks are no longer available.

```typescript
// Add this to the useEffect in ParticipantWindow
participant.on(ParticipantEvent.TrackUnsubscribed, (track: RemoteTrack) => {
  console.log("track unsubscribed");
  track.detach();
});
```

## Step 12: Add Speaking Detection Logic
**File: `src/components/ParticipantWindow.tsx`**

Add logic to detect when participants are speaking:

```typescript
// Add this to the useEffect in ParticipantWindow
participant.on(ParticipantEvent.IsSpeakingChanged, (isSpeaking: boolean) => setIsSpeaking(isSpeaking));
```

## Step 13: Add Mute State Detection
**File: `src/components/ParticipantWindow.tsx`**

Add logic to detect mute state changes for remote participants:

```typescript
// Add these to the TrackSubscribed event handler for remote participants
if (track.kind === Track.Kind.Audio && localAudioRef.current) {
  track.on(TrackEvent.Muted, () => { setIsAudioMuted(true) });
  track.on(TrackEvent.Unmuted, () => { setIsAudioMuted(false) });
  track.attach(localAudioRef.current)
}

if (track.kind === Track.Kind.Video && localVideoRef.current) {
  track.on(TrackEvent.Muted, () => { setIsVideoMuted(true); });
  track.on(TrackEvent.Unmuted, () => { setIsVideoMuted(false); });
  track.attach(localVideoRef.current);
}
```

## Step 14: Add Error Handling
**File: `src/components/LivekitConnect.tsx`**

Add error handling for connection failures:

```typescript
// Update the setupRoom function with better error handling
const setupRoom = async () => {
  try {
    const tokenResponse: TokenResponse | undefined = await getToken(roomName, participantName);

    if (!tokenResponse) {
      console.error("Failed to get token");
      return;
    }

    room.prepareConnection(url, tokenResponse.token);

    // Event listeners setup...

    await room.connect(url, tokenResponse.token, { autoSubscribe: false });
  } catch (error) {
    console.log("Room connect error:", error);
    // Handle connection error (show user message, etc.)
  }
};
```

## Steps Summary

1. **Token Service** - Authentication foundation
2. **Basic Component Structure** - React component setup
3. **Connection Form State Handlers** - Input management
4. **Basic Room Connection** - WebSocket connection
5. **Room Event Listeners** - Handle participant events
6. **Participant Display Component Structure** - Component foundation
7. **Track Subscription Logic** - Receive media streams
8. **Track Attachment** - Connect media to UI elements
9. **Local Media Controls State** - Control state management
10. **Participant List Management** - Participant tracking
11. **Track Cleanup Logic** - Resource management
12. **Speaking Detection Logic** - Activity indicators
13. **Mute State Detection** - Status tracking
14. **Error Handling** - Production readiness
