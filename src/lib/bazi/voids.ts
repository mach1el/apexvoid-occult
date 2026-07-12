import { BRANCHES, Pillar, STEMS } from "../calendar/sexagenary";

/**
 * Tính Không Vong (Tuần Không) của một trụ (thường là Trụ Ngày).
 * Mỗi Tuần (10 ngày) sẽ có 2 chi bị Không Vong.
 * 
 * @param pillar Trụ để lấy hệ quy chiếu (thường là Trụ Ngày hoặc Trụ Năm)
 * @returns Mảng chứa 2 chi Không Vong
 */
export function getVoids(pillar: Pillar): [string, string] {
  const stemIndex = STEMS.indexOf(pillar.stem);
  const branchIndex = BRANCHES.indexOf(pillar.branch);
  
  if (stemIndex === -1 || branchIndex === -1) {
    return ["", ""];
  }

  // Thuật toán: Không Vong nằm ở 2 vị trí trước Tuần thủ (Giáp).
  // Chênh lệch (branchIndex - stemIndex) là hằng số cho cả 1 tuần.
  // Tuần Giáp Tý: chênh lệch = 0. Không vong: Tuất (10), Hợi (11)
  // Tuần Giáp Tuất: chênh lệch = 10. Không vong: Thân (8), Dậu (9)
  
  const diff = (branchIndex - stemIndex + 12) % 12;
  const void1 = (diff - 2 + 12) % 12;
  const void2 = (diff - 1 + 12) % 12;

  return [BRANCHES[void1] ?? "", BRANCHES[void2] ?? ""];
}

/**
 * Kiểm tra xem một chi (ví dụ chi tháng/năm/giờ/đại vận) có rơi vào Không Vong của trụ quy chiếu không.
 */
export function isVoid(targetBranch: string, referencePillar: Pillar): boolean {
  const voids = getVoids(referencePillar);
  return voids.includes(targetBranch);
}
