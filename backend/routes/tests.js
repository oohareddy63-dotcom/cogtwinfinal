const express = require("express");
const TestResult = require("../models/TestResult");
const Session = require("../models/Session");
const User = require("../models/User");
const DigitalTwin = require("../models/DigitalTwin");
const { protect } = require("../middleware/auth");
const {
  detectAnomaly,
  analyzeTrend,
  generateAIInsights,
  extractFeatures,
  trainDigitalTwin,
} = require("../ml/cognitiveEngine");
const { generateTestQuestions } = require("../ml/questionGenerator");

const router = express.Router();

// ─── Helpers ──────────────────────────────────────────────────────────────────

function generateId() {
  return require("crypto").randomUUID();
}

async function updateBaseline(userId) {
  const BASELINE_SESSIONS = 3;
  const sessions = await Session.find({ userId, isComplete: true })
    .sort({ createdAt: -1 })
    .limit(10);

  if (sessions.length < BASELINE_SESSIONS) return;

  const types = ["memory", "reaction", "pattern", "attention", "decision"];
  const baselineUpdate = {};

  types.forEach((type) => {
    const scores = sessions.map((s) => s.scores[type]).filter((s) => s != null);
    if (scores.length > 0) {
      const mean = scores.reduce((a, b) => a + b, 0) / scores.length;
      baselineUpdate[`baseline.${type}`] = parseFloat(mean.toFixed(1));
    }
  });

  const overallScores = sessions.map((s) => s.overallScore).filter(Boolean);
  if (overallScores.length > 0) {
    baselineUpdate["baseline.overall"] = parseFloat(
      (overallScores.reduce((a, b) => a + b, 0) / overallScores.length).toFixed(1)
    );
  }

  baselineUpdate["baseline.established"] = true;
  baselineUpdate["baseline.sessionsCompleted"] = sessions.length;
  baselineUpdate["baseline.lastUpdated"] = new Date();

  await User.findByIdAndUpdate(userId, baselineUpdate);
}

