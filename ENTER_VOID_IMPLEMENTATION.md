# Enter Void Feature - Implementation Guide

## Overview
The "Enter Void" feature is a session-based music discovery system that allows authenticated users to enter a guided listening experience. The system automatically plays tracks based on user preferences and provides options for three distinct modes: **Familiar**, **Mixed**, and **Explore**.

---

## Architecture

### Backend Components

#### Models
1. **VoidSession** (`/src/models/VoidSession.js`)
   - Tracks active and completed void sessions
   - Fields: mode, genre, duration, skip delay, started/expired timestamps
   - Maintains list of tracks played during session with skip/completion data

2. **UserListeningHistory** (`/src/models/UserListeningHistory.js`)
   - Tracks user's listening behavior for recommendation purposes
   - Stores: genre, artist, listening time, completion status, like status
   - Enables "familiar" and "mixed" mode recommendations based on history

#### Controllers
**void-session-controller.js** (`/src/controllers/void-session-controller.js`)
- `startSession(req, res)` - Initialize new session with user preferences
- `getNextTrack(req, res)` - Get next track based on mode logic
- `logTrackPlay(req, res)` - Record track plays and update listening history
- `endSession(req, res)` - Early exit from active session
- `getSession(req, res)` - Fetch session details and status

**Track Selection Logic:**
- **Familiar Mode**: Plays tracks in genres user has listened to most (60-70% of history)
- **Mixed Mode**: Combination of familiar (60%) + explore (40%)
- **Explore Mode**: Completely random from all available tracks
- Genre filter applied across all modes if specified

#### Routes
**voidSessionRoutes.js** (`/src/routers/voidSessionRoutes.js`)
```
POST   /api/void/start           - Start new session
GET    /api/void/:sessionId      - Get session details
GET    /api/void/:sessionId/next - Get next track recommendation
POST   /api/void/:sessionId/log  - Log track play event
POST   /api/void/:sessionId/end  - End session early
```

All routes require authentication (`protect` middleware)

---

### Frontend Components

#### Context
**EnterVoidContext** (`/src/context/EnterVoidContext.jsx`)
- Manages session state globally
- Handles session lifecycle (start, track loading, exit)
- API integration for all backend calls
- State: session, isActive, currentTrack, queue, timeRemaining, tracksPlayed, errors

#### Components

1. **EnterVoidModal** (`/components/EnterVoidModal.jsx`)
   - Modal for session configuration
   - User selects:
     - Mode (Familiar/Mixed/Explore)
     - Duration (5, 10, 30, 60, 120 minutes)
     - Genre filter (All Genres or specific)
     - Skip delay (0-120 seconds before can skip)
   - Styled with dark theme matching KeyVoid aesthetic
   - Handles session initialization

2. **VoidSessionPlayer** (`/components/VoidSessionPlayer.jsx`)
   - Full-screen immersive player during active session
   - Displays:
     - Current track info (title, artist, genre)
     - Session countdown timer
     - Tracks played counter
     - Mode badge
   - Features:
     - Auto-play next track on completion
     - Skip button (with configurable delay)
     - Exit void button for early termination
     - Loading state for track transitions
   - Responsive design with animations

#### Integration Points

1. **Home Page** (`/pages/Home.jsx`)
   - Added "Enter The Void" button in hero section
   - Redirects to login if not authenticated
   - Opens modal on authenticated users
   - Uses `useEnterVoid()` context hook

2. **Navbar** (`/components/Navbar.jsx`)
   - "Enter Void" link in navigation (authenticated users only)
   - Opens EnterVoidModal on click
   - Consistent styling with existing nav

3. **App.jsx**
   - Wrapped with `EnterVoidProvider` for global state
   - `VoidSessionPlayer` rendered at app root for full-screen overlay
   - Providers order: AuthProvider → PlayerProvider → EnterVoidProvider → BrowserRouter

---

## User Flow

### Starting a Session
1. User clicks "Enter The Void" button (Home or Navbar)
2. If not logged in → redirects to login
3. If logged in → EnterVoidModal opens
4. User selects preferences (mode, duration, genre, skip delay)
5. Click "Enter The Void" to start
6. Backend creates VoidSession and returns session ID
7. VoidSessionPlayer overlays and begins

### During Session
1. Frontend requests next track from `GET /api/void/:sessionId/next`
2. Backend selects track based on mode and genre filter
3. Track streams to player via `/api/audio/stream/:trackId`
4. User can:
   - Skip track (after delay) → logs as skipped, fetches next
   - Listen fully → auto-advances to next track
   - Exit void → ends session early
5. Each track play logged to UserListeningHistory for future recommendations

### Session End
- Session expires when duration countdown reaches zero
- User clicks "Exit Void" button
- Session marked as inactive
- Final stats stored (tracks played, skip count, etc.)
- Player overlay removed

---

## Key Features

### Smart Recommendations
- **Familiar**: Weighted by user's play history
- **Mixed**: Balanced between known and unknown
- **Explore**: Pure randomness with optional genre focus
- All modes exclude recently played tracks in same session

### Skip Management
- Configurable delay before skip is available (0-120 seconds)
- Prevents quick genre hopping while allowing user control
- Skip logs track as "skipped" for analytics

### Session Tracking
- Start/expiration timestamps
- Automatic session cleanup on expiry
- Track-level metadata: skip status, time listened
- User listening history updated in real-time

