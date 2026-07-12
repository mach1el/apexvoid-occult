import { useState, useMemo } from "react";
import { generateBaziChart, BaziFullChart, BaziPillarDetail } from "../../lib/bazi/bazi-engine";
import { BaziChart as BaziChartComponent } from "./BaziChart";

export function BaziPage() {
  const [dateStr, setDateStr] = useState("1990-01-01T12:00");
  const [gender, setGender] = useState<"M" | "F">("M");
  const [longitude, setLongitude] = useState(105.8);
  const [timezone, setTimezone] = useState(7);

  const chart = useMemo(() => {
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return null;
      // Convert timezone hours to minutes
      return generateBaziChart(d, longitude, timezone * 60, gender);
    } catch (e) {
      console.error(e);
      return null;
    }
  }, [dateStr, gender, longitude, timezone]);

  return (
    <div className="min-h-screen bg-void text-paper font-sans p-4 lg:p-8">
      <div className="max-w-5xl mx-auto space-y-6">
        <header className="flex flex-col gap-2">
          <h1 className="text-2xl font-display text-gold">Lá Số Bát Tự</h1>
          <p className="text-sm text-muted">Hệ thống an lá số Tứ Trụ (Bát Tự) dựa trên thuật toán thiên văn chính xác.</p>
        </header>

        <section className="bg-ink rounded-lg p-4 lg:p-6 border border-white/5 grid gap-4 lg:grid-cols-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1">
            <label className="text-xs text-muted uppercase tracking-wider">Ngày Giờ Sinh (Dương Lịch)</label>
            <input 
              type="datetime-local" 
              value={dateStr}
              onChange={(e) => setDateStr(e.target.value)}
              className="bg-void border border-white/10 rounded px-3 py-2 text-sm focus:border-gold outline-none"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-muted uppercase tracking-wider">Giới Tính</label>
            <select 
              value={gender}
              onChange={(e) => setGender(e.target.value as "M" | "F")}
              className="bg-void border border-white/10 rounded px-3 py-2 text-sm focus:border-gold outline-none"
            >
              <option value="M">Nam</option>
              <option value="F">Nữ</option>
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-muted uppercase tracking-wider">Kinh Độ</label>
            <input 
              type="number" 
              step="0.1"
              value={longitude}
              onChange={(e) => setLongitude(parseFloat(e.target.value))}
              className="bg-void border border-white/10 rounded px-3 py-2 text-sm focus:border-gold outline-none"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-muted uppercase tracking-wider">Múi Giờ (UTC+)</label>
            <input 
              type="number" 
              value={timezone}
              onChange={(e) => setTimezone(parseInt(e.target.value))}
              className="bg-void border border-white/10 rounded px-3 py-2 text-sm focus:border-gold outline-none"
            />
          </div>
        </section>

        {chart ? (
          <BaziChartComponent chart={chart} />
        ) : (
          <div className="text-center py-12 text-muted">Vui lòng nhập ngày giờ sinh hợp lệ.</div>
        )}
      </div>
    </div>
  );
}
