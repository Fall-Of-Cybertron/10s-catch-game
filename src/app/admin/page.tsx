"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { ShieldAlert, Trash2, Lock, ArrowLeft, Ban } from "lucide-react";
import Link from "next/link";

type Score = {
  id: string;
  nickname: string;
  stopped_time: number;
  time_diff: number;
  created_at: string;
  fingerprint: string;
  ip_address: string;
  user_agent: string;
};

export default function AdminPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [pin, setPin] = useState("");
  const [scores, setScores] = useState<Score[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (pin.trim().length > 0) {
      setIsAuthenticated(true);
      fetchScores();
    }
  };

  const fetchScores = async () => {
    setIsLoading(true);
    const { data } = await supabase
      .from("scores")
      .select("*")
      .order("time_diff", { ascending: true })
      .order("created_at", { ascending: true })
      .limit(50);

    if (data) setScores(data);
    setIsLoading(false);
  };

  const handleDelete = async (scoreId: string) => {
    if (!confirm("Bu skoru silmek istediğinize emin misiniz? (Liderlik tablosundan anında kalkar)")) return;
    try {
      const res = await fetch("/api/admin/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scoreId, pin }),
      });
      if (!res.ok) {
        if (res.status === 403) setIsAuthenticated(false);
        return;
      }
      setScores(scores.filter(s => s.id !== scoreId));
    } catch (err) {}
  };

  const handleBan = async (identifier: string, type: 'fingerprint' | 'ip') => {
    if (!identifier || identifier === 'unknown') return alert("Geçersiz kimlik");
    if (!confirm(`Bu ${type === 'ip' ? 'IP adresini' : 'cihazı'} BANLAMAK istediğinize emin misiniz? Kişinin tüm skorları da silinecektir.`)) return;
    try {
      const res = await fetch("/api/admin/ban", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier, pin, type }),
      });
      if (!res.ok) {
        if (res.status === 403) setIsAuthenticated(false);
        return;
      }
      fetchScores();
    } catch (err) {}
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center p-6 text-white font-mono">
        <form onSubmit={handleLogin} className="bg-white/5 p-8 rounded-3xl border border-red-500/30 w-full max-w-sm text-center shadow-2xl">
          <ShieldAlert className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-black mb-6 tracking-widest text-red-500">YÖNETİCİ PANELİ</h1>
          <input 
            type="password"
            placeholder="Görevli PIN"
            value={pin}
            onChange={e => setPin(e.target.value)}
            className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-4 text-center text-xl tracking-[0.5em] mb-4 outline-none focus:border-red-500"
            autoFocus
          />
          <button type="submit" className="w-full bg-red-600 hover:bg-red-700 font-bold py-4 rounded-xl transition-colors">
            GİRİŞ YAP
          </button>
          <Link href="/" className="inline-flex items-center gap-2 mt-6 text-gray-500 hover:text-white transition-colors">
            <ArrowLeft className="w-4 h-4" /> Oyuna Dön
          </Link>
        </form>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050505] text-white p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8 pb-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <Lock className="w-8 h-8 text-red-500" />
            <div>
              <h1 className="text-2xl font-black tracking-widest text-red-500">YÖNETİCİ PANELİ</h1>
              <p className="text-sm text-gray-400">IP takibi, cihaz yasaklama ve uygunsuz isimleri temizleme merkezi.</p>
            </div>
          </div>
          <Link href="/" className="px-4 py-2 bg-white/10 rounded-lg hover:bg-white/20 transition-colors flex items-center gap-2">
            Çıkış Yap
          </Link>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
          {isLoading ? (
            <div className="p-12 text-center text-gray-500">Yükleniyor...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="bg-black/50 text-gray-400 uppercase tracking-wider">
                    <th className="p-4 font-bold">Sıra</th>
                    <th className="p-4 font-bold">İsim</th>
                    <th className="p-4 font-bold">Zaman</th>
                    <th className="p-4 font-bold">Fark</th>
                    <th className="p-4 font-bold">IP & Cihaz</th>
                    <th className="p-4 font-bold text-right">İşlem</th>
                  </tr>
                </thead>
                <tbody>
                  {scores.map((score, index) => (
                    <tr key={score.id} className="border-t border-white/5 hover:bg-white/[0.02] transition-colors">
                      <td className="p-4 text-gray-400 font-mono">#{index + 1}</td>
                      <td className="p-4 font-bold text-lg">{score.nickname}</td>
                      <td className="p-4 font-mono text-gray-300">{score.stopped_time.toFixed(3)}s</td>
                      <td className="p-4 font-mono text-indigo-400">±{score.time_diff.toFixed(3)}</td>
                      <td className="p-4">
                        <div className="text-xs text-gray-500 font-mono truncate max-w-[200px]" title={score.user_agent}>
                          IP: {score.ip_address || 'Bilinmiyor'}
                        </div>
                      </td>
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button 
                            onClick={() => handleDelete(score.id)}
                            className="p-2 bg-gray-500/10 text-gray-400 hover:bg-gray-500 hover:text-white rounded-lg transition-colors"
                            title="Sadece Skoru Sil"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => handleBan(score.ip_address, 'ip')}
                            className="p-2 bg-orange-500/10 text-orange-500 hover:bg-orange-500 hover:text-white rounded-lg transition-colors flex items-center gap-1"
                            title="Bu IP Adresini Banla"
                          >
                            <Ban className="w-4 h-4" /> IP
                          </button>
                          <button 
                            onClick={() => handleBan(score.fingerprint, 'fingerprint')}
                            className="p-2 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white rounded-lg transition-colors flex items-center gap-1"
                            title="Bu Cihazı (Fingerprint) Banla"
                          >
                            <Ban className="w-4 h-4" /> Cihaz
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {scores.length === 0 && (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-gray-500">Kayıt bulunamadı.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
