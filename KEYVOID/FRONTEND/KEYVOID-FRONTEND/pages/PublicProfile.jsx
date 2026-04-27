import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import API, { followUser, unfollowUser } from "../services/api";
import { useAuth } from "../src/context/useAuth";

export default function PublicProfile() {
  const { username } = useParams();
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [status, setStatus] = useState("loading");
  const [message, setMessage] = useState("");
  const [isFollowing, setIsFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);

  useEffect(() => {
    let ignore = false;

    async function loadProfile() {
      setStatus("loading");
      setMessage("");

      try {
        const { data } = await API.get(`/profiles/${encodeURIComponent(username)}`);

        if (!ignore) {
          setProfile(data.profile);
          setIsFollowing(data.profile.isFollowing);
          setStatus("ready");
        }
      } catch (error) {
        if (!ignore) {
          setMessage(error.response?.data?.msg || "Unable to load profile");
          setStatus("error");
        }
      }
    }

    loadProfile();

    return () => {
      ignore = true;
    };
  }, [username]);

  const handleFollowClick = async () => {
    setFollowLoading(true);
    try {
      if (isFollowing) {
        await unfollowUser(profile.id);
        setIsFollowing(false);
      } else {
        await followUser(profile.id);
        setIsFollowing(true);
      }
    } catch (error) {
      setMessage(error.response?.data?.msg || "Failed to update follow status");
    } finally {
      setFollowLoading(false);
    }
  };

  if (status === "loading") {
    return (
      <section className="dashboard-page">
        <div className="dashboard-panel">
          <p className="dashboard-kicker">Public profile</p>
          <h1>Loading profile...</h1>
        </div>
      </section>
    );
  }

  if (status === "error") {
    return (
      <section className="dashboard-page">
        <div className="dashboard-panel">
          <p className="dashboard-kicker">Public profile</p>
          <h1>Profile not found.</h1>
          <p>{message}</p>
          <Link className="nav-button nav-button-secondary" to="/">
            Go home
          </Link>
        </div>
      </section>
    );
  }

  const isOwnProfile = user?.id === profile.id;
  const joinedDate = profile.joinedAt ? new Date(profile.joinedAt).toLocaleDateString() : "";

  return (
    <section className="dashboard-page">
      <article className="dashboard-panel public-profile-card">
        <div className="profile-banner" style={{ backgroundImage: profile.bannerUrl ? `url(${profile.bannerUrl})` : "" }} />
        <div className="public-profile-body">
          <div className="profile-preview-avatar profile-preview-avatar-large">
            {profile.avatarUrl ? <img alt="" src={profile.avatarUrl} /> : <span>{profile.username.slice(0, 1)}</span>}
          </div>

          <div className="public-profile-heading">
            <p className="dashboard-kicker">{profile.role === "creator" ? "Creator" : "Listener"}</p>
            <h1>{profile.username}</h1>
            <p>{profile.bio || "This KeyVoid profile is still warming up."}</p>
          </div>

          <div className="dashboard-grid">
            <div className="dashboard-card">
              <span className="dashboard-label">Location</span>
              <strong>{profile.location || "Not set"}</strong>
            </div>
            <div className="dashboard-card">
              <span className="dashboard-label">Joined</span>
              <strong>{joinedDate || "Recently"}</strong>
            </div>
            <div className="dashboard-card">
              <span className="dashboard-label">Website</span>
              <strong>
                {profile.website ? (
                  <a href={profile.website} rel="noreferrer" target="_blank">
                    Visit
                  </a>
                ) : (
                  "Not set"
                )}
              </strong>
            </div>
            <div className="dashboard-card">
              <span className="dashboard-label">Followers</span>
              <strong>{profile.followersCount}</strong>
            </div>
            <div className="dashboard-card">
              <span className="dashboard-label">Following</span>
              <strong>{profile.followingCount}</strong>
            </div>
          </div>

          <div className="profile-chip-row">
            {(profile.favoriteGenres?.length ? profile.favoriteGenres : ["Discovery"]).map((genre) => (
              <span key={genre} className="profile-chip">
                {genre}
              </span>
            ))}
          </div>

          {message && (
            <motion.p
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className={message.includes("Failed") ? "auth-error" : "auth-success"}
            >
              {message}
            </motion.p>
          )}

          <div className="auth-inline-actions">
            {isOwnProfile ? (
              <Link className="nav-button nav-button-primary" to="/profile">
                Edit profile
              </Link>
            ) : (
              <>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleFollowClick}
                  disabled={followLoading}
                  className={`nav-button ${
                    isFollowing ? "nav-button-secondary" : "nav-button-primary"
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  {followLoading ? "..." : isFollowing ? "Following" : "Follow"}
                </motion.button>
              </>
            )}
          </div>
        </div>
      </article>
    </section>
  );
}
