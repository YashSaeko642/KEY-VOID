import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, CircleHelp, Headphones, Info, Lightbulb, MessageSquare, Newspaper, Palette, Plus, Search, Sparkles, Tags, TrendingUp, Users, X } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../src/context/useAuth";
import API, { getApiErrorMessage } from "../services/api";
import CreatePostModal from "../components/CreatePostModal";
import PostCard from "../components/PostCard";
import ErrorBoundary from "../components/ErrorBoundary";
import "./Feed.css";

const CATEGORY_CARDS = [
  {
    key: "discussion",
    title: "Discussion",
    prompt: "Artists, albums, scenes, opinions, and music culture.",
    image: "linear-gradient(135deg, rgba(14, 165, 233, 0.36), rgba(99, 102, 241, 0.22))",
    icon: MessageSquare
  },
  {
    key: "question",
    title: "Question",
    prompt: "Ask for help with theory, production, gear, or discovery.",
    image: "linear-gradient(135deg, rgba(34, 197, 94, 0.28), rgba(59, 130, 246, 0.2))",
    icon: CircleHelp
  },
  {
    key: "news",
    title: "News",
    prompt: "Fresh drops, tour news, scene updates, and industry talk.",
    image: "linear-gradient(135deg, rgba(244, 114, 182, 0.3), rgba(251, 191, 36, 0.2))",
    icon: Newspaper
  },
  {
    key: "recommendation",
    title: "Recommendation",
    prompt: "Find what to play next, from hidden gems to classics.",
    image: "linear-gradient(135deg, rgba(45, 212, 191, 0.28), rgba(168, 85, 247, 0.18))",
    icon: Headphones
  },
  {
    key: "fan_content",
    title: "Fan Content",
    prompt: "Edits, covers, reactions, fan theories, and community fun.",
    image: "linear-gradient(135deg, rgba(251, 146, 60, 0.28), rgba(99, 102, 241, 0.2))",
    icon: Palette
  }
];

const MODE_LABELS = {
  global: "For You",
  following: "Following",
  trending: "Trending"
};

function KVMark({ size = 32, spinning = false }) {
  return (
    <span
      className={spinning ? "kv-mark kv-mark--spin" : "kv-mark"}
      style={{ fontSize: size, lineHeight: 1 }}
      aria-hidden="true"
    >
      ✦
    </span>
  );
}

