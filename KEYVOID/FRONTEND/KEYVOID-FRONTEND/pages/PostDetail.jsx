import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, MessageCircle } from "lucide-react";
import { Link, useNavigate, useParams } from "react-router-dom";
import API, { getApiErrorMessage, trackPostView } from "../services/api";
import ErrorBoundary from "../components/ErrorBoundary";
import PostCard from "../components/PostCard";
import "./Feed.css";

export default function PostDetail() {
  const { postId } = useParams();
  const navigate = useNavigate();
  const [post, setPost] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const loadPost = useCallback(async () => {
    if (!postId) return;

    try {
      setIsLoading(true);
      setError("");
      const { data } = await API.get(`/posts/${postId}`);
      setPost(data.post);
      trackPostView(postId).catch(() => {});
    } catch (err) {
      setError(getApiErrorMessage(err, "Unable to load this discussion."));
      setPost(null);
    } finally {
      setIsLoading(false);
    }
  }, [postId]);

  useEffect(() => {
    loadPost();
  }, [loadPost]);

  const handlePostDeleted = () => {
    navigate("/feed", { replace: true });
  };

  return (
    <ErrorBoundary>
      <main className="feed-post-page">
        <div className="feed-post-shell">
          <div className="feed-post-toolbar">
            <Link className="feed-post-back" to="/feed">
              <ArrowLeft size={16} />
              Feed
            </Link>
            <span className="feed-post-context">
              <MessageCircle size={15} />
              Discussion
            </span>
          </div>

          {isLoading ? (
            <div className="loading-state feed-post-state">
              <span className="kv-mark kv-mark--spin" style={{ fontSize: 34, lineHeight: 1 }} aria-hidden="true">*</span>
              <p>Loading discussion...</p>
            </div>
          ) : error ? (
            <div className="empty-state feed-post-state">
              <h3>Discussion unavailable</h3>
              <p>{error}</p>
              <button type="button" className="community-load-more" onClick={loadPost}>Retry</button>
            </div>
          ) : post ? (
            <PostCard
              post={post}
              onPostDeleted={handlePostDeleted}
              defaultShowComments
              linkToDetail={false}
            />
          ) : null}
        </div>
      </main>
    </ErrorBoundary>
  );
}
