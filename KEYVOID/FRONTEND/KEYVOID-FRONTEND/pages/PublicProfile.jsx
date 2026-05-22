import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { BarChart3, Disc3, Eye, Grid3X3, Heart, Home, Menu, MessageCircle, Music2, Pause, Pencil, Play, Radio, Search, Settings, Sparkles, Trash2, TrendingUp, UserPlus, X } from "lucide-react";
import API, { followUser, unfollowUser, getFollowStatus, getApiErrorMessage, getUserAudioUploads, getUserPosts, getCreatorInsights, trackPostView } from "../services/api";
import PostCard from "../components/PostCard";
import { useAuth } from "../src/context/useAuth";
import { usePlayer } from "../src/context/PlayerContext";

function getTrackId(track) {
  return track?._id || track?.id || "";
}

function formatCompactNumber(value = 0) {
  return new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 }).format(Number(value) || 0);
}

function formatDuration(seconds = 0) {
  const value = Number(seconds) || 0;
  const minutes = Math.floor(value / 60);
  const secs = Math.floor(value % 60);
  return `${minutes}:${secs.toString().padStart(2, "0")}`;
}

function getTrackLikes(track) {
  return (track?.audienceTags || []).reduce((total, tag) => total + (Number(tag.count) || 0), 0);
}

function getTrackListens(track, index) {
  return Number(track?.listenCount || track?.plays || track?.playCount || track?.streamCount || 0) || Math.max(0, 240 - index * 17);
}

function getPostPreview(post) {
  const title = post?.title || post?.text || "Untitled";
  return String(title).replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">");
}

