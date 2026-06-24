import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  Bookmark,
  Eye,
  Flag,
  Heart,
  MessageCircle,
  Music2,
  Play,
  Search,
  Send,
  Share2,
  Sparkles,
  UserRoundCheck,
  Video,
  X
} from "lucide-react";
import { useAuth } from "../src/context/useAuth";
import API, { getApiErrorMessage, reportPost, trackPostView } from "../services/api";
import { getRelativeTime } from "../src/utils/formatters";
import "./Reels.css";

const FALLBACK_SECTIONS = [
  { key: "discover", title: "Discover", description: "Fresh and trending VODs from across KeyVoid.", items: [] },
  { key: "tutorial", title: "Tutorials", description: "Lessons, walkthroughs, technique breakdowns, and teaching clips.", items: [] },
  { key: "music", title: "Music VODs", description: "Songs, sessions, listening cuts, and creator music videos.", items: [] },
  { key: "following", title: "Following", description: "VODs from creators you follow.", items: [] }
];

const SECTION_ICONS = {
  discover: Sparkles,
  tutorial: Video,
  music: Music2,
  following: UserRoundCheck
};

function getVodTitle(vod) {
  return vod?.title || vod?.text || "Untitled VOD";
}

function getVodMeta(vod) {
  const category = String(vod?.vodCategory || "general").replaceAll("_", " ");
  return `${category} - ${getRelativeTime(vod?.createdAt)}`;
}

function VodCard({ vod }) {
  const likes = vod.likes?.length || 0;
  const comments = (vod.comments || []).filter((comment) => !comment.isDeleted).length;

  return (
    <Link className="vod-card" to={`/reels/${vod._id}`}>
      <span className="vod-thumb">
        {vod.mediaType === "video" ? (
          <video src={vod.mediaUrl} muted playsInline preload="metadata" />
        ) : (
          <img src={vod.mediaUrl || vod.author?.avatarUrl || "/default-avatar.png"} alt="" />
        )}
        <span className="vod-play-badge"><Play size={15} fill="currentColor" /></span>
      </span>
      <span className="vod-card-body">
        <strong>{getVodTitle(vod)}</strong>
        <span>{vod.author?.username || "KeyVoid creator"}</span>
        <small><Eye size={13} /> {vod.viewCount || 0} views <Heart size={13} /> {likes} <MessageCircle size={13} /> {comments}</small>
      </span>
    </Link>
  );
}

function VodRow({ section }) {
  const Icon = SECTION_ICONS[section.key] || Sparkles;

  return (
    <section className="vod-row" aria-label={section.title}>
      <div className="vod-row-header">
        <div>
          <h2><Icon size={18} /> {section.title}</h2>
        </div>
      </div>

      {section.items.length > 0 ? (
        <div className="vod-scroll-row">
          {section.items.map((vod) => (
            <VodCard key={vod._id} vod={vod} />
          ))}
        </div>
      ) : (
        <div className="vod-row-empty">
          <span>No VODs in this row yet.</span>
        </div>
      )}
    </section>
  );
}

