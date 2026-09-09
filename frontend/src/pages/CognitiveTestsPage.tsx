import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Brain, Zap, Eye, Target, GitBranch,
  CheckCircle, Play, RotateCcw, Loader2, AlertTriangle,
} from "lucide-react";
import { testsApi, type SessionSummary, type AIQuestion } from "@/lib/api";

type TestType = "reaction" | "memory" | "pattern" | "attention" | "decision";
type TestState = "idle" | "running" | "complete";

interface TestConfig {
  id: TestType;
  title: string;
  description: string;
  icon: React.ElementType;
  color: string;
}

const tests: TestConfig[] = [
  { id: "reaction",  title: "Reaction Time",      description: "Test how quickly you respond to visual stimuli.",    icon: Zap,       color: "text-yellow-400" },
  { id: "memory",    title: "Memory Recall",       description: "Remember and recall sequences of numbers.",          icon: Brain,     color: "text-primary"    },
  { id: "pattern",   title: "Pattern Recognition", description: "Identify the correct pattern in a sequence.",        icon: Eye,       color: "text-accent"     },
  { id: "attention", title: "Attention Span",      description: "Click the moving target as many times as you can.", icon: Target,    color: "text-green-400"  },
  { id: "decision",  title: "Decision Making",     description: "Make quick decisions under time pressure.",          icon: GitBranch, color: "text-orange-400" },
];

// ─── Reaction Test ────────────────────────────────────────────────────────────
const ReactionTest = ({ onComplete }: { onComplete: (score: number, duration: number) => void }) => {
  const [phase, setPhase]       = useState<"wait" | "go">("wait");
  const [startTime, setStartTime] = useState(0);
  const [times, setTimes]       = useState<number[]>([]);
  const sessionStart             = useRef(Date.now());
  const ROUNDS                   = 3;

  useEffect(() => {
    if (phase === "wait") {
      const delay = 1500 + Math.random() * 2500;
      const t = setTimeout(() => {
        setPhase("go");
        setStartTime(performance.now());
      }, delay);
      return () => clearTimeout(t);
    }
  }, [phase]);

  const handleClick = () => {
    if (phase !== "go") return;
    const rt = performance.now() - startTime;
    const newTimes = [...times, rt];
    setTimes(newTimes);

    if (newTimes.length >= ROUNDS) {
      const avg = newTimes.reduce((a, b) => a + b, 0) / newTimes.length;
      // 150ms = perfect (100), 800ms = 0; clamp 0-100
      const score = Math.max(0, Math.min(100, Math.round(100 - (avg - 150) / 6.5)));
      onComplete(score, Math.round((Date.now() - sessionStart.current) / 1000));
    } else {
      setPhase("wait");
    }
  };

  return (
    <div className="flex flex-col items-center gap-6">
      <p className="text-muted-foreground text-sm">
        Round {times.length + 1}/{ROUNDS} — Click when the screen turns green!
      </p>
      <button
        onClick={handleClick}
        className={`w-64 h-64 rounded-2xl flex items-center justify-center text-2xl font-bold transition-all duration-150 select-none ${
          phase === "go"
            ? "bg-green-500 text-white scale-105 shadow-lg shadow-green-500/30"
            : "bg-red-500/20 text-red-400 border-2 border-red-500/30"
        }`}
      >
        {phase === "go" ? "CLICK NOW!" : "Wait…"}
      </button>
      {times.length > 0 && (
        <p className="text-sm text-muted-foreground">
          Last: {Math.round(times[times.length - 1])}ms
        </p>
      )}
    </div>
  );
};

