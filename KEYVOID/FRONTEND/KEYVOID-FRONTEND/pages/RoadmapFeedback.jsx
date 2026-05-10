import { useMemo, useState } from "react";
import { Bug, Lightbulb, MessageSquarePlus, Rocket, Trash2 } from "lucide-react";
import "./RoadmapFeedback.css";

const FEEDBACK_STORAGE_KEY = "keyvoid_product_feedback";
const CURRENT_VERSION = "v0.4.2";

const isBrowser = () => typeof window !== "undefined";


const nextFeatures = [
  {
    title: "Smarter music discovery",
    status: "In progress",
    detail: "Genre onboarding, recommended and explore shelves, recent listening signals, and better outside-your-loop discovery."
  },
  {
    title: "Reels stability",
    status: "In progress",
    detail: "A lighter reel viewer with explicit arrow navigation, media unloading, and a cleaner comment drawer."
  },
  {
    title: "Profile gating (listeners vs creators)",
    status: "Planned",
    detail: "Hide creator-only panels and avoid loading creator endpoints for listener accounts."
  },
  {
    title: "Better social media features such as sharing and embeds",
    status: "Planned",
    detail: "Easier sharing of tracks, playlists, and profiles to other platforms, and richer embeds when KeyVoid links are shared on social media."
  },
  {
    title: "Better animated UI",
    status: "Planned",
    detail: "More microinteractions and animated transitions throughout the app to make it feel more alive and polished."
  }
];


function readFeedback() {
  try {
    if (!isBrowser()) return [];
    return JSON.parse(localStorage.getItem(FEEDBACK_STORAGE_KEY) || "[]");
  } catch {
    return [];
  }
}


export default function RoadmapFeedback() {
  const [items, setItems] = useState(readFeedback);
  const [form, setForm] = useState({
    type: "Feature idea",
    title: "",
    message: ""
  });

  const counts = useMemo(() => {
    return items.reduce((summary, item) => {
      summary[item.type] = (summary[item.type] || 0) + 1;
      return summary;
    }, {});
  }, [items]);

  const saveItems = (nextItems) => {
    setItems(nextItems);
    if (!isBrowser()) return;
    localStorage.setItem(FEEDBACK_STORAGE_KEY, JSON.stringify(nextItems));
  };


  const handleSubmit = (event) => {
    event.preventDefault();
    const title = form.title.trim();
    const message = form.message.trim();
    if (!title || !message) return;

    saveItems([
      {
        id: crypto.randomUUID(),
        ...form,
        title,
        message,
        createdAt: new Date().toISOString()
      },
      ...items
    ]);
    setForm({ type: form.type, title: "", message: "" });
  };

  const removeItem = (id) => {
    saveItems(items.filter((item) => item.id !== id));
  };

  return (
    <div className="roadmap-page">
      <section className="roadmap-hero">
        <div>
          <p className="roadmap-kicker">Product roadmap</p>
          <h1>What KeyVoid is building next.</h1>
          <p>
            Current version: <strong>{CURRENT_VERSION}</strong>. This page is only for product feedback, feature requests,
            and bug reports. It is separate from the public feed.
          </p>
        </div>
        <div className="version-panel">
          <Rocket size={28} />
          <span>Now shipping</span>
          <strong>{CURRENT_VERSION}</strong>
        </div>
      </section>

      <section className="roadmap-grid" aria-label="Upcoming features">
        {nextFeatures.map((feature) => (
          <article key={feature.title} className="roadmap-card">
            <span>{feature.status}</span>
            <h2>{feature.title}</h2>
            <p>{feature.detail}</p>
          </article>
        ))}
      </section>

      <section className="feedback-layout">
        <form className="feedback-form" onSubmit={handleSubmit}>
          <p className="roadmap-kicker">Feedback inbox</p>
          <h2>Ask for a feature or report a bug.</h2>
          <div className="feedback-type-row">
            {["Feature idea", "Bug report", "Question"].map((type) => (
              <button
                key={type}
                type="button"
                className={form.type === type ? "active" : ""}
                onClick={() => setForm((current) => ({ ...current, type }))}
              >
                {type === "Feature idea" ? <Lightbulb size={16} /> : type === "Bug report" ? <Bug size={16} /> : <MessageSquarePlus size={16} />}
                {type}
              </button>
            ))}
          </div>
          <input
            value={form.title}
            onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
            placeholder="Short title"
            maxLength={90}
          />
          <textarea
            value={form.message}
            onChange={(event) => setForm((current) => ({ ...current, message: event.target.value }))}
            placeholder="What should we build or fix?"
            rows={6}
            maxLength={700}
          />
          <button type="submit" className="feedback-submit">Save feedback</button>
        </form>

        <div className="feedback-board">
          <div className="feedback-board-header">
            <div>
              <p className="roadmap-kicker">Saved on this site</p>
              <h2>Feedback list</h2>
            </div>
            <div className="feedback-counts">
              <span>{counts["Feature idea"] || 0} ideas</span>
              <span>{counts["Bug report"] || 0} bugs</span>
            </div>
          </div>

          {items.length > 0 ? (
            <div className="feedback-list">
              {items.map((item) => (
                <article key={item.id} className="feedback-item">
                  <div>
                    <span>{item.type}</span>
                    <h3>{item.title}</h3>
                    <p>{item.message}</p>
                    <small>{new Date(item.createdAt).toLocaleString()}</small>
                  </div>
                  <button type="button" onClick={() => removeItem(item.id)} aria-label="Remove feedback">
                    <Trash2 size={16} />
                  </button>
                </article>
              ))}
            </div>
          ) : (
            <div className="feedback-empty">No feedback saved yet. Add the first idea or bug report here.</div>
          )}
        </div>
      </section>
    </div>
  );
}