function WatchPanel({ vod, onUpdated }) {
  const { user, isAuthenticated } = useAuth();
  const userId = user?.id;
  const vodId = vod?._id;
  const [likes, setLikes] = useState(vod?.likes?.length || 0);
  const [liked, setLiked] = useState(false);
  const [views, setViews] = useState(vod?.viewCount || 0);
  const [comments, setComments] = useState([]);
  const [commentText, setCommentText] = useState("");
  const [notice, setNotice] = useState("");
  const [isLiking, setIsLiking] = useState(false);
  const videoRef = useRef(null);

  useEffect(() => {
    setLikes(vod?.likes?.length || 0);
    setViews(vod?.viewCount || 0);
    setComments((vod?.comments || []).filter((comment) => !comment.isDeleted));
    setLiked(Boolean(userId && vod?.likes?.some((id) => String(id) === String(userId))));
    setCommentText("");
    setNotice("");
    if (videoRef.current) videoRef.current.currentTime = 0;
  }, [userId, vod]);

  useEffect(() => {
    if (!vodId) return;
    const seenKey = `keyvoid_viewed_post_${vodId}`;
    if (sessionStorage.getItem(seenKey)) return;

    const timer = window.setTimeout(() => {
      sessionStorage.setItem(seenKey, "1");
      trackPostView(vodId)
        .then((response) => {
          if (typeof response.data?.viewCount === "number") {
            setViews(response.data.viewCount);
            onUpdated?.(vodId, { viewCount: response.data.viewCount });
          }
        })
        .catch(() => sessionStorage.removeItem(seenKey));
    }, 1100);

    return () => window.clearTimeout(timer);
  }, [onUpdated, vodId]);

  const handleLike = async () => {
    if (!isAuthenticated || isLiking || !vodId) return;

    try {
      setIsLiking(true);
      const response = await API.patch(`/posts/${vodId}/like`);
      setLikes(response.data.likesCount);
      setLiked(response.data.liked);
    } finally {
      setIsLiking(false);
    }
  };

  const handleComment = async () => {
    if (!commentText.trim() || !vodId) return;

    try {
      const response = await API.post(`/posts/${vodId}/comments`, { text: commentText });
      setComments((current) => [
        {
          ...response.data.comment,
          author: {
            _id: userId,
            username: user?.username,
            avatarUrl: user?.avatarUrl
          }
        },
        ...current
      ]);
      setCommentText("");
    } catch (err) {
      setNotice(getApiErrorMessage(err, "Failed to comment"));
    }
  };

  const handleReport = async () => {
    if (!isAuthenticated || !vodId) return;

    try {
      await reportPost(vodId, { reason: "Other", details: "Reported from VOD library" });
      setNotice("Sent to moderation");
    } catch (err) {
      setNotice(getApiErrorMessage(err, "Unable to report"));
    }
  };

  if (!vod) {
    return (
      <section className="vod-watch-panel vod-watch-empty">
        <Sparkles size={30} />
        <h1>No VOD selected</h1>
        <p>Pick a video from a row to start watching.</p>
      </section>
    );
  }

  return (
    <section className="vod-watch-panel">
      <div className="vod-player">
        {vod.mediaType === "video" ? (
          <video ref={videoRef} src={vod.mediaUrl} controls playsInline poster={vod.author?.avatarUrl || ""} />
        ) : (
          <img src={vod.mediaUrl || vod.author?.avatarUrl || "/default-avatar.png"} alt={getVodTitle(vod)} />
        )}
      </div>

      <div className="vod-watch-grid">
        <article className="vod-details">
          <p className="vod-kicker">{getVodMeta(vod)}</p>
          <h1>{getVodTitle(vod)}</h1>
          {vod.text ? <p className="vod-description">{vod.text}</p> : null}

          <div className="vod-author-line">
            <img src={vod.author?.avatarUrl || "/default-avatar.png"} alt="" />
            <div>
              <strong>{vod.author?.username || "KeyVoid creator"}</strong>
              <span>{vod.author?.role === "creator" ? "Creator" : "Member"}</span>
            </div>
          </div>

          <div className="vod-action-row">
            <button type="button" onClick={handleLike} disabled={!isAuthenticated || isLiking} className={liked ? "active" : ""}>
              <Heart size={17} fill={liked ? "currentColor" : "none"} /> {likes}
            </button>
            <button type="button" disabled>
              <Eye size={17} /> {views}
            </button>
            <button type="button">
              <Share2 size={17} /> Share
            </button>
            <button type="button">
              <Bookmark size={17} /> Save
            </button>
            <button type="button" onClick={handleReport} disabled={!isAuthenticated}>
              <Flag size={17} /> Report
            </button>
          </div>

          {notice ? (
            <p className="vod-notice">
              {notice}
              <button type="button" onClick={() => setNotice("")} aria-label="Dismiss"><X size={14} /></button>
            </p>
          ) : null}
        </article>

        <aside className="vod-comments">
          <h2>Comments</h2>
          {isAuthenticated ? (
            <div className="vod-comment-box">
              <input
                value={commentText}
                onChange={(event) => setCommentText(event.target.value)}
                onKeyDown={(event) => event.key === "Enter" && handleComment()}
                placeholder="Add a comment"
                maxLength={280}
              />
              <button type="button" onClick={handleComment} disabled={!commentText.trim()}>
                <Send size={16} />
              </button>
            </div>
          ) : null}

          <div className="vod-comment-list">
            {comments.length > 0 ? comments.map((comment) => (
              <div key={comment._id} className="vod-comment">
                <img src={comment.author?.avatarUrl || "/default-avatar.png"} alt="" />
                <div>
                  <strong>{comment.author?.username || "Listener"}</strong>
                  <p>{comment.text}</p>
                  <span>{getRelativeTime(comment.createdAt)}</span>
                </div>
              </div>
            )) : <p className="vod-muted">No comments yet.</p>}
          </div>
        </aside>
      </div>
    </section>
  );
}

