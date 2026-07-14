import { useMemo } from "react";
import { AnnualYear } from "@/lib/bazi/annual-years";
import { Element, ELEMENTS } from "@/lib/bazi/elements";

interface AnnualYearsTableProps {
  annualYears: AnnualYear[];
  getElementColor: (char: string) => string;
}

export function AnnualYearsTable({ annualYears, getElementColor }: AnnualYearsTableProps) {
  const currentYear = new Date().getFullYear();

  // Nhóm theo đại vận (luckPillarIndex)
  // Mỗi mảng con là một dòng (thường là 10 năm của một đại vận)
  // Các năm chưa vô đại vận sẽ có luckPillarIndex = -1
  const rows = useMemo(() => {
    const grouped: Record<number, AnnualYear[]> = {};
    for (const ay of annualYears) {
      if (!grouped[ay.luckPillarIndex]) {
        grouped[ay.luckPillarIndex] = [];
      }
      grouped[ay.luckPillarIndex]!.push(ay);
    }
    
    // Sort keys: -1 (nếu có), 0, 1, 2...
    const keys = Object.keys(grouped).map(Number).sort((a, b) => a - b);
    return keys.map(k => ({
      index: k,
      years: grouped[k]!
    }));
  }, [annualYears]);

  if (annualYears.length === 0) return null;

  return (
    <div className="mt-8">
      <h3 className="text-xl font-bold mb-4 font-serif text-[var(--gold)] border-b border-[var(--gold)]/30 pb-2">
        Bảng Lưu Niên
      </h3>
      
      <div className="overflow-x-auto pb-4 custom-scrollbar">
        <div className="flex flex-col gap-4 min-w-max">
          {rows.map(row => (
            <div key={row.index} className="flex flex-col gap-2">
              <div className="text-sm font-semibold text-[var(--gold)]/80">
                {row.index === -1 ? "Trước khởi vận" : `Đại vận ${row.index + 1}`}
              </div>
              <div className="flex gap-2">
                {row.years.map(ay => {
                  const isCurrent = ay.year === currentYear;
                  
                  return (
                    <div 
                      key={ay.year}
                      className={`
                        w-16 flex flex-col items-center justify-between p-2 rounded border
                        ${isCurrent 
                          ? 'border-[var(--gold)] bg-[var(--gold)]/10 ring-1 ring-[var(--gold)]' 
                          : 'border-white/10 bg-[var(--paper-light)]'
                        }
                      `}
                      >
                      <div className="text-[10px] text-white/60 mb-1 leading-none">{ay.tenGod}</div>
                      
                      <div className="flex flex-col items-center text-lg font-bold font-serif leading-none gap-1">
                        <span className={getElementColor(ay.pillar.stem)}>{ay.pillar.stem}</span>
                        <span className={getElementColor(ay.pillar.branch)}>{ay.pillar.branch}</span>
                      </div>
                      
                      <div className="flex flex-col items-center mt-2 w-full">
                        <div className={`text-xs font-mono font-bold ${isCurrent ? 'text-[var(--gold)]' : 'text-white/80'}`}>
                          {ay.year}
                        </div>
                        <div className="text-[10px] text-white/50">{ay.age}t</div>
                        <div className="text-[9px] mt-1 text-white/40 uppercase tracking-wider">{ay.lifeStage}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
