/**
 * Feature flag for palace-overview V1.
 * Default OFF. Enable via VITE_ZIWEI_PALACE_OVERVIEW_V1=true
 * or ?ziweiPalaceOverviewV1=1 (persisted in sessionStorage).
 */
export const PALACE_OVERVIEW_FEATURE_FLAG = "ziweiPalaceOverviewV1";

export function isPalaceOverviewV1Enabled(): boolean {
  if (import.meta.env.VITE_ZIWEI_PALACE_OVERVIEW_V1 === "true") {
    return true;
  }
  if (typeof window === "undefined") {
    return false;
  }
  try {
    const params = new URLSearchParams(window.location.search);
    if (params.get(PALACE_OVERVIEW_FEATURE_FLAG) === "1") {
      window.sessionStorage.setItem(PALACE_OVERVIEW_FEATURE_FLAG, "1");
    }
    return window.sessionStorage.getItem(PALACE_OVERVIEW_FEATURE_FLAG) === "1";
  } catch {
    return false;
  }
}
