import { Pillar } from "../calendar/sexagenary";

export interface BaziChart {
  year: Pillar;
  month: Pillar;
  day: Pillar;
  hour: Pillar;
  
  gender: "M" | "F";
  longitude: number;
  utcOffsetMinutes: number;

  // Dương Nam, Âm Nữ, v.v.
  isYangGender: boolean;
  
  metadata: {
    trueSolarTime: Date;
    liChunDate: Date;
    equationOfTimeMinutes?: number;
    solarTerms?: { name: string; date: Date }[];
  };
}
