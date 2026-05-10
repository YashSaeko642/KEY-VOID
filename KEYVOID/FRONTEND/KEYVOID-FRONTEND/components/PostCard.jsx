import { useRef, useState, useEffect } from "react";
import { Eye, Flag, Heart, MessageCircle, Send, Share2, Trash2, TrendingUp } from "lucide-react";
import { Link } from "react-router-dom";
import API, { getApiErrorMessage, reportPost, trackPostView } from "../services/api";
import { useAuth } from "../src/context/useAuth";
import { getRelativeTime } from "../src/utils/formatters";
import "./PostCard.css";

function PostCard({ post, onPostDeleted }) {
  const { user, isAuthenticated } = useAuth();
  const userId = user?.id;
  const postId = post?._id;
  const authorUsername = post?.author?.username || "unknown";
  const postText = typeof post?.text === "string" ? post.text : "";

  const cardRef = useRef(null);
  const [likes, setLikes] = useState(post.likes?.length || 0);
  const [views, setViews] = useState(post.viewCount || 0);
  const [liked, setLiked] = useState(false);
  const [isLiking, setIsLiking] = useState(false);
  const [showLikeAnimation, setShowLikeAnimation] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [comments, setComments] = useState(
    (post.comments || []).filter((comment) => !comment.isDeleted)
  );
  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [isCommenting, setIsCommenting] = useState(false);
  const [commentError, setCommentError] = useState("");
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportReason, setReportReason] = useState("Spam");
  const [reportDetails, setReportDetails] = useState("");
  const [reportNotice, setReportNotice] = useState("");
  const [isReporting, setIsReporting] = useState(false);

  // Check if current user is post owner
  const isPostOwner = Boolean(userId && post?.author?._id === userId);

  // SET INITIAL LIKE STATE
  useEffect(() => {
    setLikes(post.likes?.length || 0);

    if (post.likes && userId) {
      const isLiked = post.likes.some(
        (id) => id.toString() === userId
      );
      setLiked(isLiked);
    } else {
      setLiked(false);
    }
  }, [post.likes, userId]);

  useEffect(() => {
    setComments((post.comments || []).filter((comment) => !comment.isDeleted));
  }, [post.comments]);

  useEffect(() => {
    setViews(post.viewCount || 0);
  }, [post.viewCount]);

  useEffect(() => {
    const node = cardRef.current;
    if (!node || !postId) return undefined;

    const seenKey = `keyvoid_viewed_post_${postId}`;
    if (sessionStorage.getItem(seenKey)) return undefined;

    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries[0]?.isIntersecting) return;

        sessionStorage.setItem(seenKey, "1");
        observer.disconnect();
        trackPostView(postId)
          .then((response) => {
            if (typeof response.data?.viewCount === "number") {
              setViews(response.data.viewCount);
            }
          })
          .catch(() => {
            sessionStorage.removeItem(seenKey);
          });
      },
      { threshold: 0.55 }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [postId]);

  // SMOOTH LIKE TOGGLE WITH OPTIMISTIC UPDATES
  const handleLike = async () => {
    if (isLiking || !userId || !postId) return;

    setIsLiking(true);
    setShowLikeAnimation(true);

    // Optimistic UI update
    const previousLiked = liked;
    const previousLikes = likes;

    setLiked(!previousLiked);
    setLikes(previousLiked ? likes - 1 : likes + 1);

    try {
      const res = await API.patch(`/posts/${postId}/like`);

      // Confirm with server response
      setLikes(res.data.likesCount);
      setLiked(res.data.liked);

      // Animation trigger
      setTimeout(() => setShowLikeAnimation(false), 600);
    } catch (err) {
      console.error("Like failed:", err);
      // Revert on error
      setLiked(previousLiked);
      setLikes(previousLikes);
      setShowLikeAnimation(false);
    } finally {
      setIsLiking(false);
    }
  };

  // HANDLE DELETE POST
  const handleDeletePost = async () => {
    if (!postId || isDeleting) return;

    setIsDeleting(true);
    try {
      await API.delete(`/posts/${postId}`);
      setShowDeleteModal(false);
      if (onPostDeleted) {
        onPostDeleted(postId);
      }
    } catch (err) {
      console.error("Delete failed:", err);
      alert("Failed to delete post");
    } finally {
      setIsDeleting(false);
    }
  };

  // HANDLE SHARE
  const handleShare = async () => {
    const preview = postText.length > 50 ? `${postText.substring(0, 50)}...` : postText;
    const shareText = `Check out this post on KeyVoid: "${preview}"`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          text: shareText,
          url: window.location.href
        });
      } catch (err) {
        console.error("Share failed:", err);
      }
    } else {
      try {
        await navigator.clipboard.writeText(`${shareText} ${window.location.href}`);
        alert("Link copied to clipboard!");
      } catch {
        alert("Unable to copy link.");
      }
    }
  };

  const handleAddComment = async () => {
    const trimmedComment = commentText.trim();
    if (!trimmedComment || !postId || isCommenting) return;

    setIsCommenting(true);
    setCommentError("");

    try {
      const res = await API.post(`/posts/${postId}/comments`, {
        text: trimmedComment
      });

      setComments((prev) => [...prev, res.data.comment]);
      setCommentText("");
      setShowComments(true);
    } catch (err) {
      console.error("Comment failed:", err);
      setCommentError(getApiErrorMessage(err, "Failed to add comment"));
    } finally {
      setIsCommenting(false);
    }
  };

  const handleDeleteComment = async (commentId) => {
    if (!postId || !commentId) return;

    try {
      await API.delete(`/posts/${postId}/comments/${commentId}`);
      setComments((prev) => prev.filter((comment) => comment._id !== commentId));
    } catch (err) {
      console.error("Delete comment failed:", err);
      setCommentError(getApiErrorMessage(err, "Failed to delete comment"));
    }
  };

  const handleReportPost = async () => {
    if (!postId || isReporting) return;

    setIsReporting(true);
    setReportNotice("");

    try {
      await reportPost(postId, {
        reason: reportReason,
        details: reportDetails
      });
      setReportNotice("Thanks. This post was sent to moderation.");
      setReportDetails("");
      window.setTimeout(() => setShowReportModal(false), 1200);
    } catch (err) {
      setReportNotice(getApiErrorMessage(err, "Unable to report this post."));
    } finally {
      setIsReporting(false);
    }
  };

  return (
    <div className="post-card" ref={cardRef}>
      {/* DELETE MODAL */}
      {showDeleteModal && (
        <div className="delete-modal-overlay" onClick={() => setShowDeleteModal(false)}>
          <div className="delete-modal" onClick={(e) => e.stopPropagation()}>
            <div className="delete-modal-header">
              <span className="delete-modal-title">Delete Post?</span>
              <span className="delete-modal-status">This action cannot be undone.</span>
            </div>
            <p className="delete-modal-copy">
              Are you sure you want to remove this post from your feed? It will be permanently deleted for everyone.
            </p>
            <div className="modal-actions">
              <button 
                className="modal-cancel" 
                onClick={() => setShowDeleteModal(false)}
              >
                Keep Post
              </button>
              <button 
                className="modal-delete" 
                onClick={handleDeletePost}
                disabled={isDeleting}
              >
                {isDeleting ? "Deleting..." : "Delete Forever"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showReportModal && (
        <div className="delete-modal-overlay" onClick={() => setShowReportModal(false)}>
          <div className="delete-modal safety-modal" onClick={(event) => event.stopPropagation()}>
            <div className="delete-modal-header">
              <span className="delete-modal-title">Report Post</span>
              <span className="delete-modal-status">Reports help keep recommendations safe.</span>
            </div>
            <label className="report-field">
              Reason
              <select value={reportReason} onChange={(event) => setReportReason(event.target.value)}>
                {["Spam", "Harassment", "Hate speech", "Self-harm", "Violence", "Sexual content", "Misinformation", "Other"].map((reason) => (
                  <option key={reason} value={reason}>{reason}</option>
                ))}
              </select>
            </label>
            <label className="report-field">
              Details
              <textarea
                value={reportDetails}
                onChange={(event) => setReportDetails(event.target.value)}
                maxLength={500}
                placeholder="Add context for moderators"
              />
            </label>
            {reportNotice && <p className="report-notice">{reportNotice}</p>}
            <div className="modal-actions">
              <button className="modal-cancel" onClick={() => setShowReportModal(false)}>Cancel</button>
              <button className="modal-delete" onClick={handleReportPost} disabled={isReporting}>
                {isReporting ? "Sending..." : "Send Report"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* HEADER */}
      <div className="post-header">
        <div className="post-avatar">
          {post.author?.username?.[0]?.toUpperCase() || "U"}
        </div>
        <div className="post-user-info">
          <Link to={`/u/${encodeURIComponent(authorUsername)}`} className="post-username-link">
            <div className="post-username">
              {authorUsername}
            </div>
          </Link>
          <div className="post-timestamp">
            {getRelativeTime(new Date(post.createdAt))}
          </div>
        </div>
        {isPostOwner && (
          <button 
            className="post-delete-btn"
            onClick={() => setShowDeleteModal(true)}
            title="Delete post"
          >
            <Trash2 size={16} />
          </button>
        )}
        {!isPostOwner && isAuthenticated && (
          <button
            className="post-delete-btn"
            onClick={() => setShowReportModal(true)}
            title="Report post"
          >
            <Flag size={16} />
          </button>
        )}
      </div>

      {/* CONTENT */}
      <div className="post-content">
        {postText}
      </div>

      {/* MEDIA */}
      {post.mediaUrl && (
        <div className="post-media">
          {post.mediaType === "image" ? (
            <img src={post.mediaUrl} alt="Post media" className="post-image" loading="lazy" />
          ) : post.mediaType === "video" ? (
            <video controls className="post-video" preload="metadata">
              <source src={post.mediaUrl} />
            </video>
          ) : post.mediaType === "audio" ? (
            <audio controls className="post-audio">
              <source src={post.mediaUrl} />
            </audio>
          ) : null}
        </div>
      )}

      {/* ACTIONS */}
      <div className="post-insight-row">
        <span><Eye size={15} /> {views} views</span>
        {post.recommendationReason && (
          <span><TrendingUp size={15} /> {post.recommendationReason}</span>
        )}
        {post.safetyStatus && post.safetyStatus !== "clear" && (
          <span><Flag size={15} /> {post.safetyStatus.replace("_", " ")}</span>
        )}
      </div>
      <div className="post-actions">
        {/* LIKE BUTTON */}
        <button
          onClick={handleLike}
          disabled={isLiking || !isAuthenticated}
          className={`post-action-btn like-btn ${liked ? "liked" : ""} ${
            showLikeAnimation ? "like-animation" : ""
          }`}
          title={isAuthenticated ? "Like post" : "Login to like"}
        >
          <Heart
            size={18}
            className={liked ? "heart-filled" : ""}
            fill={liked ? "currentColor" : "none"}
          />
          <span className="action-count">{likes}</span>
        </button>

        {/* COMMENT BUTTON */}
        <button
          className="post-action-btn"
          onClick={() => setShowComments((current) => !current)}
          title="View comments"
        >
          <MessageCircle size={18} />
          <span className="action-count">{comments.length}</span>
        </button>

        {/* SHARE BUTTON */}
        <button 
          className="post-action-btn share-btn"
          onClick={handleShare}
          title="Share post"
        >
          <Share2 size={18} />
          <span>Share</span>
        </button>
      </div>

      {showComments && (
        <div className="post-comments">
          <div className="comments-list">
            {comments.length === 0 ? (
              <p className="comments-empty">No comments yet</p>
            ) : (
              comments.map((comment) => {
                const commentAuthorId = comment.author?._id || comment.author;
                const canDeleteComment = userId && (
                  String(commentAuthorId) === String(userId) || user?.role === "admin"
                );

                return (
                  <div className="comment-item" key={comment._id}>
                    <div className="comment-avatar">
                      {comment.author?.username?.[0]?.toUpperCase() || "U"}
                    </div>
                    <div className="comment-body">
                      <div className="comment-meta">
                        <span>{comment.author?.username || "unknown"}</span>
                        <span>{getRelativeTime(new Date(comment.createdAt))}</span>
                      </div>
                      <p>{comment.text}</p>
                    </div>
                    {canDeleteComment && (
                      <button
                        className="comment-delete-btn"
                        onClick={() => handleDeleteComment(comment._id)}
                        title="Delete comment"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {commentError && <p className="comment-error">{commentError}</p>}

          {isAuthenticated && (
            <div className="comment-form">
              <textarea
                value={commentText}
                onChange={(event) => setCommentText(event.target.value)}
                maxLength={1000}
                placeholder="Add a comment"
                aria-label="Add a comment"
              />
              <button
                onClick={handleAddComment}
                disabled={!commentText.trim() || isCommenting}
                title="Post comment"
              >
                <Send size={16} />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default PostCard;