export default function Reels() {
  const { vodId } = useParams();
  const navigate = useNavigate();
  const [sections, setSections] = useState(FALLBACK_SECTIONS);
  const [selectedVod, setSelectedVod] = useState(null);
  const [activeSection, setActiveSection] = useState("discover");
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchSections = useCallback(async () => {
    try {
      setIsLoading(true);
      setError("");
      const response = await API.get("/posts/vods/sections", { params: { limit: 12 } });
      const nextSections = response.data.sections?.length ? response.data.sections : FALLBACK_SECTIONS;
      setSections(nextSections);
      setSelectedVod((current) => current || nextSections.flatMap((section) => section.items)[0] || null);
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to load VODs."));
      setSections(FALLBACK_SECTIONS);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSections();
  }, [fetchSections]);

  useEffect(() => {
    if (!vodId) {
      setSelectedVod(null);
      return;
    }

    let ignore = false;
    API.get(`/posts/${vodId}`)
      .then(({ data }) => {
        if (!ignore) setSelectedVod(data.post || null);
      })
      .catch(() => {
        if (!ignore) setError("Unable to load this VOD.");
      });

    return () => {
      ignore = true;
    };
  }, [vodId]);

  const filteredSections = useMemo(() => {
    const query = search.trim().toLowerCase();

    return sections
      .filter((section) => activeSection === "all" || section.key === activeSection)
      .map((section) => ({
        ...section,
        items: query
          ? section.items.filter((vod) => {
              const haystack = [vod.title, vod.text, vod.author?.username, vod.vodCategory, ...(vod.tags || []), ...(vod.audienceTags || [])]
                .filter(Boolean)
                .join(" ")
                .toLowerCase();
              return haystack.includes(query);
            })
          : section.items
      }));
  }, [activeSection, search, sections]);

  const updateVodInRows = useCallback((vodId, patch) => {
    setSections((current) => current.map((section) => ({
      ...section,
      items: section.items.map((item) => item._id === vodId ? { ...item, ...patch } : item)
    })));
    setSelectedVod((current) => current?._id === vodId ? { ...current, ...patch } : current);
  }, []);

  const allRecommendations = useMemo(() => (
    sections
      .flatMap((section) => section.items)
      .filter((item, index, list) => item?._id && item._id !== selectedVod?._id && list.findIndex((other) => other._id === item._id) === index)
      .slice(0, 12)
  ), [sections, selectedVod?._id]);

  if (vodId) {
    return (
      <div className="vod-page vod-page-watch">
        <div className="vod-watch-shell">
          <main className="vod-watch-main">
            <button type="button" className="vod-back-link" onClick={() => navigate("/reels")}>
              Browse VODs
            </button>
            {error ? (
              <div className="vod-error">
                <span>{error}</span>
                <button type="button" onClick={() => navigate("/reels")}>Back</button>
              </div>
            ) : null}
            <WatchPanel vod={selectedVod} onUpdated={updateVodInRows} />
          </main>

          <aside className="vod-recommendation-rail" aria-label="Recommended VODs">
            <div className="vod-rail-tabs">
              <span>All</span>
              <span>Following</span>
              <span>Similar</span>
            </div>
            {allRecommendations.length ? allRecommendations.map((vod) => (
              <Link className="vod-rail-item" to={`/reels/${vod._id}`} key={vod._id}>
                <span className="vod-rail-thumb">
                  {vod.mediaType === "video" ? <video src={vod.mediaUrl} muted playsInline preload="metadata" /> : <img src={vod.mediaUrl || vod.author?.avatarUrl || "/default-avatar.png"} alt="" />}
                </span>
                <span>
                  <strong>{getVodTitle(vod)}</strong>
                  <small>{vod.author?.username || "KeyVoid creator"}</small>
                  <small>{vod.viewCount || 0} views - {getRelativeTime(vod.createdAt)}</small>
                </span>
              </Link>
            )) : (
              <p className="vod-muted">More recommendations will appear as creators upload VODs.</p>
            )}
          </aside>
        </div>
      </div>
    );
  }

  return (
    <div className="vod-page">
      <div className="vod-shell">
        <header className="vod-header">
          <div>
            <h1>Vods</h1>
          </div>
          <form className="vod-search" onSubmit={(event) => event.preventDefault()}>
            <Search size={17} />
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search VODs" />
          </form>
        </header>

        <nav className="vod-section-tabs" aria-label="VOD sections">
          <button type="button" className={activeSection === "all" ? "active" : ""} onClick={() => setActiveSection("all")}>All</button>
          {sections.map((section) => (
            <button key={section.key} type="button" className={activeSection === section.key ? "active" : ""} onClick={() => setActiveSection(section.key)}>
              {section.title}
            </button>
          ))}
        </nav>

        {error ? (
          <div className="vod-error">
            <span>{error}</span>
            <button type="button" onClick={fetchSections}>Retry</button>
          </div>
        ) : null}

        {isLoading ? (
          <div className="vod-loading">Loading VOD library...</div>
        ) : (
          <div className="vod-browse-grid">
            {filteredSections.map((section) => (
              <VodRow key={section.key} section={section} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
