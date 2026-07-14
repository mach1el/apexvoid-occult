import { Pillar } from "../calendar/sexagenary";
import { BaziFullChart } from "./bazi-engine";
import { BaziConventions, DEFAULT_CONVENTIONS } from "./conventions";
import { getAnnualPillar } from "./luck-pillars";
import { getTenGod } from "./ten-gods";
import { getLifeStage } from "./life-stages";

export interface AnnualYear {
  year: number;              // dương lịch
  age: number;               // tuổi (quy ước: nominal hay chronological)
  pillar: Pillar;            // can-chi năm
  tenGod: string;            // thập thần của CAN năm so với Nhật Chủ
  lifeStage: string;         // trường sinh của Nhật Chủ tại CHI năm
  luckPillarIndex: number;   // thuộc đại vận thứ mấy (để nhóm/tô màu)
}

/**
 * Tính bảng lưu niên (Annual Years) cho một khoảng thời gian.
 */
export function getAnnualYears(
  chart: BaziFullChart,
  fromYear?: number,
  toYear?: number,
  conventions: BaziConventions = DEFAULT_CONVENTIONS
): AnnualYear[] {
  const birthYear = chart.metadata.trueSolarTime.getUTCFullYear();
  const start = fromYear ?? birthYear;
  const end = toYear ?? (birthYear + 80);
  const dayMaster = chart.day.stem;
  
  const results: AnnualYear[] = [];
  
  for (let year = start; year <= end; year++) {
    const pillar = getAnnualPillar(year);
    
    // Tính tuổi
    let age = 0;
    if (conventions.annualAgeMethod === "nominal") {
      age = year - birthYear + 1;
    } else {
      age = year - birthYear;
    }
    // Không cho tuổi âm
    if (age < 0) age = 0;

    // Tìm Đại Vận hiện tại dựa trên năm
    let luckPillarIndex = -1; // -1 nếu chưa vào đại vận hoặc không nằm trong 10 đại vận
    
    // chart.luck.pillars chứa 10 đại vận, mỗi cái có startAgeYear (tuổi) và startDate (thời gian)
    // Để chính xác, ta nên xem năm `year` rơi vào thời gian nào của các đại vận.
    // Tuy nhiên, việc xét theo năm (VD: 2024 thuộc đại vận nào) có thể bị lệch ở biên.
    // Cách đơn giản và phổ biến: So sánh `year` với năm bắt đầu của đại vận.
    // lp.startDate.getFullYear() là năm bắt đầu của đại vận đó.
    let foundIndex = -1;
    for (let i = chart.luck.pillars.length - 1; i >= 0; i--) {
      const lpStartYear = chart.luck.pillars[i]!.startDate.getFullYear();
      if (year >= lpStartYear) {
        foundIndex = i;
        break;
      }
    }
    luckPillarIndex = foundIndex;

    results.push({
      year,
      age,
      pillar,
      tenGod: getTenGod(dayMaster, pillar.stem),
      lifeStage: getLifeStage(dayMaster, pillar.branch, conventions),
      luckPillarIndex
    });
  }
  
  return results;
}