### Immersive UI
- Full-screen overlay during session
- Animated album placeholder with floating effect
- Countdown timer with MM:SS format
- Mode badge and session stats always visible
- Smooth transitions between tracks

---

## API Reference

### Request Examples

**Start Session:**
```json
POST /api/void/start
{
  "mode": "mixed",
  "genre": "Electronic",
  "durationMinutes": 30,
  "skipDelay": 30
}
```

**Get Next Track:**
```json
GET /api/void/{sessionId}/next
Response: {
  "track": {
    "id": "...",
    "title": "Track Name",
    "artist": "Artist",
    "genre": "Genre",
    "duration": 240,
    "url": "/api/audio/stream/{trackId}"
  }
}
```

**Log Track Play:**
```json
POST /api/void/{sessionId}/log
{
  "trackId": "...",
  "skipped": false,
  "timeListened": 240
}
```

---

## Configuration Options

### Duration
- Min: 5 minutes
- Max: 180 minutes
- Preset buttons: 5, 10, 30, 60, 120 (with range slider)

### Skip Delay
- Min: 0 seconds (skip immediately)
- Max: 120 seconds (full listen before skip)
- Default: 30 seconds
- Range slider for fine-tuning

### Genres
- "All Genres" (no filter)
- Pre-defined list: Electronic, Hip-Hop, Rock, Pop, Jazz, Classical, R&B, Indie, Ambient, Folk, Country, Metal, Soul
- Can be extended in Audio model

---

## Future Enhancements

1. **Advanced Analytics**
   - Track conversion rate (skip vs. complete)
   - Genre preference trends
   - Discovery success metrics

2. **Personalization**
   - ML-based recommendation refinement
   - Time-of-day based preferences
   - Mood-based mood selection

3. **Social Features**
   - Share session results
   - Collaborative void sessions
   - Recommendation feeds from discovered artists

4. **UI/UX Polish**
   - Three.js visualizations
   - After Effects-style animations
   - Haptic feedback integration
   - Voice control for skips

5. **Session Persistence**
   - Resume interrupted sessions
   - Session history and stats
   - Replay favorite sessions

---

## Database Schema

### VoidSession
- `user` (ObjectId) - Reference to User
- `mode` (String) - "familiar" | "mixed" | "explore"
- `genre` (String) - Optional genre filter
- `durationMinutes` (Number) - 5-180
- `skipDelay` (Number) - Seconds before skip available
- `startedAt` (Date) - Session start time
- `expiresAt` (Date) - Computed end time
- `playedTracks` (Array) - Track play logs
- `isActive` (Boolean) - Session status
- `exitedAt` (Date) - Manual exit time

### UserListeningHistory
- `user` (ObjectId) - Reference to User
- `track` (ObjectId) - Reference to Audio
- `genre` (String) - Track genre at play time
- `artist` (String) - Track artist at play time
- `listeningTime` (Number) - Milliseconds
- `completed` (Boolean) - Full completion
- `liked` (Boolean) - User liked
- `playCount` (Number) - Total plays
- `lastPlayedAt` (Date) - Most recent play

---

## Error Handling

- Invalid mode → 400 Bad Request
- Duration out of range → 400 Bad Request
- Session not found/expired → 404 Not Found
- Unauthorized session access → 403 Forbidden
- Track retrieval failure → 200 with track: null
- API errors logged in context and displayed to user

---

## Testing Checklist

- [ ] User can start session with valid preferences
- [ ] Session countdown timer decrements correctly
- [ ] Tracks auto-advance on completion
- [ ] Skip delay countdown prevents premature skipping
- [ ] Track plays logged to listening history
- [ ] Familiar mode recommends previously heard genres
- [ ] Mixed mode balances familiar/explore
- [ ] Explore mode provides random selections
- [ ] Genre filter applied across all modes
- [ ] Session expires on duration completion
- [ ] Early exit works and saves session data
- [ ] Unauthenticated users redirected to login
- [ ] Modal responsive on mobile/tablet
- [ ] Player overlay displays on all pages
- [ ] API returns proper error messages

---

## Troubleshooting

**Session won't start**
- Verify user is authenticated
- Check backend server logs for errors
- Ensure duration is within 5-180 range

**Tracks not loading**
- Verify audio files exist in library
- Check genre filter is correctly applied
- Ensure UserListeningHistory has sufficient data for familiar mode

**Skip button disabled**
- Wait for skip delay countdown
- Check session is still active
- Verify track is loaded

**Session overlay not appearing**
- Ensure EnterVoidProvider wraps app tree
- Check VoidSessionPlayer is rendered in App.jsx
- Verify z-index CSS doesn't conflict

---

## File Structure Summary

```
Backend:
  src/models/
    └── VoidSession.js
    └── UserListeningHistory.js
  src/controllers/
    └── void-session-controller.js
  src/routers/
    └── voidSessionRoutes.js
  server.js (updated)

Frontend:
  src/context/
    └── EnterVoidContext.jsx
  components/
    └── EnterVoidModal.jsx
    └── EnterVoidModal.css
    └── VoidSessionPlayer.jsx
    └── VoidSessionPlayer.css
    └── Navbar.jsx (updated)
  pages/
    └── Home.jsx (updated)
  src/
    └── App.jsx (updated)
```

---

**Implementation Date:** May 2026
**Status:** Complete and ready for testing
**Next Steps:** Deploy to staging, run comprehensive tests, gather user feedback
