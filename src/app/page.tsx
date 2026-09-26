"use client";

import { useState, useEffect, useRef } from "react";
import { useFingerprint } from "@/hooks/useFingerprint";
import { supabase } from "@/lib/supabase";
import { motion } from "framer-motion";
import { Loader2, ShieldAlert, Trophy } from "lucide-react";
import { isProfane } from "@/lib/profanity";

type GameState = "name_input" | "idle" | "playing" | "loading" | "won" | "lost" | "error";

type Score = {
  id: string;
  nickname: string;
  stopped_time: number;
  time_diff: number;
};

const LiveClock = () => {
  const [time, setTime] = useState("");
  useEffect(() => {
    setTime(new Date().toLocaleTimeString());
    const int = setInterval(() => setTime(new Date().toLocaleTimeString()), 1000);
    return () => clearInterval(int);
  }, []);
  return <div className="absolute top-4 right-4 bg-black/50 backdrop-blur-md px-3 py-1 rounded-full text-xs font-mono text-white/80 border border-white/10">{time}</div>;
};

export default function Home() {
  const fingerprint = useFingerprint();
  const [isMobile, setIsMobile] = useState<boolean | null>(null);
  
  const [gameState, setGameState] = useState<GameState>("name_input");
  const [timer, setTimer] = useState<number>(0);
  const [errorMessage, setErrorMessage] = useState("");
  
  const [gameId, setGameId] = useState<string | null>(null);
  const [hmacToken, setHmacToken] = useState<string | null>(null);
  
  const [scoreId, setScoreId] = useState<string | null>(null);
  const [stoppedTime, setStoppedTime] = useState<number | null>(null);
  const [timeDiff, setTimeDiff] = useState<number | null>(null);
  
  const [nickname, setNickname] = useState("");
  const [cooldown, setCooldown] = useState(0);
  const [staffPin, setStaffPin] = useState("");
  const [isClaimed, setIsClaimed] = useState(false);
  const [rank, setRank] = useState<number | null>(null);
  const [isNewBest, setIsNewBest] = useState(false);

  const [leaderboard, setLeaderboard] = useState<Score[]>([]);

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

    const savedName = localStorage.getItem("game_nickname");
    if (savedName) {
      setNickname(savedName);
      setGameState("idle");
    }

    fetchLeaderboard();

    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const fetchLeaderboard = async () => {
    const { data } = await supabase
      .from("scores")
      .select("id, nickname, stopped_time, time_diff")
      .order("time_diff", { ascending: true })
      .order("created_at", { ascending: true })
      .limit(10);
    
    if (data) setLeaderboard(data);
  };

  const handleSaveName = () => {
    if (!nickname.trim()) return;
    if (isProfane(nickname)) {
      setErrorMessage("Lütfen uygun bir isim giriniz.");
      return;
    }
    setErrorMessage("");
    localStorage.setItem("game_nickname", nickname.trim());
    setGameState("idle");
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
    } catch (error) {
      console.error(error);
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
        body: JSON.stringify({ gameId, hmacToken, clientDuration, fingerprint, nickname }),
      });
      const data = await res.json();

      if (!res.ok) {
        setGameState("error");
        setErrorMessage(data.error || "Bir hata oluştu");
        return;
      }

      setStoppedTime(data.stoppedTime);
      setTimeDiff(data.timeDiff);
      setRank(data.rank);
      setScoreId(data.scoreId);
      setIsNewBest(data.isNewBest);

      // Skoru kaydettikten sonra liderlik tablosunu hemen yenile
      fetchLeaderboard();

      if (data.isWin) {
        setGameState("won");
      } else {
        setGameState("lost");
        startCooldown();
      }
    } catch (error) {
      console.error(error);
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
    } catch (error) {
      console.error(error);
      alert("Hata");
    }
  };

  const getFeedbackMessage = (time: number) => {
    if (time < 9.00) return "Çok erken!";
    if (time < 9.80) return "Erken bastın!";
    if (time < 9.95) return "Çok yaklaştın!";
    if (time <= 10.05) return "KAZANDINIZ!";
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

  // BİLGİSAYAR GÖRÜNÜMÜ
  if (isMobile === false) {
    return (
      <div className="min-h-screen bg-[#050505] flex flex-col items-center justify-center p-6 text-center relative overflow-hidden">
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

  // İSİM GİRİŞ EKRANI
  if (gameState === "name_input") {
    return (
      <main className="min-h-[100dvh] bg-[#0a0a0a] flex flex-col items-center justify-center p-6 relative select-none">
        <div className="w-full max-w-sm text-center z-10 bg-white/5 p-8 rounded-3xl border border-white/10 backdrop-blur-md">
          <Trophy className="w-16 h-16 text-indigo-500 mx-auto mb-6" />
          <h1 className="text-2xl font-black text-white mb-2">Savaşa Katıl</h1>
          <p className="text-gray-400 text-sm mb-6">Skor tablosunda görünecek adını gir</p>
          
          <input 
            type="text" 
            maxLength={12}
            placeholder="Kullanıcı Adı"
            className="w-full bg-black/40 border border-white/10 rounded-2xl px-4 py-4 text-white text-center font-bold text-lg mb-2 outline-none focus:border-indigo-500 transition-colors"
            value={nickname}
            onChange={e => setNickname(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSaveName()}
          />
          {errorMessage && <p className="text-red-400 text-sm font-medium mb-4">{errorMessage}</p>}
          
          <button 
            onClick={handleSaveName}
            disabled={!nickname.trim()}
            className="w-full mt-4 bg-indigo-600 disabled:opacity-50 text-white font-black text-xl py-4 rounded-2xl transition-transform active:scale-95"
          >
            BAŞLA
          </button>
        </div>
      </main>
    );
  }

  // ÖDÜL EKRANI (Kazandı)
  if (gameState === "won") {
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
          <h2 className="text-3xl font-black text-white mb-2 tracking-tight">KAZANDINIZ!</h2>
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
          <button 
            onClick={() => setGameState("idle")} 
            className="mt-6 w-full py-4 bg-white/10 hover:bg-white/20 text-white font-bold rounded-2xl transition-colors"
          >
            REKOR İÇİN TEKRAR OYNA
          </button>
        </div>
      </div>
    );
  }

  // ANA OYUN EKRANI
  return (
    <main className="min-h-[100dvh] bg-[#0a0a0a] flex flex-col items-center justify-start pt-4 px-4 pb-8 relative select-none overflow-hidden touch-none">
      
      {/* LİDERLİK TABLOSU (ÜST KISIM) */}
      <div className="w-full max-w-sm mb-6 z-10">
        <div className="bg-white/5 border border-white/10 rounded-3xl p-4 backdrop-blur-sm">
          <div className="flex items-center justify-between mb-3 px-2">
            <span className="text-gray-400 text-xs font-bold uppercase tracking-widest flex items-center gap-1">
              <Trophy className="w-3 h-3" /> TOP 10
            </span>
            <span className="text-indigo-400 text-xs font-bold">Hedef: 10.00s</span>
          </div>
          
          <div className="space-y-1.5 h-[160px] overflow-y-auto pr-1">
            {leaderboard.length === 0 ? (
              <p className="text-center text-gray-600 text-sm mt-8">Henüz rekor kıran yok.</p>
            ) : (
              leaderboard.map((score, index) => (
                <div key={score.id} className="flex justify-between items-center bg-black/40 px-3 py-2 rounded-xl border border-white/5">
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-black ${index === 0 ? 'text-yellow-400' : index === 1 ? 'text-gray-300' : index === 2 ? 'text-amber-600' : 'text-gray-600'}`}>
                      {index + 1}
                    </span>
                    <span className="text-sm font-bold text-gray-200 truncate max-w-[100px]">{score.nickname}</span>
                  </div>
                  <span className="text-xs font-mono text-gray-400">{score.stopped_time.toFixed(3)}s</span>
                </div>
              ))
            )}
          </div>
          
          {/* Kullanıcının Kendi Sırası (Eğer Top 10'da değilse veya sıralaması varsa göster) */}
          {rank && rank > 10 && (
             <div className="mt-2 pt-2 border-t border-white/10 flex justify-between items-center bg-indigo-900/30 px-3 py-2 rounded-xl border-indigo-500/30">
               <div className="flex items-center gap-2">
                 <span className="text-xs font-black text-indigo-400">{rank}</span>
                 <span className="text-sm font-bold text-indigo-200">Sen ({nickname})</span>
               </div>
               <span className="text-xs font-mono text-indigo-400 font-bold">Fark: {timeDiff?.toFixed(3)}</span>
             </div>
          )}
        </div>
      </div>

      <div className="absolute top-3/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] bg-indigo-600/10 rounded-full blur-[100px] pointer-events-none" />

      {/* OYUN ALANI */}
      <div className="w-full max-w-sm text-center flex flex-col items-center justify-center flex-1 z-10">
        
        {/* Sayaç */}
        <div className="mb-8 font-mono font-black text-[5.5rem] leading-none text-white tracking-tighter tabular-nums drop-shadow-lg">
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

        {/* Sonuç (Kayıp) */}
        {gameState === "lost" && stoppedTime !== null && (
          <div className="w-full animate-in fade-in slide-in-from-bottom-4 mt-2">
            <div className={`font-black text-xl mb-1 ${getFeedbackColor(stoppedTime)}`}>
              {getFeedbackMessage(stoppedTime)}
            </div>
            
            {isNewBest && <div className="text-xs font-bold text-green-400 bg-green-900/30 inline-block px-2 py-1 rounded-md mb-2">Yeni Rekorun!</div>}

            <button 
              disabled={cooldown > 0}
              className={`w-full h-20 mt-4 transition-all rounded-[1.5rem] font-black text-xl flex items-center justify-center ${
                cooldown > 0 
                  ? "bg-white/5 text-gray-500 border border-white/10" 
                  : "bg-white text-black active:bg-gray-200 active:scale-95 shadow-[0_6px_0_rgb(163,163,163)]"
              }`}
            >
              {cooldown > 0 ? `BEKLENİYOR (${cooldown})` : "TEKRAR DENE"}
            </button>
          </div>
        )}

        {gameState === "error" && (
          <div className="mt-4 text-red-400 bg-red-950/30 px-4 py-4 rounded-2xl border border-red-500/20 w-full">
            <p className="font-medium text-sm">{errorMessage}</p>
            <button onClick={() => setGameState("idle")} className="mt-3 px-6 py-2 bg-white/10 rounded-full text-xs font-bold active:scale-95 transition-transform">Başa Dön</button>
          </div>
        )}
      </div>
      {/* Gizli Yönetici Paneli Butonu (Sol Alt Köşe) */}
      <a href="/admin" className="absolute bottom-0 left-0 w-8 h-8 opacity-0 z-50" />
    </main>
  );
}
