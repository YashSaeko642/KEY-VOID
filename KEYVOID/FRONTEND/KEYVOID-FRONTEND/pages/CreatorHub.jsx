import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Music, Save, Trash2, Video, Upload, Play } from "lucide-react";
import API, {
  getApiErrorMessage,
  getMyAudioUploads,
  uploadCreatorSongs
} from "../services/api";
import { useAuth } from "../src/context/useAuth";
import { usePlayer } from "../src/context/PlayerContext";

const MUSIC_CATEGORIES = [
  "Metal",
  "Blues",
  "Electronic",
  "Rock",
  "Pop",
  "Hip-Hop",
  "Jazz",
  "Classical",
  "Folk",
  "Country",
  "R&B",
  "Punk",
  "Ambient",
  "Indie"
];

function trackTagsToText(track) {
  return (track?.audienceTags || []).map((tag) => tag.tag).join(", ");
}

export default function CreatorHub() {
  const { isAdmin, user } = useAuth();
  const { refreshLibrary, updateUploadedTrack, deleteUploadedTrack } = usePlayer();
  const [status, setStatus] = useState("checking");
  const [message, setMessage] = useState("");
  const [songFiles, setSongFiles] = useState([]);
  const [songTitle, setSongTitle] = useState("");
  const [songArtist, setSongArtist] = useState(user?.username || "");
  const [songCategory, setSongCategory] = useState(MUSIC_CATEGORIES[0]);
  const [songTags, setSongTags] = useState("");
  const [releaseType, setReleaseType] = useState("track");
  const [isUploadingSongs, setIsUploadingSongs] = useState(false);
  const [songNotice, setSongNotice] = useState({ type: "", message: "" });
  const [myUploads, setMyUploads] = useState([]);
  const [uploadEdits, setUploadEdits] = useState({});

  // Reel creation state
  const [reelText, setReelText] = useState("");
  const [reelMedia, setReelMedia] = useState(null);
  const [mediaPreviewUrl, setMediaPreviewUrl] = useState("");
  const [isCreatingReel, setIsCreatingReel] = useState(false);
  const [reelError, setReelError] = useState("");
  const [reelNotice, setReelNotice] = useState({ type: "", message: "" });

  const loadMyUploads = async () => {
    try {
      const { data } = await getMyAudioUploads();
      const tracks = data.tracks || [];
      setMyUploads(tracks);
      setUploadEdits(Object.fromEntries(tracks.map((track) => [
        track.id,
        {
          title: track.title || "",
          artist: track.artist || "",
          genre: track.genre || MUSIC_CATEGORIES[0],
          tags: trackTagsToText(track),
          releaseType: track.releaseType || "track",
          isPublic: track.isPublic !== false
        }
      ])));
    } catch (err) {
      setSongNotice({ type: "error", message: getApiErrorMessage(err, "Unable to load your song uploads.") });
    }
  };

  const handleSongFileChange = (event) => {
    const files = Array.from(event.target.files || []);
    const invalidFile = files.find((file) => !file.type.startsWith("audio/") || file.size > 30 * 1024 * 1024);

    if (invalidFile) {
      setSongNotice({ type: "error", message: "Each song must be an audio file under 30MB." });
      event.target.value = "";
      return;
    }

    setSongFiles(files);
    setSongNotice({ type: "", message: "" });
  };

  const handleUploadSongs = async (event) => {
    event.preventDefault();

    if (songFiles.length === 0 || isUploadingSongs) {
      setSongNotice({ type: "error", message: "Choose at least one audio file to upload." });
      return;
    }

    try {
      setIsUploadingSongs(true);
      const formData = new FormData();
      songFiles.forEach((file) => formData.append("songs", file));
      formData.append("title", songTitle);
      formData.append("artist", songArtist || user?.username || "Original Artist");
      formData.append("genre", songCategory);
      formData.append("tags", songTags);
      formData.append("releaseType", releaseType);

      const { data } = await uploadCreatorSongs(formData);
      const uploadedCount = data.tracks?.length || songFiles.length;
      setSongFiles([]);
      setSongTitle("");
      setSongTags("");
      setSongNotice({ type: "success", message: `${uploadedCount} song${uploadedCount === 1 ? "" : "s"} uploaded to the music library.` });
      await loadMyUploads();
      refreshLibrary();
    } catch (err) {
      setSongNotice({ type: "error", message: getApiErrorMessage(err, "Unable to upload songs.") });
    } finally {
      setIsUploadingSongs(false);
    }
  };

  const updateUploadEdit = (trackId, key, value) => {
    setUploadEdits((prev) => ({
      ...prev,
      [trackId]: {
        ...prev[trackId],
        [key]: value
      }
    }));
  };

  const handleSaveUpload = async (trackId) => {
    try {
      const payload = uploadEdits[trackId];
      const updatedTrack = await updateUploadedTrack(trackId, payload);
      if (!updatedTrack) {
        throw new Error("Unable to update song");
      }
      setSongNotice({ type: "success", message: "Song details updated." });
      await loadMyUploads();
    } catch (err) {
      setSongNotice({ type: "error", message: getApiErrorMessage(err, "Unable to update song.") });
    }
  };

  const handleDeleteUpload = async (trackId) => {
    try {
      const deleted = await deleteUploadedTrack(trackId);
      if (!deleted) {
        throw new Error("Unable to delete song");
      }
      setSongNotice({ type: "success", message: "Song deleted from the music library." });
      await loadMyUploads();
    } catch (err) {
      setSongNotice({ type: "error", message: getApiErrorMessage(err, "Unable to delete song.") });
    }
  };

  const clearReelMedia = () => {
    if (mediaPreviewUrl) {
      URL.revokeObjectURL(mediaPreviewUrl);
    }
    setReelMedia(null);
    setMediaPreviewUrl("");
  };

  const handleReelMediaChange = (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) return;

    const isAllowedMedia = file.type.startsWith("video/") || file.type.startsWith("image/");
    if (!isAllowedMedia) {
      setReelError("Please choose a video or image file for your reel.");
      return;
    }

    // Larger file limits for reels
    const maxSize = file.type.startsWith("video/") ? 100 * 1024 * 1024 : 50 * 1024 * 1024; // 100MB video, 50MB image
    if (file.size > maxSize) {
      const maxSizeMB = maxSize / (1024 * 1024);
      setReelError(`File size exceeds limit. Maximum: ${maxSizeMB}MB for ${file.type.startsWith("video/") ? "videos" : "images"}.`);
      return;
    }

    clearReelMedia();
    setReelMedia(file);
    setMediaPreviewUrl(URL.createObjectURL(file));
    setReelError("");
  };

  const handleCreateReel = async () => {
    if (!reelMedia || isCreatingReel) return;

    try {
      setIsCreatingReel(true);
      setReelError("");

      const formData = new FormData();
      if (reelText.trim()) {
        formData.append("text", reelText);
      }
      formData.append("media", reelMedia);

      formData.append("contentType", "reel");
      const response = await API.post("/posts/reel", formData);

      if (response.status === 201) {
        setReelText("");
        clearReelMedia();
        setReelNotice({ type: "success", message: "Reel created successfully! Check it out in the Reels feed." });
      }
    } catch (err) {
      console.error("Failed to create reel:", err);
      const serverMessage = err.response?.data?.message || err.response?.data?.msg || err.message;
      const isLargeUpload = err.response?.status === 413 || /payload too large|uploaded file is too large/i.test(serverMessage);

      if (isLargeUpload) {
        setReelError("Reel upload failed because the file is too large. Please use a video under 100MB or an image under 50MB.");
      } else {
        setReelError(getApiErrorMessage(err, "Failed to create reel."));
      }
    } finally {
      setIsCreatingReel(false);
    }
  };

  useEffect(() => {
    let ignore = false;

    async function checkCreatorAccess() {
      try {
        const { data } = await API.get("/auth/creator-access");

        if (!ignore) {
          setStatus("success");
          setMessage(data.msg);
        }
      } catch (error) {
        if (!ignore) {
          setStatus("error");
          setMessage(error.response?.data?.msg || "Unable to confirm creator access");
        }
      }
    }

    checkCreatorAccess();
    loadMyUploads();

    return () => {
      ignore = true;
    };
  }, []);

  useEffect(() => {
    if (!reelNotice.message) return;
    const timer = window.setTimeout(() => {
      setReelNotice({ type: "", message: "" });
    }, 5000);

    return () => window.clearTimeout(timer);
  }, [reelNotice]);

  return (
    <section className="dashboard-page">
      <div className="dashboard-panel">
        <p className="dashboard-kicker text-xs uppercase tracking-[0.18em] text-blue-300/90">
          Creator access
        </p>
        <h1 className="font-['Michroma'] text-[clamp(2rem,4vw,3.4rem)] leading-tight text-slate-50">
          Creator Hub for {user?.username || "your account"}
        </h1>
        <p className="text-slate-300/80">
          This page is protected by both the frontend role guard and a backend creator-only
          authorization check. Admin accounts are also allowed through this gate.
        </p>

        <div className="dashboard-grid">
          <div className="dashboard-card">
            <span className="dashboard-label">Role</span>
            <strong>{isAdmin ? "admin" : user?.role || "user"}</strong>
          </div>
          <div className="dashboard-card">
            <span className="dashboard-label">Access check</span>
            <strong>{status === "checking" ? "Checking..." : status}</strong>
          </div>
          <div className="dashboard-card">
            <span className="dashboard-label">Backend message</span>
            <strong>{message || "Waiting for server response"}</strong>
          </div>
          <div className="dashboard-card">
            <span className="dashboard-label">Quick Actions</span>
            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
              <Link to="/reels" style={{ color: "#6366f1", textDecoration: "none", fontWeight: "500" }}>
                View Reels
              </Link>
              <Link to="/feed" style={{ color: "#6366f1", textDecoration: "none", fontWeight: "500" }}>
                View Feed
              </Link>
            </div>
          </div>
        </div>

        <div className="dashboard-card" style={{ marginTop: "2rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "16px" }}>
            <Music size={24} color="#6366f1" />
            <h2 style={{ margin: 0, fontSize: "1.25rem", fontWeight: "600" }}>Upload Original Songs</h2>
          </div>

          {songNotice.message && (
            <div style={{
              background: songNotice.type === "success" ? "rgba(16, 185, 129, 0.12)" : "rgba(248, 113, 113, 0.12)",
              border: `1px solid ${songNotice.type === "success" ? "rgba(16, 185, 129, 0.3)" : "rgba(248, 113, 113, 0.3)"}`,
              color: songNotice.type === "success" ? "#10b981" : "#ef4444",
              borderRadius: "10px",
              padding: "14px 16px",
              marginBottom: "16px",
              fontSize: "14px"
            }}>
              {songNotice.message}
            </div>
          )}

          <form onSubmit={handleUploadSongs} style={{ display: "grid", gap: "12px" }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "12px" }}>
              <input
                value={songTitle}
                onChange={(event) => setSongTitle(event.target.value)}
                placeholder="Track, album, or EP name"
                maxLength={100}
                style={{ padding: "12px", borderRadius: "8px", border: "1px solid #374151", background: "#1f2937", color: "white" }}
              />
              <input
                value={songArtist}
                onChange={(event) => setSongArtist(event.target.value)}
                placeholder="Artist name"
                maxLength={80}
                style={{ padding: "12px", borderRadius: "8px", border: "1px solid #374151", background: "#1f2937", color: "white" }}
              />
              <select
                value={releaseType}
                onChange={(event) => setReleaseType(event.target.value)}
                style={{ padding: "12px", borderRadius: "8px", border: "1px solid #374151", background: "#1f2937", color: "white" }}
              >
                <option value="track">Track</option>
                <option value="single">Single</option>
                <option value="ep">EP</option>
                <option value="album">Album</option>
              </select>
              <select
                value={songCategory}
                onChange={(event) => setSongCategory(event.target.value)}
                style={{ padding: "12px", borderRadius: "8px", border: "1px solid #374151", background: "#1f2937", color: "white" }}
              >
                {MUSIC_CATEGORIES.map((category) => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
            </div>
            <input
              value={songTags}
              onChange={(event) => setSongTags(event.target.value)}
              placeholder="Tags, comma separated"
              maxLength={180}
              style={{ padding: "12px", borderRadius: "8px", border: "1px solid #374151", background: "#1f2937", color: "white" }}
            />
            <label style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              width: "fit-content",
              padding: "12px 16px",
              background: "#374151",
              borderRadius: "8px",
              cursor: "pointer",
              fontSize: "14px",
              color: "#e5e7eb"
            }}>
              <Upload size={16} />
              {songFiles.length ? `${songFiles.length} audio file${songFiles.length === 1 ? "" : "s"} selected` : "Choose audio files"}
              <input type="file" accept="audio/*" multiple onChange={handleSongFileChange} style={{ display: "none" }} />
            </label>
            <button
              type="submit"
              disabled={isUploadingSongs}
              style={{
                width: "fit-content",
                background: isUploadingSongs ? "#374151" : "#6366f1",
                color: "white",
                border: "none",
                padding: "12px 24px",
                borderRadius: "8px",
                fontWeight: "600",
                cursor: isUploadingSongs ? "not-allowed" : "pointer"
              }}
            >
              {isUploadingSongs ? "Uploading..." : "Upload to Library"}
            </button>
          </form>

          <div style={{ display: "grid", gap: "12px", marginTop: "24px" }}>
            <h3 style={{ margin: 0, fontSize: "1rem", color: "#e5e7eb" }}>Your uploads</h3>
            {myUploads.length > 0 ? myUploads.map((track) => {
              const edit = uploadEdits[track.id] || {};
              return (
                <div key={track.id} style={{ display: "grid", gap: "10px", padding: "12px", borderRadius: "8px", border: "1px solid #374151", background: "rgba(31, 41, 55, 0.62)" }}>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "8px" }}>
                    <input value={edit.title || ""} onChange={(event) => updateUploadEdit(track.id, "title", event.target.value)} style={{ padding: "10px", borderRadius: "8px", border: "1px solid #374151", background: "#111827", color: "white" }} />
                    <input value={edit.artist || ""} onChange={(event) => updateUploadEdit(track.id, "artist", event.target.value)} style={{ padding: "10px", borderRadius: "8px", border: "1px solid #374151", background: "#111827", color: "white" }} />
                    <select value={edit.genre || MUSIC_CATEGORIES[0]} onChange={(event) => updateUploadEdit(track.id, "genre", event.target.value)} style={{ padding: "10px", borderRadius: "8px", border: "1px solid #374151", background: "#111827", color: "white" }}>
                      {MUSIC_CATEGORIES.map((category) => (
                        <option key={category} value={category}>{category}</option>
                      ))}
                    </select>
                    <select value={edit.releaseType || "track"} onChange={(event) => updateUploadEdit(track.id, "releaseType", event.target.value)} style={{ padding: "10px", borderRadius: "8px", border: "1px solid #374151", background: "#111827", color: "white" }}>
                      <option value="track">Track</option>
                      <option value="single">Single</option>
                      <option value="ep">EP</option>
                      <option value="album">Album</option>
                    </select>
                  </div>
                  <input value={edit.tags || ""} onChange={(event) => updateUploadEdit(track.id, "tags", event.target.value)} placeholder="Tags" style={{ padding: "10px", borderRadius: "8px", border: "1px solid #374151", background: "#111827", color: "white" }} />
                  <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                    <button type="button" onClick={() => handleSaveUpload(track.id)} style={{ display: "inline-flex", alignItems: "center", gap: "6px", border: "0", borderRadius: "8px", padding: "9px 12px", background: "#6366f1", color: "white", cursor: "pointer" }}>
                      <Save size={15} /> Save
                    </button>
                    <button type="button" onClick={() => handleDeleteUpload(track.id)} style={{ display: "inline-flex", alignItems: "center", gap: "6px", border: "0", borderRadius: "8px", padding: "9px 12px", background: "#7f1d1d", color: "white", cursor: "pointer" }}>
                      <Trash2 size={15} /> Delete
                    </button>
                  </div>
                </div>
              );
            }) : (
              <p style={{ color: "#9ca3af", margin: 0 }}>No original songs uploaded yet.</p>
            )}
          </div>
        </div>

        {/* Reel Creation Section */}
        <div className="dashboard-card" style={{ marginTop: "2rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "16px" }}>
            <Video size={24} color="#6366f1" />
            <h2 style={{ margin: 0, fontSize: "1.25rem", fontWeight: "600" }}>Create a Reel</h2>
          </div>

          {reelNotice.message && (
            <div style={{
              background: reelNotice.type === "success" ? "rgba(16, 185, 129, 0.12)" : "rgba(248, 113, 113, 0.12)",
              border: `1px solid ${reelNotice.type === "success" ? "rgba(16, 185, 129, 0.3)" : "rgba(248, 113, 113, 0.3)"}`,
              color: reelNotice.type === "success" ? "#10b981" : "#ef4444",
              borderRadius: "10px",
              padding: "14px 16px",
              marginBottom: "16px",
              fontSize: "14px"
            }}>
              {reelNotice.message}
            </div>
          )}

          {reelError && (
            <div style={{
              background: "#fee2e2",
              color: "#dc2626",
              padding: "12px",
              borderRadius: "8px",
              marginBottom: "16px",
              fontSize: "14px"
            }}>
              {reelError}
            </div>
          )}

          <div style={{ marginBottom: "16px" }}>
            <textarea
              placeholder="Add a caption to your reel (optional)..."
              value={reelText}
              onChange={(e) => setReelText(e.target.value)}
              maxLength={500}
              style={{
                width: "100%",
                minHeight: "80px",
                padding: "12px",
                border: "1px solid #374151",
                borderRadius: "8px",
                background: "#1f2937",
                color: "white",
                fontSize: "14px",
                resize: "vertical"
              }}
            />
            <div style={{ textAlign: "right", fontSize: "12px", color: "#9ca3af", marginTop: "4px" }}>
              {reelText.length}/500
            </div>
          </div>

          <div style={{ marginBottom: "16px" }}>
            <label style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              padding: "12px 16px",
              background: "#374151",
              borderRadius: "8px",
              cursor: "pointer",
              fontSize: "14px",
              color: "#e5e7eb"
            }}>
              <Upload size={16} />
              Choose Media (Video/Image)
              <input
                type="file"
                accept="video/*,image/*"
                onChange={handleReelMediaChange}
                style={{ display: "none" }}
              />
            </label>
            <p style={{ fontSize: "12px", color: "#9ca3af", marginTop: "8px" }}>
              Max: 100MB for videos, 50MB for images
            </p>
          </div>

          {mediaPreviewUrl && (
            <div style={{ marginBottom: "16px" }}>
              <div style={{
                position: "relative",
                maxWidth: "300px",
                borderRadius: "8px",
                overflow: "hidden"
              }}>
                {reelMedia?.type.startsWith("video/") ? (
                  <video
                    src={mediaPreviewUrl}
                    controls
                    style={{ width: "100%", maxHeight: "400px", objectFit: "cover" }}
                  />
                ) : (
                  <img
                    src={mediaPreviewUrl}
                    alt="Reel preview"
                    style={{ width: "100%", maxHeight: "400px", objectFit: "cover" }}
                  />
                )}
                <button
                  onClick={clearReelMedia}
                  style={{
                    position: "absolute",
                    top: "8px",
                    right: "8px",
                    background: "rgba(0,0,0,0.6)",
                    color: "white",
                    border: "none",
                    borderRadius: "50%",
                    width: "32px",
                    height: "32px",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center"
                  }}
                >
                  ×
                </button>
              </div>
            </div>
          )}

          <button
            onClick={handleCreateReel}
            disabled={!reelMedia || isCreatingReel}
            style={{
              background: reelMedia && !isCreatingReel ? "#6366f1" : "#374151",
              color: "white",
              border: "none",
              padding: "12px 24px",
              borderRadius: "8px",
              fontWeight: "600",
              cursor: reelMedia && !isCreatingReel ? "pointer" : "not-allowed",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              fontSize: "14px"
            }}
          >
            {isCreatingReel ? (
              <>
                <div style={{
                  width: "16px",
                  height: "16px",
                  border: "2px solid #ffffff",
                  borderTop: "2px solid transparent",
                  borderRadius: "50%",
                  animation: "spin 1s linear infinite"
                }}></div>
                Creating Reel...
              </>
            ) : (
              <>
                <Play size={16} />
                Create Reel
              </>
            )}
          </button>
        </div>
      </div>
    </section>
  );
}
