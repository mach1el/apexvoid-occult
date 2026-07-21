export function clamp(n: number, min: number, max: number): number {
  if (!Number.isFinite(n)) return min;
  return Math.min(max, Math.max(min, n));
}

export function roundToPrecision(n: number, precision: number): number {
  const factor = 10 ** precision;
  return Math.round(n * factor) / factor;
}

export function computeDirectSigned(
  supportRaw: number,
  pressureRaw: number,
  evidenceScale: number,
  epsilon: number,
): {
  total: number;
  intensity: number;
  polarity: number;
  signed: number;
} {
  const total = supportRaw + pressureRaw;
  const intensity = 1 - Math.exp(-total / evidenceScale);
  const polarity = total > epsilon ? (supportRaw - pressureRaw) / (total + epsilon) : 0;
  const signed = clamp(intensity * polarity, -1, 1);
  return {
    total,
    intensity: clamp(intensity, 0, 1),
    polarity: clamp(polarity, -1, 1),
    signed,
  };
}

export function computeActivationGate(raw: number, scale: number): number {
  if (!(raw > 0) || !(scale > 0)) return 0;
  return Math.tanh(raw / scale);
}

export function computeActivationModulator(gate: number): number {
  if (!(gate > 0)) return 0;
  return Math.sqrt(gate);
}
