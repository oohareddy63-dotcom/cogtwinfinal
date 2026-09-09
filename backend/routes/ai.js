/**
 * gemini AI Routes
 * POST /api/ai/insights        — personalized AI insights
 * POST /api/ai/recommendations — smart recommendations
 * POST /api/ai/explain-anomaly — explain an anomaly
 * GET  /api/ai/weekly-report   — weekly summary
 * POST /api/ai/ask             — ask a health question
 */

const express = require("express");
const Session    = require("../models/Session");
const TestResult = require("../models/TestResult");
const User       = require("../models/User");
const { protect } = require("../middleware/auth");
const {
  generatePersonalizedInsights,
  generateSmartRecommendations,
  explainAnomaly,
  generateWeeklyReport,
  answerHealthQuestion,
} = require("../ml/groqAI");

const router = express.Router();

// ─── Build user context for AI ────────────────────────────────────────────────
async function buildUserContext(userId) {
  const user = await User.findById(userId);
  const allSessions = await Session.find({ userId, isComplete: true })
    .sort({ createdAt: -1 }).limit(20);

  const testTypes = ["memory", "reaction", "pattern", "attention", "decision"];
  const cognitiveMetrics = await Promise.all(
    testTypes.map(async (type) => {
      const [latest, prev] = await Promise.all([
        TestResult.findOne({ userId, testType: type }).sort({ createdAt: -1 }),
        TestResult.findOne({ userId, testType: type }).sort({ createdAt: -1 }).skip(1),
      ]);
      const score     = latest?.score ?? null;
      const prevScore = prev?.score ?? null;
      const change    = score !== null && prevScore !== null ? score - prevScore : 0;
      return {
        name: type === "reaction" ? "Reaction Time" : type.charAt(0).toUpperCase() + type.slice(1),
        score, change,
        baseline: user.baseline?.[type] ?? null,
      };
    })
  );

  const anomalyAlerts = await TestResult.find({ userId, "anomaly.detected": true })
    .sort({ createdAt: -1 }).limit(5);

  const latestSession = allSessions[0];
  const overallScore  = latestSession?.overallScore ?? null;
  const daysSinceLastTest = latestSession
    ? Math.floor((Date.now() - new Date(latestSession.createdAt)) / (1000 * 60 * 60 * 24))
    : null;

  // Simple trend
  const scores = allSessions.map((s) => s.overallScore).filter(Boolean).reverse();
  let trendDirection = "stable";
  if (scores.length >= 3) {
    const first = scores.slice(0, Math.floor(scores.length / 2));
    const last  = scores.slice(Math.floor(scores.length / 2));
    const firstAvg = first.reduce((a, b) => a + b, 0) / first.length;
    const lastAvg  = last.reduce((a, b) => a + b, 0) / last.length;
    if (lastAvg - firstAvg > 2)  trendDirection = "improving";
    if (firstAvg - lastAvg > 2)  trendDirection = "declining";
  }

  return {
    name: user.name,
    overallScore,
    baseline: user.baseline,
    cognitiveMetrics,
    trend: { direction: trendDirection, slope: 0 },
    anomalyAlerts: anomalyAlerts.map((r) => ({
      testType: r.testType,
      score: r.score,
      zScore: r.anomaly.zScore,
      severity: r.anomaly.severity,
      direction: r.anomaly.direction,
    })),
    sessionCount: allSessions.length,
    daysSinceLastTest,
  };
}

// ─── POST /api/ai/insights ────────────────────────────────────────────────────
router.post("/insights", protect, async (req, res) => {
  try {
    const ctx = await buildUserContext(req.user._id);
    const insights = await generatePersonalizedInsights(ctx);

    if (!insights) {
      return res.status(503).json({ error: "AI service temporarily unavailable. Using fallback insights." });
    }

    res.json({ insights, model: "gemini-1.5-flash", source: "gemini" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── POST /api/ai/recommendations ────────────────────────────────────────────
router.post("/recommendations", protect, async (req, res) => {
  try {
    const ctx = await buildUserContext(req.user._id);

    // Add decline/peak info if provided in body
    if (req.body.declineInfo) ctx.declineInfo = req.body.declineInfo;
    if (req.body.peakInfo)    ctx.peakInfo    = req.body.peakInfo;

    const recommendations = await generateSmartRecommendations(ctx);

    if (!recommendations) {
      return res.status(503).json({ error: "AI service temporarily unavailable." });
    }

    res.json({ recommendations, model: "gemini-1.5-flash", source: "gemini" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── POST /api/ai/explain-anomaly ─────────────────────────────────────────────
router.post("/explain-anomaly", protect, async (req, res) => {
  try {
    const { testType, score, baseline, zScore, severity } = req.body;
    if (!testType || score === undefined) {
      return res.status(400).json({ error: "testType and score are required." });
    }

    const explanation = await explainAnomaly(testType, score, baseline, zScore, severity);

    if (!explanation) {
      return res.status(503).json({ error: "AI service temporarily unavailable." });
    }

    res.json({ explanation, model: "gemini-1.5-flash", source: "gemini" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── GET /api/ai/weekly-report ────────────────────────────────────────────────
router.get("/weekly-report", protect, async (req, res) => {
  try {
    const ctx     = await buildUserContext(req.user._id);
    const summary = await generateWeeklyReport(ctx);

    if (!summary) {
      return res.status(503).json({ error: "AI service temporarily unavailable." });
    }

    res.json({ summary, model: "gemini-1.5-flash", source: "gemini" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── POST /api/ai/ask ─────────────────────────────────────────────────────────
router.post("/ask", protect, async (req, res) => {
  try {
    const { question } = req.body;
    if (!question?.trim()) {
      return res.status(400).json({ error: "Question is required." });
    }

    const ctx = await buildUserContext(req.user._id);
    const answer = await answerHealthQuestion(question, {
      overallScore: ctx.overallScore,
      trend: ctx.trend.direction,
      sessionCount: ctx.sessionCount,
    });

    if (!answer) {
      return res.status(503).json({ error: "AI service temporarily unavailable." });
    }

    res.json({ answer, question, model: "gemini-1.5-flash", source: "gemini" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
