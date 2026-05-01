import { useState, useEffect, useRef, useCallback } from "react";
import {
  ChevronDown,
  ChevronUp,
  Heart,
  MessageCircle,
  Send,
  Share2,
  Volume2,
  VolumeX,
  Play,
  Pause
} from "lucide-react";
import { useAuth } from "../src/context/useAuth";
import API, { getApiErrorMessage } from "../services/api";
import { getRelativeTime } from "../src/utils/formatters";
import "./Reels.css";

function ReelCard({ reel }) {
  const { user, isAuthenticated } = useAuth();
  const userId = user?.id;
  const reelId = reel?._id;

  const [likes, setLikes] = useState(reel.likes?.length || 0);
  const [liked, setLiked] = useState(false);
  const [isLiking, setIsLiking] = useState(false);
  const [comments, setComments] = useState(
    (reel.comments || []).filter((comment) => !comment.isDeleted)
  );
  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [isCommenting, setIsCommenting] = useState(false);
  const [commentError, setCommentError] = useState("");

  // Video controls
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [showControls, setShowControls] = useState(false);
  const videoRef = useRef(null);

  // Check if current user is reel owner
  // const isReelOwner = Boolean(userId && reel?.author?._id === userId);

  // SET INITIAL LIKE STATE
  useEffect(() => {
    setLikes(reel.likes?.length || 0);

    if (reel.likes && userId) {
      const isLiked = reel.likes.some(
        (id) => id.toString() === userId
      );
      setLiked(isLiked);
    } else {
      setLiked(false);
    }
  }, [reel.likes, userId]);

  useEffect(() => {
    setComments((reel.comments || []).filter((comment) => !comment.isDeleted));
  }, [reel.comments]);

  useEffect(() => {
    const video = videoRef.current;

    setIsPlaying(false);
    setShowComments(false);
    setCommentText("");
    setCommentError("");

    if (video) {
      video.pause();
      video.currentTime = 0;
    }
  }, [reelId]);

  // Video controls
  const togglePlay = useCallback(() => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  }, [isPlaying]);

  const toggleMute = useCallback(() => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  }, [isMuted]);

  // Auto-play when in view (Instagram-style)
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            video.play().catch(() => {
              // Auto-play failed, user interaction required
            });
            setIsPlaying(true);
          } else {
            video.pause();
            setIsPlaying(false);
          }
        });
      },
      { threshold: 0.5 }
    );

    observer.observe(video);

    return () => {
      observer.disconnect();
    };
  }, []);

  const handleLike = async () => {
    if (!isAuthenticated || isLiking) return;

    try {
      setIsLiking(true);
      const response = await API.patch(`/posts/${reelId}/like`);

      setLikes(response.data.likesCount);
      setLiked(response.data.liked);
    } catch (err) {
      console.error("Like failed:", err);
    } finally {
      setIsLiking(false);
    }
  };

  const handleComment = async () => {
    if (!commentText.trim() || isCommenting) return;

    try {
      setIsCommenting(true);
      setCommentError("");

      const response = await API.post(`/posts/${reelId}/comments`, {
        text: commentText
      });

      // Add the new comment to the list
      const newComment = {
        ...response.data.comment,
        author: {
          _id: userId,
          username: user.username,
          avatarUrl: user.avatarUrl
        }
      };

      setComments((prev) => [newComment, ...prev]);
      setCommentText("");
    } catch (err) {
      console.error("Comment failed:", err);
      setCommentError(getApiErrorMessage(err, "Failed to add comment"));
    } finally {
      setIsCommenting(false);
    }
  };

  const handleDeleteComment = async (commentId) => {
    try {
      await API.delete(`/posts/${reelId}/comments/${commentId}`);
      setComments((prev) => prev.filter((comment) => comment._id !== commentId));
    } catch (err) {
      console.error("Delete comment failed:", err);
    }
  };

  return (
    <div className="reel-card">
      {/* Video Container */}
      <div
        className="reel-video-container"
        onMouseEnter={() => setShowControls(true)}
        onMouseLeave={() => setShowControls(false)}
        onClick={togglePlay}
      >
        {reel.mediaType === "video" ? (
          <video
            ref={videoRef}
            src={reel.mediaUrl}
            className="reel-video"
            loop
            muted={isMuted}
            playsInline
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
          />
        ) : (
          <img
            src={reel.mediaUrl}
            alt="Reel content"
            className="reel-image"
          />
        )}

        {/* Video Controls Overlay */}
        {reel.mediaType === "video" && showControls && (
          <div className="reel-controls-overlay">
            <button onClick={(e) => { e.stopPropagation(); togglePlay(); }} className="play-pause-btn">
              {isPlaying ? <Pause size={48} /> : <Play size={48} />}
            </button>
            <button onClick={(e) => { e.stopPropagation(); toggleMute(); }} className="mute-btn">
              {isMuted ? <VolumeX size={24} /> : <Volume2 size={24} />}
            </button>
          </div>
        )}

        {/* Play/Pause Indicator */}
        {!isPlaying && reel.mediaType === "video" && (
          <div className="play-indicator">
            <Play size={60} fill="white" />
          </div>
        )}
      </div>

      {/* Content Overlay */}
      <div className="reel-overlay">
        {/* Author Info */}
        <div className="reel-author">
          <img
            src={reel.author?.avatarUrl || "/default-avatar.png"}
            alt={reel.author?.username}
            className="reel-author-avatar"
          />
          <div className="reel-author-info">
            <span className="reel-author-username">{reel.author?.username}</span>
            {reel.author?.role === "creator" && (
              <span className="reel-creator-badge">Creator</span>
            )}
          </div>
        </div>

        {/* Text Content */}
        {reel.text && (
          <div className="reel-text">
            <p>{reel.text}</p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="reel-actions">
          <button
            onClick={handleLike}
            disabled={!isAuthenticated || isLiking}
            className={`reel-action-btn ${liked ? 'liked' : ''}`}
          >
            <Heart size={28} fill={liked ? "currentColor" : "none"} />
            <span>{likes}</span>
          </button>

          <button
            onClick={() => setShowComments(!showComments)}
            className="reel-action-btn"
          >
            <MessageCircle size={28} />
            <span>{comments.length}</span>
          </button>

          <button className="reel-action-btn">
            <Send size={28} />
          </button>

          <button className="reel-action-btn">
            <Share2 size={28} />
          </button>
        </div>

        {/* Comments Panel */}
        {showComments && (
          <div className="reel-comments-panel">
            <div className="reel-comments-header">
              <h3>Comments</h3>
              <button onClick={() => setShowComments(false)}>×</button>
            </div>

            {isAuthenticated && (
              <div className="reel-comment-input">
                <input
                  type="text"
                  placeholder="Add a comment..."
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleComment()}
                  maxLength={280}
                />
                <button
                  onClick={handleComment}
                  disabled={!commentText.trim() || isCommenting}
                >
                  Post
                </button>
              </div>
            )}

            {commentError && (
              <div className="comment-error">{commentError}</div>
            )}

            <div className="reel-comments-list">
              {comments.map((comment) => (
                <div key={comment._id} className="reel-comment">
                  <img
                    src={comment.author?.avatarUrl || "/default-avatar.png"}
                    alt={comment.author?.username}
                    className="comment-avatar"
                  />
                  <div className="comment-content">
                    <span className="comment-username">{comment.author?.username}</span>
                    <p className="comment-text">{comment.text}</p>
                    <span className="comment-time">{getRelativeTime(comment.createdAt)}</span>
                  </div>
                  {(userId === comment.author?._id || user?.role === "admin") && (
                    <button
                      onClick={() => handleDeleteComment(comment._id)}
                      className="comment-delete-btn"
                    >
                      ×
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function Reels() {
  const [reels, setReels] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [hasNext, setHasNext] = useState(true);

  const fetchReels = useCallback(async (pageNum = 1) => {
    try {
      setIsLoading(true);
      setError(null);

      const res = await API.get("/posts/reels", {
        params: { page: pageNum, limit: 5 }
      });

      const reelsData = res.data.posts || res.data;
      const pagination = res.data.pagination || {};

      const newReels = Array.isArray(reelsData) ? reelsData : [];

      setReels((prev) => {
        const merged = pageNum === 1 ? newReels : [...prev, ...newReels];
        const seen = new Set();

        return merged.filter((item) => {
          if (!item?._id || seen.has(item._id)) return false;
          seen.add(item._id);
          return true;
        });
      });

      setHasNext(pagination.hasNext || false);
      setPage(pageNum);
      return newReels;
    } catch (err) {
      console.error("Failed to fetch reels:", err);
      setError(getApiErrorMessage(err, "Failed to load reels. Please try again."));
      setHasNext(false);
      return [];
    } finally {
      setIsLoading(false);
    }
  }, []);

  const currentReel = reels[currentIndex];
  const canGoPrevious = currentIndex > 0;
  const canGoNext = currentIndex < reels.length - 1 || hasNext;

  useEffect(() => {
    fetchReels(1);
  }, [fetchReels]);

  useEffect(() => {
    // Prefetch next batch when approaching end of cache
    if (reels.length - currentIndex <= 2 && hasNext && !isLoading) {
      fetchReels(page + 1);
    }
  }, [currentIndex, reels.length, hasNext, isLoading, page, fetchReels]);

  const goToPreviousReel = useCallback(() => {
    setCurrentIndex((index) => Math.max(index - 1, 0));
  }, []);

  const goToNextReel = useCallback(async () => {
    if (currentIndex < reels.length - 1) {
      setCurrentIndex((index) => index + 1);
      return;
    }

    if (!hasNext || isLoading) return;

    const nextPageReels = await fetchReels(page + 1);
    if (nextPageReels.length > 0) {
      setCurrentIndex((index) => index + 1);
    }
  }, [currentIndex, fetchReels, hasNext, isLoading, page, reels.length]);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === "ArrowUp") {
        event.preventDefault();
        goToPreviousReel();
      }

      if (event.key === "ArrowDown") {
        event.preventDefault();
        goToNextReel();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [goToNextReel, goToPreviousReel]);

  return (
    <div className="reels-page">
      <div className="reels-container">
        {error && (
          <div className="reels-error">
            <span>{error}</span>
            <button onClick={() => fetchReels(1)}>Retry</button>
          </div>
        )}

        {currentReel && (
          <div className="reels-stage">
            <ReelCard key={currentReel._id} reel={currentReel} />

            <div className="reel-navigation" aria-label="Reel navigation">
              <button
                type="button"
                onClick={goToPreviousReel}
                disabled={!canGoPrevious}
                className="reel-nav-btn"
                aria-label="Previous reel"
                title="Previous reel"
              >
                <ChevronUp size={28} />
              </button>

              <span className="reel-position">
                {currentIndex + 1}/{Math.max(reels.length, currentIndex + 1)}
              </span>

              <button
                type="button"
                onClick={goToNextReel}
                disabled={!canGoNext || isLoading}
                className="reel-nav-btn"
                aria-label="Next reel"
                title="Next reel"
              >
                <ChevronDown size={28} />
              </button>
            </div>
          </div>
        )}

        {isLoading && (
          <div className="reels-loading">
            <div className="loading-spinner"></div>
            <p>Loading more reels...</p>
          </div>
        )}

        {!hasNext && reels.length > 0 && (
          <div className="reels-end">
            <p>You're all caught up! 🎬</p>
          </div>
        )}

        {reels.length === 0 && !isLoading && !error && (
          <div className="reels-empty">
            <h2>No reels yet</h2>
            <p>Be the first to create a reel!</p>
          </div>
        )}
      </div>
    </div>
  );
}
