import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Brain, Cpu, TrendingUp, TrendingDown, Minus, Zap, RefreshCw, Loader2, AlertTriangle, CheckCircle } from "lucide-react";
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine,
} from "recharts";
import { mlApi, type TwinStatus, type AnalysisResult } from "@/lib/api";

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.08, duration: 0.5 } }),
};

const DigitalTwinPage = () => {
  const [twinStatus, setTwinStatus] = useState<TwinStatus | null>(null);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [training, setTraining] = useState(false);
  const [trainMsg, setTrainMsg] = useState<string | null>(null);
  const [predicting, setPredicting] = useState(false);
  const [prediction, setPrediction] = useState<number | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [twin, anal] = await Promise.all([mlApi.getTwin(), mlApi.analyze()]);
      setTwinStatus(twin);
      setAnalysis(anal);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const handleTrain = async () => {
    setTraining(true);
    setTrainMsg(null);
    try {
      const result = await mlApi.train();
      const acc = result.accuracy != null ? `${result.accuracy}%` : "N/A";
      setTrainMsg(`✅ Model trained! Accuracy: ${acc} on ${result.trainedOn} sessions.`);
      await loadData();
    } catch (e: unknown) {
      setTrainMsg(`❌ ${e instanceof Error ? e.message : "Training failed"}`);
    } finally {
      setTraining(false);
    }
  };

  const handlePredict = async () => {
    setPredicting(true);
    try {
      const result = await mlApi.predict();
      setPrediction(result.predictedScore);
    } catch (e: unknown) {
      setTrainMsg(`❌ ${e instanceof Error ? e.message : "Prediction failed"}`);
    } finally {
      setPredicting(false);
    }
  };

  const twin = twinStatus?.twin;
  const trend = twin?.trendAnalysis || analysis?.trendAnalysis;
  const featureStats = twin?.featureStats || analysis?.featureStats;

  // Build radar data from feature stats
  const radarData = featureStats
    ? Object.entries(featureStats).map(([key, stat]) => ({
        subject: key.charAt(0).toUpperCase() + key.slice(1),
        mean: stat.mean ?? 0,
        consistency: Math.round((stat.consistency ?? 0) * 100),
      }))
    : [];

  // Build forecast chart data
  const forecastData = trend
    ? [
        { label: "Now", score: analysis?.featureStats ? Object.values(analysis.featureStats).reduce((a, s) => a + (s.mean ?? 0), 0) / 5 : null },
        { label: "+7d", score: trend.predicted7Day },
        { label: "+30d", score: trend.predicted30Day },
      ]
    : [];

  if (loading) {
    return (
      <div className="min-h-screen pt-20 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-20 pb-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      <motion.div initial="hidden" animate="visible" className="space-y-8">

        {/* Header */}
        <motion.div variants={fadeUp} custom={0} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground flex items-center gap-3">
              <Brain className="w-8 h-8 text-primary" /> Digital Cognitive Twin
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              AI-powered neural network model of your cognitive patterns
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={handleTrain}
              disabled={training || !twinStatus?.readyToTrain}
              className="gradient-btn text-sm inline-flex items-center gap-2 disabled:opacity-50"
            >
              {training ? <Loader2 className="w-4 h-4 animate-spin" /> : <Cpu className="w-4 h-4" />}
              {training ? "Training…" : "Train Model"}
            </button>
            <button
              onClick={handlePredict}
              disabled={predicting || !twin?.weights}
              className="glass-card px-4 py-2 text-sm inline-flex items-center gap-2 hover:border-primary/40 transition-colors disabled:opacity-50"
            >
              {predicting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4 text-primary" />}
              Predict Next
            </button>
          </div>
        </motion.div>

        {/* Status messages */}
        {trainMsg && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className={`p-3 rounded-xl border text-sm ${
              trainMsg.startsWith("✅")
                ? "border-green-500/30 bg-green-500/10 text-green-400"
                : "border-red-500/30 bg-red-500/10 text-red-400"
            }`}
          >
            {trainMsg}
          </motion.div>
        )}

        {!twinStatus?.readyToTrain && (
          <motion.div variants={fadeUp} custom={0} className="p-4 rounded-xl border border-primary/30 bg-primary/5 text-sm text-foreground">
            <span className="font-semibold">🧠 Complete {Math.max(0, 3 - (twinStatus?.sessionCount || 0))} more full session(s)</span> to unlock Digital Twin training.
            Currently: {twinStatus?.sessionCount || 0}/3 sessions.
          </motion.div>
        )}

        {/* Twin Status Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <motion.div variants={fadeUp} custom={1} className="glass-card p-5 space-y-2">
            <p className="text-xs text-muted-foreground">Model Status</p>
            <div className="flex items-center gap-2">
              {twin ? (
                <><CheckCircle className="w-5 h-5 text-green-400" /><span className="font-semibold text-green-400">Trained</span></>
              ) : (
                <><AlertTriangle className="w-5 h-5 text-yellow-400" /><span className="font-semibold text-yellow-400">Not Trained</span></>
              )}
            </div>
            {twin?.lastTrained && (
              <p className="text-xs text-muted-foreground">
                Last: {new Date(twin.lastTrained).toLocaleDateString()}
              </p>
            )}
          </motion.div>

          <motion.div variants={fadeUp} custom={2} className="glass-card p-5 space-y-2">
            <p className="text-xs text-muted-foreground">User Performance Score</p>
            <p className="text-3xl font-bold gradient-text">
              {twin?.accuracy != null ? `${twin.accuracy}%` : "—"}
            </p>
            <p className="text-xs text-muted-foreground">
              Trained on {twin?.trainedOn ?? 0} sessions
            </p>
          </motion.div>

          <motion.div variants={fadeUp} custom={3} className="glass-card p-5 space-y-2">
            <p className="text-xs text-muted-foreground">User Performance Trend</p>
            <div className="flex items-center gap-2">
              {trend?.direction === "improving" ? (
                <><TrendingUp className="w-5 h-5 text-green-400" /><span className="font-semibold text-green-400">Improving</span></>
              ) : trend?.direction === "declining" ? (
                <><TrendingDown className="w-5 h-5 text-red-400" /><span className="font-semibold text-red-400">Declining</span></>
              ) : (
                <><Minus className="w-5 h-5 text-muted-foreground" /><span className="font-semibold text-muted-foreground">Stable</span></>
              )}
            </div>
            {trend && (
              <p className="text-xs text-muted-foreground">
                Slope: {trend.slope > 0 ? "+" : ""}{trend.slope} | R²: {trend.r2}
              </p>
            )}
          </motion.div>

          <motion.div variants={fadeUp} custom={4} className="glass-card p-5 space-y-2">
            <p className="text-xs text-muted-foreground">Next Session Prediction</p>
            <p className="text-3xl font-bold gradient-text">
              {prediction != null ? prediction : twin?.lastPrediction?.score ?? "—"}
            </p>
            <p className="text-xs text-muted-foreground">
              {twin?.lastPrediction ? `Predicted ${new Date(twin.lastPrediction.predictedAt).toLocaleDateString()}` : "Click 'Predict Next'"}
            </p>
          </motion.div>
        </div>

        {/* Charts Row */}
        <div className="grid lg:grid-cols-2 gap-6">

          {/* Cognitive Radar */}
          <motion.div variants={fadeUp} custom={5} className="glass-card p-6">
            <h3 className="text-lg font-semibold text-foreground mb-1">Cognitive Feature Profile</h3>
            <p className="text-xs text-muted-foreground mb-4">Mean scores extracted by ML feature engine</p>
            {radarData.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <RadarChart data={radarData}>
                  <PolarGrid stroke="hsl(217,33%,25%)" />
                  <PolarAngleAxis dataKey="subject" stroke="hsl(215,20%,65%)" fontSize={11} />
                  <PolarRadiusAxis angle={30} domain={[0, 100]} stroke="hsl(217,33%,25%)" fontSize={10} />
                  <Radar name="Mean Score" dataKey="mean" stroke="hsl(259,100%,62%)" fill="hsl(259,100%,62%)" fillOpacity={0.25} strokeWidth={2} />
                  <Radar name="Consistency %" dataKey="consistency" stroke="hsl(150,80%,50%)" fill="hsl(150,80%,50%)" fillOpacity={0.1} strokeWidth={1.5} />
                  <Tooltip contentStyle={{ background: "hsl(217,33%,17%)", border: "1px solid hsl(217,33%,25%)", borderRadius: "12px", color: "hsl(210,40%,98%)" }} />
                </RadarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-64 flex items-center justify-center text-muted-foreground text-sm">
                Complete sessions to see your cognitive profile
              </div>
            )}
          </motion.div>

          {/* Forecast Chart */}
          <motion.div variants={fadeUp} custom={6} className="glass-card p-6">
            <h3 className="text-lg font-semibold text-foreground mb-1">Score Forecast</h3>
            <p className="text-xs text-muted-foreground mb-4">Linear regression prediction (7-day & 30-day)</p>
            {forecastData.length > 0 && forecastData.some((d) => d.score != null) ? (
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={forecastData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(217,33%,25%)" />
                  <XAxis dataKey="label" stroke="hsl(215,20%,65%)" fontSize={12} />
                  <YAxis stroke="hsl(215,20%,65%)" fontSize={12} domain={[0, 100]} />
                  <Tooltip contentStyle={{ background: "hsl(217,33%,17%)", border: "1px solid hsl(217,33%,25%)", borderRadius: "12px", color: "hsl(210,40%,98%)" }} />
                  <ReferenceLine y={50} stroke="hsl(217,33%,35%)" strokeDasharray="4 4" label={{ value: "Baseline", fill: "hsl(215,20%,65%)", fontSize: 10 }} />
                  <Line type="monotone" dataKey="score" stroke="hsl(259,100%,62%)" strokeWidth={2.5} dot={{ fill: "hsl(259,100%,62%)", r: 5 }} connectNulls />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-64 flex items-center justify-center text-muted-foreground text-sm">
                Train the model to see forecasts
              </div>
            )}
          </motion.div>
        </div>

        {/* Feature Statistics Table */}
        {featureStats && (
          <motion.div variants={fadeUp} custom={7} className="glass-card overflow-hidden">
            <div className="p-6 border-b border-border/20">
              <h3 className="text-lg font-semibold text-foreground">ML Feature Statistics</h3>
              <p className="text-xs text-muted-foreground mt-1">Extracted by simple-statistics engine from your session history</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/20 text-left text-xs text-muted-foreground">
                    <th className="px-6 py-3 font-medium">Test Type</th>
                    <th className="px-6 py-3 font-medium">Mean</th>
                    <th className="px-6 py-3 font-medium">Std Dev</th>
                    <th className="px-6 py-3 font-medium">Min</th>
                    <th className="px-6 py-3 font-medium">Max</th>
                    <th className="px-6 py-3 font-medium">Consistency</th>
                    <th className="px-6 py-3 font-medium">Trend</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(featureStats).map(([type, stat]) => (
                    <tr key={type} className="border-b border-border/10 hover:bg-muted/20 transition-colors">
                      <td className="px-6 py-3 font-medium text-foreground capitalize">{type}</td>
                      <td className="px-6 py-3 text-foreground font-semibold">{stat.mean ?? "—"}</td>
                      <td className="px-6 py-3 text-muted-foreground">±{stat.stdDev ?? "—"}</td>
                      <td className="px-6 py-3 text-red-400">{stat.min ?? "—"}</td>
                      <td className="px-6 py-3 text-green-400">{stat.max ?? "—"}</td>
                      <td className="px-6 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-1.5 rounded-full bg-muted">
                            <div
                              className="h-1.5 rounded-full bg-primary"
                              style={{ width: `${Math.round((stat.consistency ?? 0) * 100)}%` }}
                            />
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {Math.round((stat.consistency ?? 0) * 100)}%
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-3">
                        <span className={`text-xs font-medium ${
                          (stat.trendSlope ?? 0) > 0.1 ? "text-green-400" :
                          (stat.trendSlope ?? 0) < -0.1 ? "text-red-400" : "text-muted-foreground"
                        }`}>
                          {(stat.trendSlope ?? 0) > 0.1 ? "↑" : (stat.trendSlope ?? 0) < -0.1 ? "↓" : "→"}{" "}
                          {stat.trendSlope ?? 0}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}

        {/* Anomaly Summary */}
        {analysis?.anomalySummary && (
          <motion.div variants={fadeUp} custom={8} className="glass-card p-6">
            <h3 className="text-lg font-semibold text-foreground mb-4">Anomaly Detection Summary</h3>
            <p className="text-xs text-muted-foreground mb-4">Z-score based anomaly detection (|z| &gt; 1.5 flagged)</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                { label: "Total Anomalies", value: analysis.anomalySummary.total, color: "text-foreground" },
                { label: "Severe (|z|>2.5)", value: analysis.anomalySummary.severe, color: "text-red-400" },
                { label: "Moderate (|z|>2.0)", value: analysis.anomalySummary.moderate, color: "text-yellow-400" },
                { label: "Mild (|z|>1.5)", value: analysis.anomalySummary.mild, color: "text-blue-400" },
              ].map((item) => (
                <div key={item.label} className="text-center p-4 rounded-xl bg-muted/20 border border-border/20">
                  <p className={`text-3xl font-bold ${item.color}`}>{item.value}</p>
                  <p className="text-xs text-muted-foreground mt-1">{item.label}</p>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Recommendations */}
        {analysis?.recommendations && analysis.recommendations.length > 0 && (
          <motion.div variants={fadeUp} custom={9} className="glass-card p-6">
            <h3 className="text-lg font-semibold text-foreground mb-4">AI Recommendations</h3>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {analysis.recommendations.map((rec) => (
                <div key={rec.id} className="p-4 rounded-xl bg-muted/20 border border-border/20 space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-foreground">{rec.title}</p>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                      rec.priority === "high" ? "bg-red-500/20 text-red-400" :
                      rec.priority === "medium" ? "bg-yellow-500/20 text-yellow-400" :
                      "bg-green-500/20 text-green-400"
                    }`}>{rec.priority}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">{rec.description}</p>
                </div>
              ))}
            </div>
          </motion.div>
        )}

      </motion.div>
    </div>
  );
};

export default DigitalTwinPage;
