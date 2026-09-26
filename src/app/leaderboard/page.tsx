"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { motion, AnimatePresence } from "framer-motion";
import { Trophy } from "lucide-react";

type Score = {
  id: string;
  nickname: string;
  stopped_time: number;
  time_diff: number;
  created_at: string;
};

export default function LeaderboardPage() {
  const [scores, setScores] = useState<Score[]>([]);
  const [lastAddedId, setLastAddedId] = useState<string | null>(null);

  const fetchTopScores = async () => {
    const { data } = await supabase
      .from("scores")
      .select("*")
      .order("time_diff", { ascending: true })
      .order("created_at", { ascending: true })
      .limit(10);
      
    if (data) {
      setScores(data);
    }
  };

  useEffect(() => {
    fetchTopScores();

    // Supabase Realtime Aboneliği
    const channel = supabase
      .channel("public:scores")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "scores" },
        (payload) => {
          const newScore = payload.new as Score;
          setLastAddedId(newScore.id);
          
          setScores((currentScores) => {
            const newScoresList = [...currentScores, newScore];
            // Yeniden sırala ve ilk 10'u al
            newScoresList.sort((a, b) => {
              if (a.time_diff === b.time_diff) {
                return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
              }
              return a.time_diff - b.time_diff;
            });
            return newScoresList.slice(0, 10);
          });
          
          // Parlama animasyonunu 3 saniye sonra kapat
          setTimeout(() => setLastAddedId(null), 3000);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return (
    <div className="min-h-screen bg-black text-white font-mono flex flex-col items-center justify-center p-8 overflow-hidden relative">
      
      {/* Arcade Style Background Grid */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[size:50px_50px] [mask-image:radial-gradient(ellipse_at_center,black_40%,transparent_100%)] opacity-20 pointer-events-none" />

      <motion.div 
        initial={{ y: -50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="z-10 text-center mb-12"
      >
        <Trophy className="w-24 h-24 text-yellow-500 mx-auto mb-4 drop-shadow-[0_0_30px_rgba(234,179,8,0.6)]" />
        <h1 className="text-6xl font-black tracking-widest text-transparent bg-clip-text bg-gradient-to-b from-yellow-300 to-yellow-700 filter drop-shadow-[0_0_10px_rgba(234,179,8,0.8)]">
          TOP 10 HACKERS
        </h1>
        <p className="text-gray-400 mt-2 text-xl tracking-widest">HEDEF: 10.00 SANİYE</p>
      </motion.div>

      <div className="w-full max-w-4xl z-10">
        <div className="flex text-gray-500 border-b border-gray-800 pb-4 mb-4 text-xl px-4 uppercase tracking-widest font-bold">
          <div className="w-24 text-center">RANK</div>
          <div className="flex-1">NICKNAME</div>
          <div className="w-48 text-right">TIME</div>
          <div className="w-32 text-right">DIFF</div>
        </div>

        <div className="space-y-3">
          <AnimatePresence mode="popLayout">
            {scores.map((score, index) => {
              const isNew = score.id === lastAddedId;
              const isFirst = index === 0;

              return (
                <motion.div
                  key={score.id}
                  layout
                  initial={{ opacity: 0, x: -50, scale: 0.9 }}
                  animate={{ 
                    opacity: 1, 
                    x: 0, 
                    scale: 1,
                    boxShadow: isNew ? "0 0 30px 5px rgba(34, 197, 94, 0.5)" : "0 0 0px 0px rgba(0,0,0,0)"
                  }}
                  exit={{ opacity: 0, scale: 0.5, transition: { duration: 0.2 } }}
                  transition={{ type: "spring", stiffness: 300, damping: 25 }}
                  className={`flex items-center text-2xl p-4 rounded-xl border ${
                    isFirst 
                      ? "bg-yellow-950/30 border-yellow-500/50 text-yellow-400" 
                      : isNew
                        ? "bg-green-950/40 border-green-500/80 text-green-400"
                        : "bg-gray-900/50 border-gray-800 text-gray-300"
                  }`}
                >
                  <div className="w-24 text-center font-black">
                    {index + 1}
                  </div>
                  <div className="flex-1 font-bold truncate pr-4">
                    {score.nickname}
                  </div>
                  <div className="w-48 text-right font-mono tracking-wider">
                    {score.stopped_time.toFixed(3)}s
                  </div>
                  <div className="w-32 text-right font-mono text-gray-500 text-xl">
                    ±{score.time_diff.toFixed(3)}
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
          
          {scores.length === 0 && (
            <div className="text-center text-gray-600 py-12 text-xl animate-pulse">
              HENÜZ KİMSE KAZANAMADI. İLK SEN OL!
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
