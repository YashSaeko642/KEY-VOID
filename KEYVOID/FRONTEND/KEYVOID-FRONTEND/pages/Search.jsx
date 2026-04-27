import { useState } from "react";
import { motion } from "framer-motion";
import SearchBar from "../components/SearchBar";
import ProfileCard from "../components/ProfileCard";
import { searchProfiles, followUser, unfollowUser } from "../services/api";
import { useAuth } from "../src/context/useAuth";

export default function Search() {
  const { user } = useAuth();
  const [results, setResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [pagination, setPagination] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [lastQuery, setLastQuery] = useState("");
  const [followingState, setFollowingState] = useState({});
  const [actionLoading, setActionLoading] = useState({});

  const handleSearch = async (query) => {
    setIsLoading(true);
    setError("");
    setCurrentPage(1);
    setLastQuery(query);

    try {
      const data = await searchProfiles(query, 20, 1);
      setResults(data.profiles);
      setPagination(data.pagination);

      // Initialize following state
      const following = {};
      data.profiles.forEach((profile) => {
        following[profile.id] = profile.isFollowing;
      });
      setFollowingState(following);
    } catch (err) {
      setError(err.response?.data?.msg || "Failed to search profiles");
      setResults([]);
      setPagination(null);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLoadMore = async () => {
    if (!lastQuery || !pagination) return;

    setIsLoading(true);
    try {
      const data = await searchProfiles(lastQuery, 20, currentPage + 1);
      setResults([...results, ...data.profiles]);
      setPagination(data.pagination);
      setCurrentPage(currentPage + 1);

      const following = { ...followingState };
      data.profiles.forEach((profile) => {
        following[profile.id] = profile.isFollowing;
      });
      setFollowingState(following);
    } catch (err) {
      setError("Failed to load more profiles");
    } finally {
      setIsLoading(false);
    }
  };

  const handleFollow = async (userId) => {
    setActionLoading((prev) => ({ ...prev, [userId]: true }));
    try {
      await followUser(userId);
      setFollowingState((prev) => ({ ...prev, [userId]: true }));
    } catch (err) {
      setError(err.response?.data?.msg || "Failed to follow user");
    } finally {
      setActionLoading((prev) => ({ ...prev, [userId]: false }));
    }
  };

  const handleUnfollow = async (userId) => {
    setActionLoading((prev) => ({ ...prev, [userId]: true }));
    try {
      await unfollowUser(userId);
      setFollowingState((prev) => ({ ...prev, [userId]: false }));
    } catch (err) {
      setError(err.response?.data?.msg || "Failed to unfollow user");
    } finally {
      setActionLoading((prev) => ({ ...prev, [userId]: false }));
    }
  };

  return (
    <section className="search-page py-12 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-12"
        >
          <h1 className="font-['Michroma'] text-[clamp(2rem,4vw,3.4rem)] leading-tight text-slate-50 mb-3">
            Discover Artists
          </h1>
          <p className="text-slate-300/80">
            Search and connect with amazing creators in the community
          </p>
        </motion.div>

        {/* Search Bar */}
        <SearchBar onSearch={handleSearch} isLoading={isLoading} />

        {/* Error Message */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-red-900/20 border border-red-700/50 rounded-lg p-4 mb-6 text-red-300"
          >
            {error}
          </motion.div>
        )}

        {/* Results */}
        {results.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <div className="mb-6">
              <p className="text-slate-400 text-sm">
                Found {pagination?.total} result{pagination?.total !== 1 ? "s" : ""}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
              {results.map((profile) => (
                <ProfileCard
                  key={profile.id}
                  profile={profile}
                  isFollowing={followingState[profile.id]}
                  onFollow={handleFollow}
                  onUnfollow={handleUnfollow}
                  isCurrentUser={user?.id === profile.id}
                  isLoading={actionLoading[profile.id]}
                />
              ))}
            </div>

            {/* Load More Button */}
            {pagination &&
              currentPage < pagination.totalPages && (
                <div className="flex justify-center mt-8">
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleLoadMore}
                    disabled={isLoading}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:bg-slate-600 disabled:cursor-not-allowed transition-colors"
                  >
                    {isLoading ? "Loading..." : "Load More"}
                  </motion.button>
                </div>
              )}
          </motion.div>
        )}

        {/* Empty State */}
        {!isLoading && results.length === 0 && lastQuery && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-12"
          >
            <p className="text-slate-400 text-lg">
              No results found for "{lastQuery}"
            </p>
            <p className="text-slate-500 text-sm mt-2">
              Try searching with different keywords
            </p>
          </motion.div>
        )}

        {/* Initial State */}
        {!isLoading && results.length === 0 && !lastQuery && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-16"
          >
            <div className="text-6xl mb-4">🔍</div>
            <p className="text-slate-400 text-lg">
              Start searching for artists and creators
            </p>
            <p className="text-slate-500 text-sm mt-2">
              Type at least 2 characters to begin
            </p>
          </motion.div>
        )}
      </div>
    </section>
  );
}
