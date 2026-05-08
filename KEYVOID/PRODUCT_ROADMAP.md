# KeyVoid Product Roadmap

KeyVoid already has authentication, profiles, follow relationships, posts, comments, likes, reels, creator uploads, playlists, and a music player. To become a stronger social media, song discovery, and listening platform, the next feature layers should be:

## Social Layer

- Rich feed ranking: blend following posts, popular creator posts, fresh discussions, and music activity.
- Communities or rooms: subreddit-style spaces for genres, moods, scenes, cities, and creator collectives.
- Threaded comments, comment sorting, saved posts, reposts, bookmarks, and shares.
- Notifications for follows, replies, likes, playlist adds, and creator uploads.
- Profile activity tabs for posts, reels, tracks, playlists, comments, and liked public content.
- Moderation tools: report content, block users, mute communities, admin review queue.

## Music Discovery

- Listener preference onboarding for genres, moods, familiar artists, and exploration goals.
- Recommended tracks generated from preferred genres, liked tracks, tags, follows, and recent plays.
- Discovery queues such as New From Creators, Rising This Week, Mood Drift, and Outside Your Loop.
- Track detail pages with comments, tags, related tracks, uploader profile, and add-to-playlist actions.
- Listening history, recently played, saved albums, favorite creators, and collaborative playlists.

## Creator Platform

- Creator analytics: plays, likes, saves, skips, profile visits, follower conversion.
- Release pages for singles, EPs, and albums with cover art and track grouping.
- Draft uploads, scheduled releases, private/unlisted tracks, and edit history.
- Creator verification badges and profile customization.

## Reels And Media

- Infinite vertical snap scrolling with prefetching and old item unloading.
- Comment drawer, share sheet, creator follow CTA, and audio attribution.
- Upload flow for short clips with captions, tags, and linked songs.

## Deployment And Operations

- Separate frontend and backend env examples.
- Render backend service with MongoDB, JWT, Cloudinary, Google auth, SMTP, and CORS settings.
- Vercel frontend build with SPA routing and `VITE_API_URL` pointing to Render.
- Production cookie, CORS, rate limit, and secret rotation checklist.
