const FeedbackReport = require("../models/FeedbackReport");

// POST /api/feedback — submit a report (any user, even unauthenticated)
exports.submitFeedback = async (req, res) => {
  try {
    const { type, title, message } = req.body;

    if (!["Feature idea", "Bug report", "Question"].includes(type)) {
      return res.status(400).json({ msg: "Invalid feedback type" });
    }
    if (!title?.trim() || !message?.trim()) {
      return res.status(400).json({ msg: "Title and message are required" });
    }

    const report = await FeedbackReport.create({
      type,
      title: title.trim(),
      message: message.trim(),
      submittedBy: req.user?._id || null,
      submitterUsername: req.user?.username || "Anonymous"
    });

    return res.status(201).json({ msg: "Feedback submitted", report: formatReport(report) });
  } catch (error) {
    console.error("Submit feedback failed:", error.message);
    return res.status(500).json({ msg: "Unable to submit feedback" });
  }
};

// GET /api/feedback — get all reports (visible to everyone)
exports.getAllFeedback = async (req, res) => {
  try {
    const reports = await FeedbackReport.find()
      .sort({ createdAt: -1 })
      .limit(200)
      .lean();

    return res.json({ reports: reports.map(formatReport) });
  } catch (error) {
    console.error("Get feedback failed:", error.message);
    return res.status(500).json({ msg: "Unable to load feedback" });
  }
};

// PATCH /api/feedback/:id — admin: update status + reply
exports.updateFeedback = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, adminReply } = req.body;

    const validStatuses = ["Open", "Under review", "In progress", "Solved", "Closed"];
    if (status && !validStatuses.includes(status)) {
      return res.status(400).json({ msg: "Invalid status" });
    }

    const report = await FeedbackReport.findById(id);
    if (!report) {
      return res.status(404).json({ msg: "Report not found" });
    }

    if (status) report.status = status;
    if (adminReply !== undefined) {
      report.adminReply = adminReply.trim();
      report.adminRepliedAt = adminReply.trim() ? new Date() : null;
    }

    await report.save();

    return res.json({ msg: "Report updated", report: formatReport(report) });
  } catch (error) {
    console.error("Update feedback failed:", error.message);
    return res.status(500).json({ msg: "Unable to update report" });
  }
};

// DELETE /api/feedback/:id — admin: delete a report
exports.deleteFeedback = async (req, res) => {
  try {
    const { id } = req.params;
    const report = await FeedbackReport.findByIdAndDelete(id);
    if (!report) {
      return res.status(404).json({ msg: "Report not found" });
    }
    return res.json({ msg: "Report deleted" });
  } catch (error) {
    console.error("Delete feedback failed:", error.message);
    return res.status(500).json({ msg: "Unable to delete report" });
  }
};

function formatReport(report) {
  return {
    id: report._id.toString(),
    type: report.type,
    title: report.title,
    message: report.message,
    submitterUsername: report.submitterUsername || "Anonymous",
    status: report.status,
    adminReply: report.adminReply || "",
    adminRepliedAt: report.adminRepliedAt || null,
    createdAt: report.createdAt
  };
}