async function updateStreak(userId) {
  const user = await User.findById(userId);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const lastTest = user.streak?.lastTestDate ? new Date(user.streak.lastTestDate) : null;

  if (lastTest) {
    lastTest.setHours(0, 0, 0, 0);
    const diffDays = Math.round((today - lastTest) / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return;
    await User.findByIdAndUpdate(userId, {
      "streak.current": diffDays === 1 ? (user.streak.current || 0) + 1 : 1,
      "streak.lastTestDate": new Date(),
    });
  } else {
    await User.findByIdAndUpdate(userId, {
      "streak.current": 1,
      "streak.lastTestDate": new Date(),
    });
  }
}

// Auto-train Digital Twin after enough sessions
async function autoTrainTwin(userId) {
  try {
    const sessions = await Session.find({ userId, isComplete: true })
      .sort({ createdAt: 1 })
      .limit(50);

    if (sessions.length < 3) return;

    const types = ["memory", "reaction", "pattern", "attention", "decision"];
    const featureStats = {};
    types.forEach((type) => {
      const scores = sessions.map((s) => s.scores[type]).filter((s) => s != null);
      featureStats[type] = extractFeatures(scores);
    });

    const overallScores = sessions.map((s) => s.overallScore).filter(Boolean);
    const trendAnalysis = analyzeTrend(overallScores);
    const modelResult = await trainDigitalTwin(sessions);

    await DigitalTwin.findOneAndUpdate(
      { userId },
      {
        featureStats,
        trendAnalysis,
        ...(modelResult
          ? {
              weights: modelResult.weights,
              accuracy: modelResult.accuracy,
              trainedOn: modelResult.trainedOn,
              lastTrained: modelResult.lastTrained,
            }
          : {}),
      },
      { upsert: true }
    );
  } catch (e) {
    console.error("Auto-train error:", e.message);
  }
}

// ─── POST /api/tests/submit ───────────────────────────────────────────────────
router.post("/submit", protect, async (req, res) => {
  try {
    const { testType, score, durationSeconds, sessionId } = req.body;

    if (!testType || score === undefined || score === null) {
      return res.status(400).json({ error: "testType and score are required." });
    }

    const validTypes = ["reaction", "memory", "pattern", "attention", "decision"];
    if (!validTypes.includes(testType)) {
      return res.status(400).json({ error: "Invalid testType." });
    }

    const user = await User.findById(req.user._id);
    const baselineMean = user.baseline?.[testType] ?? null;

    // ML: Anomaly detection using z-score
    const anomaly = detectAnomaly(score, baselineMean, 10);
    const deviationFromBaseline =
      baselineMean !== null
        ? parseFloat(((score - baselineMean) / baselineMean * 100).toFixed(1))
        : null;

    const sid = sessionId || generateId();

    const result = await TestResult.create({
      userId: req.user._id,
      testType,
      score,
      durationSeconds: durationSeconds || null,
      sessionId: sid,
      anomaly,
      deviationFromBaseline,
    });

    // Update or create session
    let session = await Session.findOne({ sessionId: sid, userId: req.user._id });

    if (!session) {
      const initialScores = { memory: null, reaction: null, pattern: null, attention: null, decision: null };
      initialScores[testType] = score;
      session = await Session.create({
        userId: req.user._id,
        sessionId: sid,
        scores: initialScores,
        testsCompleted: 1,
      });
    } else {
      // Must use set() + markModified for nested object changes in Mongoose
      session.scores[testType] = score;
      session.markModified("scores");
      session.testsCompleted = validTypes.filter(
        (t) => session.scores[t] !== null && session.scores[t] !== undefined
      ).length;

      const allDone = validTypes.every(
        (t) => session.scores[t] !== null && session.scores[t] !== undefined
      );

      if (allDone && !session.isComplete) {
        const vals = validTypes.map((t) => session.scores[t]).filter((v) => v != null);
        session.overallScore = parseFloat((vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1));
        session.isComplete = true;

        // ML: Get all anomalies for this session
        const sessionAnomalies = {};
        validTypes.forEach((t) => {
          const base = user.baseline?.[t] ?? null;
          sessionAnomalies[t] = detectAnomaly(session.scores[t], base, 10);
        });

        // ML: Trend analysis
        const prevSessions = await Session.find({ userId: req.user._id, isComplete: true })
          .sort({ createdAt: -1 })
          .limit(20);
        const overallScores = prevSessions.map((s) => s.overallScore).filter(Boolean);
        overallScores.push(session.overallScore);
        const trendData = analyzeTrend(overallScores);

        // ML: AI insights
        const sessionCount = prevSessions.length + 1;
        session.insights = generateAIInsights(
          session.scores,
          user.baseline,
          trendData,
          sessionAnomalies,
          sessionCount
        );

        // Update baseline + streak
        await session.save();
        await updateBaseline(req.user._id);
        await updateStreak(req.user._id);

        // Auto-train Digital Twin in background (non-blocking)
        autoTrainTwin(req.user._id).catch(() => {});
      } else {
        await session.save();
      }
    }

    res.status(201).json({
      result,
      session: {
        sessionId: session.sessionId,
        testsCompleted: session.testsCompleted,
        isComplete: session.isComplete,
        overallScore: session.overallScore,
        insights: session.insights || [],
      },
      anomaly,
    });
  } catch (err) {
    console.error("Submit error:", err);
    res.status(500).json({ error: err.message });
  }
});

// ─── GET /api/tests/history ───────────────────────────────────────────────────
router.get("/history", protect, async (req, res) => {
  try {
    const { limit = 50, testType } = req.query;
    const filter = { userId: req.user._id };
    if (testType) filter.testType = testType;

    const results = await TestResult.find(filter)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit));

    res.json({ results });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── GET /api/tests/sessions ──────────────────────────────────────────────────
router.get("/sessions", protect, async (req, res) => {
  try {
    const { limit = 30 } = req.query;
    const sessions = await Session.find({ userId: req.user._id, isComplete: true })
      .sort({ createdAt: -1 })
      .limit(parseInt(limit));

    res.json({ sessions });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── GET /api/tests/session/:sessionId ───────────────────────────────────────
router.get("/session/:sessionId", protect, async (req, res) => {
  try {
    const session = await Session.findOne({
      sessionId: req.params.sessionId,
      userId: req.user._id,
    });
    if (!session) return res.status(404).json({ error: "Session not found." });
    res.json({ session });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── GET /api/tests/questions/:type ──────────────────────────────────────────
// Returns 5 AI-generated questions for pattern or decision tests.
// Falls back gracefully if Gemini is unavailable.
router.get("/questions/:type", protect, async (req, res) => {
  const { type } = req.params;
  if (!["pattern", "decision"].includes(type)) {
    return res.status(400).json({ error: "type must be 'pattern' or 'decision'" });
  }
  try {
    const questions = await generateTestQuestions(type, 5);
    if (!questions) {
      return res.status(503).json({ error: "AI unavailable, use local fallback" });
    }
    res.json({ questions, source: "ai" });
  } catch (err) {
    console.error("Question generation error:", err.message);
    res.status(503).json({ error: "AI unavailable, use local fallback" });
  }
});

module.exports = router;
