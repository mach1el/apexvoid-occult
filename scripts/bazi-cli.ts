import { generateBaziChart } from "../src/lib/bazi/bazi-engine";

// Lấy arg từ CLI:
// tsx scripts/bazi-cli.ts "2024-02-04T09:00:00Z" 105.8 420 M
const args = process.argv.slice(2);

if (args.length < 4) {
  console.log("Sử dụng: npx tsx scripts/bazi-cli.ts <ISO_DATE_UTC> <LONGITUDE> <UTC_OFFSET_MINUTES> <GENDER(M/F)>");
  console.log('Ví dụ: npx tsx scripts/bazi-cli.ts "2024-02-04T09:00:00Z" 105.8 420 M');
  process.exit(1);
}

const dateStr = args[0];
const longitude = parseFloat(args[1] ?? "105.8");
const utcOffsetMinutes = parseInt(args[2] ?? "420", 10);
const gender = (args[3] === "F" ? "F" : "M") as "M" | "F";

const date = new Date(dateStr ?? "");

if (isNaN(date.getTime())) {
  console.error("Lỗi: Ngày không hợp lệ.");
  process.exit(1);
}

const chart = generateBaziChart(date, longitude, utcOffsetMinutes, gender);

console.log(JSON.stringify(chart, null, 2));