// ─── Memory Test ──────────────────────────────────────────────────────────────
const MemoryTest = ({ onComplete }: { onComplete: (score: number, duration: number) => void }) => {
  const [sequence, setSequence]   = useState<number[]>([]);
  const [userInput, setUserInput] = useState<number[]>([]);
  const [showing, setShowing]     = useState(true);
  const [round, setRound]         = useState(1);
  const [totalScore, setTotalScore] = useState(0);
  const sessionStart               = useRef(Date.now());
  const ROUNDS                     = 5;

  useEffect(() => {
    const len = round + 3; // 4, 5, 6, 7, 8 digits
    const seq = Array.from({ length: len }, () => Math.floor(Math.random() * 10));
    setSequence(seq);
    setShowing(true);
    setUserInput([]);
    const t = setTimeout(() => setShowing(false), 1500 + len * 400);
    return () => clearTimeout(t);
  }, [round]);

  const handleInput = (num: number) => {
    if (showing) return;
    const next = [...userInput, num];
    setUserInput(next);

    if (next.length === sequence.length) {
      const correct = next.every((n, i) => n === sequence[i]);
      const roundScore = correct ? 20 : 0;
      const newTotal = totalScore + roundScore;

      if (round >= ROUNDS) {
        onComplete(newTotal, Math.round((Date.now() - sessionStart.current) / 1000));
      } else {
        setTotalScore(newTotal);
        setRound((r) => r + 1);
      }
    }
  };

  return (
    <div className="flex flex-col items-center gap-6">
      <p className="text-muted-foreground text-sm">
        Round {round}/{ROUNDS} — {showing ? "Memorise the sequence!" : "Enter the sequence"}
      </p>
      {showing ? (
        <div className="flex gap-3 text-4xl font-mono font-bold gradient-text">
          {sequence.map((n, i) => <span key={i}>{n}</span>)}
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-sm text-foreground text-center font-mono tracking-widest">
            {userInput.join(" ") || "—"} ({userInput.length}/{sequence.length})
          </p>
          <div className="grid grid-cols-5 gap-2">
            {Array.from({ length: 10 }, (_, i) => (
              <button
                key={i}
                onClick={() => handleInput(i)}
                className="w-12 h-12 rounded-xl bg-muted hover:bg-primary/20 text-foreground font-bold transition-colors"
              >
                {i}
              </button>
            ))}
          </div>
        </div>
      )}
      <p className="text-xs text-muted-foreground">Score so far: {totalScore}/100</p>
    </div>
  );
};

// ─── Pattern Test ─────────────────────────────────────────────────────────────
const ALL_PATTERNS: AIQuestion[] = [
  { seq: [2, 4, 6, 8, "?"],        answer: 10,   options: [9, 10, 11, 12]          },
  { seq: [1, 1, 2, 3, 5, "?"],     answer: 8,    options: [6, 7, 8, 9]             },
  { seq: [3, 6, 12, 24, "?"],      answer: 48,   options: [36, 48, 30, 42]         },
  { seq: [1, 4, 9, 16, "?"],       answer: 25,   options: [20, 25, 30, 36]         },
  { seq: [2, 6, 18, 54, "?"],      answer: 162,  options: [108, 162, 216, 72]      },
  { seq: [5, 10, 15, 20, "?"],     answer: 25,   options: [22, 24, 25, 30]         },
  { seq: [1, 3, 7, 15, "?"],       answer: 31,   options: [29, 30, 31, 32]         },
  { seq: [100, 50, 25, "?"],       answer: 12,   options: [10, 12, 13, 15]         },
  { seq: [7, 14, 21, 28, "?"],     answer: 35,   options: [33, 34, 35, 42]         },
  { seq: [0, 1, 4, 9, 16, "?"],    answer: 25,   options: [20, 23, 25, 36]         },
  { seq: [81, 27, 9, 3, "?"],      answer: 1,    options: [0, 1, 2, 3]             },
  { seq: [2, 3, 5, 7, 11, "?"],    answer: 13,   options: [12, 13, 14, 15]         },
  { seq: [1, 8, 27, 64, "?"],      answer: 125,  options: [100, 115, 125, 216]     },
  { seq: [4, 8, 16, 32, "?"],      answer: 64,   options: [48, 56, 64, 128]        },
  { seq: [3, 9, 27, 81, "?"],      answer: 243,  options: [162, 243, 324, 729]     },
  { seq: [10, 9, 7, 4, "?"],       answer: 0,    options: [0, 1, 2, 3]             },
  { seq: [1, 2, 4, 7, 11, "?"],    answer: 16,   options: [14, 15, 16, 17]         },
  { seq: [5, 15, 45, 135, "?"],    answer: 405,  options: [270, 405, 540, 675]     },
  { seq: [256, 64, 16, 4, "?"],    answer: 1,    options: [1, 2, 3, 4]             },
  { seq: [2, 5, 10, 17, 26, "?"],  answer: 37,   options: [34, 35, 37, 40]         },
  { seq: [1, 3, 6, 10, 15, "?"],   answer: 21,   options: [18, 19, 21, 22]         },
  { seq: [6, 11, 21, 41, "?"],     answer: 81,   options: [71, 81, 91, 101]        },
  { seq: [3, 5, 8, 13, 21, "?"],   answer: 34,   options: [29, 32, 34, 36]         },
  { seq: [16, 4, 1, "?"],          answer: 0,    options: [0, 1, 2, 4]             },
  { seq: [2, 4, 12, 48, "?"],      answer: 240,  options: [96, 192, 240, 288]      },
];

