import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { BarChart3, Disc3, Eye, Grid3X3, Heart, Menu, MessageCircle, Music2, Pause, Pencil, Play, Plus, Radio, Settings, Sparkles, Trash2, TrendingUp, Upload, UserPlus, Video, X } from "lucide-react";
import API, { followUser, unfollowUser, getFollowStatus, getApiErrorMessage, getUserAudioUploads, getUserCommentedPosts, getUserPosts, getCreatorInsights, trackPostView, uploadCreatorSongs } from "../services/api";
import CreatePostModal from "../components/CreatePostModal";
import PostCard from "../components/PostCard";
import { useAuth } from "../src/context/useAuth";
import { usePlayer } from "../src/context/PlayerContext";
import { getRelativeTime } from "../src/utils/formatters";

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
  favoriteGenres: "",
  listenerInterests: [],
  creatorIntents: []
};

const IMAGE_LIMIT_BYTES = 2 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp", "image/gif"];
const MUSIC_CATEGORIES = ["Metal", "Blues", "Electronic", "Rock", "Pop", "Hip-Hop", "Jazz", "Classical", "Folk", "Country", "R&B", "Punk", "Ambient", "Indie"];
const VOD_CATEGORIES = [
  { value: "tutorial", label: "Tutorial" },
  { value: "music", label: "Music video" },
  { value: "performance", label: "Live performance" },
  { value: "behind_the_scenes", label: "Behind the scenes" },
  { value: "discover", label: "Discovery" },
  { value: "general", label: "Other" }
];
const LISTENER_INTEREST_OPTIONS = [
  { value: "tutorials", label: "Tutorials" },
  { value: "music_videos", label: "Music videos" },
  { value: "live_performances", label: "Live performances" },
  { value: "new_artists", label: "New artists" },
  { value: "instruments", label: "Instruments" },
  { value: "production", label: "Production" }
];
const CREATOR_SPECIALTIES = [
  { value: "musician", label: "Musician" },
  { value: "artist", label: "Artist" },
  { value: "teacher", label: "Teacher" },
  { value: "producer", label: "Producer" },
  { value: "instrumentalist", label: "Instrumentalist" },
  { value: "reviewer", label: "Reviewer" }
];

function profileToForm(profile = {}) {
  return {
    username: profile.username || "",
    bio: profile.bio || "",
    location: profile.location || "",
    website: profile.website || "",
    favoriteGenres: Array.isArray(profile.favoriteGenres) ? profile.favoriteGenres.join(", ") : "",
    listenerInterests: profile.onboardingPreferences?.listenerInterests || [],
    creatorIntents: profile.onboardingPreferences?.creatorIntents || []
  };
}

function toggleValue(list = [], value) {
  return list.includes(value) ? list.filter((item) => item !== value) : [...list, value];
}

function getOptionLabels(options, values = []) {
  const labels = new Map(options.map((option) => [option.value, option.label]));
  return values.map((value) => labels.get(value) || value.replaceAll("_", " ")).filter(Boolean);
}

function ProfileAvatar({ profile, className = "" }) {
  return profile?.avatarUrl ? (
    <img className={className} src={profile.avatarUrl} alt="" />
  ) : (
    <span className={className}>{profile?.username?.slice(0, 1).toUpperCase() || "K"}</span>
  );
}

function ProfilePostViewer({ currentPost, highlightCommentId = "", onClose, onPostDeleted, onSelectPost, posts }) {
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
            highlightCommentId={highlightCommentId}
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
                    <strong>{post.contentType === "reel" ? "Vod" : "Discussion"}</strong>
                    <span>{formatCompactNumber(post.viewCount || 0)} views</span>
                    <p>{decodeStoredText(post.title || post.text || `${post.mediaType || "Media"} content`)}</p>
                  </div>
                )) : <div className="profile-empty-card">Create discussions or vods to start collecting insights.</div>}
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

function CreatorWorkspaceView({ audioCount, onOpenMusic, onOpenVod, vodCount }) {
  return (
    <section className="profile-workspace-panel creator-workspace-panel">
      <div className="profile-workspace-heading">
        <p className="profile-kicker">Creator Hub</p>
        <h2>Creator tools</h2>
      </div>
      <div className="creator-action-grid">
        <button className="creator-action-card" type="button" onClick={onOpenMusic}>
          <Music2 size={22} />
          <span>Upload music</span>
          <strong>{formatCompactNumber(audioCount || 0)} tracks</strong>
        </button>
        <button className="creator-action-card" type="button" onClick={onOpenVod}>
          <Video size={22} />
          <span>Upload vod</span>
          <strong>{formatCompactNumber(vodCount || 0)} vods</strong>
        </button>
      </div>
    </section>
  );
}

