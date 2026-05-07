import { Search, User } from "lucide-react";

export default function TopBar({ searchQuery, setSearchQuery, user }) {
  return (
    <header className="top-bar">
      <div className="top-bar-content">
        <div className="search-container">
          <div className="search-input-wrapper">
            <Search size={20} />
            <input
              type="text"
              placeholder="What do you want to listen to?"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
        <div className="user-profile">
          <button className="profile-button">
            <User size={20} />
            <span>{user?.name || 'Profile'}</span>
          </button>
        </div>
      </div>
    </header>
  );
}