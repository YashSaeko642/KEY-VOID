import { useCallback, useEffect, useRef, useState } from "react";
import { Image, Loader, Send, Video, X } from "lucide-react";
import API, { getApiErrorMessage } from "../services/api";

const CATEGORIES = [
  { value: "discussion", label: "Discussion" },
  { value: "question", label: "Question" },
  { value: "news", label: "News" },
  { value: "recommendation", label: "Recommendation" },
  { value: "fan_content", label: "Fan Content" }
];

const EMPTY_FORM = {
  category: "discussion",
  title: "",
  body: "",
  tags: ""
};

function CreatePostModal({ isOpen, onClose, onPostCreated }) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [media, setMedia] = useState(null);
  const [mediaPreviewUrl, setMediaPreviewUrl] = useState("");
  const [error, setError] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const mediaPreviewRef = useRef("");

  const clearMedia = useCallback(() => {
    if (mediaPreviewRef.current) {
      URL.revokeObjectURL(mediaPreviewRef.current);
      mediaPreviewRef.current = "";
    }
    setMedia(null);
    setMediaPreviewUrl("");
  }, []);

  useEffect(() => () => {
    if (mediaPreviewRef.current) {
      URL.revokeObjectURL(mediaPreviewRef.current);
    }
  }, []);

  useEffect(() => {
    if (!isOpen) {
      setForm(EMPTY_FORM);
      setError("");
      clearMedia();
    }
  }, [clearMedia, isOpen]);

  if (!isOpen) return null;

  const updateField = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  };

  const handleMediaChange = (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) return;

    if (!file.type.startsWith("image/") && !file.type.startsWith("video/")) {
      setError("Please choose an image or video file.");
      return;
    }

    if (file.size > 25 * 1024 * 1024) {
      setError("Media must be smaller than 25 MB.");
      return;
    }

    if (mediaPreviewRef.current) {
      URL.revokeObjectURL(mediaPreviewRef.current);
    }

    const nextPreviewUrl = URL.createObjectURL(file);
    mediaPreviewRef.current = nextPreviewUrl;
    setMedia(file);
    setMediaPreviewUrl(nextPreviewUrl);
    setError("");
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!form.title.trim() || isCreating) return;

    try {
      setIsCreating(true);
      setError("");

      const payload = {
        category: form.category,
        title: form.title.trim(),
        body: form.body.trim(),
        tags: form.tags.trim()
      };

      const response = media
        ? await (() => {
            const formData = new FormData();
            Object.entries(payload).forEach(([key, value]) => formData.append(key, value));
            formData.append("media", media);
            return API.post("/posts", formData);
          })()
        : await API.post("/posts", payload);

      setForm(EMPTY_FORM);
      clearMedia();
      onPostCreated?.(response.data);
      onClose();
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to create discussion."));
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="create-modal-overlay" onClick={onClose}>
      <form className="create-modal" onSubmit={handleSubmit} onClick={(event) => event.stopPropagation()}>
        <div className="create-modal-header">
          <div>
            <p className="feed-sidebar-kicker">Start a thread</p>
            <h2>Open a music discussion</h2>
          </div>
          <button type="button" className="create-modal-close" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>

        {error && <p className="error-banner create-modal-error">{error}</p>}

        <div className="category-picker">
          {CATEGORIES.map((category) => (
            <button
              key={category.value}
              type="button"
              className={form.category === category.value ? "category-pill active" : "category-pill"}
              onClick={() => setForm((current) => ({ ...current, category: category.value }))}
            >
              {category.label}
            </button>
          ))}
        </div>

        <label className="create-field">
          <span>Title</span>
          <input
            name="title"
            value={form.title}
            onChange={updateField}
            maxLength={140}
            placeholder="What do you want the community to talk about?"
            required
          />
        </label>

        <label className="create-field">
          <span>Body</span>
          <textarea
            name="body"
            value={form.body}
            onChange={updateField}
            maxLength={4000}
            placeholder="Add context, thoughts, questions, links, or music details. Use /tags like /shoegaze or /albumdrop."
            rows={8}
          />
        </label>

        <label className="create-field">
          <span>Tags</span>
          <input
            name="tags"
            value={form.tags}
            onChange={updateField}
            maxLength={240}
            placeholder="/newmusic /guitar /production"
          />
        </label>

        {mediaPreviewUrl && (
          <div className="media-preview">
            {media?.type.startsWith("image/") ? (
              <img src={mediaPreviewUrl} alt="preview" />
            ) : (
              <video src={mediaPreviewUrl} controls />
            )}
            <button type="button" onClick={clearMedia}>
              <X size={16} />
            </button>
          </div>
        )}

        <div className="create-modal-footer">
          <div className="composer-tools">
            <label className="media-tool" title="Add image">
              <Image size={18} />
              <input type="file" accept="image/*" onChange={handleMediaChange} />
            </label>
            <label className="media-tool" title="Add video">
              <Video size={18} />
              <input type="file" accept="video/*" onChange={handleMediaChange} />
            </label>
            <span className="char-count">{form.body.length}/4000</span>
          </div>

          <button className="post-submit-btn" disabled={!form.title.trim() || isCreating} type="submit">
            {isCreating ? (
              <>
                <Loader size={16} className="spinner" />
                Posting...
              </>
            ) : (
              <>
                <Send size={16} />
                Start
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}

export default CreatePostModal;