function pickPatterns(count: number): AIQuestion[] {
  const shuffled = [...ALL_PATTERNS].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

const PatternTest = ({ onComplete }: { onComplete: (score: number, duration: number) => void }) => {
  const [round, setRound]           = useState(1);
  const [totalScore, setTotalScore] = useState(0);
  const [feedback, setFeedback]     = useState<"correct" | "wrong" | null>(null);
  const [patterns, setPatterns]     = useState<AIQuestion[]>([]);
  const [loadingQ, setLoadingQ]     = useState(true);
  const sessionStart                = useRef(Date.now());

  // Fetch AI questions on mount; fall back to local pool if AI fails
  useEffect(() => {
    let cancelled = false;
    setLoadingQ(true);
    testsApi.getQuestions("pattern")
      .then((res) => {
        if (!cancelled && res.questions?.length >= 5) {
          setPatterns(res.questions);
        } else {
          if (!cancelled) setPatterns(pickPatterns(5));
        }
      })
      .catch(() => {
        if (!cancelled) setPatterns(pickPatterns(5));
      })
      .finally(() => {
        if (!cancelled) setLoadingQ(false);
      });
    return () => { cancelled = true; };
  }, []);

  if (loadingQ) {
    return (
      <div className="flex flex-col items-center gap-4 py-8">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Generating unique questions with AI…</p>
      </div>
    );
  }

  const current = patterns[round - 1];
  if (!current) return null;

  const handleAnswer = (val: number) => {
    const correct = val === current.answer;
    const newScore = totalScore + (correct ? 20 : 0);
    setFeedback(correct ? "correct" : "wrong");

    setTimeout(() => {
      setFeedback(null);
      if (round >= patterns.length) {
        onComplete(newScore, Math.round((Date.now() - sessionStart.current) / 1000));
      } else {
        setTotalScore(newScore);
        setRound((r) => r + 1);
      }
    }, 600);
  };

  return (
    <div className="flex flex-col items-center gap-6">
      <p className="text-muted-foreground text-sm">Round {round}/{patterns.length} — What comes next?</p>
      <div className="flex gap-3 text-2xl font-mono font-bold text-foreground flex-wrap justify-center">
        {current.seq!.map((n, i) => (
          <span key={i} className={n === "?" ? "gradient-text text-3xl" : ""}>{n}</span>
        ))}
      </div>
      {feedback && (
        <p className={`text-sm font-semibold ${feedback === "correct" ? "text-green-400" : "text-red-400"}`}>
          {feedback === "correct" ? "✓ Correct!" : "✗ Wrong"}
        </p>
      )}
      <div className="grid grid-cols-2 gap-3">
        {current.options!.map((opt) => (
          <button
            key={opt}
            onClick={() => handleAnswer(opt)}
            disabled={feedback !== null}
            className="px-8 py-3 rounded-xl bg-muted hover:bg-primary/20 text-foreground font-semibold transition-colors disabled:opacity-50"
          >
            {opt}
          </button>
        ))}
      </div>
      <p className="text-xs text-muted-foreground">Score: {totalScore}/100</p>
    </div>
  );
};

// ─── Attention Test ───────────────────────────────────────────────────────────
const AttentionTest = ({ onComplete }: { onComplete: (score: number, duration: number) => void }) => {
  const [targetPos, setTargetPos] = useState({ x: 50, y: 50 });
  const [hits, setHits]           = useState(0);
  const [timeLeft, setTimeLeft]   = useState(20);
  const [done, setDone]           = useState(false);
  const sessionStart               = useRef(Date.now());
  const hitsRef                    = useRef(0);

  useEffect(() => {
    const moveInterval = setInterval(() => {
      setTargetPos({ x: 10 + Math.random() * 80, y: 10 + Math.random() * 80 });
    }, 1200);

    const countdown = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          clearInterval(moveInterval);
          clearInterval(countdown);
          return 0;
        }
        return t - 1;
      });
    }, 1000);

    return () => { clearInterval(moveInterval); clearInterval(countdown); };
  }, []);

  useEffect(() => {
    if (timeLeft === 0 && !done) {
      setDone(true);
      // Max possible hits in 20s with 1.2s interval ≈ 16; scale to 100
      const maxHits = Math.floor(20 / 1.2);
      const score = Math.min(100, Math.round((hitsRef.current / maxHits) * 100));
      onComplete(Math.max(score, 5), Math.round((Date.now() - sessionStart.current) / 1000));
    }
  }, [timeLeft, done, onComplete]);

  const handleHit = (e: React.MouseEvent) => {
    e.stopPropagation();
    hitsRef.current += 1;
    setHits((h) => h + 1);
    // Move immediately on hit
    setTargetPos({ x: 10 + Math.random() * 80, y: 10 + Math.random() * 80 });
  };

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="flex justify-between w-full max-w-xs text-sm">
        <span className="text-muted-foreground">Hits: <span className="text-green-400 font-bold">{hits}</span></span>
        <span className={`font-bold ${timeLeft <= 5 ? "text-red-400" : "gradient-text"}`}>{timeLeft}s</span>
        <span className="text-muted-foreground">Click the dot!</span>
      </div>
      <div className="relative w-72 h-72 rounded-2xl bg-muted/30 border border-border/30 overflow-hidden">
        <motion.button
          animate={{ left: `${targetPos.x}%`, top: `${targetPos.y}%` }}
          transition={{ type: "spring", stiffness: 400, damping: 20 }}
          className="absolute w-10 h-10 -ml-5 -mt-5 rounded-full bg-primary cursor-pointer shadow-lg flex items-center justify-center"
          style={{ boxShadow: "0 0 20px hsl(259,100%,62%,0.6)" }}
          onClick={handleHit}
        >
          <span className="text-white text-xs font-bold">+1</span>
        </motion.button>
      </div>
      <p className="text-xs text-muted-foreground">Click the purple dot as fast as possible!</p>
    </div>
  );
};

