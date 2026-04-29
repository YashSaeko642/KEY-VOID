import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getFollowers, followUser, unfollowUser, getFollowStatus } from "../services/api";
import { useAuth } from "../src/context/useAuth";

export default function FollowersList({ userId, isOpen, onClose }) {
  const { user, isAuthenticated } = useAuth();
  const [followers, setFollowers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [followStatus, setFollowStatus] = useState({});
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);

  const ITEMS_PER_PAGE = 10;

  const loadFollowStatus = useCallback(async (followersList) => {
    try {
      const statusEntries = await Promise.all(
        followersList.map(async (follower) => {
          try {
            const res = await getFollowStatus(follower.id);
            return [follower.id, res.data];
          } catch {
            return null;
          }
        })
      );

      setFollowStatus(Object.fromEntries(statusEntries.filter(Boolean)));
    } catch (err) {
      console.error("Error loading follow status:", err);
    }
  }, []);

  const loadFollowers = useCallback(async (pageNum) => {
    if (!userId) return;

    setLoading(true);
    setError("");

    try {
      const response = await getFollowers(userId, ITEMS_PER_PAGE, pageNum * ITEMS_PER_PAGE);
      const nextFollowers = response.data.followers || [];

      setFollowers(prev => (pageNum === 0 ? nextFollowers : [...prev, ...nextFollowers]));
      setTotal(response.data.total || 0);
      setPage(pageNum);

      if (isAuthenticated && nextFollowers.length > 0) {
        await loadFollowStatus(nextFollowers);
      }
    } catch (err) {
      setError("Failed to load followers");
      console.error("Load followers error:", err);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, loadFollowStatus, userId]);

  useEffect(() => {
    if (isOpen) {
      loadFollowers(0);
    }
  }, [isOpen, loadFollowers]);

  const handleFollowToggle = async (follower) => {
    if (!isAuthenticated) {
      setError("Please log in to follow users");
      return;
    }

    try {
      const isFollowing = followStatus[follower.id]?.isFollowing;

      if (isFollowing) {
        await unfollowUser(follower.id);
      } else {
        await followUser(follower.id);
      }

      setFollowStatus(prev => ({
        ...prev,
        [follower.id]: {
          ...prev[follower.id],
          isFollowing: !isFollowing
        }
      }));
    } catch (err) {
      setError("Failed to update follow status");
      console.error("Follow error:", err);
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-black/70 z-[1000] flex items-center justify-center p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div 
        className="bg-slate-900 border border-slate-700 rounded-lg w-full max-w-md max-h-[80vh] flex flex-col animate-in slide-in-from-bottom-4 duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-6 border-b border-slate-700">
          <h2 className="text-xl font-semibold text-white m-0">Followers ({total})</h2>
          <button 
            className="bg-none border-none text-2xl text-slate-400 cursor-pointer p-0 w-8 h-8 flex items-center justify-center hover:text-white transition-colors"
            onClick={onClose}
          >
            ×
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {error && (
            <div className="bg-red-500/10 border border-red-500 text-red-300 px-4 py-3.5 m-4 rounded">
              {error}
            </div>
          )}

          {loading && followers.length === 0 && (
            <div className="flex items-center justify-center p-8 text-slate-400 text-base">
              Loading followers...
            </div>
          )}

          {followers.length === 0 && !loading && (
            <div className="text-center p-8 text-slate-400">
              No followers yet
            </div>
          )}

          <div className="divide-y divide-slate-700">
            {followers.map(follower => (
              <div key={follower.id} className="flex items-center gap-3 p-4 hover:bg-slate-800/50 transition-colors">
                <Link to={`/u/${encodeURIComponent(follower.username)}`} className="flex items-center gap-3 flex-1 min-w-0">
                  {follower.avatarUrl ? (
                    <img
                      src={follower.avatarUrl}
                      alt={follower.username}
                      className="w-10 h-10 rounded-full object-cover border-2 border-slate-700 flex-shrink-0"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white font-semibold flex-shrink-0">
                      {follower.username.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-base font-semibold text-white whitespace-nowrap overflow-hidden text-ellipsis">
                      {follower.username}
                    </p>
                    <p className="text-xs text-slate-400 uppercase tracking-wider">
                      {follower.isCreator ? "Creator" : "Listener"}
                    </p>
                  </div>
                </Link>

                {isAuthenticated && follower.id !== user?.id && (
                  <button
                    className={`px-4 py-2 border rounded text-sm font-medium whitespace-nowrap transition-all ${
                      followStatus[follower.id]?.isFollowing
                        ? "bg-indigo-600 text-white border-indigo-600 hover:bg-indigo-700"
                        : "border-indigo-600 text-indigo-600 hover:bg-indigo-600/10"
                    }`}
                    onClick={() => handleFollowToggle(follower)}
                  >
                    {followStatus[follower.id]?.isFollowing ? "Following" : "Follow"}
                  </button>
                )}
              </div>
            ))}
          </div>

          {followers.length < total && (
            <div className="text-center p-6">
              <button
                className="px-8 py-3 bg-indigo-600 text-white border-none rounded cursor-pointer text-sm font-medium transition-all hover:bg-indigo-700 hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={() => loadFollowers(page + 1)}
                disabled={loading}
              >
                {loading ? "Loading..." : "Load More"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