function decodeStoredText(value = "") {
  return String(value || "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, "\"")
    .replace(/&#x27;/g, "'")
    .replace(/&#x2F;/g, "/");
}

const EMPTY_PROFILE_FORM = {
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

function ProfileAvatar({ profile, className = "" }) {
  return profile?.avatarUrl ? (
    <img className={className} src={profile.avatarUrl} alt="" />
  ) : (
    <span className={className}>{profile?.username?.slice(0, 1).toUpperCase() || "K"}</span>
  );
}

function ProfilePostViewer({ currentPost, onClose, onPostDeleted, onSelectPost, posts }) {
  const currentIndex = posts.findIndex((post) => post._id === currentPost?._id);
  const hasPrevious = currentIndex > 0;
  const hasNext = currentIndex >= 0 && currentIndex < posts.length - 1;

  const goToPost = useCallback((direction) => {
    const nextPost = posts[currentIndex + direction];
    if (nextPost) {
      onSelectPost(nextPost);
    }
  }, [currentIndex, onSelectPost, posts]);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === "Escape") onClose();
      if (event.key === "ArrowLeft" && hasPrevious) goToPost(-1);
      if (event.key === "ArrowRight" && hasNext) goToPost(1);
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [goToPost, hasNext, hasPrevious, onClose]);

  return (
    <div className="profile-post-viewer-backdrop" role="dialog" aria-modal="true" aria-label="Profile post viewer" onMouseDown={onClose}>
      <div className="profile-post-viewer" onMouseDown={(event) => event.stopPropagation()}>
        <div className="profile-post-viewer-toolbar">
          <button className="profile-post-viewer-back" type="button" onClick={onClose}>
            <X size={16} /> Close
          </button>
          <div className="profile-post-viewer-nav">
            <button type="button" onClick={() => goToPost(-1)} disabled={!hasPrevious} aria-label="Previous post">
              ←
            </button>
            <span>{Math.max(currentIndex + 1, 1)} / {Math.max(posts.length, 1)}</span>
            <button type="button" onClick={() => goToPost(1)} disabled={!hasNext} aria-label="Next post">
              →
            </button>
          </div>
        </div>
        <div className="profile-post-viewer-card">
          <PostCard
            key={currentPost._id}
            post={currentPost}
            defaultShowComments
            onPostDeleted={(postId) => {
              onPostDeleted(postId);
              onClose();
            }}
          />
        </div>
      </div>
    </div>
  );
}

function ProfileDashboardView({ profile, user, isArtist }) {
  const accountRows = [
    ["Display name", profile?.username || "KeyVoid user"],
    ["Role", user?.role === "admin" ? "Admin" : isArtist ? "Creator" : "Listener"],
    ["Email", user?.email || "Hidden"],
    ["Location", profile?.location || "Not set"],
    ["Website", profile?.website || "Not set"],
    ["Account", "Active"]
  ];

  return (
    <section className="profile-workspace-panel">
      <div className="profile-workspace-heading">
        <p className="profile-kicker">Dashboard</p>
        <h2>Account overview</h2>
      </div>
      <div className="profile-stat-grid">
        <div className="profile-stat-card">
          <span>Followers</span>
          <strong>{formatCompactNumber(profile?.followersCount || 0)}</strong>
        </div>
        <div className="profile-stat-card">
          <span>Following</span>
          <strong>{formatCompactNumber(profile?.followingCount || 0)}</strong>
        </div>
        <div className="profile-stat-card">
          <span>Public type</span>
          <strong>{isArtist ? "Artist" : "Listener"}</strong>
        </div>
      </div>
      <div className="profile-account-grid">
        {accountRows.map(([label, value]) => (
          <div className="profile-account-row" key={label}>
            <span>{label}</span>
            <strong>{value}</strong>
          </div>
        ))}
      </div>
    </section>
  );
}

function CreatorAnalyticsView({ creatorInsights, insightsNotice }) {
  const totals = creatorInsights?.totals || {};

  return (
    <section className="profile-workspace-panel">
      <div className="profile-workspace-heading">
        <p className="profile-kicker">Creator Analytics</p>
        <h2>Growth and recommendations</h2>
      </div>
      {insightsNotice ? <p className="profile-inline-error">{insightsNotice}</p> : null}
      {creatorInsights ? (
        <>
          <div className="profile-stat-grid">
            <div className="profile-stat-card">
              <span><Eye size={16} /> Views</span>
              <strong>{formatCompactNumber(totals.views || 0)}</strong>
            </div>
            <div className="profile-stat-card">
              <span><Heart size={16} /> Likes</span>
              <strong>{formatCompactNumber(totals.likes || 0)}</strong>
            </div>
            <div className="profile-stat-card">
              <span><MessageCircle size={16} /> Comments</span>
              <strong>{formatCompactNumber(totals.comments || 0)}</strong>
            </div>
            <div className="profile-stat-card">
              <span><TrendingUp size={16} /> Engagement</span>
              <strong>{creatorInsights.engagementRate || 0}%</strong>
            </div>
          </div>
          <div className="profile-analytics-grid">
            <div>
              <h3>Top content</h3>
              <div className="profile-analytics-list">
                {creatorInsights.topPosts?.length ? creatorInsights.topPosts.map((post) => (
                  <div className="profile-analytics-item" key={post._id}>
                    <strong>{post.contentType === "reel" ? "Reel" : "Post"}</strong>
                    <span>{formatCompactNumber(post.viewCount || 0)} views</span>
                    <p>{decodeStoredText(post.title || post.text || `${post.mediaType || "Media"} content`)}</p>
                  </div>
                )) : <div className="profile-empty-card">Create posts or reels to start collecting insights.</div>}
              </div>
            </div>
            <div>
              <h3>Growth prompts</h3>
              <div className="profile-analytics-list">
                {(creatorInsights.recommendations || []).map((tip) => (
                  <div className="profile-analytics-tip" key={tip}>{tip}</div>
                ))}
              </div>
            </div>
          </div>
        </>
      ) : (
        <div className="profile-empty-card">Loading creator analytics...</div>
      )}
    </section>
  );
}

export default function PublicProfile({ ownProfile = false }) {
  const { username } = useParams();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { deleteAccount, updateUser, user, isAuthenticated } = useAuth();
  const updateUserRef = useRef(updateUser);
  const { activeTrack, isPlaying, handleSelectTrack, handleTogglePlay, deleteUploadedTrack } = usePlayer();
  const [profile, setProfile] = useState(null);
  const [status, setStatus] = useState("loading");
  const [message, setMessage] = useState("");
  const [followStatus, setFollowStatus] = useState(null);
  const [isFollowLoading, setIsFollowLoading] = useState(false);
  const [leftPanelOpen, setLeftPanelOpen] = useState(true);
  const [selectedPost, setSelectedPost] = useState(null);
  const [editOpen, setEditOpen] = useState(false);
  const [editFormData, setEditFormData] = useState(EMPTY_PROFILE_FORM);
  const [imageState, setImageState] = useState({
    avatarFile: null,
    avatarPreview: "",
    bannerFile: null,
    bannerPreview: "",
    removeAvatar: false,
    removeBanner: false
  });
  const [editStatus, setEditStatus] = useState("ready");
  const [editMessage, setEditMessage] = useState("");
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteAccountConfirm, setDeleteAccountConfirm] = useState("");
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [workspaceView, setWorkspaceView] = useState("profile");
  const [audioTracks, setAudioTracks] = useState([]);
  const [audioPagination, setAudioPagination] = useState({ page: 1, limit: 10, total: 0, pages: 0, hasNext: false, hasPrev: false });
  const [posts, setPosts] = useState([]);
  const [postsPagination, setPostsPagination] = useState({ page: 1, limit: 9, total: 0, pages: 0, hasNext: false, hasPrev: false });
  const [reels, setReels] = useState([]);
  const [reelsPagination, setReelsPagination] = useState({ page: 1, limit: 9, total: 0, pages: 0, hasNext: false, hasPrev: false });
  const [activityTab, setActivityTab] = useState("posts");
  const [contentLoading, setContentLoading] = useState(false);
  const [contentError, setContentError] = useState("");
  const [creatorInsights, setCreatorInsights] = useState(null);
  const [insightsNotice, setInsightsNotice] = useState("");

  const requestedMode = searchParams.get("tab") || "posts";
  const isArtist = profile?.role === "creator" || profile?.role === "admin" || profile?.isCreator;
  const isOwnProfile = ownProfile || user?.id === profile?.id;
  const activeMode = isArtist && requestedMode === "artist" ? "artist" : "posts";
  const showProfileContent = workspaceView === "profile";

  useEffect(() => {
    updateUserRef.current = updateUser;
  }, [updateUser]);

  useEffect(() => {
    let ignore = false;

    async function loadProfile() {
      setStatus("loading");
      setMessage("");

      try {
        const { data } = ownProfile
          ? await API.get("/profiles/me")
          : await API.get(`/profiles/${encodeURIComponent(username)}`);

        if (ignore) return;
        setProfile(data.profile);
        if (ownProfile) {
          updateUserRef.current(data.profile);
        }
        setStatus("ready");
        if (!ownProfile && isAuthenticated && data.profile.id !== user?.id) {
          const followRes = await getFollowStatus(data.profile.id);
          setFollowStatus(followRes.data);
        }
      } catch (error) {
        if (!ignore) {
          setMessage(error.response?.data?.msg || "Unable to load profile");
          setStatus("error");
        }
      }
    }

    loadProfile();
    return () => {
      ignore = true;
    };
  }, [username, ownProfile, isAuthenticated, user?.id]);

  useEffect(() => {
    if (!profile) return;

    setEditFormData(profileToForm(profile));
    setImageState({
      avatarFile: null,
      avatarPreview: profile.avatarUrl || "",
      bannerFile: null,
      bannerPreview: profile.bannerUrl || "",
      removeAvatar: false,
      removeBanner: false
    });
  }, [profile]);

  useEffect(() => {
    if (profile && requestedMode === "artist" && !isArtist) {
      setSearchParams({ tab: "posts" }, { replace: true });
    }
  }, [isArtist, profile, requestedMode, setSearchParams]);

  const loadProfileAudio = useCallback(async (page = 1, append = false) => {
    if (!profile?.id || !isArtist) return;
    setContentError("");
    setContentLoading(true);

    try {
      const { data } = await getUserAudioUploads(profile.id, page, 10);
      const nextTracks = data.tracks || [];
      setAudioTracks((prev) => (append ? [...prev, ...nextTracks] : nextTracks));
      setAudioPagination(data.pagination || { page, limit: 10, total: nextTracks.length, pages: 1, hasNext: false, hasPrev: page > 1 });
    } catch (error) {
      setContentError(getApiErrorMessage(error, "Unable to load artist music."));
    } finally {
      setContentLoading(false);
    }
  }, [isArtist, profile?.id]);

  const loadProfilePosts = useCallback(async (page = 1, contentType = "post", append = false) => {
    if (!profile?.id) return;
    setContentError("");
    setContentLoading(true);

    try {
      const { data } = await getUserPosts(profile.id, page, 9, contentType);
      const nextPosts = data.posts || [];
      const pagination = data.pagination || { page, limit: 9, total: nextPosts.length, pages: 1, hasNext: false, hasPrev: page > 1 };

      if (contentType === "reel") {
        setReels((prev) => (append ? [...prev, ...nextPosts] : nextPosts));
        setReelsPagination(pagination);
      } else {
        setPosts((prev) => (append ? [...prev, ...nextPosts] : nextPosts));
        setPostsPagination(pagination);
      }
    } catch (error) {
      setContentError(getApiErrorMessage(error, `Unable to load ${contentType === "reel" ? "reels" : "posts"}.`));
    } finally {
      setContentLoading(false);
    }
  }, [profile?.id]);

  useEffect(() => {
    if (!profile?.id) return;
    if (isArtist) loadProfileAudio();
    loadProfilePosts(1, "post");
    if (isArtist) loadProfilePosts(1, "reel");
  }, [profile?.id, isArtist, loadProfileAudio, loadProfilePosts]);

  useEffect(() => {
    if (!isOwnProfile || !isArtist) return;

    let ignore = false;
    getCreatorInsights()
      .then(({ data }) => {
        if (!ignore) {
          setCreatorInsights(data);
          setInsightsNotice("");
        }
      })
      .catch((error) => {
        if (!ignore) {
          setInsightsNotice(getApiErrorMessage(error, "Unable to load creator insights."));
        }
      });

    return () => {
      ignore = true;
    };
  }, [isOwnProfile, isArtist]);

  const artistStats = useMemo(() => {
    const totalLikes = audioTracks.reduce((total, track) => total + getTrackLikes(track), 0);
    const totalListens = audioTracks.reduce((total, track, index) => total + getTrackListens(track, index), 0);
    const genres = [...new Set(audioTracks.map((track) => track.genre).filter(Boolean))].slice(0, 4);
    return { totalLikes, totalListens, genres };
  }, [audioTracks]);

  const selectedActivity = activityTab === "reels" ? reels : posts;
  const selectedPagination = activityTab === "reels" ? reelsPagination : postsPagination;

  const handleFollowToggle = async () => {
    if (!isAuthenticated) {
      setMessage("Please log in to follow users");
      return;
    }

    setIsFollowLoading(true);
    try {
      if (followStatus?.isFollowing) {
        await unfollowUser(profile.id);
      } else {
        await followUser(profile.id);
      }

      setFollowStatus((prev) => ({ ...prev, isFollowing: !prev?.isFollowing }));
      const { data } = await API.get(`/profiles/${encodeURIComponent(username)}`);
      setProfile(data.profile);
    } catch {
      setMessage("Failed to update follow status");
    } finally {
      setIsFollowLoading(false);
    }
  };

  const handleLoadMoreActivity = async () => {
    if (!selectedPagination.hasNext) return;
    await loadProfilePosts(selectedPagination.page + 1, activityTab === "reels" ? "reel" : "post", true);
  };

  const handleLoadMoreAudio = async () => {
    if (audioPagination.hasNext) {
      await loadProfileAudio(audioPagination.page + 1, true);
    }
  };

  const handleDeleteAudio = async (trackId) => {
    const deleted = await deleteUploadedTrack(trackId);
    if (deleted) {
      setAudioTracks((prev) => prev.filter((track) => getTrackId(track) !== trackId));
    }
  };

  const handleOpenPost = (post) => {
    setSelectedPost(post);

    if (!post?._id) return;

    trackPostView(post._id)
      .then((response) => {
        if (typeof response.data?.viewCount !== "number") return;
        const updatePostViews = (item) => item._id === post._id
          ? { ...item, viewCount: response.data.viewCount }
          : item;

        setSelectedPost((current) => current?._id === post._id
          ? { ...current, viewCount: response.data.viewCount }
          : current
        );
        setPosts((current) => current.map(updatePostViews));
        setReels((current) => current.map(updatePostViews));
      })
      .catch(() => {});
  };

  const handleDeletePost = (postId) => {
    const wasPost = posts.some((post) => post._id === postId);
    const wasReel = reels.some((post) => post._id === postId);

    setPosts((current) => current.filter((post) => post._id !== postId));
    setReels((current) => current.filter((post) => post._id !== postId));
    setPostsPagination((current) => ({
      ...current,
      total: Math.max(0, (current.total || 0) - (wasPost ? 1 : 0))
    }));
    setReelsPagination((current) => ({
      ...current,
      total: Math.max(0, (current.total || 0) - (wasReel ? 1 : 0))
    }));
    setSelectedPost((current) => (current?._id === postId ? null : current));
  };

  const handleEditChange = (event) => {
    const { name, value } = event.target;
    setEditFormData((current) => ({ ...current, [name]: value }));
  };

  const handleImageChange = (event) => {
    const { files, name } = event.target;
    const file = files?.[0];

    if (!file) return;

    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      setEditMessage("Images must be PNG, JPG, WEBP, or GIF");
      event.target.value = "";
      return;
    }

    if (file.size > IMAGE_LIMIT_BYTES) {
      setEditMessage("Images must be smaller than 2 MB");
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
    setEditMessage("");
  };

  const clearImage = (name) => {
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
  };

  const handleEditSubmit = async (event) => {
    event.preventDefault();
    if (!isOwnProfile) return;

    setEditStatus("saving");
    setEditMessage("");

    try {
      const profileForm = new FormData();
      profileForm.append("username", editFormData.username);
      profileForm.append("bio", editFormData.bio);
      profileForm.append("location", editFormData.location);
      profileForm.append("website", editFormData.website);
      profileForm.append("favoriteGenres", editFormData.favoriteGenres);
      profileForm.append("removeAvatar", String(imageState.removeAvatar));
      profileForm.append("removeBanner", String(imageState.removeBanner));

      if (imageState.avatarFile) profileForm.append("avatar", imageState.avatarFile);
      if (imageState.bannerFile) profileForm.append("banner", imageState.bannerFile);

      const { data } = await API.patch("/profiles/me", profileForm);
      setProfile(data.profile);
      updateUser(data.profile);
      setEditMessage("Profile updated");
      setEditStatus("ready");
      setEditOpen(false);
    } catch (error) {
      setEditMessage(getApiErrorMessage(error, "Unable to update profile"));
      setEditStatus("ready");
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteAccountConfirm.trim().toUpperCase() !== "DELETE" || isDeletingAccount) {
      return;
    }

    setIsDeletingAccount(true);
    const result = await deleteAccount();

    if (result.success) {
      navigate("/login", { replace: true });
      return;
    }

    setEditMessage(result.message || "Unable to delete account.");
    setIsDeletingAccount(false);
  };

  if (status === "loading") {
    return <section className="public-profile-page"><div className="profile-state">Loading profile...</div></section>;
  }

  if (status === "error") {
    return (
      <section className="public-profile-page">
        <div className="profile-state">
          <h1>Profile Not Found</h1>
          <p>{message}</p>
          <Link className="profile-action-button" to="/">Go Home</Link>
        </div>
      </section>
    );
  }

  return (
    <section className={`public-profile-page${isOwnProfile ? " public-profile-page-own" : ""}${leftPanelOpen ? " profile-panel-open" : " profile-panel-closed"}`}>
      {isOwnProfile ? (
        <aside className={`profile-side-panel ${leftPanelOpen ? "profile-side-panel--open" : "profile-side-panel--closed"}`} aria-label="Profile navigation">
          {leftPanelOpen ? (
            <div className="profile-side-content">
              <div className="profile-side-header">
                <div>
                  <p className="drawer-kicker">Profile</p>
                  <strong>{profile.username}</strong>
                </div>
                <button className="panel-collapse-btn" type="button" onClick={() => setLeftPanelOpen(false)} aria-label="Collapse profile panel">
                  <X size={16} />
                </button>
              </div>

              <div className="profile-side-section">
                <p className="drawer-section-label">Views</p>
                {isArtist ? (
                  <button className={`profile-side-link ${showProfileContent && activeMode === "artist" ? "active" : ""}`} type="button" onClick={() => { setWorkspaceView("profile"); setSearchParams({ tab: "artist" }); }}>
                    <Radio size={17} /> Artist page
                  </button>
                ) : null}
                <button className={`profile-side-link ${showProfileContent && activeMode === "posts" ? "active" : ""}`} type="button" onClick={() => { setWorkspaceView("profile"); setSearchParams({ tab: "posts" }); }}>
                  <Grid3X3 size={17} /> Posts and reels
                </button>
              </div>

              <div className="profile-side-section">
                <p className="drawer-section-label">Account</p>
                <button className="profile-side-link" type="button" onClick={() => setEditOpen(true)}>
                  <Pencil size={17} /> Edit profile
                </button>
                {isArtist ? (
                  <button className={`profile-side-link ${workspaceView === "analytics" ? "active" : ""}`} type="button" onClick={() => setWorkspaceView("analytics")}>
                    <BarChart3 size={17} /> Creator analytics
                  </button>
                ) : null}
                <button className={`profile-side-link ${workspaceView === "dashboard" ? "active" : ""}`} type="button" onClick={() => setWorkspaceView("dashboard")}>
                  <Home size={17} /> Dashboard
                </button>
                <Link className="profile-side-link" to="/search">
                  <Search size={17} /> Search creators
                </Link>
              </div>

              <div className="profile-side-section">
                <p className="drawer-section-label">Danger</p>
                <button className="profile-side-link danger" type="button" onClick={() => setDeleteOpen(true)}>
                  <Trash2 size={17} /> Delete account
                </button>
              </div>
            </div>
          ) : (
            <div className="profile-side-rail">
              <button className="rail-toggle" type="button" onClick={() => setLeftPanelOpen(true)} aria-label="Open profile panel">
                <Menu size={18} />
              </button>
              <button className={`rail-btn ${showProfileContent && activeMode === "posts" ? "active" : ""}`} type="button" onClick={() => { setWorkspaceView("profile"); setSearchParams({ tab: "posts" }); }} aria-label="Posts and reels">
                <Grid3X3 size={18} />
              </button>
              {isArtist ? (
                <button className={`rail-btn ${showProfileContent && activeMode === "artist" ? "active" : ""}`} type="button" onClick={() => { setWorkspaceView("profile"); setSearchParams({ tab: "artist" }); }} aria-label="Artist page">
                  <Radio size={18} />
                </button>
              ) : null}
              <span className="rail-divider" />
              <button className={`rail-btn ${workspaceView === "dashboard" ? "active" : ""}`} type="button" onClick={() => setWorkspaceView("dashboard")} aria-label="Dashboard">
                <Home size={18} />
              </button>
              {isArtist ? (
                <button className={`rail-btn ${workspaceView === "analytics" ? "active" : ""}`} type="button" onClick={() => setWorkspaceView("analytics")} aria-label="Creator analytics">
                  <BarChart3 size={18} />
                </button>
              ) : null}
              <button className="rail-btn" type="button" onClick={() => setEditOpen(true)} aria-label="Edit profile">
                <Settings size={18} />
              </button>
              <button className="rail-btn danger" type="button" onClick={() => setDeleteOpen(true)} aria-label="Delete account">
                <Trash2 size={18} />
              </button>
            </div>
          )}
        </aside>
      ) : null}

      <div className="profile-hero-shell">
        <div className="artist-hero" style={{ backgroundImage: profile.bannerUrl ? `url(${profile.bannerUrl})` : "" }}>
          <div className="artist-hero-shade" />
          <div className="artist-hero-content">
            <div className="artist-hero-avatar">
              <ProfileAvatar profile={profile} />
            </div>
            <div>
              <p className="profile-kicker">{isArtist ? "Verified KeyVoid Artist" : "KeyVoid Listener"}</p>
              <h1>{profile.username}</h1>
              <p>{profile.bio || "This profile is still tuning their signal."}</p>
              <div className="artist-hero-stats">
                <span>{formatCompactNumber(profile.followersCount)} followers</span>
                <span>{formatCompactNumber(profile.followingCount)} following</span>
                {isArtist ? <span>{formatCompactNumber(audioPagination.total)} songs</span> : null}
              </div>
            </div>
          </div>
        </div>

        <div className="profile-command-row">
          <div className="profile-mode-tabs">
            {isArtist ? (
              <button type="button" className={activeMode === "artist" ? "active" : ""} onClick={() => setSearchParams({ tab: "artist" })}>
                <Radio size={16} /> Artist
              </button>
            ) : null}
            <button type="button" className={activeMode === "posts" ? "active" : ""} onClick={() => setSearchParams({ tab: "posts" })}>
              <Grid3X3 size={16} /> Posts
            </button>
          </div>

          <div className="profile-actions">
            {!isOwnProfile && isAuthenticated ? (
              <button type="button" className="profile-action-button" onClick={handleFollowToggle} disabled={isFollowLoading}>
                <UserPlus size={16} /> {isFollowLoading ? "..." : followStatus?.isFollowing ? "Following" : "Follow"}
              </button>
            ) : null}
            {isOwnProfile ? <button className="profile-action-button" type="button" onClick={() => setEditOpen(true)}>Edit Profile</button> : null}
          </div>
        </div>

        {message ? <p className="profile-inline-error">{message}</p> : null}
        {contentError ? <p className="profile-inline-error">{contentError}</p> : null}

        {workspaceView === "dashboard" ? (
          <ProfileDashboardView profile={profile} user={user} isArtist={isArtist} />
        ) : workspaceView === "analytics" ? (
          <CreatorAnalyticsView creatorInsights={creatorInsights} insightsNotice={insightsNotice} />
        ) : activeMode === "artist" ? (
          <div className="artist-page-grid">
            <main className="artist-main-section">
              <div className="artist-control-strip">
                <button
                  type="button"
                  className="artist-play-button"
                  onClick={() => audioTracks[0] && (getTrackId(activeTrack) === getTrackId(audioTracks[0]) ? handleTogglePlay() : handleSelectTrack(audioTracks[0]))}
                  disabled={!audioTracks.length}
                  aria-label="Play artist"
                >
                  {isPlaying && getTrackId(activeTrack) === getTrackId(audioTracks[0]) ? <Pause size={26} /> : <Play size={26} />}
                </button>
                <div className="artist-stat-pill"><Eye size={16} /> {formatCompactNumber(artistStats.totalListens)} listens</div>
                <div className="artist-stat-pill"><Heart size={16} /> {formatCompactNumber(artistStats.totalLikes)} likes</div>
                <div className="artist-stat-pill"><Disc3 size={16} /> {formatCompactNumber(audioPagination.total)} tracks</div>
              </div>

              <section className="artist-section">
                <div className="artist-section-heading">
                  <h2>Popular</h2>
                  {contentLoading ? <span>Loading...</span> : null}
                </div>
                <div className="artist-track-list">
                  {audioTracks.length ? audioTracks.map((track, index) => {
                    const active = getTrackId(activeTrack) === getTrackId(track);
                    return (
                      <div className={`artist-track-row ${active ? "active" : ""}`} key={getTrackId(track)}>
                        <button type="button" className="artist-track-play" onClick={() => handleSelectTrack(track)} aria-label={`Play ${track.title}`}>
                          {active && isPlaying ? <Pause size={15} /> : <Play size={15} />}
                        </button>
                        <span className="artist-track-rank">{index + 1}</span>
                        <div className="artist-track-art">{track.coverUrl ? <img src={track.coverUrl} alt="" /> : <Music2 size={18} />}</div>
                        <div className="artist-track-copy">
                          <strong>{track.title || "Untitled"}</strong>
                          <span>{track.genre || "Uploads"}</span>
                        </div>
                        <span>{formatCompactNumber(getTrackListens(track, index))}</span>
                        <span>{formatCompactNumber(getTrackLikes(track))} likes</span>
                        <span>{formatDuration(track.duration)}</span>
                        {isOwnProfile ? (
                          <button type="button" className="artist-delete-track" onClick={() => handleDeleteAudio(getTrackId(track))}>Delete</button>
                        ) : null}
                      </div>
                    );
                  }) : (
                    <div className="profile-empty-card">No public music yet. Upload songs from Creator Hub to fill this artist page.</div>
                  )}
                </div>
                {audioPagination.hasNext ? <button type="button" className="profile-load-more" onClick={handleLoadMoreAudio}>Load more music</button> : null}
              </section>
            </main>

            <aside className="artist-side-section">
              <section className="artist-pick-card">
                <p className="profile-kicker">Artist Pick</p>
                {audioTracks[0] ? (
                  <button type="button" onClick={() => handleSelectTrack(audioTracks[0])}>
                    <span>{audioTracks[0].title}</span>
                    <small>{audioTracks[0].genre || "New upload"}</small>
                  </button>
                ) : (
                  <p>New releases will show here.</p>
                )}
              </section>
              <section className="artist-pick-card">
                <p className="profile-kicker">Sound</p>
                <div className="profile-chip-row compact">
                  {(artistStats.genres.length ? artistStats.genres : profile.favoriteGenres || ["Discovery"]).map((genre) => (
                    <span className="profile-chip" key={genre}>{genre}</span>
                  ))}
                </div>
              </section>
            </aside>
          </div>
        ) : (
          <div className="profile-posts-surface">
            <div className="activity-tabs">
              <button type="button" className={activityTab === "posts" ? "active" : ""} onClick={() => setActivityTab("posts")}>
                <Grid3X3 size={15} /> Posts {postsPagination.total}
              </button>
              {isArtist ? (
                <button type="button" className={activityTab === "reels" ? "active" : ""} onClick={() => setActivityTab("reels")}>
                  <Sparkles size={15} /> Reels {reelsPagination.total}
                </button>
              ) : null}
              <button type="button" disabled>
                <MessageCircle size={15} /> Commented
              </button>
            </div>

            <div className="profile-post-grid">
              {selectedActivity.length ? selectedActivity.map((post) => (
                <button className="profile-post-tile" type="button" onClick={() => handleOpenPost(post)} key={post._id}>
                  {post.mediaUrl && post.mediaType === "image" ? <img src={post.mediaUrl} alt="" /> : null}
                  {post.mediaUrl && post.mediaType === "video" ? <video src={post.mediaUrl} muted playsInline /> : null}
                  <div className="profile-post-overlay">
                    <strong>{getPostPreview(post)}</strong>
                    <span><Heart size={14} /> {post.likes?.length || 0}</span>
                    <span><MessageCircle size={14} /> {(post.comments || []).length}</span>
                  </div>
                </button>
              )) : (
                <div className="profile-empty-card">
                  {activityTab === "reels" ? "No reels yet." : "No posts yet. Discussions and commented threads will show here as activity grows."}
                </div>
              )}
            </div>

            {selectedPagination.hasNext ? <button type="button" className="profile-load-more" onClick={handleLoadMoreActivity}>Load more</button> : null}
          </div>
        )}
      </div>

      {selectedPost ? createPortal(
        <ProfilePostViewer
          currentPost={selectedPost}
          posts={selectedActivity}
          onSelectPost={handleOpenPost}
          onPostDeleted={handleDeletePost}
          onClose={() => setSelectedPost(null)}
        />,
        document.body
      ) : null}

      {editOpen ? createPortal(
        <div className="profile-modal-backdrop" role="dialog" aria-modal="true" aria-label="Edit profile">
          <form className="profile-edit-modal" onSubmit={handleEditSubmit}>
            <div className="profile-modal-header">
              <div>
                <p className="profile-kicker">Edit Profile</p>
                <h2>Update your public profile</h2>
              </div>
              <button className="panel-collapse-btn" type="button" onClick={() => setEditOpen(false)} aria-label="Close edit profile">
                <X size={16} />
              </button>
            </div>
            {editMessage ? <p className={editMessage === "Profile updated" ? "auth-success" : "auth-error"}>{editMessage}</p> : null}
            <div className="profile-edit-grid">
              <label className="auth-field">
                <span>Display name</span>
                <input maxLength="24" minLength="3" name="username" onChange={handleEditChange} required type="text" value={editFormData.username} />
              </label>
              <label className="auth-field">
                <span>Location</span>
                <input maxLength="60" name="location" onChange={handleEditChange} type="text" value={editFormData.location} />
              </label>
              <label className="auth-field profile-wide-field">
                <span>Bio</span>
                <textarea maxLength="280" name="bio" onChange={handleEditChange} rows="4" value={editFormData.bio} />
              </label>
              <label className="auth-field">
                <span>Website</span>
                <input name="website" onChange={handleEditChange} type="url" value={editFormData.website} />
              </label>
              <label className="auth-field">
                <span>Favorite genres</span>
                <input name="favoriteGenres" onChange={handleEditChange} type="text" value={editFormData.favoriteGenres} />
              </label>
              <label className="auth-field">
                <span>Avatar image</span>
                <input accept="image/png,image/jpeg,image/webp,image/gif" name="avatar" onChange={handleImageChange} type="file" />
                {imageState.avatarPreview ? <button className="auth-inline-button" onClick={() => clearImage("avatar")} type="button">Remove avatar</button> : null}
              </label>
              <label className="auth-field">
                <span>Banner image</span>
                <input accept="image/png,image/jpeg,image/webp,image/gif" name="banner" onChange={handleImageChange} type="file" />
                {imageState.bannerPreview ? <button className="auth-inline-button" onClick={() => clearImage("banner")} type="button">Remove banner</button> : null}
              </label>
            </div>
            <div className="profile-modal-actions">
              <button className="profile-action-button" type="button" onClick={() => setEditOpen(false)}>Cancel</button>
              <button className="profile-action-button primary" disabled={editStatus === "saving"} type="submit">
                {editStatus === "saving" ? "Saving..." : "Save profile"}
              </button>
            </div>
          </form>
        </div>,
        document.body
      ) : null}

      {deleteOpen ? createPortal(
        <div className="profile-modal-backdrop" role="dialog" aria-modal="true" aria-label="Delete account">
          <div className="profile-delete-modal">
            <div className="profile-modal-header">
              <div>
                <p className="profile-kicker">Danger Zone</p>
                <h2>Delete account</h2>
              </div>
              <button className="panel-collapse-btn" type="button" onClick={() => setDeleteOpen(false)} aria-label="Close delete account">
                <X size={16} />
              </button>
            </div>
            <p>This permanently removes your account, posts, reels, uploaded media, playlists, sessions, and profile images.</p>
            <input value={deleteAccountConfirm} onChange={(event) => setDeleteAccountConfirm(event.target.value)} placeholder="Type DELETE" />
            <div className="profile-modal-actions">
              <button className="profile-action-button" type="button" onClick={() => setDeleteOpen(false)}>Cancel</button>
              <button className="profile-action-button danger" disabled={isDeletingAccount || deleteAccountConfirm.trim().toUpperCase() !== "DELETE"} type="button" onClick={handleDeleteAccount}>
                {isDeletingAccount ? "Deleting..." : "Delete forever"}
              </button>
            </div>
          </div>
        </div>,
        document.body
      ) : null}
    </section>
  );
}