// ─── Decision Test ────────────────────────────────────────────────────────────
const ALL_DECISIONS: AIQuestion[] = [
  { q: "Which number is largest?",                           a: "847",      opts: ["748", "847", "784", "478"]              },
  { q: "Hot is to Cold as Day is to…",                       a: "Night",    opts: ["Morning", "Night", "Evening", "Noon"]   },
  { q: "Which shape has the most sides?",                    a: "Hexagon",  opts: ["Triangle", "Square", "Pentagon", "Hexagon"] },
  { q: "Odd one out (not a fruit):",                         a: "Carrot",   opts: ["Apple", "Banana", "Carrot", "Grape"]    },
  { q: "2 + 2 × 2 = ?",                                     a: "6",        opts: ["8", "6", "4", "10"]                     },
  { q: "Which is heavier: 1kg iron or 1kg feathers?",        a: "Same",     opts: ["Iron", "Feathers", "Same", "Depends"]   },
  { q: "Next in sequence: 2, 4, 8, 16, ?",                  a: "32",       opts: ["24", "32", "20", "28"]                  },
  { q: "Which planet is closest to the Sun?",                a: "Mercury",  opts: ["Venus", "Earth", "Mercury", "Mars"]     },
  { q: "What comes next: Monday, Wednesday, Friday, ?",      a: "Sunday",   opts: ["Sunday", "Saturday", "Thursday", "Tuesday"] },
  { q: "Odd one out (not a primary colour):",                a: "Green",    opts: ["Red", "Blue", "Green", "Yellow"]        },
  { q: "Which is NOT a programming language?",               a: "Cobra",    opts: ["Python", "Ruby", "Cobra", "Swift"]      },
  { q: "5² + 3² = ?",                                       a: "34",       opts: ["30", "32", "34", "64"]                  },
  { q: "Fast is to Slow as Loud is to…",                     a: "Quiet",    opts: ["Soft", "Quiet", "Silent", "Low"]        },
  { q: "How many sides does a pentagon have?",               a: "5",        opts: ["4", "5", "6", "7"]                      },
  { q: "Which number is a prime?",                           a: "17",       opts: ["15", "16", "17", "18"]                  },
  { q: "Odd one out (not an ocean):",                        a: "Amazon",   opts: ["Pacific", "Atlantic", "Amazon", "Arctic"] },
  { q: "What is 15% of 200?",                                a: "30",       opts: ["20", "25", "30", "35"]                  },
  { q: "Which comes first alphabetically?",                  a: "Elephant", opts: ["Tiger", "Elephant", "Lion", "Zebra"]    },
  { q: "Light travels faster than…",                         a: "Sound",    opts: ["Water", "Sound", "Wind", "Electricity"] },
  { q: "Square root of 144?",                                a: "12",       opts: ["10", "11", "12", "14"]                  },
  { q: "Which is the largest continent?",                    a: "Asia",     opts: ["Africa", "Asia", "Europe", "Australia"] },
  { q: "3 + 3 ÷ 3 = ?",                                     a: "4",        opts: ["2", "3", "4", "6"]                      },
  { q: "Odd one out (not a mammal):",                        a: "Salmon",   opts: ["Whale", "Bat", "Salmon", "Dolphin"]     },
  { q: "Which month has 28 days minimum every year?",        a: "February", opts: ["January", "February", "March", "April"] },
  { q: "What is the next prime after 11?",                   a: "13",       opts: ["12", "13", "14", "15"]                  },
  { q: "Bird is to Sky as Fish is to…",                      a: "Water",    opts: ["Ocean", "Water", "River", "Sea"]        },
  { q: "100 ÷ 4 × 2 = ?",                                   a: "50",       opts: ["12.5", "25", "50", "200"]               },
  { q: "Which is NOT a type of triangle?",                   a: "Circular", opts: ["Scalene", "Isosceles", "Circular", "Equilateral"] },
  { q: "How many minutes in 2.5 hours?",                     a: "150",      opts: ["120", "135", "150", "180"]              },
];

