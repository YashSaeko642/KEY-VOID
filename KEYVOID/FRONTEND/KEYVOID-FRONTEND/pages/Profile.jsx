import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import API from "../services/api";
import { useAuth } from "../src/context/useAuth";

const EMPTY_FORM = {
  username: "",
  bio: "",
  location: "",
  website: "",
  favoriteGenres: ""
};
const IMAGE_LIMIT_BYTES = 2 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp", "image/gif"];

function profileToForm(profile = {}) {
  return {
    username: profile.username || "",
    bio: profile.bio || "",
    location: profile.location || "",
    website: profile.website || "",
    favoriteGenres: Array.isArray(profile.favoriteGenres) ? profile.favoriteGenres.join(", ") : ""
  };
}

export default function Profile() {
  const { updateUser, user } = useAuth();
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [imageState, setImageState] = useState({
    avatarFile: null,
    avatarPreview: "",
    bannerFile: null,
    bannerPreview: "",
    removeAvatar: false,
    removeBanner: false
  });
  const [status, setStatus] = useState("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    let ignore = false;

    async function loadProfile() {
      try {
        const { data } = await API.get("/profiles/me");

        if (!ignore) {
          setFormData(profileToForm(data.profile));
          setImageState({
            avatarFile: null,
            avatarPreview: data.profile.avatarUrl || "",
            bannerFile: null,
            bannerPreview: data.profile.bannerUrl || "",
            removeAvatar: false,
            removeBanner: false
          });
          updateUser(data.profile);
          setStatus("ready");
        }
      } catch (error) {
        if (!ignore) {
          setMessage(error.response?.data?.msg || "Unable to load your profile");
          setStatus("error");
        }
      }
    }

    loadProfile();

    return () => {
      ignore = true;
    };
  }, []);

  function handleChange(event) {
    const { name, value } = event.target;
    setFormData((current) => ({ ...current, [name]: value }));
  }

  function handleImageChange(event) {
    const { files, name } = event.target;
    const file = files?.[0];

    if (!file) {
      return;
    }

    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      setMessage("Images must be PNG, JPG, WEBP, or GIF");
      event.target.value = "";
      return;
    }

    if (file.size > IMAGE_LIMIT_BYTES) {
      setMessage("Images must be smaller than 2 MB");
      event.target.value = "";
      return;
    }

    const previewUrl = URL.createObjectURL(file);
    const isAvatar = name === "avatar";

    setImageState((current) => {
      const previousPreview = isAvatar ? current.avatarPreview : current.bannerPreview;
      if (previousPreview.startsWith("blob:")) {
        URL.revokeObjectURL(previousPreview);
      }

      return {
        ...current,
        [isAvatar ? "avatarFile" : "bannerFile"]: file,
        [isAvatar ? "avatarPreview" : "bannerPreview"]: previewUrl,
        [isAvatar ? "removeAvatar" : "removeBanner"]: false
      };
    });
    setMessage("");
  }

  function clearImage(name) {
    const isAvatar = name === "avatar";
    setImageState((current) => {
      const previousPreview = isAvatar ? current.avatarPreview : current.bannerPreview;
      if (previousPreview.startsWith("blob:")) {
        URL.revokeObjectURL(previousPreview);
      }

      return {
        ...current,
        [isAvatar ? "avatarFile" : "bannerFile"]: null,
        [isAvatar ? "avatarPreview" : "bannerPreview"]: "",
        [isAvatar ? "removeAvatar" : "removeBanner"]: true
      };
    });
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setStatus("saving");
    setMessage("");

    try {
      const profileForm = new FormData();
      profileForm.append("username", formData.username);
      profileForm.append("bio", formData.bio);
      profileForm.append("location", formData.location);
      profileForm.append("website", formData.website);
      profileForm.append("favoriteGenres", formData.favoriteGenres);
      profileForm.append("removeAvatar", String(imageState.removeAvatar));
      profileForm.append("removeBanner", String(imageState.removeBanner));

      if (imageState.avatarFile) {
        profileForm.append("avatar", imageState.avatarFile);
      }

      if (imageState.bannerFile) {
        profileForm.append("banner", imageState.bannerFile);
      }

      const { data } = await API.patch("/profiles/me", profileForm);

      updateUser(data.profile);
      setFormData(profileToForm(data.profile));
      setImageState((current) => {
        if (current.avatarPreview.startsWith("blob:")) {
          URL.revokeObjectURL(current.avatarPreview);
        }
        if (current.bannerPreview.startsWith("blob:")) {
          URL.revokeObjectURL(current.bannerPreview);
        }

        return {
          avatarFile: null,
          avatarPreview: data.profile.avatarUrl || "",
          bannerFile: null,
          bannerPreview: data.profile.bannerUrl || "",
          removeAvatar: false,
          removeBanner: false
        };
      });
      setMessage("Profile updated");
      setStatus("ready");
    } catch (error) {
      setMessage(error.response?.data?.msg || "Unable to update profile");
      setStatus("ready");
    }
  }

  const previewAvatar = imageState.avatarPreview || "";
  const publicProfilePath = `/u/${encodeURIComponent(formData.username || user?.username || "")}`;

  return (
    <section className="dashboard-page">
      <div className="profile-layout">
        <form className="dashboard-panel profile-editor" onSubmit={handleSubmit}>
          <p className="dashboard-kicker text-xs uppercase tracking-[0.18em] text-blue-300/90">
            Profile
          </p>
          <h1 className="font-['Michroma'] text-[clamp(2rem,4vw,3.4rem)] leading-tight text-slate-50">
            Shape your public identity.
          </h1>
          <p className="text-slate-300/80">
            This is the profile listeners and creators will see around KeyVoid.
          </p>

          {status === "loading" ? <p className="auth-success">Loading profile...</p> : null}
          {message ? (
            <p className={message === "Profile updated" ? "auth-success" : "auth-error"}>{message}</p>
          ) : null}

          <div className="profile-form-grid">
            <label className="auth-field">
              <span>Display name</span>
              <input
                maxLength="24"
                minLength="3"
                name="username"
                onChange={handleChange}
                required
                type="text"
                value={formData.username}
              />
            </label>
            <label className="auth-field">
              <span>Location</span>
              <input
                maxLength="60"
                name="location"
                onChange={handleChange}
                placeholder="City, country, scene..."
                type="text"
                value={formData.location}
              />
            </label>
            <label className="auth-field profile-wide-field">
              <span>Bio</span>
              <textarea
                maxLength="280"
                name="bio"
                onChange={handleChange}
                placeholder="Tell people what you listen to, make, or want to discover."
                rows="4"
                value={formData.bio}
              />
            </label>
            <label className="auth-field">
              <span>Website</span>
              <input
                name="website"
                onChange={handleChange}
                placeholder="https://..."
                type="url"
                value={formData.website}
              />
            </label>
            <label className="auth-field">
              <span>Favorite genres</span>
              <input
                name="favoriteGenres"
                onChange={handleChange}
                placeholder="Ambient, rap, shoegaze"
                type="text"
                value={formData.favoriteGenres}
              />
            </label>
            <label className="auth-field">
              <span>Avatar image</span>
              <input
                accept="image/png,image/jpeg,image/webp,image/gif"
                onChange={handleImageChange}
                name="avatar"
                type="file"
              />
              {imageState.avatarPreview ? (
                <button className="auth-inline-button" onClick={() => clearImage("avatar")} type="button">
                  Remove avatar
                </button>
              ) : null}
            </label>
            <label className="auth-field">
              <span>Banner image</span>
              <input
                accept="image/png,image/jpeg,image/webp,image/gif"
                onChange={handleImageChange}
                name="banner"
                type="file"
              />
              {imageState.bannerPreview ? (
                <button className="auth-inline-button" onClick={() => clearImage("banner")} type="button">
                  Remove banner
                </button>
              ) : null}
            </label>
          </div>

          <div className="auth-inline-actions">
            <button className="auth-submit" disabled={status === "saving"} type="submit">
              {status === "saving" ? "Saving..." : "Save profile"}
            </button>
            <Link className="nav-button nav-button-secondary" to={publicProfilePath}>
              View public profile
            </Link>
          </div>

          <div style={{
            marginBottom: "32px",
            display: "grid",
            gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
            gap: "20px"
          }}>
            <div style={{
              padding: "20px",
              background: "rgba(99, 102, 241, 0.1)",
              borderRadius: "16px",
              border: "1px solid rgba(99, 102, 241, 0.25)",
              textAlign: "center"
            }}>
              <p style={{fontSize: "12px", color: "#c7d2fe", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "8px"}}>Followers</p>
              <p style={{fontSize: "36px", fontWeight: "700", color: "#818cf8", margin: 0}}>{user?.followersCount || 0}</p>
            </div>
            <div style={{
              padding: "20px",
              background: "rgba(168, 85, 247, 0.1)",
              borderRadius: "16px",
              border: "1px solid rgba(168, 85, 247, 0.25)",
              textAlign: "center"
            }}>
              <p style={{fontSize: "12px", color: "#f3e8ff", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "8px"}}>Following</p>
              <p style={{fontSize: "36px", fontWeight: "700", color: "#a855f7", margin: 0}}>{user?.followingCount || 0}</p>
            </div>
          </div>

        </form>

        <aside className="dashboard-panel profile-preview-panel">
          <div className="profile-banner" style={{ backgroundImage: imageState.bannerPreview ? `url(${imageState.bannerPreview})` : "" }} />
          <div className="profile-preview-avatar">
            {previewAvatar ? <img alt="" src={previewAvatar} /> : <span>{(formData.username || "K").slice(0, 1)}</span>}
          </div>
          <p className="dashboard-kicker">Preview</p>
          <h2>{formData.username || user?.username || "Your profile"}</h2>
          <p>{formData.bio || "Your bio will show up here."}</p>
          <div className="profile-chip-row">
            {(formData.favoriteGenres
              ? formData.favoriteGenres.split(",").map((genre) => genre.trim()).filter(Boolean)
              : ["Discovery"]
            ).map((genre) => (
              <span key={genre} className="profile-chip">
                {genre}
              </span>
            ))}
          </div>
        </aside>
      </div>
    </section>
  );
}
