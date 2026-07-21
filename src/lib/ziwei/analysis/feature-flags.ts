/**
 * Feature flag for palace-overview V1.
 * Default ON. Kill-switch via VITE_ZIWEI_PALACE_OVERVIEW_V1=false, or
 * ?ziweiPalaceOverviewV1=0 (persisted in sessionStorage) for a per-session
 * opt-out; ?ziweiPalaceOverviewV1=1 persists a per-session opt-in override.
 */
export const PALACE_OVERVIEW_FEATURE_FLAG = "ziweiPalaceOverviewV1";

export function isPalaceOverviewV1Enabled(): boolean {
  if (import.meta.env.VITE_ZIWEI_PALACE_OVERVIEW_V1 === "false") {
    return false;
  }
  if (typeof window === "undefined") {
    return true;
  }
  try {
    const params = new URLSearchParams(window.location.search);
    const queryValue = params.get(PALACE_OVERVIEW_FEATURE_FLAG);
    if (queryValue === "0" || queryValue === "1") {
      window.sessionStorage.setItem(PALACE_OVERVIEW_FEATURE_FLAG, queryValue);
    }
    const stored = window.sessionStorage.getItem(PALACE_OVERVIEW_FEATURE_FLAG);
    if (stored === "0") return false;
    if (stored === "1") return true;
    return true;
  } catch {
    return true;
  }
}

/** @deprecated Nam Phái Annual Axes is V0.8-only; no longer gates routing. */
export const ANNUAL_AXES_V04_FEATURE_FLAG = "ziweiAnnualAxesV04";
export function isAnnualAxesV04Enabled(): boolean {
  return true;
}

/** @deprecated Removed from public routing. */
export const ANNUAL_AXES_V043_FEATURE_FLAG = "ziweiAnnualAxesV043";
export function isAnnualAxesV043Enabled(): boolean {
  return false;
}

/** @deprecated Removed from public routing. */
export const ANNUAL_AXES_V05_FEATURE_FLAG = "ziweiAnnualAxesV05";
export function isAnnualAxesV05Enabled(): boolean {
  return false;
}

/** @deprecated Removed from public routing. */
export const ANNUAL_AXES_V06_FEATURE_FLAG = "ziweiAnnualAxesV06";
export function isAnnualAxesV06Enabled(): boolean {
  return false;
}

/** @deprecated Removed from public routing. */
export const ANNUAL_AXES_V07_FEATURE_FLAG = "ziweiAnnualAxesV07";
export function isAnnualAxesV07Enabled(): boolean {
  return false;
}

/** @deprecated Nam Phái always runs V0.8; kept for URL compatibility. */
export const ANNUAL_AXES_V08_FEATURE_FLAG = "ziweiAnnualAxesV08";
export function isAnnualAxesV08Enabled(): boolean {
  return true;
}

/**
 * Feature flag for Annual Axes V0.3 (head-centric Nam Phái + preserved
 * V0.2 Trung Châu). Default ON while PR #90 remains experimental.
 * Kill-switch via VITE_ZIWEI_ANNUAL_AXES_V03=false, or `?ziweiAnnualAxesV03=0`.
 */
export const ANNUAL_AXES_V03_FEATURE_FLAG = "ziweiAnnualAxesV03";

export function isAnnualAxesV03Enabled(): boolean {
  if (import.meta.env.VITE_ZIWEI_ANNUAL_AXES_V03 === "false") {
    return false;
  }
  if (typeof window === "undefined") {
    return true;
  }
  try {
    const params = new URLSearchParams(window.location.search);
    const queryValue = params.get(ANNUAL_AXES_V03_FEATURE_FLAG);
    if (queryValue === "0" || queryValue === "1") {
      window.sessionStorage.setItem(ANNUAL_AXES_V03_FEATURE_FLAG, queryValue);
    }
    const stored = window.sessionStorage.getItem(ANNUAL_AXES_V03_FEATURE_FLAG);
    if (stored === "0") return false;
    if (stored === "1") return true;
    return true;
  } catch {
    return true;
  }
}

/** @deprecated Use `ANNUAL_AXES_V03_FEATURE_FLAG` instead. */
export const ANNUAL_AXES_V02_FEATURE_FLAG = ANNUAL_AXES_V03_FEATURE_FLAG;

/** @deprecated Use `isAnnualAxesV03Enabled` instead. */
export const isAnnualAxesV02Enabled = isAnnualAxesV03Enabled;

/**
 * Feature flag for Huyền Khí Research Preview V0.1 (natal factual UI only).
 * Default OFF — opt-in via VITE_ZIWEI_HUYEN_KHI_PREVIEW_V01=true, or
 * `?ziweiHuyenKhiPreviewV01=1` (persisted in sessionStorage).
 */
export const HUYEN_KHI_PREVIEW_V01_FEATURE_FLAG = "ziweiHuyenKhiPreviewV01";

export function isHuyenKhiPreviewV01Enabled(): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  if (import.meta.env.VITE_ZIWEI_HUYEN_KHI_PREVIEW_V01 === "false") {
    return false;
  }

  try {
    const params = new URLSearchParams(window.location.search);
    const queryValue = params.get(HUYEN_KHI_PREVIEW_V01_FEATURE_FLAG);

    if (queryValue === "0" || queryValue === "1") {
      window.sessionStorage.setItem(
        HUYEN_KHI_PREVIEW_V01_FEATURE_FLAG,
        queryValue,
      );
    }

    const stored = window.sessionStorage.getItem(
      HUYEN_KHI_PREVIEW_V01_FEATURE_FLAG,
    );

    if (stored === "0") return false;
    if (stored === "1") return true;

    return import.meta.env.VITE_ZIWEI_HUYEN_KHI_PREVIEW_V01 === "true";
  } catch {
    return false;
  }
}
