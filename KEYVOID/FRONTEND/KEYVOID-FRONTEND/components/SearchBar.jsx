import { useState } from "react";
import { motion } from "framer-motion";

export default function SearchBar({ onSearch, isLoading }) {
  const [searchTerm, setSearchTerm] = useState("");
  const [isFocused, setIsFocused] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (searchTerm.trim().length >= 2) {
      onSearch(searchTerm);
    }
  };

  const isValid = searchTerm.trim().length >= 2;

  return (
    <motion.form
      onSubmit={handleSubmit}
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="w-full mb-12"
    >
      {/* Search Input Container */}
      <div className="relative group">
        {/* Glowing background effect */}
        {isFocused && (
          <motion.div
            layoutId="search-glow"
            className="absolute -inset-1 bg-gradient-to-r from-blue-600/20 via-purple-600/20 to-blue-600/20 rounded-2xl blur-xl opacity-75"
            animate={{ opacity: [0.5, 0.8, 0.5] }}
            transition={{ duration: 3, repeat: Infinity }}
          />
        )}

        {/* Main input wrapper */}
        <motion.div
          animate={{
            boxShadow: isFocused
              ? "0 0 20px rgba(59, 130, 246, 0.3), 0 0 40px rgba(147, 51, 234, 0.15)"
              : "0 4px 12px rgba(0, 0, 0, 0.1)"
          }}
          transition={{ duration: 0.3 }}
          className="relative bg-gradient-to-br from-slate-800/80 to-slate-900/80 backdrop-blur-xl border border-slate-700/50 rounded-2xl overflow-hidden"
        >
          {/* Animated gradient border on focus */}
          {isFocused && (
            <motion.div
              className="absolute inset-0 rounded-2xl p-[2px] pointer-events-none"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-blue-500 via-purple-500 to-blue-500 opacity-50" />
            </motion.div>
          )}

          <div className="relative flex items-center gap-3 px-5 py-4">
            {/* Search Icon */}
            <motion.div
              animate={{ scale: isFocused ? 1.1 : 1, color: isFocused ? "#3b82f6" : "#94a3b8" }}
              transition={{ duration: 0.2 }}
              className="text-2xl flex-shrink-0"
            >
              🔍
            </motion.div>

            {/* Input Field */}
            <motion.input
              type="text"
              placeholder="Search by name or bio..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              className="flex-1 bg-transparent text-slate-50 placeholder-slate-400 focus:outline-none font-medium text-lg"
              whileHover={{ scale: 1.01 }}
            />

            {/* Clear button */}
            {searchTerm && (
              <motion.button
                type="button"
                onClick={() => setSearchTerm("")}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                whileHover={{ scale: 1.2, rotate: 90 }}
                whileTap={{ scale: 0.9 }}
                className="text-slate-400 hover:text-slate-200 transition-colors flex-shrink-0"
              >
                ✕
              </motion.button>
            )}

            {/* Search Button */}
            <motion.button
              type="submit"
              disabled={!isValid || isLoading}
              whileHover={isValid ? { scale: 1.05, x: 2 } : {}}
              whileTap={isValid ? { scale: 0.95 } : {}}
              animate={{
                background: isValid
                  ? "linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)"
                  : "rgba(71, 85, 105, 0.5)"
              }}
              className="ml-2 px-6 py-2 rounded-xl font-semibold text-white text-sm flex items-center gap-2 flex-shrink-0 transition-all duration-300 disabled:cursor-not-allowed"
            >
              <motion.span
                animate={{ rotate: isLoading ? 360 : 0 }}
                transition={{ duration: 1, repeat: isLoading ? Infinity : 0 }}
              >
                {isLoading ? "⏳" : "→"}
              </motion.span>
              <span className="hidden sm:inline">
                {isLoading ? "Searching" : "Search"}
              </span>
            </motion.button>
          </div>
        </motion.div>
      </div>

      {/* Validation Message */}
      <motion.div
        layout
        className="mt-3 flex items-center gap-2 h-5"
      >
        {searchTerm.trim().length < 2 && searchTerm.length > 0 ? (
          <motion.p
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            className="text-xs font-medium text-amber-400/80 flex items-center gap-1"
          >
            <span>⚠️</span>
            <span>Minimum 2 characters required</span>
          </motion.p>
        ) : searchTerm.trim().length >= 2 && !isLoading ? (
          <motion.p
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            className="text-xs font-medium text-emerald-400/80 flex items-center gap-1"
          >
            <span>✓</span>
            <span>Ready to search</span>
          </motion.p>
        ) : null}
      </motion.div>

      {/* Search Tips */}
      {!searchTerm && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 10 }}
          transition={{ delay: 0.2 }}
          className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs text-slate-400"
        >
          <div className="flex items-center gap-2">
            <span>💡</span>
            <span>Search by username</span>
          </div>
          <div className="flex items-center gap-2">
            <span>🎵</span>
            <span>Find creators</span>
          </div>
          <div className="flex items-center gap-2">
            <span>👥</span>
            <span>Browse profiles</span>
          </div>
          <div className="flex items-center gap-2">
            <span>🔗</span>
            <span>Connect & follow</span>
          </div>
        </motion.div>
      )}
    </motion.form>
  );
}
