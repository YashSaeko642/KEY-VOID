# MongoDB Music Library Setup

Your KeyVoid app now uses **MongoDB + GridFS** to store and serve your personal music library instead of Pixabay.

## What was changed

✅ Created `Audio.js` model to store track metadata  
✅ Created `gridfsUtils.js` for GridFS file operations  
✅ Created `upload-music.js` script to import music from your Downloads/music folder  
✅ Updated audio controller to serve from MongoDB  
✅ Updated audio routes with `/stream` and `/metadata` endpoints  

## How to use

### Step 1: Make sure your music folder exists
Your music files should be in:
```
C:\Users\Saeko\Downloads\music
```

The script found these 9 files:
- alec_koff-blues-ballad-487408.mp3
- alec_koff-fps-metal-doom-493400.mp3
- alec_koff-in-heavy-metal-492175.mp3
- mrclaps-this-heavy-metal-492569.mp3
- nickpanekaiassets-heavy-doom-metal-instrumental-288971.mp3
- nickpanekaiassets-intense-black-metal-instrumental-304729.mp3
- soulfuljamtracks-american-blues-314911.mp3
- the_mountain-blues-138614.mp3
- u_as2rhjglks-rainy-day-blues-253596.mp3

### Step 2: Run the upload script
Open terminal in the BACKEND folder and run:
```bash
npm run upload-music
```

This will:
- Read all .mp3, .wav, .flac, .m4a, .aac files from your Downloads/music folder
- Parse metadata from filenames (artist, title, genre)
- Upload files to MongoDB GridFS
- Create Audio records with metadata

Expected output:
```
✅ Connected to MongoDB
✅ GridFS initialized

📁 Found 9 audio files. Starting upload...

⬆️  Uploading: alec_koff-blues-ballad-487408.mp3
✅ Uploaded: Blues Ballad by Alec Koff (Blues)

... (more uploads)

✅ Music upload complete!
📊 Total library tracks: 9
```

### Step 3: Start the server
```bash
npm run dev
```

Your frontend will automatically fetch tracks from `/api/audio/library` and stream them from `/api/audio/stream/:trackId`.

## How it works

1. **Upload**: `npm run upload-music` reads files from Downloads/music
2. **Storage**: Files stored in MongoDB GridFS (database native, no Cloudinary needed)
3. **Metadata**: Track info stored in Audio model (title, artist, genre, etc)
4. **Streaming**: Frontend fetches library → plays via `/api/audio/stream/:trackId`

## File format parsing

The upload script automatically parses filenames to extract:
- **Artist**: First word(s) before hyphen (underscores become spaces)
- **Title**: Middle section (numbers stripped)
- **Genre**: Detected from keywords (metal, blues, doom, instrumental, etc)

Example: `alec_koff-blues-ballad-487408.mp3` → 
```json
{
  "artist": "Alec Koff",
  "title": "Blues Ballad",
  "genre": "Blues"
}
```

## To add more music later

1. Drop files into `C:\Users\Saeko\Downloads\music`
2. Run `npm run upload-music` again (won't re-upload duplicates)
3. New tracks appear automatically in the app

## Troubleshooting

**Error: "Music folder not found"**
- Make sure folder exists: `C:\Users\Saeko\Downloads\music`

**Error: "GridFS not initialized"**
- Make sure MongoDB is running
- Check `MONGO_URI` in `.env`

**Error: "Unable to fetch music library"**
- Check backend is running on correct port
- Check CORS settings in `server.js`

---

Ready? Run: `npm run upload-music`
