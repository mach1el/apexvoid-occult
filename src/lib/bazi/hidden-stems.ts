/**
 * Tàng can trong Địa chi
 */

export interface HiddenStem {
  stem: string;
  type: "Bản khí" | "Trung khí" | "Dư khí";
}

export const HIDDEN_STEMS: Record<string, HiddenStem[]> = {
  Tý: [{ stem: "Quý", type: "Bản khí" }],
  Sửu: [
    { stem: "Kỷ", type: "Bản khí" },
    { stem: "Quý", type: "Trung khí" },
    { stem: "Tân", type: "Dư khí" }
  ],
  Dần: [
    { stem: "Giáp", type: "Bản khí" },
    { stem: "Bính", type: "Trung khí" },
    { stem: "Mậu", type: "Dư khí" }
  ],
  Mão: [{ stem: "Ất", type: "Bản khí" }],
  Thìn: [
    { stem: "Mậu", type: "Bản khí" },
    { stem: "Ất", type: "Trung khí" },
    { stem: "Quý", type: "Dư khí" }
  ],
  Tị: [
    { stem: "Bính", type: "Bản khí" },
    { stem: "Mậu", type: "Trung khí" },
    { stem: "Canh", type: "Dư khí" }
  ],
  Ngọ: [
    { stem: "Đinh", type: "Bản khí" },
    { stem: "Kỷ", type: "Trung khí" }
  ],
  Mùi: [
    { stem: "Kỷ", type: "Bản khí" },
    { stem: "Đinh", type: "Trung khí" },
    { stem: "Ất", type: "Dư khí" }
  ],
  Thân: [
    { stem: "Canh", type: "Bản khí" },
    { stem: "Nhâm", type: "Trung khí" },
    { stem: "Mậu", type: "Dư khí" }
  ],
  Dậu: [{ stem: "Tân", type: "Bản khí" }],
  Tuất: [
    { stem: "Mậu", type: "Bản khí" },
    { stem: "Tân", type: "Trung khí" },
    { stem: "Đinh", type: "Dư khí" }
  ],
  Hợi: [
    { stem: "Nhâm", type: "Bản khí" },
    { stem: "Giáp", type: "Trung khí" }
  ]
};

export function getHiddenStems(branch: string): HiddenStem[] {
  return HIDDEN_STEMS[branch] || [];
}
