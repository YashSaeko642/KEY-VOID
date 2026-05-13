import { useEffect, useMemo, useState } from "react";
import {
  Bug, CheckCircle, ChevronDown, ChevronLeft, ChevronRight, ChevronUp,
  Clock, Lightbulb, MessageSquarePlus,
  Rocket, Shield, Trash2, X
} from "lucide-react";
import { useAuth } from "../src/context/useAuth";
import API from "../services/api";
import "./RoadmapFeedback.css";

const CURRENT_VERSION = "v0.4.2";
const PAGE_SIZE = 5;

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
    detail: "Easier sharing of tracks, playlists, and profiles to other platforms."
  },
  {
    title: "Better animated UI",
    status: "Planned",
    detail: "More microinteractions and animated transitions throughout the app."
  }
];

const STATUS_COLORS = {
  "Open": "status-open",
  "Under review": "status-review",
  "In progress": "status-progress",
  "Solved": "status-solved",
  "Closed": "status-closed"
};

const STATUS_ICONS = {
  "Open": <Clock size={13} />,
  "Under review": <Clock size={13} />,
  "In progress": <Clock size={13} />,
  "Solved": <CheckCircle size={13} />,
  "Closed": <X size={13} />
};

// Filter tabs — "All" excludes Solved; Solved has its own tab; In Progress is separate
const FILTER_TABS = ["All", "Feature idea", "Bug report", "Question", "In progress", "Solved"];

function TypeIcon({ type }) {
  if (type === "Feature idea") return <Lightbulb size={15} />;
  if (type === "Bug report") return <Bug size={15} />;
  return <MessageSquarePlus size={15} />;
}

