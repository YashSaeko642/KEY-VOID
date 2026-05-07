import SongCard from "./SongCard";

export default function MainContent({ filteredLibrary, isLoading, pagination, handleLoadNextPage, error, onRetry }) {
  return (
    <main className="main-content">
      <div className="content-wrapper">
        {/* Recently Played Section */}
        <section className="content-section">
          <h2 className="section-title">Recently Played</h2>
          <div className="horizontal-scroll">
            {/* Mock data for recently played - replace with real data */}
            <div className="scroll-item">
              <div className="album-card">
                <img src="/api/placeholder/200/200" alt="Album" />
                <h3>Album Title</h3>
                <p>Artist Name</p>
              </div>
            </div>
          </div>
        </section>

        {/* Made for You Section */}
        <section className="content-section">
          <h2 className="section-title">Made for You</h2>
          <div className="horizontal-scroll">
            <div className="scroll-item">
              <div className="mix-card">
                <div className="mix-gradient"></div>
                <h3>Discover Weekly</h3>
                <p>Your weekly mixtape</p>
              </div>
            </div>
          </div>
        </section>

        {/* Songs Grid */}
        <section className="content-section">
          <h2 className="section-title">Songs</h2>
          {error && (
            <div className="error-message">
              <p>{error}</p>
              <button type="button" className="load-more-btn" onClick={onRetry}>
                Retry
              </button>
            </div>
          )}
          <div className="songs-grid">
            {isLoading && filteredLibrary.length === 0 ? (
              <div className="loading-state">Loading songs...</div>
            ) : filteredLibrary.length > 0 ? (
              <>
                {filteredLibrary.map((track) => (
                  <SongCard key={track._id || track.id} track={track} />
                ))}
                {pagination.hasNext && (
                  <button className="load-more-btn" onClick={handleLoadNextPage}>
                    Load More
                  </button>
                )}
              </>
            ) : (
              <div className="empty-state">
                {error ? "Unable to load songs." : "No songs found."}
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}