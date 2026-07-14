import { useRef, useState, useEffect } from "react";
import { Eye, Flag, MessageCircle, Pencil, Send, Share2, Trash2, TrendingUp } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import API, { getApiErrorMessage, reportPost, trackPostView } from "../services/api";
import { useAuth } from "../src/context/useAuth";
import { getRelativeTime } from "../src/utils/formatters";
import "./PostCard.css";

const CATEGORY_LABELS = {
  discussion: "Discussion",
  question: "Question",
  news: "News",
  recommendation: "Recommendation",
  fan_content: "Fan Content",
  general: "General"
};

const CATEGORY_OPTIONS = Object.entries(CATEGORY_LABELS)
  .filter(([value]) => value !== "general")
  .map(([value, label]) => ({ value, label }));

function decodeStoredText(value = "") {
  return String(value || "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, "\"")
    .replace(/&#x27;/g, "'")
    .replace(/&#x2F;/g, "/");
}

function renderSlashTags(text = "", onTagClick) {
  const parts = String(text || "").split(/(\/[a-zA-Z][a-zA-Z0-9_-]{1,29}\b)/g);

  return parts.map((part, index) => {
    if (/^\/[a-zA-Z][a-zA-Z0-9_-]{1,29}$/.test(part)) {
      const tag = part.slice(1).toLowerCase();
      return (
        <button
          className="inline-tag"
          key={`${part}-${index}`}
          onClick={() => onTagClick?.(tag)}
          type="button"
        >
          {part}
        </button>
      );
    }

    return <span key={`${part}-${index}`}>{part}</span>;
  });
}

function PostCard({ post, onPostDeleted, onTagClick, defaultShowComments = false, highlightCommentId = "", linkToDetail = true }) {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const [currentPost, setCurrentPost] = useState(post);
  const activePost = currentPost || post;
  const userId = user?.id;
  const postId = activePost?._id;
  const authorUsername = activePost?.author?.username || "unknown";
  const postTitle = decodeStoredText(typeof activePost?.title === "string" ? activePost.title : "");
  const postBody = decodeStoredText(typeof activePost?.body === "string" ? activePost.body : "");
  const postText = decodeStoredText(typeof activePost?.text === "string" ? activePost.text : "");
  const displayTitle = postTitle || (postText.length > 96 ? `${postText.slice(0, 96)}...` : postText);
  const displayBody = postBody || (postTitle ? postText : "");
  const postDetailPath = postId ? `/feed/${encodeURIComponent(postId)}` : "";

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
  const [showComments, setShowComments] = useState(defaultShowComments);
  const [commentText, setCommentText] = useState("");
  const [isCommenting, setIsCommenting] = useState(false);
  const [commentError, setCommentError] = useState("");
  const [showReportModal, setShowReportModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState({
    category: activePost?.category || "discussion",
    title: displayTitle || "",
    body: displayBody || "",
    tags: Array.isArray(activePost?.tags) ? activePost.tags.map((tag) => `/${tag}`).join(" ") : ""
  });
  const [editError, setEditError] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [reportReason, setReportReason] = useState("Spam");
  const [reportDetails, setReportDetails] = useState("");
  const [reportNotice, setReportNotice] = useState("");
  const [isReporting, setIsReporting] = useState(false);

  // Check if current user is post owner
  const isPostOwner = Boolean(userId && String(activePost?.author?._id) === String(userId));
  const canModeratePost = isPostOwner || user?.role === "admin";
  const canEditPost = canModeratePost && activePost?.contentType !== "reel";

  useEffect(() => {
    setCurrentPost(post);
  }, [post]);

  useEffect(() => {
    setShowComments(defaultShowComments);
  }, [defaultShowComments, post?._id]);

  // SET INITIAL LIKE STATE
  useEffect(() => {
    setLikes(activePost.likes?.length || 0);

    if (activePost.likes && userId) {
      const isLiked = activePost.likes.some(
        (id) => id.toString() === userId
      );
      setLiked(isLiked);
    } else {
      setLiked(false);
    }
  }, [activePost.likes, userId]);

  useEffect(() => {
    setComments((activePost.comments || []).filter((comment) => !comment.isDeleted));
  }, [activePost.comments]);

  useEffect(() => {
    if (!showComments || !highlightCommentId) return;
    const target = document.querySelector(`[data-comment-id="${CSS.escape(String(highlightCommentId))}"]`);
    if (!target) return;
    target.scrollIntoView({ behavior: "smooth", block: "center" });
    target.classList.add("comment-item-highlight");
    const timer = window.setTimeout(() => target.classList.remove("comment-item-highlight"), 2200);
    return () => window.clearTimeout(timer);
  }, [comments.length, highlightCommentId, showComments]);

  useEffect(() => {
    setViews(activePost.viewCount || 0);
  }, [activePost.viewCount]);

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
    const sourceText = displayTitle || displayBody || postText;
    const preview = sourceText.length > 50 ? `${sourceText.substring(0, 50)}...` : sourceText;
    const shareText = `Check out this post on KeyVoid: "${preview}"`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          text: shareText,
        url: postDetailPath ? `${window.location.origin}${postDetailPath}` : window.location.href
        });
      } catch (err) {
        console.error("Share failed:", err);
      }
    } else {
      try {
        await navigator.clipboard.writeText(`${shareText} ${postDetailPath ? `${window.location.origin}${postDetailPath}` : window.location.href}`);
        alert("Link copied to clipboard!");
      } catch {
        alert("Unable to copy link.");
      }
    }
  };

  const shouldIgnoreCardNavigation = (event) => {
    return Boolean(event.target.closest("a, button, input, textarea, select, video, audio, label"));
  };

  const openPostDetail = (event) => {
    if (!linkToDetail || !postDetailPath || shouldIgnoreCardNavigation(event)) return;
    navigate(postDetailPath);
  };

  const handleCardKeyDown = (event) => {
    if (!linkToDetail || !postDetailPath || shouldIgnoreCardNavigation(event)) return;
    if (event.key === "Enter") {
      navigate(postDetailPath);
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

  const openEditModal = () => {
    setEditForm({
      category: activePost?.category === "general" ? "discussion" : activePost?.category || "discussion",
      title: displayTitle || "",
      body: displayBody || "",
      tags: Array.isArray(activePost?.tags) ? activePost.tags.map((tag) => `/${tag}`).join(" ") : ""
    });
    setEditError("");
    setShowEditModal(true);
  };

  const handleEditFieldChange = (event) => {
    const { name, value } = event.target;
    setEditForm((current) => ({ ...current, [name]: value }));
  };

  const handleUpdatePost = async (event) => {
    event.preventDefault();

    if (!postId || isEditing || !editForm.title.trim()) return;

    setIsEditing(true);
    setEditError("");

    try {
      const { data } = await API.patch(`/posts/${postId}`, {
        category: editForm.category,
        title: editForm.title.trim(),
        body: editForm.body.trim(),
        tags: editForm.tags.trim()
      });

      setCurrentPost(data);
      setComments((data.comments || []).filter((comment) => !comment.isDeleted));
      setShowEditModal(false);
    } catch (err) {
      setEditError(getApiErrorMessage(err, "Failed to edit post"));
    } finally {
      setIsEditing(false);
    }
  };

  return (
    <div
      className={`post-card${linkToDetail ? " post-card-clickable" : ""}`}
      ref={cardRef}
      onClick={openPostDetail}
      onKeyDown={handleCardKeyDown}
      role={linkToDetail ? "link" : undefined}
      tabIndex={linkToDetail ? 0 : undefined}
      aria-label={linkToDetail ? `Open discussion: ${displayTitle || "post"}` : undefined}
    >
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

      {showEditModal && (
        <div className="delete-modal-overlay" onClick={() => setShowEditModal(false)}>
          <form className="delete-modal edit-post-modal" onSubmit={handleUpdatePost} onClick={(event) => event.stopPropagation()}>
            <div className="delete-modal-header">
              <span className="delete-modal-title">Edit Post</span>
              <span className="delete-modal-status">Update the thread title, body, category, and /tags.</span>
            </div>
            <label className="report-field">
              Category
              <select name="category" value={editForm.category} onChange={handleEditFieldChange}>
                {CATEGORY_OPTIONS.map((category) => (
                  <option key={category.value} value={category.value}>{category.label}</option>
                ))}
              </select>
            </label>
            <label className="report-field">
              Title
              <input name="title" value={editForm.title} onChange={handleEditFieldChange} maxLength={140} required />
            </label>
            <label className="report-field">
              Body
              <textarea name="body" value={editForm.body} onChange={handleEditFieldChange} maxLength={4000} />
            </label>
            <label className="report-field">
              Tags
              <input name="tags" value={editForm.tags} onChange={handleEditFieldChange} maxLength={240} placeholder="/newmusic /guitar" />
            </label>
            {editError && <p className="comment-error">{editError}</p>}
            <div className="modal-actions">
              <button className="modal-cancel" type="button" onClick={() => setShowEditModal(false)}>Cancel</button>
              <button className="modal-save" type="submit" disabled={isEditing || !editForm.title.trim()}>
                {isEditing ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* HEADER */}
      <div className="post-header">
        <Link to={`/u/${encodeURIComponent(authorUsername)}`} className="post-avatar post-avatar-link" aria-label={`Open ${authorUsername}'s profile`}>
          {activePost.author?.username?.[0]?.toUpperCase() || "U"}
        </Link>
        <div className="post-user-info">
          <Link to={`/u/${encodeURIComponent(authorUsername)}`} className="post-username-link">
            <div className="post-username">
              {authorUsername}
            </div>
          </Link>
          <div className="post-timestamp">
            {getRelativeTime(new Date(activePost.createdAt))}
            {activePost.isEdited ? " (edited)" : ""}
          </div>
        </div>
        <span className="post-category-badge">
          {CATEGORY_LABELS[activePost.category] || "General"}
        </span>
        {activePost.author?.role === "creator" && <span className="post-creator-badge">Creator</span>}
        {canEditPost && (
          <button
            className="post-delete-btn"
            onClick={openEditModal}
            title="Edit post"
          >
            <Pencil size={16} />
          </button>
        )}
        {canModeratePost && (
          <button 
            className="post-delete-btn"
            onClick={() => setShowDeleteModal(true)}
            title="Delete post"
          >
            <Trash2 size={16} />
          </button>
        )}
        {!canModeratePost && isAuthenticated && (
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
        {displayTitle && <h3 className="post-title">{renderSlashTags(displayTitle, onTagClick)}</h3>}
        {displayBody && <p className="post-body">{renderSlashTags(displayBody, onTagClick)}</p>}
        {Array.isArray(activePost.tags) && activePost.tags.length > 0 && (
          <div className="post-tag-row">
            {activePost.tags.map((tag) => (
              <button key={tag} type="button" onClick={() => onTagClick?.(tag)}>
                /{tag}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* MEDIA */}
      {activePost.mediaUrl && (
        <div className="post-media">
          {activePost.mediaType === "image" ? (
            <img src={activePost.mediaUrl} alt="Post media" className="post-image" loading="lazy" />
          ) : activePost.mediaType === "video" ? (
            <video controls className="post-video" preload="metadata">
              <source src={activePost.mediaUrl} />
            </video>
          ) : activePost.mediaType === "audio" ? (
            <audio controls className="post-audio">
              <source src={activePost.mediaUrl} />
            </audio>
          ) : null}
        </div>
      )}

      {/* ACTIONS */}
      <div className="post-insight-row">
        <span><Eye size={15} /> {views} views</span>
        {activePost.recommendationReason && (
          <span><TrendingUp size={15} /> {activePost.recommendationReason}</span>
        )}
        {activePost.safetyStatus && activePost.safetyStatus !== "clear" && (
          <span><Flag size={15} /> {activePost.safetyStatus.replace("_", " ")}</span>
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
          <span className="spark-like-symbol" aria-hidden="true">{liked ? "✦" : "✧"}</span>
          <span className="action-count">{likes}</span>
        </button>

        {/* COMMENT BUTTON */}
        <button
          className="post-action-btn"
          onClick={() => {
            if (linkToDetail && postDetailPath) {
              navigate(postDetailPath);
              return;
            }
            setShowComments((current) => !current);
          }}
          title={linkToDetail ? "Open discussion" : "View comments"}
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
                  <div className="comment-item" data-comment-id={comment._id} key={comment._id}>
                    <div className="comment-avatar">
                      {comment.author?.username?.[0]?.toUpperCase() || "U"}
                    </div>
                    <div className="comment-body">
                      <div className="comment-meta">
                        {comment.author?.username ? (
                          <Link to={`/u/${encodeURIComponent(comment.author.username)}`}>{comment.author.username}</Link>
                        ) : (
                          <span>unknown</span>
                        )}
                        <span>{getRelativeTime(new Date(comment.createdAt))}</span>
                      </div>
                      <p>{decodeStoredText(comment.text)}</p>
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
