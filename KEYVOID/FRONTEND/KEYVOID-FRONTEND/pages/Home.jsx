const rainDrops = Array.from({ length: 120 }, (_, index) => ({
  id: index,
  style: {
    left: `${(index * 3.1) % 100}%`,
    animationDelay: `${(index % 14) * 0.16}s`,
    animationDuration: `${1.1 + (index % 7) * 0.16}s`,
    opacity: 0.12 + (index % 6) * 0.06,
    height: `${50 + (index % 7) * 18}px`
  }
}));

const hoverCards = [
  {
    title: "Why KeyVoid",
    eyebrow: "The aim",
    summary: "Give rising artists room to be found before popularity decides everything.",
    detail:
      "KeyVoid is built for discovery first, helping listeners break out of repetitive recommendation loops while giving creators a real shot at visibility."
  },
  {
    title: "What You Can Do",
    eyebrow: "Core features",
    summary: "Profiles, posts, creator upgrades, discussions, and music-centered sharing.",
    detail:
      "The platform will connect social features with artist tools so fans can explore, interact, and follow a music journey instead of just consuming isolated uploads."
  },
  {
    title: "The Key Void",
    eyebrow: "Discovery mode",
    summary: "A controlled-randomness session that nudges people into new sounds, moods, and genres.",
    detail:
      "Instead of feeding users the same familiar loop, Key Void will use tags like mood, energy, and genre to create intentional exploration sessions."
  },
  {
    title: "How We Build It",
    eyebrow: "Development",
    summary: "Functionality first, immersive polish after the real product flow works.",
    detail:
      "We are starting with auth, profiles, posts, creator tools, and player support. Then we can layer in After Effects visuals, Three.js scenes, and richer motion."
  }
];

export default function Home() {
  return (
    <section className="home-hero overflow-hidden">
      <div className="rain-layer" aria-hidden="true">
        {rainDrops.map((drop) => (
          <span key={drop.id} className="rain-drop" style={drop.style} />
        ))}
      </div>
      <div className="cloud cloud-one" aria-hidden="true" />
      <div className="cloud cloud-two" aria-hidden="true" />
      <div className="cloud cloud-three" aria-hidden="true" />

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
            <button type="button" className="primary-action">
              Enter The Void
            </button>
            <button type="button" className="secondary-action">
              Read The Vision
            </button>
          </div>
        </div>
      </div>

      <div className="overview-strip">
        <div className="overview-item">
          <span className="overview-label">Current focus</span>
          <span className="overview-value">Build the functional MVP first</span>
        </div>
        <div className="overview-item">
          <span className="overview-label">Core stack</span>
          <span className="overview-value">React, Node.js, MongoDB, JWT</span>
        </div>
        <div className="overview-item">
          <span className="overview-label">Future polish</span>
          <span className="overview-value">After Effects, Three.js, deeper motion</span>
        </div>
      </div>

      <div className="section-divider" aria-hidden="true">
        <span />
        <span />
        <span />
      </div>

      <div className="info-grid" id="vision">
        {hoverCards.map((card) => (
          <article
            key={card.title}
            className="info-card bg-slate-950/40 text-slate-50 backdrop-blur-xl"
          >
            <p className="card-eyebrow text-[11px] uppercase tracking-[0.18em] text-cyan-300/90">
              {card.eyebrow}
            </p>
            <h3 className="font-['Michroma'] text-xl leading-tight">{card.title}</h3>
            <p className="card-summary text-sm leading-7 text-slate-300/80">{card.summary}</p>
            <div className="card-popup">
              <p className="text-sm leading-7 text-slate-100/90">{card.detail}</p>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