function pickDecisions(count: number): AIQuestion[] {
  const shuffled = [...ALL_DECISIONS].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

const DecisionTest = ({ onComplete }: { onComplete: (score: number, duration: number) => void }) => {
  const [round, setRound]           = useState(1);
  const [totalScore, setTotalScore] = useState(0);
  const [timeLeft, setTimeLeft]     = useState(6);
  const [answered, setAnswered]     = useState(false);
  const [questions, setQuestions]   = useState<AIQuestion[]>([]);
  const [loadingQ, setLoadingQ]     = useState(true);
  const sessionStart                = useRef(Date.now());

  // Fetch AI questions on mount; fall back to local pool if AI fails
  useEffect(() => {
    let cancelled = false;
    setLoadingQ(true);
    testsApi.getQuestions("decision")
      .then((res) => {
        if (!cancelled && res.questions?.length >= 5) {
          setQuestions(res.questions);
        } else {
          if (!cancelled) setQuestions(pickDecisions(5));
        }
      })
      .catch(() => {
        if (!cancelled) setQuestions(pickDecisions(5));
      })
      .finally(() => {
        if (!cancelled) setLoadingQ(false);
      });
    return () => { cancelled = true; };
  }, []);

  const ROUNDS = 5;
  const current = questions[(round - 1) % Math.max(questions.length, 1)];

  useEffect(() => {
    if (loadingQ || !current) return;
    setTimeLeft(6);
    setAnswered(false);
    const t = setInterval(() => setTimeLeft((v) => v - 1), 1000);
    return () => clearInterval(t);
  }, [round, loadingQ, current]);

  useEffect(() => {
    if (loadingQ || !current) return;
    if (timeLeft <= 0 && !answered) {
      if (round >= ROUNDS) {
        onComplete(totalScore, Math.round((Date.now() - sessionStart.current) / 1000));
      } else {
        setRound((r) => r + 1);
      }
    }
  }, [timeLeft, answered, round, totalScore, onComplete, loadingQ, current]);

  if (loadingQ) {
    return (
      <div className="flex flex-col items-center gap-4 py-8">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Generating unique questions with AI…</p>
      </div>
    );
  }

  if (!current) return null;

  const handleAnswer = (opt: string) => {
    if (answered) return;
    setAnswered(true);
    const correct = opt === current.a;
    const newScore = totalScore + (correct ? 20 : 0);

    setTimeout(() => {
      if (round >= ROUNDS) {
        onComplete(newScore, Math.round((Date.now() - sessionStart.current) / 1000));
      } else {
        setTotalScore(newScore);
        setRound((r) => r + 1);
      }
    }, 500);
  };

  return (
    <div className="flex flex-col items-center gap-6 w-full max-w-sm mx-auto">
      <div className="flex justify-between w-full text-sm">
        <span className="text-muted-foreground">Round {round}/{ROUNDS}</span>
        <span className={`font-bold ${timeLeft <= 2 ? "text-red-400 animate-pulse" : "gradient-text"}`}>
          {timeLeft}s
        </span>
        <span className="text-muted-foreground">Score: {totalScore}</span>
      </div>
      {/* Timer bar */}
      <div className="w-full h-1.5 rounded-full bg-muted">
        <div
          className="h-1.5 rounded-full bg-primary transition-all duration-1000"
          style={{ width: `${(timeLeft / 6) * 100}%` }}
        />
      </div>
      <p className="text-foreground font-semibold text-center text-lg">{current.q}</p>
      <div className="grid grid-cols-2 gap-3 w-full">
        {current.opts!.map((opt) => (
          <button
            key={opt}
            onClick={() => handleAnswer(opt)}
            disabled={answered}
            className="px-4 py-3 rounded-xl bg-muted hover:bg-primary/20 text-foreground text-sm font-semibold transition-colors disabled:opacity-60"
          >
            {opt}
          </button>
        ))}
      </div>
    </div>
  );
};

// ─── Test Component Map ───────────────────────────────────────────────────────
const TestComponents: Record<TestType, React.FC<{ onComplete: (score: number, duration: number) => void }>> = {
  reaction:  ReactionTest,
  memory:    MemoryTest,
  pattern:   PatternTest,
  attention: AttentionTest,
  decision:  DecisionTest,
};

// ─── Main Page ────────────────────────────────────────────────────────────────
const CognitiveTestsPage = () => {
  const [activeTest, setActiveTest]       = useState<TestType | null>(null);
  const [testState, setTestState]         = useState<TestState>("idle");
  const [lastScore, setLastScore]         = useState<number | null>(null);
  const [submitting, setSubmitting]       = useState(false);
  const [submitError, setSubmitError]     = useState<string | null>(null);
  const [sessionResult, setSessionResult] = useState<SessionSummary | null>(null);

  // Use a ref so handleComplete always has the latest activeTest without re-creating
  const activeTestRef  = useRef<TestType | null>(null);
  const sessionIdRef   = useRef<string>(crypto.randomUUID());

  const startTest = (test: TestType) => {
    activeTestRef.current = test;
    setActiveTest(test);
    setTestState("running");
    setLastScore(null);
    setSessionResult(null);
    setSubmitError(null);
  };

  // Stable callback — reads activeTestRef instead of state
  const handleComplete = async (score: number, duration: number) => {
    const testType = activeTestRef.current;
    if (!testType) return;

    // Clamp score 0-100
    const finalScore = Math.max(0, Math.min(100, Math.round(score)));

    setLastScore(finalScore);
    setTestState("complete");
    setSubmitting(true);
    setSubmitError(null);

    try {
      const res = await testsApi.submit({
        testType,
        score: finalScore,
        durationSeconds: duration,
        sessionId: sessionIdRef.current,
      });
      setSessionResult(res.session);
    } catch (e: unknown) {
      setSubmitError(e instanceof Error ? e.message : "Failed to save result. Check your connection.");
    } finally {
      setSubmitting(false);
    }
  };

  const reset = () => {
    setActiveTest(null);
    activeTestRef.current = null;
    setTestState("idle");
    setLastScore(null);
    setSessionResult(null);
    setSubmitError(null);
  };

  const startNewSession = () => {
    sessionIdRef.current = crypto.randomUUID();
    reset();
  };

  const ActiveComponent = activeTest ? TestComponents[activeTest] : null;
  const activeConfig    = activeTest ? tests.find((t) => t.id === activeTest) : null;

  return (
    <div className="min-h-screen pt-20 pb-12 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Cognitive Tests</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Complete all 5 tests to update your cognitive profile
          </p>
        </div>

        <AnimatePresence mode="wait">
          {/* ── Test Grid ── */}
          {testState === "idle" && (
            <motion.div key="grid" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  Session: <span className="font-mono text-xs text-primary">{sessionIdRef.current.slice(0, 8)}…</span>
                </p>
                <button onClick={startNewSession} className="text-xs text-muted-foreground hover:text-foreground underline">
                  New Session
                </button>
              </div>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {tests.map((test, i) => (
                  <motion.div
                    key={test.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0, transition: { delay: i * 0.08 } }}
                    className="glass-card-hover p-6 space-y-4 cursor-pointer"
                    onClick={() => startTest(test.id)}
                  >
                    <test.icon className={`w-8 h-8 ${test.color}`} />
                    <h3 className="text-lg font-semibold text-foreground">{test.title}</h3>
                    <p className="text-sm text-muted-foreground">{test.description}</p>
                    <button className="gradient-btn text-sm flex items-center gap-2 w-full justify-center">
                      <Play className="w-4 h-4" /> Start Test
                    </button>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}

          {/* ── Running ── */}
          {testState === "running" && ActiveComponent && (
            <motion.div
              key="test"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="glass-card p-8 text-center space-y-6"
            >
              <h2 className="text-xl font-bold text-foreground">{activeConfig?.title}</h2>
              <ActiveComponent onComplete={handleComplete} />
            </motion.div>
          )}

          {/* ── Result ── */}
          {testState === "complete" && (
            <motion.div
              key="result"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="glass-card p-8 text-center space-y-6"
            >
              <CheckCircle className="w-16 h-16 text-green-400 mx-auto" />
              <h2 className="text-2xl font-bold text-foreground">Test Complete!</h2>

              {/* Score display */}
              <div className="space-y-1">
                <p className="text-6xl font-black gradient-text">{lastScore ?? 0}</p>
                <p className="text-muted-foreground text-sm">out of 100</p>
              </div>

              {/* Score bar */}
              <div className="w-full max-w-xs mx-auto h-3 rounded-full bg-muted">
                <div
                  className="h-3 rounded-full bg-primary transition-all duration-700"
                  style={{ width: `${lastScore ?? 0}%` }}
                />
              </div>

              {/* Saving indicator */}
              {submitting && (
                <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="w-4 h-4 animate-spin" /> Saving to your profile…
                </div>
              )}

              {/* Error */}
              {submitError && (
                <div className="flex items-center gap-2 text-sm text-yellow-400 justify-center p-3 rounded-xl border border-yellow-500/20 bg-yellow-500/5">
                  <AlertTriangle className="w-4 h-4 shrink-0" /> {submitError}
                </div>
              )}

              {/* Session progress */}
              {sessionResult && !submitting && (
                <div className="text-left space-y-3 p-4 rounded-xl bg-muted/20 border border-border/20">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-foreground">
                      Session progress
                    </p>
                    <span className="text-sm font-bold gradient-text">
                      {sessionResult.testsCompleted}/5
                    </span>
                  </div>
                  {/* Progress dots */}
                  <div className="flex gap-2">
                    {Array.from({ length: 5 }, (_, i) => (
                      <div
                        key={i}
                        className={`flex-1 h-2 rounded-full ${
                          i < sessionResult.testsCompleted ? "bg-primary" : "bg-muted"
                        }`}
                      />
                    ))}
                  </div>

                  {sessionResult.isComplete && (
                    <div className="space-y-2 pt-2 border-t border-border/20">
                      <p className="text-sm text-green-400 font-semibold">
                        🎉 Session complete! Overall score: <span className="text-xl font-black">{sessionResult.overallScore}</span>
                      </p>
                      {sessionResult.insights?.map((ins, i) => (
                        <p key={i} className={`text-xs ${
                          ins.type === "positive" ? "text-green-400" :
                          ins.type === "warning"  ? "text-yellow-400" : "text-muted-foreground"
                        }`}>
                          {ins.type === "warning" ? "⚠️" : ins.type === "positive" ? "✅" : "ℹ️"}{" "}
                          <strong>{ins.title}:</strong> {ins.description}
                        </p>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <button onClick={reset} className="gradient-btn inline-flex items-center gap-2">
                <RotateCcw className="w-4 h-4" /> Back to Tests
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
};

export default CognitiveTestsPage;
