import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Video, Upload, Play } from "lucide-react";
import API, { getApiErrorMessage } from "../services/api";
import { useAuth } from "../src/context/useAuth";

export default function CreatorHub() {
  const { isAdmin, user } = useAuth();
  const [status, setStatus] = useState("checking");
  const [message, setMessage] = useState("");

  // Reel creation state
  const [reelText, setReelText] = useState("");
  const [reelMedia, setReelMedia] = useState(null);
  const [mediaPreviewUrl, setMediaPreviewUrl] = useState("");
  const [isCreatingReel, setIsCreatingReel] = useState(false);
  const [reelError, setReelError] = useState("");
  const [reelNotice, setReelNotice] = useState({ type: "", message: "" });

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
