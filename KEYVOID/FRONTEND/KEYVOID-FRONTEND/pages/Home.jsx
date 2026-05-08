import { useNavigate } from "react-router-dom";
import { useAuth } from "../src/context/useAuth";
import EnterVoidModal from "../components/EnterVoidModal";
import { useState } from "react";

const featureBlocks = [
  {
    title: "Social listening",
    text: "Posts, reels, comments, follows, and music activity in one place."
  },
  {
    title: "Discovery sessions",
    text: "Step outside your usual loop with guided genre and mood exploration."
  },
  {
    title: "Creator space",
    text: "Upload tracks, grow a following, and turn releases into conversations."
  },
  {
    title: "Community taste",
    text: "Audience tags, likes, playlists, and follows shape what rises next."
  }
];

export default function Home() {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [showVoidModal, setShowVoidModal] = useState(false);

  const handleEnterVoid = () => {
    if (!isAuthenticated) {
      navigate("/login");
    } else {
      setShowVoidModal(true);
    }
  };

  const handleVoidSessionStart = () => {
    setShowVoidModal(false);
  };

  return (
    <section className="home-hero overflow-hidden">
      <div className="orb orb-one" aria-hidden="true" />
      <div className="orb orb-two" aria-hidden="true" />
      <div className="orb orb-three" aria-hidden="true" />

      <div className="hero-stage">
        <div className="hero-core" aria-hidden="true">
          <span className="core-ring ring-one" />
          <span className="core-ring ring-two" />
          <span className="core-ring ring-three" />
          <span className="core-ring ring-four" />
          <span className="core-dot" />
        </div>

        <div className="hero-copy px-4">
          <p className="eyebrow text-[11px] uppercase tracking-[0.24em] text-blue-300/90">
            Rain-soaked discovery for emerging artists
          </p>
          <h1 className="font-['Michroma'] text-balance text-[clamp(3rem,7vw,5.3rem)] leading-none text-slate-50">
            Meet <span>KeyVoid</span>
          </h1>
          <p className="hero-subtitle text-xs tracking-[0.28em] text-slate-300/70">
            A quieter kind of music discovery.
          </p>
          <p className="hero-text max-w-4xl text-pretty text-base leading-8 text-slate-300/80">
            KeyVoid is a music-focused social platform where listeners find
            unfamiliar sounds, artists share their progress, and discovery feels
            intentional instead of algorithmically repetitive.
          </p>

          <div className="hero-highlights">
            <div className="highlight-pill">Creator-first growth</div>
            <div className="highlight-pill">Social music culture</div>
            <div className="highlight-pill">Curated randomness</div>
          </div>

          <div className="hero-actions">
            <button
              type="button"
              className="primary-action"
              onClick={handleEnterVoid}
              title={!isAuthenticated ? "Log in to enter the void" : ""}
            >
              Enter The Void
            </button>
            <button type="button" className="secondary-action" onClick={() => document.getElementById("about")?.scrollIntoView({ behavior: "smooth" })}>
              Explore The Vision
            </button>
          </div>
        </div>
      </div>

      <div className="overview-strip" id="about">
        <div className="overview-item">
          <span className="overview-label">Listen</span>
          <span className="overview-value">Play tracks, save favorites, and build playlists.</span>
        </div>
        <div className="overview-item">
          <span className="overview-label">Post</span>
          <span className="overview-value">Share reactions, clips, images, and music culture.</span>
        </div>
        <div className="overview-item">
          <span className="overview-label">Discover</span>
          <span className="overview-value">Follow creators and find tracks outside your loop.</span>
        </div>
      </div>

      <div className="section-divider" aria-hidden="true">
        <span />
        <span />
        <span />
      </div>

      <div className="home-story" id="vision">
        <div className="home-story-copy">
          <p className="eyebrow">About KeyVoid</p>
          <h2>Music discovery should feel social, alive, and a little unpredictable.</h2>
          <p>
            KeyVoid blends the velocity of short-form media with the depth of community discussion.
            Listeners can drift through reels, collect songs, follow creators, and talk around the
            sounds they love before popularity turns them obvious.
          </p>
        </div>
        <div className="feature-grid">
          {featureBlocks.map((feature) => (
            <article key={feature.title} className="feature-tile">
              <span />
              <h3>{feature.title}</h3>
              <p>{feature.text}</p>
            </article>
          ))}
        </div>
      </div>

      <EnterVoidModal
        isOpen={showVoidModal}
        onClose={() => setShowVoidModal(false)}
        onSessionStart={handleVoidSessionStart}
      />
    </section>
  );
}
