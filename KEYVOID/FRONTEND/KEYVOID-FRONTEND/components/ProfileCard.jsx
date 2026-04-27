import { motion } from "framer-motion";
import { Link } from "react-router-dom";

export default function ProfileCard({
  profile,
  isFollowing,
  onFollow,
  onUnfollow,
  isCurrentUser,
  isLoading
}) {
  const handleFollowClick = async () => {
    if (isFollowing) {
      await onUnfollow(profile.id);
    } else {
      await onFollow(profile.id);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4 }}
      className="bg-slate-800/30 border border-slate-700 rounded-lg overflow-hidden hover:border-slate-600 transition-all"
    >
      {/* Banner */}
      {profile.bannerUrl && (
        <div className="h-32 bg-gradient-to-r from-blue-600 to-purple-600 overflow-hidden">
          <img
            src={profile.bannerUrl}
            alt="banner"
            className="w-full h-full object-cover"
          />
        </div>
      )}

      {/* Content */}
      <div className="p-4">
        {/* Avatar and Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-end gap-3 flex-1">
            {profile.avatarUrl && (
              <img
                src={profile.avatarUrl}
                alt={profile.username}
                className="w-14 h-14 rounded-full object-cover border-2 border-slate-700"
              />
            )}
            <div className="flex-1 min-w-0">
              <Link
                to={`/u/${encodeURIComponent(profile.username)}`}
                className="block"
              >
                <h3 className="font-semibold text-slate-50 hover:text-blue-400 truncate">
                  {profile.username}
                </h3>
              </Link>
              {profile.isCreator && (
                <span className="text-xs bg-purple-600/20 text-purple-300 px-2 py-1 rounded-full">
                  Creator
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Bio */}
        {profile.bio && (
          <p className="text-sm text-slate-300 mb-3 line-clamp-2">
            {profile.bio}
          </p>
        )}

        {/* Location and Website */}
        <div className="flex flex-wrap gap-2 text-xs text-slate-400 mb-3">
          {profile.location && (
            <span className="flex items-center gap-1">
              📍 {profile.location}
            </span>
          )}
          {profile.website && (
            <a
              href={profile.website}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 hover:text-blue-400"
            >
              🔗 Website
            </a>
          )}
        </div>

        {/* Genres */}
        {profile.favoriteGenres?.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-3">
            {profile.favoriteGenres.slice(0, 3).map((genre) => (
              <span
                key={genre}
                className="text-xs bg-slate-700/50 text-slate-300 px-2 py-1 rounded"
              >
                {genre}
              </span>
            ))}
          </div>
        )}

        {/* Stats */}
        <div className="flex gap-4 text-sm mb-4 pb-4 border-b border-slate-700">
          <div>
            <span className="text-slate-400">Followers</span>
            <p className="font-semibold text-slate-50">
              {profile.followersCount}
            </p>
          </div>
          <div>
            <span className="text-slate-400">Following</span>
            <p className="font-semibold text-slate-50">
              {profile.followingCount}
            </p>
          </div>
        </div>

        {/* Action Button */}
        {!isCurrentUser && (
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleFollowClick}
            disabled={isLoading}
            className={`w-full py-2 rounded-lg font-medium text-sm transition-colors ${
              isFollowing
                ? "bg-slate-700 text-slate-100 hover:bg-slate-600"
                : "bg-blue-600 text-white hover:bg-blue-700"
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {isLoading ? "..." : isFollowing ? "Following" : "Follow"}
          </motion.button>
        )}
      </div>
    </motion.div>
  );
}