export default function RoadmapFeedback() {
  const { user, isAuthenticated } = useAuth();
  const isAdmin = user?.role === "admin";

  const [reports, setReports] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  const [form, setForm] = useState({ type: "Feature idea", title: "", message: "" });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [adminEditId, setAdminEditId] = useState(null);
  const [adminForm, setAdminForm] = useState({ status: "", adminReply: "" });
  const [isSaving, setIsSaving] = useState(false);

  const [filter, setFilter] = useState("All");
  const [expandedId, setExpandedId] = useState(null);
  const [page, setPage] = useState(1);

  useEffect(() => {
    async function load() {
      try {
        setIsLoading(true);
        const res = await API.get("/feedback");
        setReports(res.data.reports || []);
      } catch {
        setError("Unable to load feedback. Please try again.");
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, []);

  // Reset to page 1 when filter changes
  useEffect(() => {
    setPage(1);
    setExpandedId(null);
  }, [filter]);

  const counts = useMemo(() => {
    return reports.reduce((acc, r) => {
      acc[r.type] = (acc[r.type] || 0) + 1;
      return acc;
    }, {});
  }, [reports]);

  // Filter logic:
  // "All" — excludes Solved and Closed so they don't clutter the main list
  // "Solved" — only Solved
  // "In progress" — only In progress status
  // Other tabs — match by type
  const filteredReports = useMemo(() => {
    switch (filter) {
      case "All":
        return reports.filter((r) => r.status !== "Solved" && r.status !== "Closed");
      case "Solved":
        return reports.filter((r) => r.status === "Solved");
      case "In progress":
        return reports.filter((r) => r.status === "In progress");
      case "Feature idea":
      case "Bug report":
      case "Question":
        return reports.filter((r) => r.type === filter && r.status !== "Solved" && r.status !== "Closed");
      default:
        return reports;
    }
  }, [reports, filter]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filteredReports.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pagedReports = filteredReports.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const title = form.title.trim();
    const message = form.message.trim();
    if (!title || !message) return;

    try {
      setIsSubmitting(true);
      const res = await API.post("/feedback", { ...form, title, message });
      setReports((prev) => [res.data.report, ...prev]);
      setForm({ type: form.type, title: "", message: "" });
      setSubmitSuccess(true);
      setTimeout(() => setSubmitSuccess(false), 4000);
    } catch {
      setError("Unable to submit feedback. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const openAdminEdit = (report) => {
    setAdminEditId(report.id);
    setAdminForm({ status: report.status, adminReply: report.adminReply || "" });
  };

  const handleAdminSave = async (id) => {
    try {
      setIsSaving(true);
      const res = await API.patch(`/feedback/${id}`, adminForm);
      setReports((prev) => prev.map((r) => r.id === id ? res.data.report : r));
      setAdminEditId(null);
    } catch {
      setError("Unable to update report.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleAdminDelete = async (id) => {
    if (!window.confirm("Delete this report?")) return;
    try {
      await API.delete(`/feedback/${id}`);
      setReports((prev) => prev.filter((r) => r.id !== id));
    } catch {
      setError("Unable to delete report.");
    }
  };

  const toggleExpand = (id) => {
    setExpandedId((prev) => prev === id ? null : id);
  };

  return (
    <div className="roadmap-page">
      {/* Hero */}
      <section className="roadmap-hero">
        <div>
          <p className="roadmap-kicker">Product roadmap</p>
          <h1>What KeyVoid is building next.</h1>
          <p>
            Current version: <strong>{CURRENT_VERSION}</strong>. Submit feature ideas,
            bug reports, and questions. All submissions are visible to the community.
          </p>
          {isAdmin && (
            <div className="admin-badge">
              <Shield size={14} /> Admin mode — you can update statuses and reply to reports
            </div>
          )}
        </div>
        <div className="version-panel">
          <Rocket size={28} />
          <span>Now shipping</span>
          <strong>{CURRENT_VERSION}</strong>
        </div>
      </section>

      {/* Roadmap cards */}
      <section className="roadmap-grid" aria-label="Upcoming features">
        {nextFeatures.map((feature) => (
          <article key={feature.title} className="roadmap-card">
            <span>{feature.status}</span>
            <h2>{feature.title}</h2>
            <p>{feature.detail}</p>
          </article>
        ))}
      </section>

      {/* Feedback layout */}
      <section className="feedback-layout">
        {/* Submit form */}
        <form className="feedback-form" onSubmit={handleSubmit}>
          <p className="roadmap-kicker">Feedback inbox</p>
          <h2>Ask for a feature or report a bug.</h2>
          {!isAuthenticated && (
            <p className="feedback-anon-note">You're not logged in — your report will appear as Anonymous.</p>
          )}
          <div className="feedback-type-row">
            {["Feature idea", "Bug report", "Question"].map((type) => (
              <button key={type} type="button"
                className={form.type === type ? "active" : ""}
                onClick={() => setForm((c) => ({ ...c, type }))}
              >
                <TypeIcon type={type} /> {type}
              </button>
            ))}
          </div>
          <input
            value={form.title}
            onChange={(e) => setForm((c) => ({ ...c, title: e.target.value }))}
            placeholder="Short title"
            maxLength={90}
            required
          />
          <textarea
            value={form.message}
            onChange={(e) => setForm((c) => ({ ...c, message: e.target.value }))}
            placeholder="What should we build or fix?"
            rows={6}
            maxLength={700}
            required
          />
          {submitSuccess && (
            <div className="feedback-success">
              <CheckCircle size={15} /> Feedback submitted! Everyone can now see it.
            </div>
          )}
          {error && <div className="feedback-error">{error}</div>}
          <button type="submit" className="feedback-submit" disabled={isSubmitting}>
            {isSubmitting ? "Submitting..." : "Submit feedback"}
          </button>
        </form>

        {/* Reports board */}
        <div className="feedback-board">
          <div className="feedback-board-header">
            <div>
              <p className="roadmap-kicker">Community reports</p>
              <h2>Feedback list</h2>
            </div>
            <div className="feedback-counts">
              <span>{counts["Feature idea"] || 0} ideas</span>
              <span>{counts["Bug report"] || 0} bugs</span>
              <span>{reports.filter((r) => r.status === "Solved").length} solved</span>
              <span>{reports.filter((r) => r.status === "In progress").length} in progress</span>
            </div>
          </div>

          {/* Filter tabs */}
          <div className="feedback-filters">
            {FILTER_TABS.map((f) => (
              <button key={f} type="button"
                className={filter === f ? "active" : ""}
                onClick={() => setFilter(f)}
              >{f}</button>
            ))}
          </div>

          {isLoading ? (
            <div className="feedback-empty">Loading reports...</div>
          ) : pagedReports.length > 0 ? (
            <>
              <div className="feedback-list">
                {pagedReports.map((report) => {
                  const isExpanded = expandedId === report.id;
                  const isEditing = adminEditId === report.id;

                  return (
                    <article key={report.id} className={`feedback-item ${report.status === "Solved" ? "feedback-item--solved" : ""} ${report.status === "In progress" ? "feedback-item--inprogress" : ""}`}>
                      <div className="feedback-item-top">
                        <div className="feedback-item-meta">
                          <span className="feedback-type-badge">
                            <TypeIcon type={report.type} /> {report.type}
                          </span>
                          <span className={`feedback-status-badge ${STATUS_COLORS[report.status] || ""}`}>
                            {STATUS_ICONS[report.status]} {report.status}
                          </span>
                        </div>

                        <div className="feedback-item-actions">
                          {isAdmin && (
                            <>
                              <button type="button" className="admin-btn"
                                onClick={() => isEditing ? setAdminEditId(null) : openAdminEdit(report)}
                                title="Edit status / reply"
                              >
                                <Shield size={14} /> {isEditing ? "Cancel" : "Edit"}
                              </button>
                              <button type="button" className="admin-btn admin-btn--danger"
                                onClick={() => handleAdminDelete(report.id)}
                                title="Delete report"
                              >
                                <Trash2 size={14} />
                              </button>
                            </>
                          )}
                          <button type="button" className="expand-btn"
                            onClick={() => toggleExpand(report.id)}
                            title={isExpanded ? "Collapse" : "Expand"}
                          >
                            {isExpanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                          </button>
                        </div>
                      </div>

                      <h3>{report.title}</h3>
                      <p className="feedback-submitter">by {report.submitterUsername}</p>

                      {isExpanded && (
                        <div className="feedback-item-expanded">
                          <p>{report.message}</p>
                          <small>{new Date(report.createdAt).toLocaleString()}</small>

                          {report.adminReply && (
                            <div className="admin-reply">
                              <div className="admin-reply-header">
                                <Shield size={13} /> Developer reply
                                {report.adminRepliedAt && (
                                  <small>{new Date(report.adminRepliedAt).toLocaleString()}</small>
                                )}
                              </div>
                              <p>{report.adminReply}</p>
                            </div>
                          )}

                          {report.status === "Solved" && (
                            <div className="solved-banner">
                              <CheckCircle size={16} /> This has been resolved!
                            </div>
                          )}
                        </div>
                      )}

                      {isAdmin && isEditing && (
                        <div className="admin-edit-panel">
                          <label>Status</label>
                          <select value={adminForm.status}
                            onChange={(e) => setAdminForm((f) => ({ ...f, status: e.target.value }))}
                          >
                            {["Open", "Under review", "In progress", "Solved", "Closed"].map((s) => (
                              <option key={s} value={s}>{s}</option>
                            ))}
                          </select>
                          <label>Developer reply (visible to all users)</label>
                          <textarea
                            value={adminForm.adminReply}
                            onChange={(e) => setAdminForm((f) => ({ ...f, adminReply: e.target.value }))}
                            placeholder="Leave a message for the user..."
                            rows={3}
                            maxLength={1000}
                          />
                          <button type="button" className="feedback-submit"
                            onClick={() => handleAdminSave(report.id)}
                            disabled={isSaving}
                          >
                            {isSaving ? "Saving..." : "Save changes"}
                          </button>
                        </div>
                      )}
                    </article>
                  );
                })}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="feedback-pagination">
                  <button type="button"
                    className="page-arrow"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={safePage === 1}
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <div className="page-numbers">
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                      <button key={p} type="button"
                        className={`page-number ${p === safePage ? "active" : ""}`}
                        onClick={() => setPage(p)}
                      >{p}</button>
                    ))}
                  </div>
                  <button type="button"
                    className="page-arrow"
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={safePage === totalPages}
                  >
                    <ChevronRight size={16} />
                  </button>
                  <span className="page-info">{safePage} / {totalPages}</span>
                </div>
              )}
            </>
          ) : (
            <div className="feedback-empty">
              {filter === "All"
                ? "No open feedback yet. Be the first!"
                : `No ${filter.toLowerCase()} reports yet.`}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
