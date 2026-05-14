import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Loader, Plus, Search, Sparkles, Users } from "lucide-react";
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
    image: "linear-gradient(135deg, rgba(14, 165, 233, 0.36), rgba(99, 102, 241, 0.22))"
  },
  {
    key: "question",
    title: "Question",
    prompt: "Ask for help with theory, production, gear, or discovery.",
    image: "linear-gradient(135deg, rgba(34, 197, 94, 0.28), rgba(59, 130, 246, 0.2))"
  },
  {
    key: "news",
    title: "News",
    prompt: "Fresh drops, tour news, scene updates, and industry talk.",
    image: "linear-gradient(135deg, rgba(244, 114, 182, 0.3), rgba(251, 191, 36, 0.2))"
  },
  {
    key: "recommendation",
    title: "Recommendation",
    prompt: "Find what to play next, from hidden gems to classics.",
    image: "linear-gradient(135deg, rgba(45, 212, 191, 0.28), rgba(168, 85, 247, 0.18))"
  },
  {
    key: "fan_content",
    title: "Fan Content",
    prompt: "Edits, covers, reactions, fan theories, and community fun.",
    image: "linear-gradient(135deg, rgba(251, 146, 60, 0.28), rgba(99, 102, 241, 0.2))"
  }
];

const MODE_LABELS = {
  global: "For You",
  following: "Following",
  trending: "Trending"
};

