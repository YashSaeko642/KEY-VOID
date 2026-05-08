import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Search as SearchIcon, UserRound, X } from "lucide-react";
import { searchProfiles } from "../services/api";
import "./Search.css";

const RESULTS_PER_PAGE = 20;

export default function Search() {
  const [searchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState(searchParams.get("q") || "");
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    const timer = setTimeout(async () => {
      const query = searchQuery.trim();

      if (query.length < 2) {
        setSearchResults([]);
        setError("");
        setTotal(0);
        return;
      }

      setLoading(true);
      setError("");
      setPage(0);

      try {
        const response = await searchProfiles(query, RESULTS_PER_PAGE, 0);
        setSearchResults(response.data.profiles || []);
        setTotal(response.data.total || 0);
      } catch (err) {
        setError("Failed to search profiles");
        console.error("Search error:", err);
      } finally {
        setLoading(false);
      }
    }, 450);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const loadMore = async () => {
    setLoading(true);
    try {
      const nextPage = page + 1;
      const response = await searchProfiles(
        searchQuery,
        RESULTS_PER_PAGE,
        nextPage * RESULTS_PER_PAGE
      );

      setSearchResults((prev) => [...prev, ...(response.data.profiles || [])]);
      setPage(nextPage);
    } catch (err) {
      setError("Failed to load more results");
      console.error("Load more error:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="search-page social-surface">
      <section className="search-shell">
        <aside className="search-rail">
          <p className="search-kicker">Discover</p>
          <h1>Find people worth listening with.</h1>
          <p>Search creators, listeners, and profile bios. Community and track search can plug into this same surface next.</p>
        </aside>

        <main className="search-main">
          <div className="search-input-wrap">
            <SearchIcon size={18} />
            <input
              type="search"
              placeholder="Search username..."
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              autoFocus
            />
            {searchQuery ? (
              <button type="button" onClick={() => setSearchQuery("")} aria-label="Clear search">
                <X size={18} />
              </button>
            ) : null}
          </div>

          {error ? <div className="search-error">{error}</div> : null}

          {searchQuery.trim().length > 0 ? (
            <>
              {loading && searchResults.length === 0 ? (
                <div className="search-empty">Searching...</div>
              ) : null}

              {searchResults.length === 0 && !loading ? (
                <div className="search-empty">No profiles found for "{searchQuery}"</div>
              ) : null}

              <div className="profile-result-list">
                {searchResults.map((profile) => (
                  <Link key={profile.id || profile.username} to={`/u/${profile.username}`} className="profile-result">
                    <div className="profile-result-avatar">
                      {profile.avatarUrl ? (
                        <img src={profile.avatarUrl} alt={profile.username} />
                      ) : (
                        <UserRound size={24} />
                      )}
                    </div>
                    <div className="profile-result-body">
                      <div className="profile-result-top">
                        <div>
                          <h2>{profile.displayName || profile.username}</h2>
                          <small>@{profile.username}</small>
                        </div>
                        <span>{profile.isCreator ? "Creator" : "Listener"}</span>
                      </div>
                      <p>{profile.bio || "No bio yet."}</p>
                      <div className="profile-result-stats">
                        <span><strong>{profile.followersCount ?? 0}</strong> followers</span>
                        <span><strong>{profile.followingCount ?? 0}</strong> following</span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>

              {searchResults.length < total ? (
                <button className="search-load-more" onClick={loadMore} disabled={loading}>
                  {loading ? "Loading..." : `Load More (${searchResults.length}/${total})`}
                </button>
              ) : null}
            </>
          ) : (
            <div className="search-empty">Start typing to discover profiles.</div>
          )}
        </main>
      </section>
    </div>
  );
}
