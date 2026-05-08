import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import API, { getApiErrorMessage, getMyAudioUploads, getUserPosts } from "../services/api";
import { useAuth } from "../src/context/useAuth";
import { usePlayer } from "../src/context/PlayerContext";
import PostCard from "../components/PostCard";

const EMPTY_FORM = {
  username: "",
  bio: "",
  location: "",
  website: "",
  favoriteGenres: ""
};
const IMAGE_LIMIT_BYTES = 2 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp", "image/gif"];

function profileToForm(profile = {}) {
  return {
    username: profile.username || "",
    bio: profile.bio || "",
    location: profile.location || "",
    website: profile.website || "",
    favoriteGenres: Array.isArray(profile.favoriteGenres) ? profile.favoriteGenres.join(", ") : ""
  };
}

export default function Profile() {
  const { deleteAccount, updateUser, user } = useAuth();
  const navigate = useNavigate();
  const { deleteUploadedTrack } = usePlayer();
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [imageState, setImageState] = useState({
    avatarFile: null,
    avatarPreview: "",
    bannerFile: null,
    bannerPreview: "",
    removeAvatar: false,
    removeBanner: false
  });
  const [status, setStatus] = useState("loading");
  const [message, setMessage] = useState("");
  const [activeTab, setActiveTab] = useState("uploads");
  const [audioTracks, setAudioTracks] = useState([]);
  const [audioPagination, setAudioPagination] = useState({ page: 1, limit: 10, total: 0, pages: 0, hasNext: false, hasPrev: false });
  const [posts, setPosts] = useState([]);
  const [postsPagination, setPostsPagination] = useState({ page: 1, limit: 6, total: 0, pages: 0, hasNext: false, hasPrev: false });
  const [reels, setReels] = useState([]);
  const [reelsPagination, setReelsPagination] = useState({ page: 1, limit: 6, total: 0, pages: 0, hasNext: false, hasPrev: false });
  const [contentLoading, setContentLoading] = useState(false);
  const [contentError, setContentError] = useState("");
  const [deleteAccountConfirm, setDeleteAccountConfirm] = useState("");
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);

  useEffect(() => {
    let ignore = false;

    async function loadProfile() {
      try {
        const { data } = await API.get("/profiles/me");

        if (!ignore) {
          setFormData(profileToForm(data.profile));
          setImageState({
            avatarFile: null,
            avatarPreview: data.profile.avatarUrl || "",
            bannerFile: null,
            bannerPreview: data.profile.bannerUrl || "",
            removeAvatar: false,
            removeBanner: false
          });
          updateUser(data.profile);
          setStatus("ready");
        }
      } catch (error) {
        if (!ignore) {
          setMessage(error.response?.data?.msg || "Unable to load your profile");
          setStatus("error");
        }
      }
    }

    loadProfile();

    return () => {
      ignore = true;
    };
  }, []);

  function handleChange(event) {
    const { name, value } = event.target;
    setFormData((current) => ({ ...current, [name]: value }));
  }

  function handleImageChange(event) {
    const { files, name } = event.target;
    const file = files?.[0];

    if (!file) {
      return;
    }

    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      setMessage("Images must be PNG, JPG, WEBP, or GIF");
      event.target.value = "";
      return;
    }

    if (file.size > IMAGE_LIMIT_BYTES) {
      setMessage("Images must be smaller than 2 MB");
      event.target.value = "";
      return;
    }

    const previewUrl = URL.createObjectURL(file);
    const isAvatar = name === "avatar";

    setImageState((current) => {
      const previousPreview = isAvatar ? current.avatarPreview : current.bannerPreview;
      if (previousPreview.startsWith("blob:")) {
        URL.revokeObjectURL(previousPreview);
      }

      return {
        ...current,
        [isAvatar ? "avatarFile" : "bannerFile"]: file,
        [isAvatar ? "avatarPreview" : "bannerPreview"]: previewUrl,
        [isAvatar ? "removeAvatar" : "removeBanner"]: false
      };
    });
    setMessage("");
  }

  function clearImage(name) {
    const isAvatar = name === "avatar";
    setImageState((current) => {
      const previousPreview = isAvatar ? current.avatarPreview : current.bannerPreview;
      if (previousPreview.startsWith("blob:")) {
        URL.revokeObjectURL(previousPreview);
      }

      return {
        ...current,
        [isAvatar ? "avatarFile" : "bannerFile"]: null,
        [isAvatar ? "avatarPreview" : "bannerPreview"]: "",
        [isAvatar ? "removeAvatar" : "removeBanner"]: true
      };
    });
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setStatus("saving");
    setMessage("");

    try {
      const profileForm = new FormData();
      profileForm.append("username", formData.username);
      profileForm.append("bio", formData.bio);
      profileForm.append("location", formData.location);
      profileForm.append("website", formData.website);
      profileForm.append("favoriteGenres", formData.favoriteGenres);
      profileForm.append("removeAvatar", String(imageState.removeAvatar));
      profileForm.append("removeBanner", String(imageState.removeBanner));

      if (imageState.avatarFile) {
        profileForm.append("avatar", imageState.avatarFile);
      }

      if (imageState.bannerFile) {
        profileForm.append("banner", imageState.bannerFile);
      }

      const { data } = await API.patch("/profiles/me", profileForm);

      updateUser(data.profile);
      setFormData(profileToForm(data.profile));
      setImageState((current) => {
        if (current.avatarPreview.startsWith("blob:")) {
          URL.revokeObjectURL(current.avatarPreview);
        }
        if (current.bannerPreview.startsWith("blob:")) {
          URL.revokeObjectURL(current.bannerPreview);
        }

        return {
          avatarFile: null,
          avatarPreview: data.profile.avatarUrl || "",
          bannerFile: null,
          bannerPreview: data.profile.bannerUrl || "",
          removeAvatar: false,
          removeBanner: false
        };
      });
      setMessage("Profile updated");
      setStatus("ready");
    } catch (error) {
      setMessage(error.response?.data?.msg || "Unable to update profile");
      setStatus("ready");
    }
  }

  const loadUserAudioUploads = useCallback(async (page = 1, append = false) => {
    if (!user?.id) return;
    setContentError("");
    setContentLoading(true);

    try {
      const { data } = await getMyAudioUploads(page, 10);
      const nextTracks = data.tracks || [];
      setAudioTracks((prev) => (append ? [...prev, ...nextTracks] : nextTracks));
      setAudioPagination(data.pagination || {
        page,
        limit: 10,
        total: nextTracks.length,
        pages: 1,
        hasNext: false,
        hasPrev: page > 1
      });
    } catch (error) {
      setContentError(getApiErrorMessage(error, "Unable to load your audio uploads."));
    } finally {
      setContentLoading(false);
    }
  }, [user?.id]);

  const loadUserPosts = useCallback(async (page = 1) => {
    if (!user?.id) return;
    setContentError("");
    setContentLoading(true);

    try {
      const { data } = await getUserPosts(user.id, page, 6, "post");
      setPosts(data.posts || []);
      setPostsPagination(data.pagination || {
        page: 1,
        limit: 6,
        total: data.posts?.length || 0,
        pages: 1,
        hasNext: false,
        hasPrev: false
      });
    } catch (error) {
      setContentError(getApiErrorMessage(error, "Unable to load your posts."));
    } finally {
      setContentLoading(false);
    }
  }, [user?.id]);

  const loadUserReels = useCallback(async (page = 1) => {
    if (!user?.id) return;
    setContentError("");
    setContentLoading(true);

    try {
      const { data } = await getUserPosts(user.id, page, 6, "reel");
      setReels(data.posts || []);
      setReelsPagination(data.pagination || {
        page: 1,
        limit: 6,
        total: data.posts?.length || 0,
        pages: 1,
        hasNext: false,
        hasPrev: false
      });
    } catch (error) {
      setContentError(getApiErrorMessage(error, "Unable to load your reels."));
    } finally {
      setContentLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    if (status !== "ready") return;
    loadUserAudioUploads();
    loadUserPosts();
    loadUserReels();
  }, [status, loadUserAudioUploads, loadUserPosts, loadUserReels]);

  const handleDeletePost = (postId) => {
    setPosts((prev) => prev.filter((post) => post._id !== postId));
    setReels((prev) => prev.filter((post) => post._id !== postId));
  };

  const handleLoadMoreAudio = async () => {
    if (!audioPagination.hasNext) return;
    await loadUserAudioUploads(audioPagination.page + 1, true);
  };

  const handleLoadMorePosts = async () => {
    if (!postsPagination.hasNext) return;
    const nextPage = postsPagination.page + 1;
    try {
      setContentError("");
      setContentLoading(true);
      const { data } = await getUserPosts(user.id, nextPage, 6, "post");
      setPosts((prev) => [...prev, ...(data.posts || [])]);
      setPostsPagination(data.pagination || postsPagination);
    } catch (error) {
      setContentError(getApiErrorMessage(error, "Unable to load more posts."));
    } finally {
      setContentLoading(false);
    }
  };

  const handleLoadMoreReels = async () => {
    if (!reelsPagination.hasNext) return;
    const nextPage = reelsPagination.page + 1;
    try {
      setContentError("");
      setContentLoading(true);
      const { data } = await getUserPosts(user.id, nextPage, 6, "reel");
      setReels((prev) => [...prev, ...(data.posts || [])]);
      setReelsPagination(data.pagination || reelsPagination);
    } catch (error) {
      setContentError(getApiErrorMessage(error, "Unable to load more reels."));
    } finally {
      setContentLoading(false);
    }
  };

  const handleDeleteAudio = async (trackId) => {
    const deleted = await deleteUploadedTrack(trackId);
    if (deleted) {
      setAudioTracks((prev) => prev.filter((track) => track.id !== trackId));
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteAccountConfirm.trim().toUpperCase() !== "DELETE" || isDeletingAccount) {
      setMessage("Type DELETE to confirm account deletion.");
      return;
    }

    setIsDeletingAccount(true);
    setMessage("");

    const result = await deleteAccount();
    if (result.success) {
      navigate("/login", { replace: true });
      return;
    }

    setMessage(result.message || "Unable to delete account.");
    setIsDeletingAccount(false);
  };

  const previewAvatar = imageState.avatarPreview || "";
  const publicProfilePath = `/u/${encodeURIComponent(formData.username || user?.username || "")}`;

  return (
    <section className="dashboard-page">
      <div className="profile-layout">
        <form className="dashboard-panel profile-editor" onSubmit={handleSubmit}>
          <p className="dashboard-kicker text-xs uppercase tracking-[0.18em] text-blue-300/90">
            Profile
          </p>
          <h1 className="font-['Michroma'] text-[clamp(2rem,4vw,3.4rem)] leading-tight text-slate-50">
            Shape your public identity.
          </h1>
          <p className="text-slate-300/80">
            This is the profile listeners and creators will see around KeyVoid.
          </p>

          {status === "loading" ? <p className="auth-success">Loading profile...</p> : null}
          {message ? (
            <p className={message === "Profile updated" ? "auth-success" : "auth-error"}>{message}</p>
          ) : null}

          <div className="profile-form-grid">
            <label className="auth-field">
              <span>Display name</span>
              <input
                maxLength="24"
                minLength="3"
                name="username"
                onChange={handleChange}
                required
                type="text"
                value={formData.username}
              />
            </label>
            <label className="auth-field">
              <span>Location</span>
              <input
                maxLength="60"
                name="location"
                onChange={handleChange}
                placeholder="City, country, scene..."
                type="text"
                value={formData.location}
              />
            </label>
            <label className="auth-field profile-wide-field">
              <span>Bio</span>
              <textarea
                maxLength="280"
                name="bio"
                onChange={handleChange}
                placeholder="Tell people what you listen to, make, or want to discover."
                rows="4"
                value={formData.bio}
              />
            </label>
            <label className="auth-field">
              <span>Website</span>
              <input
                name="website"
                onChange={handleChange}
                placeholder="https://..."
                type="url"
                value={formData.website}
              />
            </label>
            <label className="auth-field">
              <span>Favorite genres</span>
              <input
                name="favoriteGenres"
                onChange={handleChange}
                placeholder="Ambient, rap, shoegaze"
                type="text"
                value={formData.favoriteGenres}
              />
            </label>
            <label className="auth-field">
              <span>Avatar image</span>
              <input
                accept="image/png,image/jpeg,image/webp,image/gif"
                onChange={handleImageChange}
                name="avatar"
                type="file"
              />
              {imageState.avatarPreview ? (
                <button className="auth-inline-button" onClick={() => clearImage("avatar")} type="button">
                  Remove avatar
                </button>
              ) : null}
            </label>
            <label className="auth-field">
              <span>Banner image</span>
              <input
                accept="image/png,image/jpeg,image/webp,image/gif"
                onChange={handleImageChange}
                name="banner"
                type="file"
              />
              {imageState.bannerPreview ? (
                <button className="auth-inline-button" onClick={() => clearImage("banner")} type="button">
                  Remove banner
                </button>
              ) : null}
            </label>
          </div>

          <div className="auth-inline-actions">
            <button className="auth-submit" disabled={status === "saving"} type="submit">
              {status === "saving" ? "Saving..." : "Save profile"}
            </button>
            <Link className="nav-button nav-button-secondary" to={publicProfilePath}>
              View public profile
            </Link>
          </div>

          <div style={{
            marginBottom: "32px",
            display: "grid",
            gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
            gap: "20px"
          }}>
            <div style={{
              padding: "20px",
              background: "rgba(99, 102, 241, 0.1)",
              borderRadius: "16px",
              border: "1px solid rgba(99, 102, 241, 0.25)",
              textAlign: "center"
            }}>
              <p style={{fontSize: "12px", color: "#c7d2fe", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "8px"}}>Followers</p>
              <p style={{fontSize: "36px", fontWeight: "700", color: "#818cf8", margin: 0}}>{user?.followersCount || 0}</p>
            </div>
            <div style={{
              padding: "20px",
              background: "rgba(168, 85, 247, 0.1)",
              borderRadius: "16px",
              border: "1px solid rgba(168, 85, 247, 0.25)",
              textAlign: "center"
            }}>
              <p style={{fontSize: "12px", color: "#f3e8ff", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "8px"}}>Following</p>
              <p style={{fontSize: "36px", fontWeight: "700", color: "#a855f7", margin: 0}}>{user?.followingCount || 0}</p>
            </div>
          </div>

        </form>

        <aside className="dashboard-panel profile-preview-panel">
          <div className="profile-banner" style={{ backgroundImage: imageState.bannerPreview ? `url(${imageState.bannerPreview})` : "" }} />
          <div className="profile-preview-avatar">
            {previewAvatar ? <img alt="" src={previewAvatar} /> : <span>{(formData.username || "K").slice(0, 1)}</span>}
          </div>
          <p className="dashboard-kicker">Preview</p>
          <h2>{formData.username || user?.username || "Your profile"}</h2>
          <p>{formData.bio || "Your bio will show up here."}</p>
          <div className="profile-chip-row">
            {(formData.favoriteGenres
              ? formData.favoriteGenres.split(",").map((genre) => genre.trim()).filter(Boolean)
              : ["Discovery"]
            ).map((genre) => (
              <span key={genre} className="profile-chip">
                {genre}
              </span>
            ))}
          </div>
        </aside>
      </div>

      <div className="dashboard-card" style={{ marginTop: "2rem", padding: "24px", background: "rgba(15, 23, 42, 0.88)", border: "1px solid rgba(71, 85, 105, 0.3)", borderRadius: "20px" }}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "12px", marginBottom: "24px" }}>
          {[
            { key: "uploads", label: `Uploads (${audioPagination.total})` },
            { key: "posts", label: `Posts (${postsPagination.total})` },
            { key: "reels", label: `Reels (${reelsPagination.total})` }
          ].map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              style={{
                padding: "12px 20px",
                borderRadius: "999px",
                border: activeTab === tab.key ? "1px solid #818cf8" : "1px solid rgba(148, 163, 184, 0.24)",
                background: activeTab === tab.key ? "rgba(99, 102, 241, 0.18)" : "rgba(31, 41, 55, 0.8)",
                color: "#e2e8f0",
                cursor: "pointer"
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {contentError ? (
          <p className="auth-error" style={{ marginBottom: "16px" }}>{contentError}</p>
        ) : null}
        {contentLoading ? (
          <p style={{ color: "#cbd5e1", marginBottom: "16px" }}>Loading content...</p>
        ) : null}

        {activeTab === "uploads" && (
          <div style={{ display: "grid", gap: "14px" }}>
            {audioTracks.length > 0 ? (
              audioTracks.map((track) => (
                <div key={track.id} style={{ padding: "16px", borderRadius: "16px", border: "1px solid rgba(148, 163, 184, 0.12)", background: "rgba(15, 23, 42, 0.95)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: "16px", flexWrap: "wrap" }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: "1rem", color: "#f8fafc" }}>{track.title || "Untitled"}</div>
                      <div style={{ color: "#94a3b8", fontSize: "0.95rem" }}>{track.artist || "Unknown artist"}</div>
                    </div>
                    <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", alignItems: "center" }}>
                      <span style={{ color: "#94a3b8", fontSize: "0.85rem" }}>{track.genre || "Uploads"}</span>
                      <button
                        type="button"
                        onClick={() => handleDeleteAudio(track.id)}
                        style={{ padding: "10px 14px", borderRadius: "12px", background: "#7f1d1d", border: "none", color: "white", cursor: "pointer" }}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <p style={{ color: "#cbd5e1" }}>No uploads to show yet.</p>
            )}
            {audioPagination.hasNext && (
              <button type="button" onClick={handleLoadMoreAudio} style={{ padding: "12px 20px", borderRadius: "12px", background: "#6366f1", border: "none", color: "white", cursor: "pointer", width: "fit-content" }}>
                Load more uploads
              </button>
            )}
          </div>
        )}

        {activeTab === "posts" && (
          <div style={{ display: "grid", gap: "16px" }}>
            {posts.length > 0 ? (
              posts.map((post) => (
                <PostCard key={post._id} post={post} onPostDeleted={handleDeletePost} />
              ))
            ) : (
              <p style={{ color: "#cbd5e1" }}>No posts yet. Share updates or stories to fill this tab.</p>
            )}
            {postsPagination.hasNext && (
              <button type="button" onClick={handleLoadMorePosts} style={{ padding: "12px 20px", borderRadius: "12px", background: "#6366f1", border: "none", color: "white", cursor: "pointer", width: "fit-content" }}>
                Load more posts
              </button>
            )}
          </div>
        )}

        {activeTab === "reels" && (
          <div style={{ display: "grid", gap: "16px" }}>
            {reels.length > 0 ? (
              reels.map((post) => (
                <PostCard key={post._id} post={post} onPostDeleted={handleDeletePost} />
              ))
            ) : (
              <p style={{ color: "#cbd5e1" }}>No reels uploaded yet. Create a reel from the Creator Hub.</p>
            )}
            {reelsPagination.hasNext && (
              <button type="button" onClick={handleLoadMoreReels} style={{ padding: "12px 20px", borderRadius: "12px", background: "#6366f1", border: "none", color: "white", cursor: "pointer", width: "fit-content" }}>
                Load more reels
              </button>
            )}
          </div>
        )}
      </div>

      <div className="dashboard-card" style={{ marginTop: "2rem", padding: "24px", background: "rgba(127, 29, 29, 0.18)", border: "1px solid rgba(248, 113, 113, 0.35)", borderRadius: "20px" }}>
        <p className="dashboard-kicker" style={{ color: "#fca5a5" }}>Danger zone</p>
        <h2 style={{ color: "#fee2e2", marginTop: 0 }}>Delete account</h2>
        <p style={{ color: "#fecaca", lineHeight: 1.7 }}>
          This permanently removes your account, posts, reels, uploaded media, playlists, sessions, and profile images.
          This action cannot be undone.
        </p>
        <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", alignItems: "center" }}>
          <input
            value={deleteAccountConfirm}
            onChange={(event) => setDeleteAccountConfirm(event.target.value)}
            placeholder="Type DELETE"
            style={{
              minHeight: "44px",
              padding: "0 12px",
              borderRadius: "10px",
              border: "1px solid rgba(248, 113, 113, 0.35)",
              background: "rgba(15, 23, 42, 0.9)",
              color: "#fee2e2",
              outline: "none"
            }}
          />
          <button
            type="button"
            onClick={handleDeleteAccount}
            disabled={isDeletingAccount || deleteAccountConfirm.trim().toUpperCase() !== "DELETE"}
            style={{
              minHeight: "44px",
              padding: "0 16px",
              borderRadius: "10px",
              border: "1px solid rgba(248, 113, 113, 0.4)",
              background: deleteAccountConfirm.trim().toUpperCase() === "DELETE" ? "#991b1b" : "rgba(127, 29, 29, 0.35)",
              color: "white",
              cursor: deleteAccountConfirm.trim().toUpperCase() === "DELETE" ? "pointer" : "not-allowed"
            }}
          >
            {isDeletingAccount ? "Deleting account..." : "Delete account forever"}
          </button>
        </div>
      </div>
    </section>
  );
}