function Feed() {
  const { isAuthenticated } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const [posts, setPosts] = useState([]);
  const [feedMeta, setFeedMeta] = useState({ categories: {}, tags: [] });
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
        params: {
          page: pageNum,
          limit: 10,
          sort,
          category: category || undefined,
          tag: tag || undefined
        }
      });

      const postsData = Array.isArray(res.data.posts) ? res.data.posts : [];
      const pagination = res.data.pagination || {};

      setPosts((prev) => {
        const existingIds = new Set(pageNum === 1 ? [] : prev.map((post) => post._id));
        const uniqueNewPosts = postsData.filter((post) => !existingIds.has(post._id));
        const combined = pageNum === 1 ? uniqueNewPosts : [...prev, ...uniqueNewPosts];
        return combined.length > 60 ? combined.slice(combined.length - 60) : combined;
      });
      setHasNext(Boolean(pagination.hasNext));
      setPage(pageNum);
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to load posts. Please try again."));
      setPosts([]);
      setHasNext(false);
    } finally {
      setIsLoading(false);
    }
  }, [category, endpoint, sort, tag]);

  const fetchFeedMeta = useCallback(async () => {
    try {
      const { data } = await API.get("/posts/meta");
      setFeedMeta({
        categories: data.categories || {},
        tags: data.tags || []
      });
    } catch {
      setFeedMeta({ categories: {}, tags: [] });
    }
  }, []);

  useEffect(() => {
    fetchFeedMeta();
  }, [fetchFeedMeta]);

  useEffect(() => {
    setPosts([]);
    setHasNext(true);
    setPage(1);
    fetchPosts(1);
  }, [mode, sort, category, tag, fetchPosts]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && hasNext && !isLoading) {
          fetchPosts(page + 1);
        }
      },
      { rootMargin: "260px" }
    );

    if (loadMoreTrigger.current) {
      observer.observe(loadMoreTrigger.current);
    }

    return () => observer.disconnect();
  }, [fetchPosts, hasNext, isLoading, page]);

  const handlePostCreated = (post) => {
    setPosts((prev) => [post, ...prev].slice(0, 60));
    fetchFeedMeta();
  };

  const handlePostDeleted = (postId) => {
    setPosts((prev) => prev.filter((post) => post._id !== postId));
    fetchFeedMeta();
  };

  const applyTagFilter = (nextTag) => {
    const normalized = String(nextTag || "").replace(/^\/+/, "").trim().toLowerCase();
    setTag(normalized);
    setTagDraft(normalized ? `/${normalized}` : "");
  };

  const clearFilters = () => {
    setCategory("");
    applyTagFilter("");
  };

  const activeTitle = tag
    ? `/${tag}`
    : category
      ? CATEGORY_CARDS.find((item) => item.key === category)?.title || "Category"
      : MODE_LABELS[mode];

  return (
    <ErrorBoundary>
      <div className="feed-container social-surface">
        <CreatePostModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onPostCreated={handlePostCreated}
        />

        <div className="feed-shell">
          <aside className="feed-sidebar">
            <p className="feed-sidebar-kicker">Filters</p>
            <button className={mode === "global" ? "feed-channel active" : "feed-channel"} onClick={() => setMode("global")}>
              <Sparkles size={16} />
              For You
              <span>Recommended by freshness and community signals</span>
            </button>
            <button className={mode === "following" ? "feed-channel active" : "feed-channel"} onClick={() => setMode("following")}>
              <Users size={16} />
              Following
              <span>Posts from people you follow</span>
            </button>
            <button className={mode === "trending" ? "feed-channel active" : "feed-channel"} onClick={() => setMode("trending")}>
              Trending
              <span>High-engagement threads from the last 48 hours</span>
            </button>

            <div className="filter-block">
              <span className="filter-label">Categories</span>
              {CATEGORY_CARDS.map((item) => (
                <button
                  key={item.key}
                  className={category === item.key ? "filter-option active" : "filter-option"}
                  onClick={() => setCategory((current) => current === item.key ? "" : item.key)}
                  type="button"
                >
                  {item.title}
                  <span>{feedMeta.categories?.[item.key] || 0}</span>
                </button>
              ))}
            </div>

            <form
              className="tag-search"
              onSubmit={(event) => {
                event.preventDefault();
                applyTagFilter(tagDraft);
              }}
            >
              <Search size={15} />
              <input
                value={tagDraft}
                onChange={(event) => setTagDraft(event.target.value)}
                placeholder="/tag"
              />
            </form>

            {(category || tag) && (
              <button className="clear-filter-btn" type="button" onClick={clearFilters}>
                Clear filters
              </button>
            )}
          </aside>

          <main className="feed-wrapper">
            <section className="feed-header">
              <div>
                <p className="feed-sidebar-kicker">KeyVoid community</p>
                <h1 className="feed-title">{activeTitle}</h1>
                <p className="feed-subtitle">
                  Music threads for artists, listeners, teachers, and people discovering what to play next.
                </p>
              </div>
              {isAuthenticated && (
                <button className="start-discussion-btn" type="button" onClick={() => setIsModalOpen(true)}>
                  <Plus size={18} />
                  Start Discussion
                </button>
              )}
            </section>

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

            <div className="feed-sort-row" aria-label="Feed ranking">
              <button className={sort === "recommended" ? "active" : ""} onClick={() => setSort("recommended")}>
                Recommended
              </button>
              <button className={sort === "recent" ? "active" : ""} onClick={() => setSort("recent")}>
                Recent
              </button>
            </div>

            {error && (
              <div className="error-banner">
                <span>{error}</span>
                <button onClick={() => setError(null)}>x</button>
              </div>
            )}

            <div className="feed-content">
              {isLoading && posts.length === 0 ? (
                <div className="loading-state">
                  <Loader size={40} className="spinner" />
                  <p>Loading posts...</p>
                </div>
              ) : posts.length === 0 ? (
                <div className="empty-state">
                  <h3>No threads yet</h3>
                  <p>Start a discussion or loosen the filters.</p>
                </div>
              ) : (
                posts.map((post) => (
                  <PostCard
                    key={post._id}
                    post={post}
                    onPostDeleted={handlePostDeleted}
                    onTagClick={applyTagFilter}
                  />
                ))
              )}

              {posts.length > 0 && hasNext && (
                <div className="pagination-controls">
                  <button
                    className="load-more-btn"
                    onClick={() => fetchPosts(page + 1)}
                    disabled={isLoading}
                  >
                    {isLoading ? "Loading more..." : "Load more"}
                  </button>
                </div>
              )}

              <div ref={loadMoreTrigger} className="load-more-trigger" />
            </div>
          </main>

          <aside className="feed-sidebar feed-sidebar-right">
            <p className="feed-sidebar-kicker">Trending tags</p>
            <div className="tag-cloud">
              {feedMeta.tags.length > 0 ? (
                feedMeta.tags.map((item) => (
                  <button key={item.tag} type="button" onClick={() => applyTagFilter(item.tag)}>
                    /{item.tag}
                    <span>{item.count}</span>
                  </button>
                ))
              ) : (
                <span className="feed-muted">No tags yet.</span>
              )}
            </div>
            <div className="feed-tip">
              <strong>Creator posts</strong>
              <span>Creators can post reels and music uploads. Listeners can join threads, ask questions, and build the community.</span>
            </div>
            <div className="feed-tip">
              <strong>Server friendly loading</strong>
              <span>The feed pulls 10 posts at a time and caps the client window to keep memory stable.</span>
            </div>
          </aside>
        </div>
      </div>
    </ErrorBoundary>
  );
}

export default Feed;