function Feed() {
  const { isAuthenticated } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const [posts, setPosts] = useState([]);
  const [feedMeta, setFeedMeta] = useState({ categories: {}, tags: [], personalTags: [] });
  const [isLoading, setIsLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(Boolean(location.state?.openCreatePost));
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [hasNext, setHasNext] = useState(true);
  const loadMoreTrigger = useRef(null);

  const [mode, setMode] = useState("global");
  const [sort, setSort] = useState("recommended");
  const [category, setCategory] = useState("");
  const [tag, setTag] = useState("");
  const [tagDraft, setTagDraft] = useState("");

  // Left panel state
  const [drawerOpen, setDrawerOpen] = useState(true);
  const [rightPanelOpen, setRightPanelOpen] = useState(true);

  useEffect(() => {
    if (location.state?.openCreatePost) {
      setIsModalOpen(true);
      navigate(location.pathname, { replace: true });
    }
  }, [location.pathname, location.state, navigate]);

  const endpoint = useMemo(() => {
    if (mode === "following") return "/posts/following";
    if (mode === "trending") return "/posts/trending";
    return "/posts";
  }, [mode]);

  const fetchPosts = useCallback(async (pageNum = 1) => {
    try {
      setIsLoading(true);
      setError(null);
      const res = await API.get(endpoint, {
        params: { page: pageNum, limit: 10, sort, category: category || undefined, tag: tag || undefined }
      });
      const postsData = Array.isArray(res.data.posts) ? res.data.posts : [];
      const pagination = res.data.pagination || {};
      setPosts((prev) => {
        const existingIds = new Set(pageNum === 1 ? [] : prev.map((p) => p._id));
        const uniqueNew = postsData.filter((p) => !existingIds.has(p._id));
        const combined = pageNum === 1 ? uniqueNew : [...prev, ...uniqueNew];
        return combined.length > 60 ? combined.slice(combined.length - 60) : combined;
      });
      setHasNext(Boolean(pagination.hasNext));
      setPage(pageNum);
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to load posts."));
      setPosts([]);
      setHasNext(false);
    } finally {
      setIsLoading(false);
    }
  }, [category, endpoint, sort, tag]);

  const fetchFeedMeta = useCallback(async () => {
    try {
      const [{ data: platformMeta }, personalMeta] = await Promise.all([
        API.get("/posts/meta"),
        isAuthenticated
          ? API.get("/posts/meta/me").catch(() => ({ data: { tags: [] } }))
          : Promise.resolve({ data: { tags: [] } })
      ]);

      setFeedMeta({
        categories: platformMeta.categories || {},
        tags: platformMeta.tags || [],
        personalTags: personalMeta.data.tags || []
      });
    } catch {
      setFeedMeta({ categories: {}, tags: [], personalTags: [] });
    }
  }, [isAuthenticated]);

  useEffect(() => { fetchFeedMeta(); }, [fetchFeedMeta]);

  useEffect(() => {
    setPosts([]);
    setHasNext(true);
    setPage(1);
    fetchPosts(1);
  }, [mode, sort, category, tag, fetchPosts]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && hasNext && !isLoading) fetchPosts(page + 1);
      },
      { rootMargin: "260px" }
    );
    if (loadMoreTrigger.current) observer.observe(loadMoreTrigger.current);
    return () => observer.disconnect();
  }, [fetchPosts, hasNext, isLoading, page]);

  const handlePostCreated = (post) => {
    setPosts((prev) => [post, ...prev].slice(0, 60));
    fetchFeedMeta();
  };

  const handlePostDeleted = (postId) => {
    setPosts((prev) => prev.filter((p) => p._id !== postId));
    fetchFeedMeta();
  };

  const applyTagFilter = (nextTag) => {
    const normalized = String(nextTag || "").replace(/^\/+/, "").trim().toLowerCase();
    setTag(normalized);
    setTagDraft(normalized ? `/${normalized}` : "");
  };

  const applyCategory = (key) => {
    setCategory((cur) => cur === key ? "" : key);
  };

  const clearFilters = () => {
    setCategory("");
    applyTagFilter("");
  };

  const activeTitle = tag
    ? `/${tag}`
    : category
      ? CATEGORY_CARDS.find((c) => c.key === category)?.title || "Category"
      : MODE_LABELS[mode];

  const activeCategoryCard = CATEGORY_CARDS.find((c) => c.key === category);

  return (
    <ErrorBoundary>
      <div
        className={[
          "feed-page",
          drawerOpen ? "feed-page--panel-open" : "feed-page--panel-closed",
          rightPanelOpen ? "feed-page--right-open" : "feed-page--right-closed"
        ].join(" ")}
      >
        {isModalOpen && (
          <CreatePostModal
            isOpen={isModalOpen}
            onClose={() => setIsModalOpen(false)}
            onPostCreated={handlePostCreated}
          />
        )}

        {/* Fixed left panel */}
        <aside className={`feed-drawer ${drawerOpen ? "feed-drawer--open" : ""}`}>
          {/* Drawer content — scrollable */}
          <div className="drawer-content">
            <div className="drawer-header">
              <span className="drawer-kicker">Filters</span>
              <button
                type="button"
                className="panel-collapse-btn"
                onClick={() => setDrawerOpen(false)}
                aria-label="Collapse filters"
                title="Collapse filters"
              >
                <ChevronLeft size={16} />
              </button>
            </div>

            {/* Mode */}
            <div className="drawer-section">
              <span className="drawer-section-label">Feed</span>
              <button className={mode === "global" ? "drawer-channel active" : "drawer-channel"} onClick={() => setMode("global")} title="For You">
                <Sparkles size={14} />
                <span className="drawer-item-text">For You</span>
              </button>
              <button className={mode === "following" ? "drawer-channel active" : "drawer-channel"} onClick={() => setMode("following")} title="Following">
                <Users size={14} />
                <span className="drawer-item-text">Following</span>
              </button>
              <button className={mode === "trending" ? "drawer-channel active" : "drawer-channel"} onClick={() => setMode("trending")} title="Trending">
                <TrendingUp size={14} />
                <span className="drawer-item-text">Trending</span>
              </button>
            </div>

            {/* Categories */}
            <div className="drawer-section">
              <span className="drawer-section-label">Categories</span>
              {CATEGORY_CARDS.map((item) => (
                <button
                  key={item.key}
                  className={category === item.key ? "drawer-filter active" : "drawer-filter"}
                  onClick={() => applyCategory(item.key)}
                  type="button"
                  title={item.title}
                >
                  <item.icon size={14} />
                  <span className="drawer-item-text">{item.title}</span>
                  <span className="drawer-filter-count">{feedMeta.categories?.[item.key] || 0}</span>
                </button>
              ))}
            </div>

            {/* Tag search */}
            <div className="drawer-section">
              <span className="drawer-section-label">Search by tag</span>
              <form
                className="drawer-tag-search"
                onSubmit={(e) => { e.preventDefault(); applyTagFilter(tagDraft); }}
              >
                <Search size={13} />
                <input
                  value={tagDraft}
                  onChange={(e) => setTagDraft(e.target.value)}
                  placeholder="/tag"
                />
              </form>
            </div>

            {/* Personal tags */}
            {feedMeta.personalTags.length > 0 && (
              <div className="drawer-section">
                <span className="drawer-section-label">Your top tags</span>
                <div className="drawer-tag-list">
                  {feedMeta.personalTags.map((item) => (
                    <button
                      key={item.tag}
                      type="button"
                      className={tag === item.tag ? "drawer-tag active" : "drawer-tag"}
                      onClick={() => applyTagFilter(item.tag)}
                      title={`/${item.tag}`}
                    >
                      <span className="drawer-item-text">/{item.tag}</span>
                      <span className="drawer-filter-count">{item.count}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Clear filters */}
            {(category || tag) && (
              <button className="drawer-clear-btn" type="button" onClick={clearFilters}>
                Clear filters
              </button>
            )}

          </div>
          <div className="panel-rail panel-rail-left" aria-label="Collapsed feed filters">
            <button type="button" className="rail-toggle" onClick={() => setDrawerOpen(true)} aria-label="Open filters" title="Open filters">
              <ChevronRight size={17} />
            </button>
            <button type="button" className={mode === "global" ? "rail-btn active" : "rail-btn"} onClick={() => setMode("global")} aria-label="For You" title="For You">
              <Sparkles size={17} />
            </button>
            <button type="button" className={mode === "following" ? "rail-btn active" : "rail-btn"} onClick={() => setMode("following")} aria-label="Following" title="Following">
              <Users size={17} />
            </button>
            <button type="button" className={mode === "trending" ? "rail-btn active" : "rail-btn"} onClick={() => setMode("trending")} aria-label="Trending" title="Trending">
              <TrendingUp size={17} />
            </button>
            <span className="rail-divider" />
            {CATEGORY_CARDS.map((item) => (
              <button
                key={item.key}
                type="button"
                className={category === item.key ? "rail-btn active" : "rail-btn"}
                onClick={() => applyCategory(item.key)}
                aria-label={item.title}
                title={item.title}
              >
                <item.icon size={17} />
              </button>
            ))}
          </div>
        </aside>

        <aside className={`feed-sidebar-right ${rightPanelOpen ? "feed-sidebar-right--open" : ""}`}>
          <div className="right-panel-content">
            <div className="right-panel-header">
              <span className="drawer-kicker">Community</span>
              <button
                type="button"
                className="panel-collapse-btn"
                onClick={() => setRightPanelOpen(false)}
                aria-label="Collapse right panel"
                title="Collapse right panel"
              >
                <ChevronRight size={16} />
              </button>
            </div>

            {isAuthenticated && (
              <button type="button" className="right-panel-cta right-panel-cta-top" onClick={() => setIsModalOpen(true)} title="Start a Discussion">
              <Plus size={15} /> <span className="right-panel-text">Start a Discussion</span>
              </button>
            )}

            <div className="right-panel-section">
              <p className="feed-kicker"><Tags size={14} /> <span className="right-panel-text">Trending tags</span></p>
              {feedMeta.tags.length > 0 ? (
                <div className="tag-cloud">
                  {feedMeta.tags.map((item) => (
                    <button
                      key={item.tag}
                      type="button"
                      className={tag === item.tag ? "tag-pill active" : "tag-pill"}
                      onClick={() => applyTagFilter(item.tag)}
                      title={`/${item.tag}`}
                    >
                      <Tags size={14} className="right-panel-icon" />
                      <span className="tag-pill-name right-panel-text">/{item.tag}</span>
                      <span className="tag-pill-count">{item.count}</span>
                    </button>
                  ))}
                </div>
              ) : (
                <p className="feed-muted right-panel-text">No tags yet - use /tag in your posts.</p>
              )}
            </div>

            <div className="right-panel-divider" />

            <div className="right-panel-section">
              <p className="feed-kicker"><Info size={14} /> <span className="right-panel-text">About KeyVoid</span></p>
              <div className="about-panel-stats">
                <div className="about-stat" title="Creator posts">
                  <span className="about-stat-icon"><Sparkles size={14} /></span>
                  <div className="right-panel-text">
                    <strong>Creator posts</strong>
                    <p>Creators can post reels and music uploads.</p>
                  </div>
                </div>
                <div className="about-stat" title="Listener threads">
                  <span className="about-stat-icon"><MessageSquare size={14} /></span>
                  <div className="right-panel-text">
                    <strong>Listener threads</strong>
                    <p>Join discussions, ask questions, and build the community.</p>
                  </div>
                </div>
                <div className="about-stat" title="Server-friendly">
                  <span className="about-stat-icon"><TrendingUp size={14} /></span>
                  <div className="right-panel-text">
                    <strong>Server-friendly</strong>
                    <p>10 posts per page, 60 post memory cap.</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="right-panel-divider" />

            <div className="right-panel-section">
              <p className="feed-kicker"><Lightbulb size={14} /> <span className="right-panel-text">Post prompts</span></p>
              <div className="prompt-list">
                {[
                  "What album changed how you hear music?",
                  "Ask for a genre you've never explored.",
                  "Share a hidden gem from your library.",
                  "Start a debate: overrated or underrated?"
                ].map((prompt) => (
                  <button
                    key={prompt}
                    type="button"
                    className="prompt-item"
                    onClick={() => isAuthenticated && setIsModalOpen(true)}
                    disabled={!isAuthenticated}
                    title={prompt}
                  >
                    <Lightbulb size={13} className="prompt-bullet" />
                    <span className="right-panel-text">{prompt}</span>
                  </button>
                ))}
              </div>
            </div>

            {isAuthenticated && (
              <>
                <div className="right-panel-divider" />
                <button type="button" className="right-panel-cta right-panel-cta-bottom" onClick={() => setIsModalOpen(true)} title="Start a Discussion">
                  <Plus size={15} /> <span className="right-panel-text">Start a Discussion</span>
                </button>
              </>
            )}
          </div>
          <div className="panel-rail panel-rail-right" aria-label="Collapsed community panel">
            <button type="button" className="rail-toggle" onClick={() => setRightPanelOpen(true)} aria-label="Open community panel" title="Open panel">
              <ChevronLeft size={17} />
            </button>
            <button type="button" className="rail-btn" onClick={() => setRightPanelOpen(true)} aria-label="Trending tags" title="Trending tags">
              <Tags size={17} />
            </button>
            <button type="button" className="rail-btn" onClick={() => setRightPanelOpen(true)} aria-label="About KeyVoid" title="About KeyVoid">
              <Info size={17} />
            </button>
            <button type="button" className="rail-btn" onClick={() => setRightPanelOpen(true)} aria-label="Post prompts" title="Post prompts">
              <Lightbulb size={17} />
            </button>
            {isAuthenticated && (
              <>
                <span className="rail-divider" />
                <button type="button" className="rail-btn rail-btn-action" onClick={() => setIsModalOpen(true)} aria-label="Start a Discussion" title="Start a Discussion">
                  <Plus size={18} />
                </button>
              </>
            )}
          </div>
        </aside>

        {/* ── MAIN CONTENT ── */}
        <div className="feed-main">
          <div className="feed-shell">

            {/* CENTER — feed */}
            <main className="feed-wrapper">
              <section className="feed-header">
                <div>
                  <p className="feed-kicker">KeyVoid community</p>
                  <h1 className="feed-title">{activeTitle}</h1>
                  <p className="feed-subtitle">
                    {activeCategoryCard
                      ? activeCategoryCard.prompt
                      : "Music threads for artists, listeners, teachers, and people discovering what to play next."}
                  </p>
                </div>
                {isAuthenticated && (
                  <button className="start-discussion-btn" type="button" onClick={() => setIsModalOpen(true)}>
                    <Plus size={17} /> Start Discussion
                  </button>
                )}
              </section>

              {/* Category cards */}
              <section className="category-card-grid" aria-label="Community categories">
                {CATEGORY_CARDS.map((item) => (
                  <button
                    key={item.key}
                    className={category === item.key ? "community-card active" : "community-card"}
                    style={{ "--category-art": item.image }}
                    onClick={() => setCategory(item.key)}
                    type="button"
                  >
                    <span className="community-card-art" />
                    <span className="community-card-title">{item.title}</span>
                    <span className="community-card-prompt">{item.prompt}</span>
                    <span className="community-card-footer">
                      Join discussion
                      <small>{feedMeta.categories?.[item.key] || 0} posts</small>
                    </span>
                  </button>
                ))}
              </section>

              {/* Sort row */}
              <div className="feed-sort-row">
                <button className={sort === "recommended" ? "active" : ""} onClick={() => setSort("recommended")}>Recommended</button>
                <button className={sort === "recent" ? "active" : ""} onClick={() => setSort("recent")}>Recent</button>
              </div>

              {error && (
                <div className="error-banner">
                  <span>{error}</span>
                  <button onClick={() => setError(null)}>×</button>
                </div>
              )}

              <div className="feed-content">
                {isLoading && posts.length === 0 ? (
                  <div className="loading-state">
                    <KVMark size={38} spinning />
                    <p>Loading posts...</p>
                  </div>
                ) : posts.length === 0 ? (
                  <div className="empty-state">
                    <KVMark size={34} />
                    <h3>No threads yet</h3>
                    <p>{category ? `Be the first to post in ${activeCategoryCard?.title || category}.` : "Start a discussion or loosen the filters."}</p>
                  </div>
                ) : (
                  posts.map((post) => (
                    <PostCard key={post._id} post={post} onPostDeleted={handlePostDeleted} onTagClick={applyTagFilter} />
                  ))
                )}

                {posts.length > 0 && isLoading && (
                  <div className="feed-loading-more">
                    <KVMark size={20} spinning />
                    <span>Loading more posts...</span>
                  </div>
                )}

                {posts.length > 0 && !hasNext && !isLoading && (
                  <div className="feed-end-state">
                    <KVMark size={26} />
                    <p>You're all caught up</p>
                    <span>{posts.length} post{posts.length !== 1 ? "s" : ""} loaded{category ? ` in ${activeCategoryCard?.title || category}` : ""}{tag ? ` tagged /${tag}` : ""}</span>
                  </div>
                )}

                <div ref={loadMoreTrigger} className="load-more-trigger" />
              </div>
            </main>
          </div>
        </div>
      </div>
    </ErrorBoundary>
  );
}

export default Feed;
