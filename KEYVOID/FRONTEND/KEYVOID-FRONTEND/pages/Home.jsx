import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  AudioLines,
  Eclipse,
  Flame,
  Headphones,
  Orbit,
  Radio,
  Sparkles,
  UsersRound,
  Zap
} from "lucide-react";
import EnterVoidModal from "../components/EnterVoidModal";
import { getTrafficStats } from "../services/api";
import { useAuth } from "../src/context/useAuth";

const fallbackStats = {
  online: 1,
  listeners: 0,
  creators: 0,
  totalUsers: 0,
  tracks: 0,
  posts: 0,
  reels: 0
};

const featureBlocks = [
  {
    icon: Radio,
    title: "Void Sessions",
    text: "Drop into guided discovery when your usual rotation starts sounding too familiar.",
    accent: "cyan"
  },
  {
    icon: AudioLines,
    title: "Creator Signals",
    text: "Artists can upload music, publish reels, and turn releases into visible community moments.",
    accent: "violet"
  },
  {
    icon: Flame,
    title: "Culture Feed",
    text: "Posts, reactions, clips, and conversations keep the story around each sound alive.",
    accent: "rose"
  },
  {
    icon: Orbit,
    title: "Taste Graph",
    text: "Follows, tags, likes, playlists, and listens shape discovery without flattening it.",
    accent: "mint"
  }
];

function formatStat(value) {
  const number = Number(value) || 0;

  if (number >= 1000000) return `${(number / 1000000).toFixed(number >= 10000000 ? 0 : 1)}M`;
  if (number >= 1000) return `${(number / 1000).toFixed(number >= 10000 ? 0 : 1)}K`;
  return String(number);
}

export default function Home() {
  const { isAuthenticated, user } = useAuth();
  const navigate = useNavigate();
  const [showVoidModal, setShowVoidModal] = useState(false);
  const [trafficStats, setTrafficStats] = useState(fallbackStats);
  const [statsState, setStatsState] = useState("loading");

  useEffect(() => {
    let ignore = false;

    async function loadTrafficStats() {
      try {
        const { data } = await getTrafficStats();

        if (!ignore) {
          setTrafficStats({ ...fallbackStats, ...data });
          setStatsState("live");
        }
      } catch {
        if (!ignore) {
          setStatsState("quiet");
        }
      }
    }

    loadTrafficStats();
    const intervalId = window.setInterval(loadTrafficStats, 45000);

    return () => {
      ignore = true;
      window.clearInterval(intervalId);
    };
  }, []);

  const greeting = isAuthenticated
    ? `Welcome back, ${user?.displayName || user?.username || "Voidwalker"}`
    : "Welcome wanderer";

  const trafficCards = useMemo(
    () => [
      {
        icon: UsersRound,
        label: "Online Now",
        value: trafficStats.online,
        accent: "cyan"
      },
      {
        icon: Headphones,
        label: "Listeners",
        value: trafficStats.listeners,
        accent: "violet"
      },
      {
        icon: Sparkles,
        label: "Creators",
        value: trafficStats.creators,
        accent: "rose"
      },
      {
        icon: Eclipse,
        label: "Total Users",
        value: trafficStats.totalUsers,
        accent: "amber"
      }
    ],
    [trafficStats]
  );

  const handleEnterVoid = () => {
    if (!isAuthenticated) {
      navigate("/login");
      return;
    }

    setShowVoidModal(true);
  };

  return (
    <section className="home-hero home-redesign overflow-hidden">
      <div className="void-stars" aria-hidden="true" />
      <div className="void-rain" aria-hidden="true">
        {Array.from({ length: 34 }, (_, index) => (
          <span
            key={index}
            style={{
              "--x": `${(index * 37) % 100}%`,
              "--delay": `${(index % 11) * -0.42}s`,
              "--duration": `${2.8 + (index % 6) * 0.42}s`,
              "--height": `${64 + (index % 5) * 18}px`
            }}
          />
        ))}
      </div>
      <div className="void-orb void-orb-one" aria-hidden="true" />
      <div className="void-orb void-orb-two" aria-hidden="true" />
      <div className="void-orb void-orb-three" aria-hidden="true" />

      <div className="home-redesign-shell">
        <div className="home-introduction">
          <div className="home-signal-mark" aria-hidden="true">
            <span />
            <span />
            <Zap size={28} />
          </div>

          <p className="eyebrow">KeyVoid Transmission</p>
          <h1>
            {greeting}
            <span>{isAuthenticated ? "enter the pulse" : "care to enter the void?"}</span>
          </h1>
          <div className="home-hero-actions">
            <button type="button" className="primary-action void-action" onClick={handleEnterVoid}>
              {isAuthenticated ? "Enter The Void" : "Login To Begin"}
            </button>
            <Link className="secondary-action void-link-action" to={isAuthenticated ? "/music" : "/login"}>
              {isAuthenticated ? "Open Music" : "Create Your Signal"}
            </Link>
          </div>
        </div>

        <div className="traffic-panel" aria-label="KeyVoid traffic">
          <div className="traffic-panel-header">
            <div>
              <p className="eyebrow">Traffic Pulse</p>
              <h2>Live void activity</h2>
            </div>
            <span className={`traffic-status traffic-status-${statsState}`}>
              {statsState === "live" ? "Live" : statsState === "loading" ? "Syncing" : "Standby"}
            </span>
          </div>

          <div className="traffic-grid">
            {trafficCards.map((card) => {
              const Icon = card.icon;

              return (
                <article className={`traffic-card traffic-card-${card.accent}`} key={card.label}>
                  <div className="traffic-card-beam" aria-hidden="true" />
                  <div className="traffic-card-topline">
                    <span>
                      <Icon size={19} />
                    </span>
                    <small>{card.label}</small>
                  </div>
                  <strong>{formatStat(card.value)}</strong>
                </article>
              );
            })}
          </div>
        </div>

        <div className="feature-showcase" id="vision">
          <div className="feature-showcase-copy">
            <p className="eyebrow">Major Features</p>
            <h2>Music discovery</h2>
          </div>

          <div className="feature-grid">
            {featureBlocks.map((feature) => {
              const Icon = feature.icon;

              return (
                <article className={`feature-tile feature-tile-${feature.accent}`} key={feature.title}>
                  <div className="feature-laser" aria-hidden="true" />
                  <span className="feature-icon">
                    <Icon size={22} />
                  </span>
                  <h3>{feature.title}</h3>
                </article>
              );
            })}
          </div>
        </div>
      </div>

      <EnterVoidModal
        isOpen={showVoidModal}
        onClose={() => setShowVoidModal(false)}
        onSessionStart={() => setShowVoidModal(false)}
      />
    </section>
  );
}
