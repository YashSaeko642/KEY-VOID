import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { searchProfiles } from "../services/api";

export default function Search() {
  const [searchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState(searchParams.get("q") || "");
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);

  const RESULTS_PER_PAGE = 20;

  // Perform search
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (searchQuery.trim().length < 2) {
        setSearchResults([]);
        setError("");
        return;
      }

      setLoading(true);
      setError("");
      setPage(0);

      try {
        const response = await searchProfiles(
          searchQuery,
          RESULTS_PER_PAGE,
          0
        );
        setSearchResults(response.data.profiles || []);
        setTotal(response.data.total || 0);
      } catch (err) {
        setError("Failed to search profiles");
        console.error("Search error:", err);
      } finally {
        setLoading(false);
      }
    }, 500); // Debounce search

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Load more results
  const loadMore = async () => {
    setLoading(true);
    try {
      const nextPage = page + 1;
      const response = await searchProfiles(
        searchQuery,
        RESULTS_PER_PAGE,
        nextPage * RESULTS_PER_PAGE
      );

      setSearchResults(prev => [...prev, ...(response.data.profiles || [])]);
      setPage(nextPage);
    } catch (err) {
      setError("Failed to load more results");
      console.error("Load more error:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #0f172a 100%)",
      padding: "60px 40px",
      fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif"
    }}>
      <div style={{maxWidth: "1200px", margin: "0 auto"}}>
        {/* Header */}
        <div style={{marginBottom: "50px"}}>
          <h1 style={{
            fontSize: "clamp(2.5rem, 5vw, 4rem)",
            color: "#f1f5f9",
            fontWeight: "700",
            marginBottom: "16px",
            fontFamily: "'Michroma', monospace"
          }}>
            Discover
          </h1>
          <p style={{fontSize: "18px", color: "#cbd5e1"}}>Find creators and listeners in the KeyVoid community</p>
        </div>

        {/* Search Input */}
        <div style={{position: "relative", marginBottom: "50px"}}>
          <span style={{
            position: "absolute",
            left: "20px",
            top: "50%",
            transform: "translateY(-50%)",
            fontSize: "20px",
            pointerEvents: "none"
          }}>🔍</span>
          <input
            type="text"
            style={{
              width: "100%",
              paddingLeft: "56px",
              paddingRight: "16px",
              paddingTop: "16px",
              paddingBottom: "16px",
              border: "1px solid rgba(71, 85, 105, 0.5)",
              borderRadius: "12px",
              background: "rgba(15, 23, 42, 0.6)",
              color: "#f1f5f9",
              fontSize: "16px",
              outline: "none",
              transition: "all 0.3s ease",
              boxSizing: "border-box",
              backdropFilter: "blur(10px)",
              maxWidth: "600px"
            }}
            placeholder="Search username..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={(e) => {
              e.target.style.borderColor = "rgba(99, 102, 241, 0.8)";
              e.target.style.boxShadow = "0 0 0 3px rgba(99, 102, 241, 0.1)";
            }}
            onBlur={(e) => {
              e.target.style.borderColor = "rgba(71, 85, 105, 0.5)";
              e.target.style.boxShadow = "none";
            }}
            autoFocus
          />
          {searchQuery && (
            <button
              style={{
                position: "absolute",
                right: "16px",
                top: "50%",
                transform: "translateY(-50%)",
                background: "none",
                border: "none",
                color: "#94a3b8",
                fontSize: "24px",
                cursor: "pointer",
                padding: "4px",
                transition: "color 0.2s ease"
              }}
              onClick={() => setSearchQuery("")}
              onMouseEnter={(e) => e.target.style.color = "#f1f5f9"}
              onMouseLeave={(e) => e.target.style.color = "#94a3b8"}
            >
              ×
            </button>
          )}
        </div>

        {error && (
          <div style={{
            background: "rgba(239, 68, 68, 0.1)",
            border: "1px solid rgba(239, 68, 68, 0.3)",
            color: "#fca5a5",
            padding: "16px 20px",
            borderRadius: "12px",
            marginBottom: "30px",
            fontSize: "14px"
          }}>
            {error}
          </div>
        )}

        {searchQuery.trim().length > 0 ? (
          <>
            {loading && searchResults.length === 0 && (
              <div style={{textAlign: "center", paddingY: "60px", color: "#94a3b8"}}>
                <div style={{fontSize: "32px", marginBottom: "16px", animation: "spin 1s linear infinite"}}>⟳</div>
                <p style={{fontSize: "16px"}}>Searching...</p>
              </div>
            )}

            {searchResults.length === 0 && !loading && (
              <div style={{textAlign: "center", padding: "60px 20px", color: "#94a3b8"}}>
                <p style={{fontSize: "16px"}}>No profiles found for "{searchQuery}"</p>
              </div>
            )}

            {searchResults.length > 0 && (
              <>
                {/* Cards Grid */}
                <div style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))",
                  gap: "24px",
                  marginBottom: "50px"
                }}>
                  {searchResults.map((profile) => (
                    <a
                      key={profile.id}
                      href={`/u/${profile.username}`}
                      style={{
                        textDecoration: "none",
                        color: "inherit",
                        display: "block",
                        background: "rgba(15, 23, 42, 0.5)",
                        border: "1px solid rgba(71, 85, 105, 0.3)",
                        borderRadius: "16px",
                        padding: "24px",
                        transition: "all 0.3s ease",
                        cursor: "pointer"
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = "rgba(99, 102, 241, 0.6)";
                        e.currentTarget.style.background = "rgba(15, 23, 42, 0.8)";
                        e.currentTarget.style.transform = "translateY(-8px)";
                        e.currentTarget.style.boxShadow = "0 20px 40px rgba(99, 102, 241, 0.15)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = "rgba(71, 85, 105, 0.3)";
                        e.currentTarget.style.background = "rgba(15, 23, 42, 0.5)";
                        e.currentTarget.style.transform = "translateY(0)";
                        e.currentTarget.style.boxShadow = "none";
                      }}
                    >
                      {/* Header with Avatar and Badge */}
                      <div style={{display: "flex", alignItems: "flex-start", gap: "16px", marginBottom: "20px"}}>
                        <div>
                          {profile.avatarUrl ? (
                            <img
                              src={profile.avatarUrl}
                              alt={profile.username}
                              style={{
                                width: "80px",
                                height: "80px",
                                borderRadius: "12px",
                                objectFit: "cover",
                                border: "2px solid rgba(99, 102, 241, 0.3)"
                              }}
                            />
                          ) : (
                            <div style={{
                              width: "80px",
                              height: "80px",
                              borderRadius: "12px",
                              background: "linear-gradient(135deg, #4f46e5 0%, #a855f7 100%)",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              color: "white",
                              fontSize: "36px",
                              fontWeight: "700",
                              border: "2px solid rgba(99, 102, 241, 0.3)"
                            }}>
                              {profile.username.charAt(0).toUpperCase()}
                            </div>
                          )}
                        </div>
                        <div style={{flex: 1}}>
                          <h3 style={{
                            fontSize: "20px",
                            fontWeight: "700",
                            color: "#f1f5f9",
                            marginBottom: "6px"
                          }}>
                            {profile.username}
                          </h3>
                          <span style={{
                            display: "inline-block",
                            fontSize: "12px",
                            fontWeight: "600",
                            color: "#818cf8",
                            background: "rgba(99, 102, 241, 0.1)",
                            border: "1px solid rgba(99, 102, 241, 0.2)",
                            padding: "4px 12px",
                            borderRadius: "20px",
                            marginBottom: "8px"
                          }}>
                            {profile.isCreator ? "🎵 Creator" : "🎧 Listener"}
                          </span>
                        </div>
                      </div>

                      {/* Bio */}
                      {profile.bio && (
                        <p style={{
                          fontSize: "14px",
                          color: "#cbd5e1",
                          marginBottom: "16px",
                          lineHeight: "1.6",
                          display: "-webkit-box",
                          WebkitLineClamp: "2",
                          WebkitBoxOrient: "vertical",
                          overflow: "hidden"
                        }}>
                          {profile.bio}
                        </p>
                      )}

                      {/* Stats */}
                      <div style={{
                        display: "grid",
                        gridTemplateColumns: "1fr 1fr",
                        gap: "12px",
                        paddingTop: "16px",
                        borderTop: "1px solid rgba(71, 85, 105, 0.3)"
                      }}>
                        <div style={{textAlign: "center", paddingY: "12px"}}>
                          <p style={{fontSize: "18px", fontWeight: "700", color: "#818cf8"}}>
                            {profile.followersCount}
                          </p>
                          <p style={{fontSize: "12px", color: "#94a3b8", textTransform: "uppercase", letterSpacing: "1px"}}>
                            Followers
                          </p>
                        </div>
                        <div style={{textAlign: "center", paddingY: "12px"}}>
                          <p style={{fontSize: "18px", fontWeight: "700", color: "#a855f7"}}>
                            {profile.followingCount}
                          </p>
                          <p style={{fontSize: "12px", color: "#94a3b8", textTransform: "uppercase", letterSpacing: "1px"}}>
                            Following
                          </p>
                        </div>
                      </div>

                      {/* View Button */}
                      <button style={{
                        width: "100%",
                        marginTop: "16px",
                        padding: "12px",
                        background: "rgba(99, 102, 241, 0.1)",
                        border: "1px solid rgba(99, 102, 241, 0.3)",
                        color: "#818cf8",
                        borderRadius: "8px",
                        fontSize: "14px",
                        fontWeight: "600",
                        cursor: "pointer",
                        transition: "all 0.2s ease"
                      }}
                      onClick={(e) => e.preventDefault()}
                      onMouseEnter={(e) => {
                        e.target.style.background = "rgba(99, 102, 241, 0.2)";
                        e.target.style.borderColor = "rgba(99, 102, 241, 0.6)";
                      }}
                      onMouseLeave={(e) => {
                        e.target.style.background = "rgba(99, 102, 241, 0.1)";
                        e.target.style.borderColor = "rgba(99, 102, 241, 0.3)";
                      }}
                      >
                        View Profile →
                      </button>
                    </a>
                  ))}
                </div>

                {/* Load More */}
                {searchResults.length < total && (
                  <div style={{textAlign: "center"}}>
                    <button
                      style={{
                        padding: "16px 40px",
                        background: "linear-gradient(135deg, #4f46e5 0%, #6366f1 100%)",
                        color: "white",
                        border: "1px solid rgba(99, 102, 241, 0.3)",
                        borderRadius: "12px",
                        fontSize: "15px",
                        fontWeight: "600",
                        cursor: "pointer",
                        transition: "all 0.3s ease"
                      }}
                      onClick={loadMore}
                      disabled={loading}
                      onMouseEnter={(e) => {
                        if (!e.target.disabled) {
                          e.target.style.transform = "translateY(-4px)";
                          e.target.style.boxShadow = "0 15px 30px rgba(99, 102, 241, 0.3)";
                        }
                      }}
                      onMouseLeave={(e) => {
                        e.target.style.transform = "translateY(0)";
                        e.target.style.boxShadow = "none";
                      }}
                    >
                      {loading ? "Loading..." : `Load More (${searchResults.length}/${total})`}
                    </button>
                  </div>
                )}
              </>
            )}
          </>
        ) : (
          <div style={{textAlign: "center", padding: "100px 20px", color: "#94a3b8"}}>
            <div style={{fontSize: "64px", marginBottom: "24px"}}>🎧</div>
            <p style={{fontSize: "18px"}}>Start searching to discover profiles</p>
          </div>
        )}
      </div>
    </div>
  );
}