export default function PublicProfile({ ownProfile = false }) {
  const { username } = useParams();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { deleteAccount, updateUser, user, isAuthenticated } = useAuth();
  const updateUserRef = useRef(updateUser);
  const { activeTrack, isPlaying, handleSelectTrack, handleTogglePlay, deleteUploadedTrack, refreshLibrary } = usePlayer();
  const [profile, setProfile] = useState(null);
  const [status, setStatus] = useState("loading");
  const [message, setMessage] = useState("");
  const [followStatus, setFollowStatus] = useState(null);
  const [isFollowLoading, setIsFollowLoading] = useState(false);
  const [leftPanelOpen, setLeftPanelOpen] = useState(true);
  const [selectedPost, setSelectedPost] = useState(null);
  const [selectedCommentId, setSelectedCommentId] = useState("");
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
  const [createDiscussionOpen, setCreateDiscussionOpen] = useState(false);
  const [creatorUploadOpen, setCreatorUploadOpen] = useState("");
  const [deleteAccountConfirm, setDeleteAccountConfirm] = useState("");
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [workspaceView, setWorkspaceView] = useState("profile");
  const [audioTracks, setAudioTracks] = useState([]);
  const [audioPagination, setAudioPagination] = useState({ page: 1, limit: 10, total: 0, pages: 0, hasNext: false, hasPrev: false });
  const [posts, setPosts] = useState([]);
  const [postsPagination, setPostsPagination] = useState({ page: 1, limit: 9, total: 0, pages: 0, hasNext: false, hasPrev: false });
  const [reels, setReels] = useState([]);
  const [reelsPagination, setReelsPagination] = useState({ page: 1, limit: 9, total: 0, pages: 0, hasNext: false, hasPrev: false });
  const [commentedPosts, setCommentedPosts] = useState([]);
  const [commentedPagination, setCommentedPagination] = useState({ page: 1, limit: 9, total: 0, pages: 0, hasNext: false, hasPrev: false });
  const [activityTab, setActivityTab] = useState("posts");
  const [contentLoading, setContentLoading] = useState(false);
  const [contentError, setContentError] = useState("");
  const [creatorInsights, setCreatorInsights] = useState(null);
  const [insightsNotice, setInsightsNotice] = useState("");
  const [musicForm, setMusicForm] = useState({ title: "", artist: user?.username || "", genre: MUSIC_CATEGORIES[0], tags: "", releaseType: "track", files: [] });
  const [musicNotice, setMusicNotice] = useState({ type: "", message: "" });
  const [isUploadingMusic, setIsUploadingMusic] = useState(false);
  const [vodForm, setVodForm] = useState({ title: "", text: "", vodCategory: "music", audienceTags: "" });
  const [vodMedia, setVodMedia] = useState(null);
  const [vodPreviewUrl, setVodPreviewUrl] = useState("");
  const [vodNotice, setVodNotice] = useState({ type: "", message: "" });
  const [isCreatingVod, setIsCreatingVod] = useState(false);
  const [editingVod, setEditingVod] = useState(null);
  const [pendingDeleteVod, setPendingDeleteVod] = useState(null);
  const [isDeletingVod, setIsDeletingVod] = useState(false);

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
      setContentError(getApiErrorMessage(error, `Unable to load ${contentType === "reel" ? "vods" : "discussions"}.`));
    } finally {
      setContentLoading(false);
    }
  }, [profile?.id]);

  const loadCommentedPosts = useCallback(async (page = 1, append = false, showError = true) => {
    if (!profile?.id) return;
    if (showError) setContentError("");
    setContentLoading(true);

    try {
      const { data } = await getUserCommentedPosts(profile.id, page, 9);
      const nextPosts = data.posts || [];
      setCommentedPosts((prev) => (append ? [...prev, ...nextPosts] : nextPosts));
      setCommentedPagination(data.pagination || { page, limit: 9, total: nextPosts.length, pages: 1, hasNext: false, hasPrev: page > 1 });
    } catch (error) {
      setCommentedPosts((prev) => (append ? prev : []));
      setCommentedPagination((current) => ({ ...current, page, total: append ? current.total : 0, hasNext: false }));
      if (showError) {
        setContentError(getApiErrorMessage(error, "Unable to load commented discussions."));
      }
    } finally {
      setContentLoading(false);
    }
  }, [profile?.id]);

  useEffect(() => {
    if (!profile?.id) return;
    if (isArtist) loadProfileAudio();
    loadProfilePosts(1, "post");
    if (isArtist) loadProfilePosts(1, "reel");
    loadCommentedPosts(1, false, false);
  }, [profile?.id, isArtist, loadCommentedPosts, loadProfileAudio, loadProfilePosts]);

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

  useEffect(() => () => {
    if (vodPreviewUrl) URL.revokeObjectURL(vodPreviewUrl);
  }, [vodPreviewUrl]);

  const artistStats = useMemo(() => {
    const totalLikes = audioTracks.reduce((total, track) => total + getTrackLikes(track), 0);
    const totalListens = audioTracks.reduce((total, track, index) => total + getTrackListens(track, index), 0);
    const genres = [...new Set(audioTracks.map((track) => track.genre).filter(Boolean))].slice(0, 4);
    return { totalLikes, totalListens, genres };
  }, [audioTracks]);

  const selectedActivity = activityTab === "vods" ? reels : activityTab === "comments" ? commentedPosts : posts;
  const selectedPagination = activityTab === "vods" ? reelsPagination : activityTab === "comments" ? commentedPagination : postsPagination;
  const profileGenres = useMemo(() => {
    if (Array.isArray(profile?.favoriteGenres)) {
      return profile.favoriteGenres.filter(Boolean);
    }
    if (typeof profile?.favoriteGenres === "string") {
      return profile.favoriteGenres.split(",").map((genre) => genre.trim()).filter(Boolean);
    }
    return [];
  }, [profile?.favoriteGenres]);
  const listenerInterestLabels = useMemo(() => (
    getOptionLabels(LISTENER_INTEREST_OPTIONS, profile?.onboardingPreferences?.listenerInterests || [])
  ), [profile?.onboardingPreferences?.listenerInterests]);
  const creatorSpecialtyLabels = useMemo(() => (
    getOptionLabels(CREATOR_SPECIALTIES, profile?.onboardingPreferences?.creatorIntents || [])
  ), [profile?.onboardingPreferences?.creatorIntents]);
  const commentHistory = useMemo(() => {
    if (!profile?.id) return [];
    return commentedPosts.flatMap((post) => (
      (post.comments || [])
        .filter((comment) => !comment.isDeleted && String(comment.author?._id || comment.author) === String(profile.id))
        .map((comment) => ({ comment, post }))
    )).sort((a, b) => new Date(b.comment.createdAt || 0) - new Date(a.comment.createdAt || 0));
  }, [commentedPosts, profile?.id]);

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
    if (activityTab === "comments") {
      await loadCommentedPosts(selectedPagination.page + 1, true);
      return;
    }
    await loadProfilePosts(selectedPagination.page + 1, activityTab === "vods" ? "reel" : "post", true);
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

  const handleOpenPost = (post, commentId = "") => {
    if (post?.contentType === "reel") {
      navigate(`/reels/${post._id}`);
      return;
    }

    setSelectedCommentId(commentId || "");
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
        setCommentedPosts((current) => current.map(updatePostViews));
      })
      .catch(() => {});
  };

  const handleOpenComment = (post, commentId) => {
    handleOpenPost(post, commentId);
  };

  const handleDeletePost = (postId) => {
    const wasPost = posts.some((post) => post._id === postId);
    const wasReel = reels.some((post) => post._id === postId);
    const wasCommented = commentedPosts.some((post) => post._id === postId);

    setPosts((current) => current.filter((post) => post._id !== postId));
    setReels((current) => current.filter((post) => post._id !== postId));
    setCommentedPosts((current) => current.filter((post) => post._id !== postId));
    setPostsPagination((current) => ({
      ...current,
      total: Math.max(0, (current.total || 0) - (wasPost ? 1 : 0))
    }));
    setReelsPagination((current) => ({
      ...current,
      total: Math.max(0, (current.total || 0) - (wasReel ? 1 : 0))
    }));
    setCommentedPagination((current) => ({
      ...current,
      total: Math.max(0, (current.total || 0) - (wasCommented ? 1 : 0))
    }));
    setSelectedPost((current) => (current?._id === postId ? null : current));
  };

  const handleDiscussionCreated = (payload) => {
    const nextPost = payload?.post || payload;
    if (!nextPost?._id) return;

    setPosts((current) => [nextPost, ...current.filter((post) => post._id !== nextPost._id)].slice(0, postsPagination.limit || 9));
    setPostsPagination((current) => ({
      ...current,
      total: (current.total || 0) + 1
    }));
    setActivityTab("posts");
    setWorkspaceView("profile");
    setSearchParams({ tab: "posts" });
  };

  const handleMusicFileChange = (event) => {
    const files = Array.from(event.target.files || []);
    const invalidFile = files.find((file) => !file.type.startsWith("audio/") || file.size > 30 * 1024 * 1024);

    if (invalidFile) {
      setMusicNotice({ type: "error", message: "Each audio file must be under 30MB." });
      event.target.value = "";
      return;
    }

    setMusicForm((current) => ({ ...current, files }));
    setMusicNotice({ type: "", message: "" });
  };

  const handleUploadMusic = async (event) => {
    event.preventDefault();
    if (!musicForm.files.length || isUploadingMusic) {
      setMusicNotice({ type: "error", message: "Choose at least one audio file." });
      return;
    }

    try {
      setIsUploadingMusic(true);
      const formData = new FormData();
      musicForm.files.forEach((file) => formData.append("songs", file));
      formData.append("title", musicForm.title);
      formData.append("artist", musicForm.artist || user?.username || "Original Artist");
      formData.append("genre", musicForm.genre);
      formData.append("tags", musicForm.tags);
      formData.append("releaseType", musicForm.releaseType);

      await uploadCreatorSongs(formData);
      setMusicForm({ title: "", artist: user?.username || "", genre: MUSIC_CATEGORIES[0], tags: "", releaseType: "track", files: [] });
      setMusicNotice({ type: "success", message: "Music uploaded." });
      await loadProfileAudio(1);
      refreshLibrary?.();
      window.setTimeout(() => setCreatorUploadOpen(""), 700);
    } catch (error) {
      setMusicNotice({ type: "error", message: getApiErrorMessage(error, "Unable to upload music.") });
    } finally {
      setIsUploadingMusic(false);
    }
  };

  const clearVodMedia = () => {
    if (vodPreviewUrl) URL.revokeObjectURL(vodPreviewUrl);
    setVodMedia(null);
    setVodPreviewUrl("");
  };

  const handleVodMediaChange = (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    const isAllowedMedia = file.type.startsWith("video/") || file.type.startsWith("image/");
    if (!isAllowedMedia) {
      setVodNotice({ type: "error", message: "Choose a video or image file." });
      return;
    }

    const maxSize = file.type.startsWith("video/") ? 100 * 1024 * 1024 : 50 * 1024 * 1024;
    if (file.size > maxSize) {
      setVodNotice({ type: "error", message: `Maximum file size is ${maxSize / (1024 * 1024)}MB.` });
      return;
    }

    clearVodMedia();
    setVodMedia(file);
    setVodPreviewUrl(URL.createObjectURL(file));
    setVodNotice({ type: "", message: "" });
  };

  const handleCreateVod = async (event) => {
    event.preventDefault();
    if (!vodMedia || isCreatingVod) return;

    try {
      setIsCreatingVod(true);
      setVodNotice({ type: "", message: "" });
      const formData = new FormData();
      formData.append("title", vodForm.title.trim());
      formData.append("text", vodForm.text.trim());
      formData.append("vodCategory", vodForm.vodCategory);
      formData.append("audienceTags", vodForm.audienceTags);
      formData.append("media", vodMedia);
      formData.append("contentType", "reel");
      const response = await API.post("/posts/reel", formData);
      const nextVod = response.data?.post || response.data;

      setVodForm({ title: "", text: "", vodCategory: "music", audienceTags: "" });
      clearVodMedia();
      if (nextVod?._id) {
        setReels((current) => [nextVod, ...current.filter((post) => post._id !== nextVod._id)]);
        setReelsPagination((current) => ({ ...current, total: (current.total || 0) + 1 }));
      } else {
        await loadProfilePosts(1, "reel");
      }
      setActivityTab("vods");
      setWorkspaceView("profile");
      setSearchParams({ tab: "posts" });
      setVodNotice({ type: "success", message: "Vod uploaded." });
      window.setTimeout(() => setCreatorUploadOpen(""), 700);
    } catch (error) {
      const serverMessage = error.response?.data?.message || error.response?.data?.msg || error.message;
      const isLargeUpload = error.response?.status === 413 || /payload too large|uploaded file is too large/i.test(serverMessage);
      setVodNotice({ type: "error", message: isLargeUpload ? "The file is too large." : getApiErrorMessage(error, "Unable to upload vod.") });
    } finally {
      setIsCreatingVod(false);
    }
  };

  const openEditVod = (post) => {
    setEditingVod({
      _id: post._id,
      title: post.title || "",
      text: post.text || "",
      vodCategory: post.vodCategory || "general",
      audienceTags: (post.audienceTags || post.tags || []).join(", ")
    });
    setVodNotice({ type: "", message: "" });
  };

  const handleUpdateVod = async (event) => {
    event.preventDefault();
    if (!editingVod?._id) return;

    try {
      setVodNotice({ type: "", message: "" });
      const { data } = await API.patch(`/posts/${editingVod._id}`, {
        title: editingVod.title,
        text: editingVod.text,
        vodCategory: editingVod.vodCategory,
        audienceTags: editingVod.audienceTags,
        tags: editingVod.audienceTags
      });

      const nextVod = data.post || data;
      setReels((current) => current.map((post) => post._id === nextVod._id ? nextVod : post));
      setEditingVod(null);
      setVodNotice({ type: "success", message: "Vod updated." });
    } catch (error) {
      setVodNotice({ type: "error", message: getApiErrorMessage(error, "Unable to update vod.") });
    }
  };

  const handleConfirmDeleteVod = async () => {
    if (!pendingDeleteVod?._id || isDeletingVod) return;

    try {
      setIsDeletingVod(true);
      setVodNotice({ type: "", message: "" });
      await API.delete(`/posts/${pendingDeleteVod._id}`);
      handleDeletePost(pendingDeleteVod._id);
      setPendingDeleteVod(null);
      setVodNotice({ type: "success", message: "Vod deleted." });
    } catch (error) {
      setVodNotice({ type: "error", message: getApiErrorMessage(error, "Unable to delete vod.") });
    } finally {
      setIsDeletingVod(false);
    }
  };

  const handleEditChange = (event) => {
    const { name, value } = event.target;
    setEditFormData((current) => ({ ...current, [name]: value }));
  };

  const toggleEditChoice = (field, value) => {
    setEditFormData((current) => ({ ...current, [field]: toggleValue(current[field] || [], value) }));
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
      profileForm.append("listenerInterests", editFormData.listenerInterests.join(","));
      profileForm.append("creatorIntents", editFormData.creatorIntents.join(","));
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
                  <Grid3X3 size={17} /> Discussions and vods
                </button>
              </div>

              <div className="profile-side-section">
                <p className="drawer-section-label">Account</p>
                <button className="profile-side-link" type="button" onClick={() => setCreateDiscussionOpen(true)}>
                  <Plus size={17} /> Start discussion
                </button>
                {isArtist ? (
                  <button className={`profile-side-link ${workspaceView === "creator" ? "active" : ""}`} type="button" onClick={() => setWorkspaceView("creator")}>
                    <Music2 size={17} /> Creator Hub
                  </button>
                ) : null}
                <button className="profile-side-link" type="button" onClick={() => setEditOpen(true)}>
                  <Pencil size={17} /> Edit profile
                </button>
                {isArtist ? (
                  <button className={`profile-side-link ${workspaceView === "analytics" ? "active" : ""}`} type="button" onClick={() => setWorkspaceView("analytics")}>
                    <BarChart3 size={17} /> Creator analytics
                  </button>
                ) : null}
                <Link className="profile-side-link" to="/feed">
                  <TrendingUp size={17} /> Explore feed
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
              <button className={`rail-btn ${showProfileContent && activeMode === "posts" ? "active" : ""}`} type="button" onClick={() => { setWorkspaceView("profile"); setSearchParams({ tab: "posts" }); }} aria-label="Discussions and vods">
                <Grid3X3 size={18} />
              </button>
              {isArtist ? (
                <button className={`rail-btn ${showProfileContent && activeMode === "artist" ? "active" : ""}`} type="button" onClick={() => { setWorkspaceView("profile"); setSearchParams({ tab: "artist" }); }} aria-label="Artist page">
                  <Radio size={18} />
                </button>
              ) : null}
              <span className="rail-divider" />
              <button className="rail-btn" type="button" onClick={() => setCreateDiscussionOpen(true)} aria-label="Start discussion">
                <Plus size={18} />
              </button>
              {isArtist ? (
                <button className={`rail-btn ${workspaceView === "creator" ? "active" : ""}`} type="button" onClick={() => setWorkspaceView("creator")} aria-label="Creator Hub">
                  <Music2 size={18} />
                </button>
              ) : null}
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
        <div className="profile-three-column">
          <main className="profile-center-column">
            <div className="profile-feed-header">
              <div>
                <p className="profile-kicker">{workspaceView === "profile" ? "Profile Feed" : workspaceView === "analytics" ? "Creator Studio" : workspaceView === "creator" ? "Creator Hub" : "Account"}</p>
                <h1>{workspaceView === "profile" ? (activeMode === "artist" ? "Artist signal" : "Discussions") : workspaceView === "analytics" ? "Analytics" : workspaceView === "creator" ? "Creator tools" : "Profile"}</h1>
              </div>
              <div className="profile-mode-tabs">
                <button type="button" className={showProfileContent && activeMode === "posts" ? "active" : ""} onClick={() => { setWorkspaceView("profile"); setSearchParams({ tab: "posts" }); }}>
                  <Grid3X3 size={16} /> Discussions
                </button>
                {isArtist ? (
                  <button type="button" className={showProfileContent && activeMode === "artist" ? "active" : ""} onClick={() => { setWorkspaceView("profile"); setSearchParams({ tab: "artist" }); }}>
                    <Radio size={16} /> Artist
                  </button>
                ) : null}
              </div>
            </div>

            {isArtist ? (
              <div className="profile-artist-switch">
                <button type="button" className="profile-action-button primary" onClick={() => { setWorkspaceView("profile"); setSearchParams({ tab: activeMode === "artist" ? "posts" : "artist" }); }}>
                  {activeMode === "artist" ? <Grid3X3 size={16} /> : <Radio size={16} />}
                  {activeMode === "artist" ? "Back to discussions" : "Shift to artist"}
                </button>
              </div>
            ) : null}

            <div className="profile-mobile-identity">
              <ProfileAvatar profile={profile} />
              <div>
                <strong>@{profile.username}</strong>
                <span>{isArtist ? "Creator" : "Listener"} profile</span>
              </div>
            </div>

            {message ? <p className="profile-inline-error">{message}</p> : null}
            {contentError ? <p className="profile-inline-error">{contentError}</p> : null}

            {workspaceView === "analytics" ? (
              <CreatorAnalyticsView creatorInsights={creatorInsights} insightsNotice={insightsNotice} />
            ) : workspaceView === "creator" && isArtist ? (
              <CreatorWorkspaceView
                audioCount={audioPagination.total}
                vodCount={reelsPagination.total}
                onOpenMusic={() => setCreatorUploadOpen("music")}
                onOpenVod={() => setCreatorUploadOpen("vod")}
              />
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
                        <div className="profile-empty-card">No public music yet.</div>
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
                      {(artistStats.genres.length ? artistStats.genres : profileGenres.length ? profileGenres : ["Discovery"]).map((genre) => (
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
                    <Grid3X3 size={15} /> Discussions {postsPagination.total}
                  </button>
                  {isArtist ? (
                    <button type="button" className={activityTab === "vods" ? "active" : ""} onClick={() => setActivityTab("vods")}>
                      <Sparkles size={15} /> Vods {reelsPagination.total}
                    </button>
                  ) : null}
                  <button type="button" className={activityTab === "comments" ? "active" : ""} onClick={() => setActivityTab("comments")}>
                    <MessageCircle size={15} /> Comments {commentedPagination.total}
                  </button>
                </div>

                {activityTab === "comments" ? (
                  <div className="profile-comment-history">
                    {commentHistory.length ? commentHistory.map(({ comment, post }) => (
                      <button className="profile-comment-card" type="button" onClick={() => handleOpenComment(post, comment._id)} key={`${post._id}-${comment._id}`}>
                        <span>{getRelativeTime(new Date(comment.createdAt))}</span>
                        <strong>{getPostPreview(post)}</strong>
                        <p>{decodeStoredText(comment.text)}</p>
                      </button>
                    )) : (
                      <div className="profile-empty-card">No commented discussions yet.</div>
                    )}
                  </div>
                ) : (
                <div className="profile-post-grid">
                  {selectedActivity.length ? selectedActivity.map((post) => (
                    <button className="profile-post-tile" type="button" onClick={() => handleOpenPost(post)} key={post._id}>
                      {post.mediaUrl && post.mediaType === "image" ? <img src={post.mediaUrl} alt="" /> : null}
                      {post.mediaUrl && post.mediaType === "video" ? <video src={post.mediaUrl} muted playsInline /> : null}
                      {isOwnProfile && post.contentType === "reel" ? (
                        <span className="profile-vod-tile-actions">
                          <span
                            role="button"
                            tabIndex={0}
                            onClick={(event) => { event.stopPropagation(); openEditVod(post); }}
                            onKeyDown={(event) => { if (event.key === "Enter") { event.stopPropagation(); openEditVod(post); } }}
                          >
                            <Pencil size={14} />
                          </span>
                          <span
                            role="button"
                            tabIndex={0}
                            aria-label={`Delete ${getPostPreview(post)}`}
                            onClick={(event) => { event.stopPropagation(); setPendingDeleteVod(post); }}
                            onKeyDown={(event) => {
                              if (event.key === "Enter" || event.key === " ") {
                                event.preventDefault();
                                event.stopPropagation();
                                setPendingDeleteVod(post);
                              }
                            }}
                          >
                            <Trash2 size={14} />
                          </span>
                        </span>
                      ) : null}
                      <div className="profile-post-overlay">
                        <strong>{getPostPreview(post)}</strong>
                        {post.contentType === "reel" ? <span>{VOD_CATEGORIES.find((category) => category.value === post.vodCategory)?.label || "Vod"}</span> : null}
                        <span><Heart size={14} /> {post.likes?.length || 0}</span>
                        <span><MessageCircle size={14} /> {(post.comments || []).length}</span>
                      </div>
                    </button>
                  )) : (
                    <div className="profile-empty-card">
                      {activityTab === "vods" ? "No vods yet." : activityTab === "comments" ? "No commented discussions yet." : "No discussions yet."}
                    </div>
                  )}
                </div>
                )}

                {selectedPagination.hasNext ? <button type="button" className="profile-load-more" onClick={handleLoadMoreActivity}>Load more</button> : null}
              </div>
            )}
          </main>

          <aside className="profile-identity-panel" aria-label="Profile details">
            <div className="profile-identity-card">
              <div className="profile-identity-banner" style={{ backgroundImage: profile.bannerUrl ? `url(${profile.bannerUrl})` : "" }}>
                <div className="profile-identity-banner-glow" />
              </div>
              <div className="profile-identity-body">
                <div className="profile-identity-avatar">
                  <ProfileAvatar profile={profile} />
                </div>
                <p className="profile-kicker">{isArtist ? "KeyVoid Creator" : "KeyVoid Listener"}</p>
                <h2>{profile.username}</h2>
                <p>{profile.bio || "This profile is still tuning their signal."}</p>
                <div className="profile-identity-stats">
                  <span><strong>{formatCompactNumber(profile.followersCount)}</strong> Followers</span>
                  <span><strong>{formatCompactNumber(profile.followingCount)}</strong> Following</span>
                  {isArtist ? <span><strong>{formatCompactNumber(audioPagination.total)}</strong> Tracks</span> : null}
                </div>
                <div className="profile-detail-list">
                  <div>
                    <span>Location</span>
                    <strong>{profile.location || "Not set"}</strong>
                  </div>
                  <div>
                    <span>Website</span>
                    {profile.website ? <a href={profile.website} target="_blank" rel="noreferrer">{profile.website}</a> : <strong>Not set</strong>}
                  </div>
                  <div>
                    <span>Role</span>
                    <strong>{isArtist ? "Creator" : "Listener"}</strong>
                  </div>
                </div>
                <div className="profile-chip-row compact">
                  {(profileGenres.length ? profileGenres : ["Discovery"]).map((genre) => (
                    <span className="profile-chip" key={genre}>{genre}</span>
                  ))}
                </div>
                <div className="profile-detail-list">
                  <div>
                    <span>{isArtist ? "Specialty" : "Looking for"}</span>
                    <strong>
                      {(isArtist ? creatorSpecialtyLabels : listenerInterestLabels).slice(0, 3).join(", ") || "Not set"}
                    </strong>
                  </div>
                </div>
                <div className="profile-identity-actions">
                  {!isOwnProfile && isAuthenticated ? (
                    <button type="button" className="profile-action-button primary" onClick={handleFollowToggle} disabled={isFollowLoading}>
                      <UserPlus size={16} /> {isFollowLoading ? "..." : followStatus?.isFollowing ? "Following" : "Follow"}
                    </button>
                  ) : null}
                  {isOwnProfile ? <button className="profile-action-button" type="button" onClick={() => setEditOpen(true)}>Edit Profile</button> : null}
                </div>
              </div>
            </div>
          </aside>
        </div>
      </div>

      {selectedPost ? createPortal(
        <ProfilePostViewer
          currentPost={selectedPost}
          highlightCommentId={selectedCommentId}
          posts={selectedActivity}
          onSelectPost={handleOpenPost}
          onPostDeleted={handleDeletePost}
          onClose={() => { setSelectedPost(null); setSelectedCommentId(""); }}
        />,
        document.body
      ) : null}

      <CreatePostModal
        isOpen={createDiscussionOpen}
        onClose={() => setCreateDiscussionOpen(false)}
        onPostCreated={handleDiscussionCreated}
      />

      {creatorUploadOpen === "music" ? createPortal(
        <div className="profile-modal-backdrop" role="dialog" aria-modal="true" aria-label="Upload music">
          <form className="profile-edit-modal creator-upload-modal" onSubmit={handleUploadMusic}>
            <div className="profile-modal-header">
              <div>
                <p className="profile-kicker">Music</p>
                <h2>Upload music</h2>
              </div>
              <button className="panel-collapse-btn" type="button" onClick={() => setCreatorUploadOpen("")} aria-label="Close upload music">
                <X size={16} />
              </button>
            </div>
            {musicNotice.message ? <p className={musicNotice.type === "success" ? "auth-success" : "auth-error"}>{musicNotice.message}</p> : null}
            <div className="profile-edit-grid">
              <label className="auth-field">
                <span>Title</span>
                <input maxLength="100" value={musicForm.title} onChange={(event) => setMusicForm((current) => ({ ...current, title: event.target.value }))} />
              </label>
              <label className="auth-field">
                <span>Artist</span>
                <input maxLength="80" value={musicForm.artist} onChange={(event) => setMusicForm((current) => ({ ...current, artist: event.target.value }))} />
              </label>
              <label className="auth-field">
                <span>Release</span>
                <select value={musicForm.releaseType} onChange={(event) => setMusicForm((current) => ({ ...current, releaseType: event.target.value }))}>
                  <option value="track">Track</option>
                  <option value="single">Single</option>
                  <option value="ep">EP</option>
                  <option value="album">Album</option>
                </select>
              </label>
              <label className="auth-field">
                <span>Genre</span>
                <select value={musicForm.genre} onChange={(event) => setMusicForm((current) => ({ ...current, genre: event.target.value }))}>
                  {MUSIC_CATEGORIES.map((category) => <option key={category} value={category}>{category}</option>)}
                </select>
              </label>
              <label className="auth-field profile-wide-field">
                <span>Tags</span>
                <input maxLength="180" value={musicForm.tags} onChange={(event) => setMusicForm((current) => ({ ...current, tags: event.target.value }))} />
              </label>
              <label className="auth-field profile-wide-field">
                <span>Audio files</span>
                <input accept="audio/*" multiple onChange={handleMusicFileChange} type="file" />
                <small>{musicForm.files.length ? `${musicForm.files.length} selected` : "No files selected"}</small>
              </label>
            </div>
            <div className="profile-modal-actions">
              <button className="profile-action-button" type="button" onClick={() => setCreatorUploadOpen("")}>Cancel</button>
              <button className="profile-action-button primary" disabled={isUploadingMusic} type="submit">
                <Upload size={16} /> {isUploadingMusic ? "Uploading..." : "Upload"}
              </button>
            </div>
          </form>
        </div>,
        document.body
      ) : null}

      {creatorUploadOpen === "vod" ? createPortal(
        <div className="profile-modal-backdrop" role="dialog" aria-modal="true" aria-label="Upload vod">
          <form className="profile-edit-modal creator-upload-modal" onSubmit={handleCreateVod}>
            <div className="profile-modal-header">
              <div>
                <p className="profile-kicker">Vod</p>
                <h2>Upload vod</h2>
              </div>
              <button className="panel-collapse-btn" type="button" onClick={() => setCreatorUploadOpen("")} aria-label="Close upload vod">
                <X size={16} />
              </button>
            </div>
            {vodNotice.message ? <p className={vodNotice.type === "success" ? "auth-success" : "auth-error"}>{vodNotice.message}</p> : null}
            <div className="profile-edit-grid">
              <label className="auth-field profile-wide-field">
                <span>Title</span>
                <input maxLength="140" value={vodForm.title} onChange={(event) => setVodForm((current) => ({ ...current, title: event.target.value }))} placeholder="Name this VOD" />
              </label>
              <label className="auth-field">
                <span>Category</span>
                <select value={vodForm.vodCategory} onChange={(event) => setVodForm((current) => ({ ...current, vodCategory: event.target.value }))}>
                  {VOD_CATEGORIES.map((category) => <option key={category.value} value={category.value}>{category.label}</option>)}
                </select>
              </label>
              <label className="auth-field">
                <span>Audience tags</span>
                <input maxLength="180" value={vodForm.audienceTags} onChange={(event) => setVodForm((current) => ({ ...current, audienceTags: event.target.value }))} placeholder="guitar, beginner, live" />
              </label>
              <label className="auth-field profile-wide-field">
                <span>Description</span>
                <textarea maxLength="500" rows="4" value={vodForm.text} onChange={(event) => setVodForm((current) => ({ ...current, text: event.target.value }))} />
              </label>
              <label className="auth-field profile-wide-field">
                <span>Media</span>
                <input accept="video/*,image/*" onChange={handleVodMediaChange} type="file" />
              </label>
              {vodPreviewUrl ? (
                <div className="creator-vod-preview profile-wide-field">
                  {vodMedia?.type.startsWith("video/") ? <video src={vodPreviewUrl} controls /> : <img src={vodPreviewUrl} alt="" />}
                  <button type="button" onClick={clearVodMedia}><X size={16} /></button>
                </div>
              ) : null}
            </div>
            <div className="profile-modal-actions">
              <button className="profile-action-button" type="button" onClick={() => setCreatorUploadOpen("")}>Cancel</button>
              <button className="profile-action-button primary" disabled={!vodMedia || isCreatingVod} type="submit">
                <Upload size={16} /> {isCreatingVod ? "Uploading..." : "Upload vod"}
              </button>
            </div>
          </form>
        </div>,
        document.body
      ) : null}

      {editingVod ? createPortal(
        <div className="profile-modal-backdrop" role="dialog" aria-modal="true" aria-label="Edit vod">
          <form className="profile-edit-modal creator-upload-modal" onSubmit={handleUpdateVod}>
            <div className="profile-modal-header">
              <div>
                <p className="profile-kicker">Vod</p>
                <h2>Edit vod</h2>
              </div>
              <button className="panel-collapse-btn" type="button" onClick={() => setEditingVod(null)} aria-label="Close edit vod">
                <X size={16} />
              </button>
            </div>
            {vodNotice.message ? <p className={vodNotice.type === "success" ? "auth-success" : "auth-error"}>{vodNotice.message}</p> : null}
            <div className="profile-edit-grid">
              <label className="auth-field profile-wide-field">
                <span>Title</span>
                <input maxLength="140" value={editingVod.title} onChange={(event) => setEditingVod((current) => ({ ...current, title: event.target.value }))} />
              </label>
              <label className="auth-field">
                <span>Category</span>
                <select value={editingVod.vodCategory} onChange={(event) => setEditingVod((current) => ({ ...current, vodCategory: event.target.value }))}>
                  {VOD_CATEGORIES.map((category) => <option key={category.value} value={category.value}>{category.label}</option>)}
                </select>
              </label>
              <label className="auth-field">
                <span>Audience tags</span>
                <input maxLength="180" value={editingVod.audienceTags} onChange={(event) => setEditingVod((current) => ({ ...current, audienceTags: event.target.value }))} />
              </label>
              <label className="auth-field profile-wide-field">
                <span>Description</span>
                <textarea maxLength="500" rows="4" value={editingVod.text} onChange={(event) => setEditingVod((current) => ({ ...current, text: event.target.value }))} />
              </label>
            </div>
            <div className="profile-modal-actions">
              <button className="profile-action-button" type="button" onClick={() => setEditingVod(null)}>Cancel</button>
              <button className="profile-action-button primary" type="submit">Save vod</button>
            </div>
          </form>
        </div>,
        document.body
      ) : null}

      {pendingDeleteVod ? createPortal(
        <div
          className="profile-modal-backdrop"
          role="dialog"
          aria-modal="true"
          aria-label="Confirm vod deletion"
          onMouseDown={() => !isDeletingVod && setPendingDeleteVod(null)}
        >
          <div className="profile-delete-modal" onMouseDown={(event) => event.stopPropagation()}>
            <div className="profile-modal-header">
              <div>
                <p className="profile-kicker">Delete vod</p>
                <h2>Delete this video?</h2>
              </div>
              <button
                className="panel-collapse-btn"
                type="button"
                disabled={isDeletingVod}
                onClick={() => setPendingDeleteVod(null)}
                aria-label="Close delete confirmation"
              >
                <X size={16} />
              </button>
            </div>
            <p>"{getPostPreview(pendingDeleteVod)}" will be permanently removed.</p>
            {vodNotice.type === "error" ? <p className="auth-error">{vodNotice.message}</p> : null}
            <div className="profile-modal-actions">
              <button className="profile-action-button" type="button" disabled={isDeletingVod} onClick={() => setPendingDeleteVod(null)}>
                Cancel
              </button>
              <button className="profile-action-button danger" type="button" disabled={isDeletingVod} onClick={handleConfirmDeleteVod}>
                {isDeletingVod ? "Deleting..." : "Delete vod"}
              </button>
            </div>
          </div>
        </div>,
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
              <div className="auth-field profile-wide-field">
                <span>Content you want recommended</span>
                <div className="auth-choice-grid">
                  {LISTENER_INTEREST_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      className={editFormData.listenerInterests.includes(option.value) ? "auth-choice-chip active" : "auth-choice-chip"}
                      onClick={() => toggleEditChoice("listenerInterests", option.value)}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>
              {isArtist ? (
                <div className="auth-field profile-wide-field">
                  <span>Creator specialty</span>
                  <div className="auth-choice-grid">
                    {CREATOR_SPECIALTIES.map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        className={editFormData.creatorIntents.includes(option.value) ? "auth-choice-chip active" : "auth-choice-chip"}
                        onClick={() => toggleEditChoice("creatorIntents", option.value)}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}
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
            <p>This permanently removes your account, discussions, vods, uploaded media, playlists, sessions, and profile images.</p>
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
