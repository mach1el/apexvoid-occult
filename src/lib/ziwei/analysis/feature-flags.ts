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

/**
 * Feature flag for Annual Axes V0.2.
 * Default ON. Kill-switch via VITE_ZIWEI_ANNUAL_AXES_V02=false, or
 * ?ziweiAnnualAxesV02=0 (persisted in sessionStorage) for a per-session
 * opt-out; ?ziweiAnnualAxesV02=1 persists a per-session opt-in override.
 */
export const ANNUAL_AXES_V02_FEATURE_FLAG = "ziweiAnnualAxesV02";

export function isAnnualAxesV02Enabled(): boolean {
  if (import.meta.env.VITE_ZIWEI_ANNUAL_AXES_V02 === "false") {
    return false;
  }
  if (typeof window === "undefined") {
    return true;
  }
  try {
    const params = new URLSearchParams(window.location.search);
    const queryValue = params.get(ANNUAL_AXES_V02_FEATURE_FLAG);
    if (queryValue === "0" || queryValue === "1") {
      window.sessionStorage.setItem(ANNUAL_AXES_V02_FEATURE_FLAG, queryValue);
    }
    const stored = window.sessionStorage.getItem(ANNUAL_AXES_V02_FEATURE_FLAG);
    if (stored === "0") return false;
    if (stored === "1") return true;
    return true;
  } catch {
    return true;
  }
}
