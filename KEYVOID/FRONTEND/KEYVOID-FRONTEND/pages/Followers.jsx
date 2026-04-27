import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { motion } from "framer-motion";
import ProfileCard from "../components/ProfileCard";
import { getFollowers, getFollowing, followUser, unfollowUser } from "../services/api";
import { useAuth } from "../src/context/useAuth";

export default function Followers() {
  const { username } = useParams();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("followers");
  const [profiles, setProfiles] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [pagination, setPagination] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [userId, setUserId] = useState(null);
  const [followingState, setFollowingState] = useState({});
  const [actionLoading, setActionLoading] = useState({});

  // We would need to get userId from username, for now assume it's passed or use user.id
  useEffect(() => {
    // In a real app, you'd fetch the user ID based on username
    // For now, if no username param, use current user
    if (!username && user?.id) {
      setUserId(user.id);
    }
  }, [username, user]);

  useEffect(() => {
    if (!userId) return;

    const loadProfiles = async () => {
      setIsLoading(true);
      setError("");

      try {
        const data =
          activeTab === "followers"
            ? await getFollowers(userId, 20, 1)
            : await getFollowing(userId, 20, 1);

        setProfiles(data[activeTab === "followers" ? "followers" : "following"]);
        setPagination(data.pagination);
        setCurrentPage(1);

        const following = {};
        data[activeTab === "followers" ? "followers" : "following"].forEach(
          (profile) => {
            following[profile.id] = profile.isFollowing;
          }
        );
        setFollowingState(following);
      } catch (err) {
        setError(err.response?.data?.msg || `Failed to load ${activeTab}`);
        setProfiles([]);
        setPagination(null);
      } finally {
        setIsLoading(false);
      }
    };

    loadProfiles();
  }, [userId, activeTab]);

  const handleFollow = async (targetUserId) => {
    setActionLoading((prev) => ({ ...prev, [targetUserId]: true }));
    try {
      await followUser(targetUserId);
      setFollowingState((prev) => ({ ...prev, [targetUserId]: true }));
    } catch (err) {
      setError(err.response?.data?.msg || "Failed to follow user");
    } finally {
      setActionLoading((prev) => ({ ...prev, [targetUserId]: false }));
    }
  };

  const handleUnfollow = async (targetUserId) => {
    setActionLoading((prev) => ({ ...prev, [targetUserId]: true }));
    try {
      await unfollowUser(targetUserId);
      setFollowingState((prev) => ({ ...prev, [targetUserId]: false }));
    } catch (err) {
      setError(err.response?.data?.msg || "Failed to unfollow user");
    } finally {
      setActionLoading((prev) => ({ ...prev, [targetUserId]: false }));
    }
  };

  const handleLoadMore = async () => {
    if (!userId || !pagination) return;

    setIsLoading(true);
    try {
      const data =
        activeTab === "followers"
          ? await getFollowers(userId, 20, currentPage + 1)
          : await getFollowing(userId, 20, currentPage + 1);

      const newProfiles = data[activeTab === "followers" ? "followers" : "following"];
      setProfiles([...profiles, ...newProfiles]);
      setPagination(data.pagination);
      setCurrentPage(currentPage + 1);

      const following = { ...followingState };
      newProfiles.forEach((profile) => {
        following[profile.id] = profile.isFollowing;
      });
      setFollowingState(following);
    } catch (err) {
      setError("Failed to load more");
    } finally {
      setIsLoading(false);
    }
  };

  if (!userId) {
    return (
      <section className="followers-page py-12 px-4">
        <div className="max-w-4xl mx-auto text-center text-slate-400">
          Loading...
        </div>
      </section>
    );
  }

  return (
    <section className="followers-page py-12 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="font-['Michroma'] text-[clamp(2rem,4vw,3.4rem)] leading-tight text-slate-50">
            {username ? `${username}'s` : "Your"} Network
          </h1>
        </motion.div>

        {/* Tabs */}
        <div className="flex gap-4 mb-8 border-b border-slate-700">
          {["followers", "following"].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-3 font-medium capitalize border-b-2 transition-colors ${
                activeTab === tab
                  ? "border-blue-500 text-blue-400"
                  : "border-transparent text-slate-400 hover:text-slate-300"
              }`}
            >
              {tab} ({pagination?.total || 0})
            </button>
          ))}
        </div>

        {/* Error */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-red-900/20 border border-red-700/50 rounded-lg p-4 mb-6 text-red-300"
          >
            {error}
          </motion.div>
        )}

        {/* Loading */}
        {isLoading && currentPage === 1 && (
          <div className="text-center py-12 text-slate-400">
            Loading {activeTab}...
          </div>
        )}

        {/* Profiles Grid */}
        {profiles.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
              {profiles.map((profile) => (
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

            {/* Load More */}
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
        {!isLoading && profiles.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-12"
          >
            <div className="text-4xl mb-4">
              {activeTab === "followers" ? "👥" : "🔗"}
            </div>
            <p className="text-slate-400 text-lg">
              No {activeTab} yet
            </p>
            <p className="text-slate-500 text-sm mt-2">
              {activeTab === "followers"
                ? "Be the first to follow this user"
                : "Start following creators"}
            </p>
          </motion.div>
        )}
      </div>
    </section>
  );
}
