import { useCallback, useEffect, useState, useRef } from "react";
import { Image, Loader, Send, Video, X } from "lucide-react";
import { useAuth } from "../src/context/useAuth";
import API, { getApiErrorMessage } from "../services/api";
import PostCard from "../components/PostCard";
import ErrorBoundary from "../components/ErrorBoundary";
import "./Feed.css";

function Feed() {
  const { isAuthenticated } = useAuth();

  const [postText, setPostText] = useState("");
  const [postMedia, setPostMedia] = useState(null);
  const [mediaPreviewUrl, setMediaPreviewUrl] = useState("");
  const [posts, setPosts] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [hasNext, setHasNext] = useState(true);
  const loadMoreTrigger = useRef(null);

  const [mode, setMode] = useState("global");

  const clearMedia = useCallback(() => {
    if (mediaPreviewUrl) {
      URL.revokeObjectURL(mediaPreviewUrl);
    }
    setPostMedia(null);
    setMediaPreviewUrl("");
  }, [mediaPreviewUrl]);

  const fetchPosts = useCallback(async (pageNum = 1) => {
    try {
      setIsLoading(true);
      setError(null);

      const endpoint =
        mode === "following" ? "/posts/following" : "/posts";

      const res = await API.get(endpoint, {
        params: { page: pageNum, limit: 10 }
      });

      const postsData = res.data.posts || res.data;
      const pagination = res.data.pagination || {};

      setPosts((prev) => {
        const newPosts = Array.isArray(postsData) ? postsData : [];
        const combined = pageNum === 1 ? newPosts : [...prev, ...newPosts];
        return combined.length > 50 ? combined.slice(combined.length - 50) : combined;
      });
      setHasNext(pagination.hasNext || false);
      setPage(pageNum);
    } catch (err) {
      console.error("Failed to fetch posts:", err);
      setError(getApiErrorMessage(err, "Failed to load posts. Please try again."));
      setPosts([]);
      setHasNext(false);
    } finally {
      setIsLoading(false);
    }
  }, [mode]);

  const handleCreatePost = async () => {
    if (!postText.trim() || isCreating) return;

    try {
      setIsCreating(true);
      setError(null);

      const response = postMedia
        ? await (() => {
            const formData = new FormData();
            formData.append("text", postText);
            formData.append("media", postMedia);
            return API.post("/posts", formData);
          })()
        : await API.post("/posts", { text: postText });

      if (response.status === 201) {
        setPostText("");
        clearMedia();

        setPosts((prev) => [response.data, ...prev]);
      }
    } catch (err) {
      console.error("Failed to create post:", err);
      setError(getApiErrorMessage(err, "Failed to create post."));
    } finally {
      setIsCreating(false);
    }
  };

  const handlePostDeleted = (postId) => {
    setPosts((prev) => prev.filter((post) => post._id !== postId));
  };

  const handleMediaChange = (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) return;

    const isAllowedMedia =
      file.type.startsWith("image/") || file.type.startsWith("video/");

    if (!isAllowedMedia) {
      setError("Please choose an image or video file.");
      return;
    }

    if (file.size > 25 * 1024 * 1024) {
      setError("Media must be smaller than 25 MB.");
      return;
    }

    clearMedia();
    setPostMedia(file);
    setMediaPreviewUrl(URL.createObjectURL(file));
  };

  useEffect(() => {
    setPosts([]);
    setHasNext(true);
    setPage(1);
    fetchPosts(1);
  }, [mode, fetchPosts]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && hasNext && !isLoading) {
          fetchPosts(page + 1);
        }
      },
      { rootMargin: "240px" }
    );

    if (loadMoreTrigger.current) {
      observer.observe(loadMoreTrigger.current);
    }

    return () => observer.disconnect();
  }, [fetchPosts, hasNext, isLoading, page]);

  useEffect(() => {
    return () => {
      if (mediaPreviewUrl) {
        URL.revokeObjectURL(mediaPreviewUrl);
      }
    };
  }, [mediaPreviewUrl]);

  return (
    <ErrorBoundary>
      <div className="feed-container social-surface">
        <div className="feed-shell">
          <aside className="feed-sidebar">
            <p className="feed-sidebar-kicker">Channels</p>
            <button className={mode === "global" ? "feed-channel active" : "feed-channel"} onClick={() => setMode("global")}>
              For You
              <span>Fresh posts across KeyVoid</span>
            </button>
            <button className={mode === "following" ? "feed-channel active" : "feed-channel"} onClick={() => setMode("following")}>
              Following
              <span>Creators and listeners you follow</span>
            </button>
          </aside>

        <div className="feed-wrapper">

          {/* HEADER */}
          <div className="feed-header">
            <h1 className="feed-title">{mode === "following" ? "Following" : "For You"}</h1>
            <p className="feed-subtitle">
             Music discussions, updates, and media from the KeyVoid community.
            </p>

          </div>

          {/* ERROR */}
          {error && (
            <div className="error-banner">
              <span>{error}</span>
              <button onClick={() => setError(null)}>x</button>
            </div>
          )}

          {/* CREATE POST */}
          {isAuthenticated && (
            <div className="create-post-card">
              <textarea
                placeholder="What's on your mind?"
                value={postText}
                onChange={(event) => setPostText(event.target.value)}
                maxLength={500}
                className="post-textarea"
              />

              {mediaPreviewUrl && (
                <div className="media-preview">
                  {postMedia?.type.startsWith("image/") ? (
                    <img src={mediaPreviewUrl} alt="preview" />
                  ) : (
                    <video src={mediaPreviewUrl} controls />
                  )}
                  <button onClick={clearMedia}>
                    <X size={16} />
                  </button>
                </div>
              )}

              <div className="create-post-footer">
                <div className="composer-tools">
                  <label className="media-tool">
                    <Image size={18} />
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleMediaChange}
                    />
                  </label>

                  <label className="media-tool">
                    <Video size={18} />
                    <input
                      type="file"
                      accept="video/*"
                      onChange={handleMediaChange}
                    />
                  </label>

                  <span className="char-count">
                    {postText.length}/500
                  </span>
                </div>

                <button
                  onClick={handleCreatePost}
                  disabled={!postText.trim() || isCreating}
                  className="post-submit-btn"
                >
                  {isCreating ? (
                    <>
                      <Loader size={16} className="spinner" />
                      Posting...
                    </>
                  ) : (
                    <>
                      <Send size={16} />
                      Post
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* FEED */}
          <div className="feed-content">
            {isLoading ? (
              <div className="loading-state">
                <Loader size={40} className="spinner" />
                <p>Loading posts...</p>
              </div>
            ) : posts.length === 0 ? (
              <div className="empty-state">
                <h3>No posts yet</h3>
                <p>Be the first one to share something interesting!</p>
              </div>
            ) : (
              posts.map((post) => (
                <PostCard
                  key={post._id}
                  post={post}
                  onPostDeleted={handlePostDeleted}
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
                  {isLoading ? "Loading more posts..." : "Load more posts"}
                </button>
              </div>
            )}

            <div ref={loadMoreTrigger} className="load-more-trigger" />
          </div>
        </div>

          <aside className="feed-sidebar feed-sidebar-right">
            <p className="feed-sidebar-kicker">Community</p>
            <div className="feed-tip">
              <strong>Post prompts</strong>
              <span>Share a track, ask for recs, post a clip, or start a genre debate.</span>
            </div>
            <div className="feed-tip">
              <strong>Coming next</strong>
              <span>Genre rooms, saved posts, notifications, and threaded replies.</span>
            </div>
          </aside>
        </div>
      </div>
    </ErrorBoundary>
  );
}

export default Feed;
