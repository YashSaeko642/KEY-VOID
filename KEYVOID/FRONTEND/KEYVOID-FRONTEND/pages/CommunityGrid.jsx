import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Eye, Grid3X3, Heart, MessageCircle, Search, Sparkles, Video, X } from "lucide-react";
import API, { getApiErrorMessage, trackPostView } from "../services/api";
import PostCard from "../components/PostCard";
import "./Feed.css";

const TYPE_FILTERS = [
  { key: "", label: "All", icon: Grid3X3 },
  { key: "post", label: "Posts", icon: Sparkles },
  { key: "discussion", label: "Discussions", icon: MessageCircle },
  { key: "reel", label: "Vods", icon: Video }
];

const TYPE_LABELS = {
  post: "Posts",
  discussion: "Discussions",
  reel: "Vods"
};

function decodeStoredText(value = "") {
  return String(value || "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, "\"")
    .replace(/&#x27;/g, "'")
    .replace(/&#x2F;/g, "/");
}

function getPostPreview(post) {
  const fallback = post?.contentType === "reel" ? "Vod" : "Discussion";
  return decodeStoredText(post?.title || post?.text || post?.body || fallback);
}

function CommunityPostViewer({ currentPost, hasMore, isLoadingMore, onClose, onLoadMore, onPostDeleted, onSelectPost, posts }) {
  const currentIndex = posts.findIndex((post) => post._id === currentPost?._id);
  const hasPrevious = currentIndex > 0;
  const hasNext = currentIndex >= 0 && currentIndex < posts.length - 1;
  const loadMoreRef = useRef(null);

  const goToPost = useCallback((direction) => {
    const nextPost = posts[currentIndex + direction];
    if (nextPost) onSelectPost(nextPost);
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

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && hasMore && !isLoadingMore) onLoadMore();
      },
      { rootMargin: "360px" }
    );

    if (loadMoreRef.current) observer.observe(loadMoreRef.current);
    return () => observer.disconnect();
  }, [hasMore, isLoadingMore, onLoadMore]);

  return (
    <div className="profile-post-viewer-backdrop" role="dialog" aria-modal="true" aria-label="Community post viewer" onMouseDown={onClose}>
      <div className="profile-post-viewer community-discovery-viewer" onMouseDown={(event) => event.stopPropagation()}>
        <div className="profile-post-viewer-toolbar">
          <button className="profile-post-viewer-back" type="button" onClick={onClose}>
            <X size={16} /> Close
          </button>
          <span className="community-viewer-title">More like this</span>
          <div className="profile-post-viewer-nav">
            <button type="button" onClick={() => goToPost(-1)} disabled={!hasPrevious} aria-label="Previous post">
              {"<-"}
            </button>
            <span>{Math.max(currentIndex + 1, 1)} / {Math.max(posts.length, 1)}</span>
            <button type="button" onClick={() => goToPost(1)} disabled={!hasNext} aria-label="Next post">
              {"->"}
            </button>
          </div>
        </div>
        <div className="community-viewer-scroll">
          {posts.map((post, index) => (
            <div className="profile-post-viewer-card community-viewer-card" key={post._id}>
              {index > 0 ? <p className="feed-kicker community-viewer-kicker">{post.recommendationReason || "Recommended next"}</p> : null}
              <PostCard
                post={post}
                defaultShowComments={index === 0}
                onPostDeleted={(postId) => {
                  onPostDeleted(postId);
                  if (postId === currentPost?._id) onClose();
                }}
              />
            </div>
          ))}
          <div ref={loadMoreRef} className="community-viewer-sentinel">
            {isLoadingMore ? "Loading similar posts..." : hasMore ? "Scroll for more" : "End of this discovery path"}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function CommunityGrid() {
  const location = useLocation();
  const navigate = useNavigate();
  const searchParams = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const searchTerm = searchParams.get("search")?.trim() || "";
  const searchType = searchParams.get("type")?.trim().toLowerCase() || "";

  const [posts, setPosts] = useState([]);
  const [selectedPost, setSelectedPost] = useState(null);
  const [viewerPosts, setViewerPosts] = useState([]);
  const [viewerPage, setViewerPage] = useState(1);
  const [viewerHasNext, setViewerHasNext] = useState(false);
  const [viewerLoading, setViewerLoading] = useState(false);
  const [typeFilter, setTypeFilter] = useState(searchType);
  const [sort, setSort] = useState("recommended");
  const [page, setPage] = useState(1);
  const [hasNext, setHasNext] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const loadMoreTrigger = useRef(null);

  useEffect(() => {
    setTypeFilter(searchType);
  }, [searchType]);

  const fetchPosts = useCallback(async (pageNum = 1) => {
    setIsLoading(true);
    setError("");

    try {
      const { data } = await API.get("/posts/discover", {
        params: {
          page: pageNum,
          limit: 24,
          sort,
          type: typeFilter || undefined,
          search: searchTerm || undefined
        }
      });
      const nextPosts = Array.isArray(data.posts) ? data.posts : [];
      const pagination = data.pagination || {};

      setPosts((current) => {
        const existingIds = new Set(pageNum === 1 ? [] : current.map((post) => post._id));
        const uniqueNew = nextPosts.filter((post) => post?._id && !existingIds.has(post._id));
        return pageNum === 1 ? uniqueNew : [...current, ...uniqueNew];
      });
      setHasNext(Boolean(pagination.hasNext));
      setPage(pageNum);
    } catch (err) {
      setError(getApiErrorMessage(err, "Unable to load the community grid."));
      if (pageNum === 1) setPosts([]);
      setHasNext(false);
    } finally {
      setIsLoading(false);
    }
  }, [searchTerm, sort, typeFilter]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && hasNext && !isLoading) fetchPosts(page + 1);
      },
      { rootMargin: "420px" }
    );

    if (loadMoreTrigger.current) observer.observe(loadMoreTrigger.current);
    return () => observer.disconnect();
  }, [fetchPosts, hasNext, isLoading, page]);

  useEffect(() => {
    setPosts([]);
    setPage(1);
    setHasNext(true);
    fetchPosts(1);
  }, [fetchPosts]);

  const handleTypeFilter = (nextType) => {
    setTypeFilter(nextType);
    const nextParams = new URLSearchParams(location.search);
    if (nextType) nextParams.set("type", nextType);
    else nextParams.delete("type");
    navigate({ pathname: "/grid", search: nextParams.toString() ? `?${nextParams.toString()}` : "" }, { replace: true });
  };

  const fetchSimilarPosts = useCallback(async (post, pageNum = 1, excludeIds = []) => {
    if (!post?._id) return;
    setViewerLoading(true);
    try {
      const excluded = pageNum === 1
        ? [post._id, ...excludeIds]
        : [post._id, ...viewerPosts.map((item) => item._id), ...excludeIds];
      const { data } = await API.get("/posts/discover", {
        params: {
          page: pageNum,
          limit: 8,
          seedPostId: post._id,
          type: post.contentType === "reel" ? "reel" : typeFilter || undefined,
          exclude: excluded.filter(Boolean).join(",")
        }
      });

      const nextPosts = Array.isArray(data.posts) ? data.posts : [];
      setViewerPosts((current) => {
        const existingIds = new Set(current.map((item) => item._id));
        const uniqueNew = nextPosts.filter((item) => item?._id && !existingIds.has(item._id));
        return pageNum === 1 ? [post, ...uniqueNew] : [...current, ...uniqueNew];
      });
      setViewerPage(pageNum);
      setViewerHasNext(Boolean(data.pagination?.hasNext));
    } catch {
      setViewerHasNext(false);
    } finally {
      setViewerLoading(false);
    }
  }, [typeFilter, viewerPosts]);

  const handleOpenPost = (post) => {
    setSelectedPost(post);
    setViewerPosts([post]);
    setViewerPage(1);
    setViewerHasNext(false);
    fetchSimilarPosts(post, 1);
    if (!post?._id) return;

    trackPostView(post._id)
      .then((response) => {
        if (typeof response.data?.viewCount !== "number") return;
        const updateViews = (item) => item._id === post._id ? { ...item, viewCount: response.data.viewCount } : item;
        setPosts((current) => current.map(updateViews));
        setSelectedPost((current) => current?._id === post._id ? { ...current, viewCount: response.data.viewCount } : current);
      })
      .catch(() => {});
  };

  const handleDeletePost = (postId) => {
    setPosts((current) => current.filter((post) => post._id !== postId));
    setSelectedPost((current) => current?._id === postId ? null : current);
    setViewerPosts((current) => current.filter((post) => post._id !== postId));
  };

  const loadMoreSimilarPosts = useCallback(() => {
    if (!selectedPost || viewerLoading || !viewerHasNext) return;
    fetchSimilarPosts(selectedPost, viewerPage + 1);
  }, [fetchSimilarPosts, selectedPost, viewerHasNext, viewerLoading, viewerPage]);

  const clearSearch = () => {
    navigate(typeFilter ? `/grid?type=${encodeURIComponent(typeFilter)}` : "/grid");
  };

  const activeTypeLabel = TYPE_LABELS[typeFilter] || "Everything";

  return (
    <section className="community-grid-page">
      <header className="community-grid-header">
        <div>
          <p className="feed-kicker">Community Grid</p>
          <h1 className="feed-title">{searchTerm ? `${activeTypeLabel} matching "${searchTerm}"` : "Explore"}</h1>
          <p className="feed-subtitle">Discover posts and vods based on tags, categories, engagement, and what you interact with. Open a tile and scroll into similar content.</p>
        </div>
        <Link className="start-discussion-btn" to="/feed">
          Feed
        </Link>
      </header>

      {searchTerm ? (
        <section className="feed-search-summary" aria-label="Grid search">
          <span><Search size={15} /> {activeTypeLabel}</span>
          <strong>{searchTerm}</strong>
          <button type="button" onClick={clearSearch}>
            <X size={15} /> Clear
          </button>
        </section>
      ) : null}

      <div className="community-grid-toolbar">
        <div className="feed-sort-row">
          {TYPE_FILTERS.map((item) => {
            const Icon = item.icon;
            return (
              <button key={item.key || "all"} className={typeFilter === item.key ? "active" : ""} type="button" onClick={() => handleTypeFilter(item.key)}>
                <Icon size={14} /> {item.label}
              </button>
            );
          })}
        </div>
        <div className="feed-sort-row">
          <button className={sort === "recommended" ? "active" : ""} type="button" onClick={() => setSort("recommended")}>Recommended</button>
          <button className={sort === "recent" ? "active" : ""} type="button" onClick={() => setSort("recent")}>Recent</button>
        </div>
      </div>

      {error ? (
        <div className="error-banner">
          <span>{error}</span>
          <button type="button" onClick={() => fetchPosts(1)}>Retry</button>
        </div>
      ) : null}

      <div className="profile-post-grid community-post-grid">
        {posts.length ? posts.map((post) => (
          <button className="profile-post-tile community-post-tile" type="button" onClick={() => handleOpenPost(post)} key={post._id}>
            {post.mediaUrl && post.mediaType === "image" ? <img src={post.mediaUrl} alt="" /> : null}
            {post.mediaUrl && post.mediaType === "video" ? <video src={post.mediaUrl} muted playsInline /> : null}
            {!post.mediaUrl ? (
              <span className="community-post-text-preview">{getPostPreview(post)}</span>
            ) : null}
            <div className="profile-post-overlay">
              <strong>{getPostPreview(post)}</strong>
              <span><Heart size={14} /> {post.likes?.length || 0}</span>
              <span><MessageCircle size={14} /> {(post.comments || []).filter((comment) => !comment.isDeleted).length}</span>
              <span><Eye size={14} /> {post.viewCount || 0}</span>
            </div>
          </button>
        )) : null}

        {!isLoading && posts.length === 0 ? (
          <div className="profile-empty-card">No matching posts yet.</div>
        ) : null}
      </div>

      {isLoading ? (
        <div className="feed-loading-more">
          <span>Loading grid...</span>
        </div>
      ) : null}

      {posts.length > 0 && hasNext ? (
        <button className="profile-load-more community-load-more" type="button" onClick={() => fetchPosts(page + 1)} disabled={isLoading}>
          Load more
        </button>
      ) : null}

      <div ref={loadMoreTrigger} className="load-more-trigger" />

      {selectedPost ? createPortal(
        <CommunityPostViewer
          currentPost={selectedPost}
          posts={viewerPosts.length ? viewerPosts : [selectedPost]}
          hasMore={viewerHasNext}
          isLoadingMore={viewerLoading}
          onLoadMore={loadMoreSimilarPosts}
          onSelectPost={handleOpenPost}
          onPostDeleted={handleDeletePost}
          onClose={() => setSelectedPost(null)}
        />,
        document.body
      ) : null}
    </section>
  );
}
