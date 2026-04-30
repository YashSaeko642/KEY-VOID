import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import API, { followUser, unfollowUser, getFollowStatus } from "../services/api";
import { useAuth } from "../src/context/useAuth";

export default function PublicProfile() {
  const { username } = useParams();
  const { user, isAuthenticated } = useAuth();
  const [profile, setProfile] = useState(null);
  const [status, setStatus] = useState("loading");
  const [message, setMessage] = useState("");
  const [followStatus, setFollowStatus] = useState(null);
  const [isFollowLoading, setIsFollowLoading] = useState(false);

  useEffect(() => {
    let ignore = false;

    async function loadProfile() {
      setStatus("loading");
      setMessage("");

      try {
        const { data } = await API.get(`/profiles/${encodeURIComponent(username)}`);

        if (!ignore) {
          setProfile(data.profile);
          setStatus("ready");

          // Load follow status if authenticated and not own profile
          if (isAuthenticated && data.profile.id !== user?.id) {
            try {
              const followRes = await getFollowStatus(data.profile.id);
              setFollowStatus(followRes.data);
            } catch (err) {
              console.error("Error loading follow status:", err);
            }
          }
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
  }, [username, isAuthenticated, user?.id]);

  const handleFollowToggle = async () => {
    if (!isAuthenticated) {
      setMessage("Please log in to follow users");
      return;
    }

    setIsFollowLoading(true);
    try {
      if (followStatus?.isFollowing) {
        await unfollowUser(profile.id);
      } else {
        await followUser(profile.id);
      }

      // Update follow status
      setFollowStatus(prev => ({
        ...prev,
        isFollowing: !prev.isFollowing
      }));

      // Reload the full profile to get updated counts
      const { data } = await API.get(`/profiles/${encodeURIComponent(username)}`);
      setProfile(data.profile);
    } catch (err) {
      setMessage("Failed to update follow status");
      console.error("Follow error:", err);
    } finally {
      setIsFollowLoading(false);
    }
  };

  if (status === "loading") {
    return (
      <section className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 py-12 px-4">
        <div className="mx-auto max-w-4xl">
          <p className="text-slate-400">Loading profile...</p>
        </div>
      </section>
    );
  }

  if (status === "error") {
    return (
      <section className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 py-12 px-4">
        <div className="mx-auto max-w-4xl text-center">
          <h1 className="text-3xl font-bold text-slate-50 mb-4">Profile Not Found</h1>
          <p className="text-slate-400 mb-6">{message}</p>
          <Link className="inline-block px-8 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg transition-colors" to="/">
            ← Go Home
          </Link>
        </div>
      </section>
    );
  }

  const isOwnProfile = user?.id === profile.id;
  const joinedDate = profile.joinedAt ? new Date(profile.joinedAt).toLocaleDateString() : "";

  return (
    <section style={{
      minHeight: "100vh",
      background: "linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #0f172a 100%)",
      padding: "40px 20px",
      fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif"
    }}>
      <div style={{maxWidth: "900px", margin: "0 auto"}}>
        {/* Banner */}
        {profile.bannerUrl && (
          <div 
            style={{
              height: "300px",
              backgroundImage: `url(${profile.bannerUrl})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
              borderTopLeftRadius: "20px",
              borderTopRightRadius: "20px",
              border: "1px solid rgba(71, 85, 105, 0.3)",
              marginBottom: "-80px",
              position: "relative",
              zIndex: 1
            }}
          />
        )}

        {/* Profile Card */}
        <div style={{
          background: "rgba(15, 23, 42, 0.7)",
          border: "1px solid rgba(71, 85, 105, 0.3)",
          borderTopLeftRadius: profile.bannerUrl ? "0" : "20px",
          borderTopRightRadius: profile.bannerUrl ? "0" : "20px",
          borderBottomLeftRadius: "20px",
          borderBottomRightRadius: "20px",
          backdropFilter: "blur(10px)",
          padding: "60px 50px",
          position: "relative",
          zIndex: 2
        }}>
          {/* Avatar Section */}
          <div style={{
            display: "flex",
            alignItems: "flex-end",
            gap: "30px",
            marginBottom: "40px",
            paddingBottom: "40px",
            borderBottom: "1px solid rgba(71, 85, 105, 0.2)"
          }}>
            {/* Avatar */}
            <div>
              {profile.avatarUrl ? (
                <img 
                  src={profile.avatarUrl} 
                  alt={profile.username}
                  style={{
                    width: "150px",
                    height: "150px",
                    borderRadius: "16px",
                    objectFit: "cover",
                    border: "4px solid rgba(99, 102, 241, 0.3)",
                    marginTop: profile.bannerUrl ? "-100px" : "0"
                  }}
                />
              ) : (
                <div style={{
                  width: "150px",
                  height: "150px",
                  borderRadius: "16px",
                  background: "linear-gradient(135deg, #4f46e5 0%, #a855f7 100%)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "64px",
                  fontWeight: "700",
                  color: "white",
                  border: "4px solid rgba(99, 102, 241, 0.3)",
                  marginTop: profile.bannerUrl ? "-100px" : "0"
                }}>
                  {profile.username.slice(0, 1).toUpperCase()}
                </div>
              )}
            </div>

            {/* User Info */}
            <div style={{flex: 1}}>
              <div style={{marginBottom: "16px", display: "flex", alignItems: "center", gap: "12px"}}>
                <span style={{
                  padding: "8px 16px",
                  background: "rgba(99, 102, 241, 0.15)",
                  border: "1px solid rgba(99, 102, 241, 0.3)",
                  color: "#818cf8",
                  fontSize: "12px",
                  fontWeight: "700",
                  borderRadius: "20px",
                  textTransform: "uppercase",
                  letterSpacing: "1px"
                }}>
                  {profile.role === "creator" ? "🎵 Creator" : "🎧 Listener"}
                </span>
              </div>
              <h1 style={{
                fontSize: "48px",
                fontWeight: "700",
                color: "#f1f5f9",
                marginBottom: "12px"
              }}>
                {profile.username}
              </h1>
              <p style={{
                fontSize: "16px",
                color: "#cbd5e1",
                lineHeight: "1.6"
              }}>
                {profile.bio || "This profile is on a sonic journey..."}
              </p>
            </div>

            {/* Follow Button */}
            {!isOwnProfile && isAuthenticated && (
              <button
                onClick={handleFollowToggle}
                disabled={isFollowLoading}
                style={{
                  padding: "14px 32px",
                  fontSize: "15px",
                  fontWeight: "700",
                  borderRadius: "10px",
                  border: followStatus?.isFollowing ? "1px solid rgba(99, 102, 241, 0.3)" : "1px solid rgba(99, 102, 241, 0.5)",
                  background: followStatus?.isFollowing ? "linear-gradient(135deg, #4f46e5 0%, #6366f1 100%)" : "transparent",
                  color: followStatus?.isFollowing ? "white" : "#818cf8",
                  cursor: isFollowLoading ? "not-allowed" : "pointer",
                  transition: "all 0.3s ease",
                  whiteSpace: "nowrap",
                  opacity: isFollowLoading ? 0.6 : 1
                }}
                onMouseEnter={(e) => {
                  if (!isFollowLoading) {
                    if (!followStatus?.isFollowing) {
                      e.currentTarget.style.background = "rgba(99, 102, 241, 0.15)";
                      e.currentTarget.style.borderColor = "rgba(99, 102, 241, 0.8)";
                    }
                    e.currentTarget.style.transform = "translateY(-4px)";
                    e.currentTarget.style.boxShadow = "0 10px 20px rgba(99, 102, 241, 0.2)";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isFollowLoading) {
                    if (!followStatus?.isFollowing) {
                      e.currentTarget.style.background = "transparent";
                      e.currentTarget.style.borderColor = "rgba(99, 102, 241, 0.5)";
                    }
                    e.currentTarget.style.transform = "translateY(0)";
                    e.currentTarget.style.boxShadow = "none";
                  }
                }}
              >
                {isFollowLoading ? "..." : followStatus?.isFollowing ? "✓ Following" : "+ Follow"}
              </button>
            )}
          </div>

          {message && (
            <div style={{
              marginBottom: "30px",
              padding: "16px 20px",
              background: "rgba(239, 68, 68, 0.1)",
              border: "1px solid rgba(239, 68, 68, 0.3)",
              color: "#fca5a5",
              fontSize: "14px",
              borderRadius: "10px"
            }}>
              {message}
            </div>
          )}

          {/* Stats Grid */}
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
            gap: "30px",
            marginBottom: "40px",
            paddingBottom: "40px",
            borderBottom: "1px solid rgba(71, 85, 105, 0.2)"
          }}>
            <div>
              <p style={{fontSize: "12px", letterSpacing: "2px", color: "#94a3b8", textTransform: "uppercase", marginBottom: "12px", fontWeight: "600"}}>Followers</p>
              <p style={{fontSize: "40px", fontWeight: "700", color: "#818cf8"}}>{profile.followersCount || 0}</p>
            </div>
            <div>
              <p style={{fontSize: "12px", letterSpacing: "2px", color: "#94a3b8", textTransform: "uppercase", marginBottom: "12px", fontWeight: "600"}}>Following</p>
              <p style={{fontSize: "40px", fontWeight: "700", color: "#a855f7"}}>{profile.followingCount || 0}</p>
            </div>
            <div>
              <p style={{fontSize: "12px", letterSpacing: "2px", color: "#94a3b8", textTransform: "uppercase", marginBottom: "12px", fontWeight: "600"}}>Joined</p>
              <p style={{fontSize: "20px", fontWeight: "700", color: "#cbd5e1"}}>{joinedDate || "Recently"}</p>
            </div>
            {profile.website && (
              <div>
                <p style={{fontSize: "12px", letterSpacing: "2px", color: "#94a3b8", textTransform: "uppercase", marginBottom: "12px", fontWeight: "600"}}>Website</p>
                <a 
                  href={profile.website} 
                  target="_blank" 
                  rel="noreferrer"
                  style={{
                    fontSize: "15px",
                    fontWeight: "600",
                    color: "#818cf8",
                    textDecoration: "none",
                    transition: "color 0.2s ease",
                    display: "block"
                  }}
                  onMouseEnter={(e) => e.target.style.color = "#a78bfa"}
                  onMouseLeave={(e) => e.target.style.color = "#818cf8"}
                >
                  Visit →
                </a>
              </div>
            )}
          </div>

          {/* Favorite Genres */}
          {profile.favoriteGenres && profile.favoriteGenres.length > 0 && (
            <div style={{marginBottom: "40px"}}>
              <h3 style={{
                fontSize: "16px",
                fontWeight: "700",
                color: "#f1f5f9",
                marginBottom: "16px",
                textTransform: "uppercase",
                letterSpacing: "1px"
              }}>
                🎵 Favorite Genres
              </h3>
              <div style={{
                display: "flex",
                flexWrap: "wrap",
                gap: "12px"
              }}>
                {profile.favoriteGenres.map((genre) => (
                  <span 
                    key={genre}
                    style={{
                      padding: "10px 18px",
                      background: "rgba(99, 102, 241, 0.1)",
                      border: "1px solid rgba(99, 102, 241, 0.3)",
                      color: "#cbd5e1",
                      borderRadius: "8px",
                      fontSize: "14px",
                      fontWeight: "600",
                      transition: "all 0.2s ease",
                      cursor: "default"
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = "rgba(99, 102, 241, 0.2)";
                      e.currentTarget.style.borderColor = "rgba(99, 102, 241, 0.6)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = "rgba(99, 102, 241, 0.1)";
                      e.currentTarget.style.borderColor = "rgba(99, 102, 241, 0.3)";
                    }}
                  >
                    {genre}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div style={{display: "flex", gap: "16px", flexWrap: "wrap"}}>
            {isOwnProfile && (
              <Link 
                to="/profile"
                style={{
                  padding: "14px 32px",
                  background: "linear-gradient(135deg, #4f46e5 0%, #6366f1 100%)",
                  color: "white",
                  border: "1px solid rgba(99, 102, 241, 0.3)",
                  borderRadius: "10px",
                  fontSize: "15px",
                  fontWeight: "600",
                  textDecoration: "none",
                  display: "inline-block",
                  cursor: "pointer",
                  transition: "all 0.3s ease"
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "translateY(-4px)";
                  e.currentTarget.style.boxShadow = "0 10px 20px rgba(99, 102, 241, 0.2)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.boxShadow = "none";
                }}
              >
                ✎ Edit Profile
              </Link>
            )}
            <Link 
              to="/"
              style={{
                padding: "14px 32px",
                background: "rgba(30, 41, 59, 0.6)",
                color: "#cbd5e1",
                border: "1px solid rgba(71, 85, 105, 0.5)",
                borderRadius: "10px",
                fontSize: "15px",
                fontWeight: "600",
                textDecoration: "none",
                display: "inline-block",
                cursor: "pointer",
                transition: "all 0.3s ease"
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = "rgba(168, 85, 247, 0.6)";
                e.currentTarget.style.background = "rgba(168, 85, 247, 0.1)";
                e.currentTarget.style.color = "#e2e8f0";
                e.currentTarget.style.transform = "translateY(-4px)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = "rgba(71, 85, 105, 0.5)";
                e.currentTarget.style.background = "rgba(30, 41, 59, 0.6)";
                e.currentTarget.style.color = "#cbd5e1";
                e.currentTarget.style.transform = "translateY(0)";
              }}
            >
              ← Back to Home
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
