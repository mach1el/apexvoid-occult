/** TP4C geometry for a palace index — opposite and two trines (mod 12). */
export function oppositePalaceIndex(index: number): number {
  return (index + 6) % 12;
}

export function trinePalaceIndexes(index: number): [number, number] {
  return [(index + 4) % 12, (index + 8) % 12];
}
