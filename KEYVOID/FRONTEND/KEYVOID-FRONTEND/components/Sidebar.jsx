import { useState } from "react";
import { Home, Search, Library, Plus, Heart, ChevronDown, ChevronRight } from "lucide-react";

export default function Sidebar({ playlists, onCreatePlaylist, showCreatePlaylist, setShowCreatePlaylist, newPlaylistName, setNewPlaylistName, newPlaylistDescription, setNewPlaylistDescription, handleCreatePlaylist }) {
  const [expandedSections, setExpandedSections] = useState({
    playlists: true,
    library: true
  });

  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  return (
    <aside className="sidebar">
      <div className="sidebar-content">
        {/* Navigation */}
        <nav className="sidebar-nav">
          <button className="nav-item active">
            <Home size={24} />
            <span>Home</span>
          </button>
          <button className="nav-item">
            <Search size={24} />
            <span>Search</span>
          </button>
          <button className="nav-item">
            <Library size={24} />
            <span>Your Library</span>
          </button>
        </nav>

        {/* Library Section */}
        <div className="sidebar-section">
          <button
            className="section-header"
            onClick={() => toggleSection('library')}
          >
            {expandedSections.library ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
            <span>Your Library</span>
          </button>
          {expandedSections.library && (
            <div className="section-content">
              <button className="library-item" type="button" onClick={onCreatePlaylist}>
                <Plus size={20} />
                <span>Create Playlist</span>
              </button>
              <button className="library-item" type="button">
                <Heart size={20} />
                <span>Liked Songs</span>
              </button>
            </div>
          )}
        </div>

        {/* Playlists Section */}
        <div className="sidebar-section">
          <button
            className="section-header"
            onClick={() => toggleSection('playlists')}
          >
            {expandedSections.playlists ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
            <span>Playlists</span>
          </button>
          {expandedSections.playlists && (
            <div className="section-content">
              {playlists.map(playlist => (
                <button key={playlist._id} className="playlist-item">
                  <span>{playlist.name}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Create Playlist Form */}
        {showCreatePlaylist && (
          <div className="create-playlist-modal">
            <form onSubmit={handleCreatePlaylist}>
              <input
                type="text"
                placeholder="Playlist name"
                value={newPlaylistName}
                onChange={(e) => setNewPlaylistName(e.target.value)}
                required
              />
              <textarea
                placeholder="Description (optional)"
                value={newPlaylistDescription}
                onChange={(e) => setNewPlaylistDescription(e.target.value)}
                rows={3}
              />
              <div className="form-actions">
                <button type="button" onClick={() => setShowCreatePlaylist(false)}>Cancel</button>
                <button type="submit">Create</button>
              </div>
            </form>
          </div>
        )}
      </div>
    </aside>
  );
}