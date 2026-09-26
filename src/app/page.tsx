"use client";

import { useState, useEffect, useRef } from "react";
import { useFingerprint } from "@/hooks/useFingerprint";
import { supabase } from "@/lib/supabase";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, ShieldAlert, Trophy, X, ListOrdered } from "lucide-react";

type GameState = "idle" | "playing" | "loading" | "won" | "lost" | "error";

type Score = {
  id: string;
  nickname: string;
  stopped_time: number;
  time_diff: number;
};

export default function Home() {
  const fingerprint = useFingerprint();
  const [isMobile, setIsMobile] = useState<boolean | null>(null);
  
  const [gameState, setGameState] = useState<GameState>("idle");
  const [timer, setTimer] = useState<number>(0);
  const [errorMessage, setErrorMessage] = useState("");
  
  const [gameId, setGameId] = useState<string | null>(null);
  const [hmacToken, setHmacToken] = useState<string | null>(null);
  const [winToken, setWinToken] = useState<string | null>(null);
  
  const [scoreId, setScoreId] = useState<string | null>(null);
  const [stoppedTime, setStoppedTime] = useState<number | null>(null);
  const [timeDiff, setTimeDiff] = useState<number | null>(null);
  
  const [nickname, setNickname] = useState("");
  const [cooldown, setCooldown] = useState(0);
  const [staffPin, setStaffPin] = useState("");
  const [isClaimed, setIsClaimed] = useState(false);
  const [rank, setRank] = useState<number | null>(null);

  // Liderlik tablosu modalı
  const [isLeaderboardOpen, setIsLeaderboardOpen] = useState(false);
  const [leaderboard, setLeaderboard] = useState<Score[]>([]);
  const [isLoadingLeaderboard, setIsLoadingLeaderboard] = useState(false);

  const requestRef = useRef<number>(0);
  const startTimeRef = useRef<number>(0);

  useEffect(() => {
    const checkMobile = () => {
      const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
      const isSmallScreen = window.innerWidth <= 768;
      setIsMobile(isTouch && isSmallScreen);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const fetchLeaderboard = async () => {
    setIsLoadingLeaderboard(true);
    const { data } = await supabase
      .from("scores")
      .select("id, nickname, stopped_time, time_diff")
      .order("time_diff", { ascending: true })
      .order("created_at", { ascending: true })
      .limit(10);
    
    if (data) setLeaderboard(data);
    setIsLoadingLeaderboard(false);
  };

  const openLeaderboard = () => {
    fetchLeaderboard();
    setIsLeaderboardOpen(true);
  };

  const updateTimer = () => {
    if (startTimeRef.current === 0) return;
    const now = performance.now();
    const elapsed = (now - startTimeRef.current) / 1000;
    setTimer(elapsed);
    requestRef.current = requestAnimationFrame(updateTimer);
  };

  const handleStart = async () => {
    if (!fingerprint) return;
    setGameState("loading");
    setErrorMessage("");
    setTimer(0);
    
    try {
      const res = await fetch("/api/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fingerprint }),
      });
      const data = await res.json();
      
      if (!res.ok) {
        setGameState("error");
        setErrorMessage(data.error || "Başlatılamadı");
        return;
      }
      setGameId(data.gameId);
      setHmacToken(data.hmacToken);
      setGameState("playing");
      
      startTimeRef.current = performance.now();
      requestRef.current = requestAnimationFrame(updateTimer);
    } catch (err) {
      setGameState("error");
      setErrorMessage("Bağlantı hatası");
    }
  };

  const handleStop = async () => {
    if (gameState !== "playing" || !gameId || !hmacToken) return;
    
    cancelAnimationFrame(requestRef.current);
    const clientDuration = (performance.now() - startTimeRef.current) / 1000;
    setTimer(clientDuration);
    setGameState("loading");

    try {
      const res = await fetch("/api/stop", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gameId, hmacToken, clientDuration, fingerprint }),
      });
      const data = await res.json();

      if (!res.ok) {
        setGameState("error");
        setErrorMessage(data.error || "Bir hata oluştu");
        return;
      }

      setStoppedTime(data.stoppedTime);
      setTimeDiff(data.timeDiff);

      if (data.isWin) {
        setWinToken(data.winToken);
        setGameState("won");
      } else {
        setGameState("lost");
        startCooldown();
      }
    } catch (err) {
      setGameState("error");
      setErrorMessage("Durdurma sırasında hata oluştu");
    }
  };

  const startCooldown = () => {
    setCooldown(3);
    const interval = setInterval(() => {
      setCooldown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          setGameState("idle");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleSaveScore = async () => {
    if (!nickname.trim()) return;
    setGameState("loading");

    try {
      const res = await fetch("/api/save-score", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fingerprint, nickname, stoppedTime, timeDiff, winToken }),
      });
      const data = await res.json();
      if (!res.ok) {
        setGameState("error");
        setErrorMessage(data.error);
        return;
      }
      setScoreId(data.scoreId);
      fetchRank(data.scoreId);
    } catch (err) {
      setGameState("error");
      setErrorMessage("Skor kaydedilemedi");
    }
  };

  const fetchRank = async (sid: string) => {
    try {
      const res = await fetch(`/api/rank?id=${sid}`);
      const data = await res.json();
      if (res.ok) setRank(data.rank);
    } catch (err) {}
  };

  const handleClaim = async () => {
    if (!staffPin || !scoreId) return;
    try {
      const res = await fetch("/api/claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scoreId, pin: staffPin }),
      });
      if (res.ok) setIsClaimed(true);
      else alert("Yanlış PIN");
    } catch (err) {
      alert("Hata");
    }
  };

  const LiveClock = () => {
    const [time, setTime] = useState(new Date().toLocaleTimeString());
    useEffect(() => {
      const int = setInterval(() => setTime(new Date().toLocaleTimeString()), 1000);
      return () => clearInterval(int);
    }, []);
    return <div className="absolute top-4 right-4 bg-black/50 backdrop-blur-md px-3 py-1 rounded-full text-xs font-mono text-white/80 border border-white/10">{time}</div>;
  };

  const getFeedbackMessage = (time: number) => {
    if (time < 9.00) return "Çok erken!";
    if (time < 9.80) return "Erken bastın!";
    if (time < 9.95) return "Çok yaklaştın!";
    if (time <= 10.05) return "MÜKEMMEL!";
    if (time <= 10.20) return "Çok yaklaştın!";
    if (time < 11.00) return "Geç kaldın!";
    return "Neyi bekliyorsun?";
  };

  const getFeedbackColor = (time: number) => {
    if (time >= 9.95 && time <= 10.05) return "text-green-400";
    if (time >= 9.80 && time <= 10.20) return "text-yellow-400";
    return "text-red-400";
  };

  if (isMobile === null) {
    return <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center"><Loader2 className="animate-spin text-white w-8 h-8" /></div>;
  }

  // BİLGİSAYAR GÖRÜNÜMÜ (MODERNİZE EDİLDİ)
  if (isMobile === false) {
    return (
      <div className="min-h-screen bg-[#050505] flex flex-col items-center justify-center p-6 text-center relative overflow-hidden">
        {/* Subtle background glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-600/10 rounded-full blur-[120px] pointer-events-none" />
        
        <div className="z-10 bg-white/5 border border-white/10 p-10 rounded-3xl backdrop-blur-sm max-w-lg w-full shadow-2xl">
          <div className="bg-red-500/20 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
            <ShieldAlert className="w-10 h-10 text-red-500" />
          </div>
          <h1 className="text-3xl font-black text-white mb-4 tracking-tight">Mobil Cihaz Gerekli</h1>
          <p className="text-gray-400 text-lg leading-relaxed">
            Bu oyun sadece dokunmatik ekranlı mobil cihazlardan oynanabilir. Lütfen etkinliğe ait QR kodu telefonunuzla okutarak tekrar deneyin.
          </p>
        </div>
      </div>
    );
  }

  // ÖDÜL EKRANI
  if (scoreId) {
    return (
      <div className="min-h-screen bg-[#051505] flex flex-col items-center justify-center p-6 relative overflow-hidden">
        <motion.div 
          animate={{ scale: [1, 1.1, 1], opacity: [0.2, 0.4, 0.2] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          className="absolute inset-0 bg-green-500/20 blur-[100px] rounded-full"
        />
        <LiveClock />
        <div className="z-10 bg-black/40 p-8 rounded-3xl border border-green-500/30 backdrop-blur-xl w-full max-w-sm text-center shadow-2xl">
          <Trophy className="w-20 h-20 text-yellow-400 mx-auto mb-4 filter drop-shadow-[0_0_15px_rgba(250,204,21,0.5)]" />
          <h2 className="text-3xl font-black text-white mb-2 tracking-tight">TEBRİKLER!</h2>
          <p className="text-green-400 font-mono text-2xl mb-6 font-bold">{stoppedTime?.toFixed(3)}s</p>
          
          {rank && (
            <div className="bg-white/5 py-3 px-4 rounded-xl mb-8 border border-white/10">
              <p className="text-gray-400 text-sm mb-1 uppercase tracking-wider font-semibold">Sıralaman</p>
              <p className="text-3xl font-black text-white">#{rank}</p>
            </div>
          )}

          {isClaimed ? (
            <div className="bg-green-500 text-black font-black py-4 px-6 rounded-2xl text-lg shadow-[0_0_20px_rgba(34,197,94,0.4)]">
              ÖDÜL TESLİM EDİLDİ
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-xs text-gray-400 uppercase tracking-wider">Görevli Onayı</p>
              <input 
                type="password" 
                placeholder="PIN" 
                className="w-full bg-black/50 border border-white/10 rounded-2xl px-4 py-4 text-center text-white text-xl tracking-[0.5em] outline-none focus:border-green-500 transition-colors"
                value={staffPin}
                onChange={e => setStaffPin(e.target.value)}
              />
              <button 
                onClick={handleClaim}
                className="w-full bg-yellow-500 hover:bg-yellow-400 text-black font-black text-lg py-4 rounded-2xl transition-transform active:scale-95"
              >
                ONAYLA
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ANA OYUN EKRANI
  return (
    <main className="min-h-[100dvh] bg-[#0a0a0a] flex flex-col items-center justify-center p-6 relative select-none overflow-hidden touch-none">
      
      {/* Performans dostu modern arkaplan */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] bg-indigo-600/10 rounded-full blur-[100px] pointer-events-none" />

      {/* Liderlik Tablosu Butonu (Sağ Üst) */}
      <button 
        onClick={openLeaderboard}
        className="absolute top-6 right-6 p-3 bg-white/5 border border-white/10 rounded-full text-white backdrop-blur-md active:scale-90 transition-transform"
      >
        <ListOrdered className="w-6 h-6 text-gray-300" />
      </button>

      <div className="w-full max-w-sm text-center flex flex-col items-center z-10">
        
        <div className="mb-10">
          <h1 className="text-4xl font-black text-white tracking-tighter">10.00</h1>
          <p className="text-gray-500 text-sm mt-2 font-medium tracking-wide">TAM ZAMANINDA DURDUR</p>
        </div>

        {/* Sayaç */}
        <div className="mb-14 font-mono font-black text-[5.5rem] leading-none text-white tracking-tighter tabular-nums drop-shadow-lg">
          {timer.toFixed(2)}
        </div>

        {/* Butonlar */}
        {gameState === "idle" && (
          <button 
            onClick={handleStart}
            disabled={!fingerprint}
            className="w-full h-24 bg-white active:bg-gray-200 active:scale-95 transition-all rounded-[2rem] text-black font-black text-3xl shadow-[0_8px_0_rgb(163,163,163)] flex items-center justify-center disabled:opacity-50"
          >
            BAŞLA
          </button>
        )}

        {gameState === "playing" && (
          <button 
            onPointerDown={handleStop}
            className="w-full h-24 bg-indigo-600 active:bg-indigo-700 active:scale-95 transition-all rounded-[2rem] text-white font-black text-3xl shadow-[0_8px_0_rgb(67,56,202)] flex items-center justify-center"
          >
            DURDUR
          </button>
        )}

        {gameState === "loading" && (
          <div className="w-full h-24 flex items-center justify-center">
            <Loader2 className="w-10 h-10 text-indigo-500 animate-spin" />
          </div>
        )}

        {/* Kaybettin UI */}
        {gameState === "lost" && stoppedTime !== null && (
          <div className="w-full animate-in fade-in slide-in-from-bottom-4">
            <div className={`font-black text-2xl mb-1 ${getFeedbackColor(stoppedTime)}`}>
              {getFeedbackMessage(stoppedTime)}
            </div>
            <div className="text-gray-400 font-mono text-lg mb-6">
              Süre: {stoppedTime.toFixed(3)}s
            </div>
            <button 
              disabled={cooldown > 0}
              className={`w-full h-20 transition-all rounded-[1.5rem] font-black text-xl flex items-center justify-center ${
                cooldown > 0 
                  ? "bg-white/5 text-gray-500 border border-white/10" 
                  : "bg-white text-black active:bg-gray-200 active:scale-95 shadow-[0_6px_0_rgb(163,163,163)]"
              }`}
            >
              {cooldown > 0 ? `BEKLENİYOR (${cooldown})` : "TEKRAR DENE"}
            </button>
          </div>
        )}

        {/* Kazandın UI */}
        {gameState === "won" && (
          <div className="w-full animate-in zoom-in-95 duration-200">
            <div className="bg-green-950/40 border border-green-500/30 p-6 rounded-[2rem] mb-6 backdrop-blur-md">
              <h3 className="text-green-400 font-black text-2xl mb-1">KAZANDIN!</h3>
              <p className="text-white text-4xl font-mono font-black mb-6 drop-shadow-md">{stoppedTime?.toFixed(3)}s</p>
              
              <input 
                type="text" 
                maxLength={12}
                placeholder="Adın Nedir?"
                className="w-full bg-black/40 border border-white/10 rounded-2xl px-4 py-4 text-white text-center font-bold text-lg mb-4 outline-none focus:border-green-500 transition-colors"
                value={nickname}
                onChange={e => setNickname(e.target.value)}
              />
              
              <button 
                onClick={handleSaveScore}
                disabled={!nickname.trim()}
                className="w-full bg-green-500 disabled:opacity-50 text-black font-black text-xl py-4 rounded-2xl transition-transform active:scale-95"
              >
                KAYDET
              </button>
            </div>
          </div>
        )}

        {gameState === "error" && (
          <div className="mt-8 text-red-400 bg-red-950/30 px-4 py-4 rounded-2xl border border-red-500/20 w-full">
            <p className="font-medium">{errorMessage}</p>
            <button onClick={() => setGameState("idle")} className="mt-4 px-6 py-2 bg-white/10 rounded-full text-sm font-bold active:scale-95 transition-transform">Başa Dön</button>
          </div>
        )}
      </div>

      {/* Liderlik Tablosu Modalı */}
      <AnimatePresence>
        {isLeaderboardOpen && (
          <motion.div 
            initial={{ opacity: 0, y: 100 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 100 }}
            className="fixed inset-0 z-50 bg-[#0a0a0a] flex flex-col"
          >
            <div className="flex items-center justify-between p-6 border-b border-white/5 bg-black/20">
              <div className="flex items-center gap-3">
                <Trophy className="w-6 h-6 text-yellow-500" />
                <h2 className="text-xl font-black text-white">TOP 10</h2>
              </div>
              <button onClick={() => setIsLeaderboardOpen(false)} className="p-2 bg-white/5 rounded-full active:scale-90">
                <X className="w-6 h-6 text-white" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6">
              {isLoadingLeaderboard ? (
                <div className="flex justify-center mt-10"><Loader2 className="w-8 h-8 animate-spin text-white/30" /></div>
              ) : leaderboard.length === 0 ? (
                <div className="text-center text-gray-500 mt-10 font-medium">Henüz kimse kazanamadı.</div>
              ) : (
                <div className="space-y-3">
                  {leaderboard.map((score, index) => (
                    <div key={score.id} className="flex items-center justify-between p-4 bg-white/5 border border-white/5 rounded-2xl">
                      <div className="flex items-center gap-4">
                        <span className={`font-black text-lg ${index === 0 ? 'text-yellow-400' : index === 1 ? 'text-gray-300' : index === 2 ? 'text-amber-600' : 'text-gray-500'}`}>
                          #{index + 1}
                        </span>
                        <span className="font-bold text-white text-lg">{score.nickname}</span>
                      </div>
                      <div className="text-right">
                        <div className="font-mono font-bold text-white">{score.stopped_time.toFixed(3)}s</div>
                        <div className="text-xs text-gray-500 font-mono">Fark: {score.time_diff.toFixed(3)}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}
