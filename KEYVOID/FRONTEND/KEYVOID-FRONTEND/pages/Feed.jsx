import { useCallback, useEffect, useState } from "react";
import { Image, Loader, Send, Video, X } from "lucide-react";
import { useAuth } from "../src/context/useAuth";
import API, { getApiErrorMessage } from "../services/api";
import PostCard from "../components/PostCard";
import ErrorBoundary from "../components/ErrorBoundary";
import RainEffect from "../components/RainEffect";
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

  const clearMedia = useCallback(() => {
    if (mediaPreviewUrl) {
      URL.revokeObjectURL(mediaPreviewUrl);
    }

    setPostMedia(null);
    setMediaPreviewUrl("");
  }, [mediaPreviewUrl]);

  const fetchPosts = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const res = await API.get("/posts", { params: { page: 1, limit: 20 } });
      const postsData = res.data.posts || res.data;
      setPosts(Array.isArray(postsData) ? postsData : []);
    } catch (err) {
      console.error("Failed to fetch posts:", err);
      setError(getApiErrorMessage(err, "Failed to load posts. Please try again."));
      setPosts([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

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
        await fetchPosts();
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

    const isAllowedMedia = file.type.startsWith("image/") || file.type.startsWith("video/");

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
    fetchPosts();
  }, [fetchPosts]);

  useEffect(() => () => {
    if (mediaPreviewUrl) {
      URL.revokeObjectURL(mediaPreviewUrl);
    }
  }, [mediaPreviewUrl]);

  return (
    <ErrorBoundary>
      <RainEffect />
      <div className="feed-container">
        <div className="feed-wrapper">
          <div className="feed-header">
            <h1 className="feed-title">Social Feed</h1>
            <p className="feed-subtitle">Share your thoughts with the world</p>
          </div>

          {error && (
            <div className="error-banner">
              <span>{error}</span>
              <button onClick={() => setError(null)}>x</button>
            </div>
          )}

          {isAuthenticated && (
            <div className="create-post-card">
              <textarea
                placeholder="What's on your mind?"
                value={postText}
                onChange={(event) => setPostText(event.target.value)}
                maxLength={500}
                className="post-textarea"
                aria-label="Post content"
              />

              {mediaPreviewUrl && (
                <div className="media-preview">
                  {postMedia?.type.startsWith("image/") ? (
                    <img src={mediaPreviewUrl} alt="Selected post media preview" />
                  ) : (
                    <video src={mediaPreviewUrl} controls />
                  )}
                  <button onClick={clearMedia} aria-label="Remove selected media">
                    <X size={16} />
                  </button>
                </div>
              )}

              <div className="create-post-footer">
                <div className="composer-tools">
                  <label className="media-tool" title="Add image">
                    <Image size={18} />
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp,image/gif"
                      onChange={handleMediaChange}
                    />
                  </label>
                  <label className="media-tool" title="Add video">
                    <Video size={18} />
                    <input
                      type="file"
                      accept="video/mp4,video/webm,video/quicktime"
                      onChange={handleMediaChange}
                    />
                  </label>
                  <span className="char-count">{postText.length}/500</span>
                </div>
                <button
                  onClick={handleCreatePost}
                  disabled={!postText.trim() || isCreating}
                  className="post-submit-btn"
                  aria-label="Submit post"
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
          </div>
        </div>
      </div>
    </ErrorBoundary>
  );
}

export default Feed;
