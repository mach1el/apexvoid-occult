import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import {
  ANNUAL_AXES_V05_FEATURE_FLAG,
  isHuyenKhiPreviewV01Enabled,
  HUYEN_KHI_PREVIEW_V01_FEATURE_FLAG,
  isAnnualAxesV043Enabled,
} from "../feature-flags";

describe("isAnnualAxesV043Enabled", () => {
  it("defaults OFF in non-browser / unset env", () => {
    expect(isAnnualAxesV043Enabled()).toBe(false);
  });
});

describe("isAnnualAxesV05Enabled", () => {
  beforeEach(() => {
    vi.resetModules();
    window.sessionStorage.clear();
    window.history.replaceState({}, "", "/");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("defaults ON in browser with no overrides", async () => {
    const { isAnnualAxesV05Enabled: enabled } = await import("../feature-flags");
    expect(enabled()).toBe(true);
  });

  it("env false always returns false even with query 1", async () => {
    vi.stubEnv("VITE_ZIWEI_ANNUAL_AXES_V05", "false");
    const { isAnnualAxesV05Enabled: enabled } = await import("../feature-flags");
    window.history.replaceState({}, "", `/?${ANNUAL_AXES_V05_FEATURE_FLAG}=1`);
    expect(enabled()).toBe(false);
  });

  it("query 0 persists session rollback", async () => {
    const { isAnnualAxesV05Enabled: enabled, ANNUAL_AXES_V05_FEATURE_FLAG: flag } =
      await import("../feature-flags");
    window.history.replaceState({}, "", `/?${flag}=0`);
    expect(enabled()).toBe(false);
    window.history.replaceState({}, "", "/");
    expect(enabled()).toBe(false);
  });
});

describe("isHuyenKhiPreviewV01Enabled", () => {
  const originalWindow = globalThis.window;

  beforeEach(() => {
    vi.resetModules();
    // Set up a fake window object for DOM environment
    globalThis.window = {
      location: { search: "" },
      sessionStorage: {
        getItem: vi.fn(),
        setItem: vi.fn(),
      }
    } as any;
  });

  afterEach(() => {
    globalThis.window = originalWindow;
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("SSR + env true => false", () => {
    // SSR means window is undefined
    globalThis.window = undefined as any;
    vi.stubEnv("VITE_ZIWEI_HUYEN_KHI_PREVIEW_V01", "true");
    expect(isHuyenKhiPreviewV01Enabled()).toBe(false);
  });

  it("env false + no query => false", () => {
    vi.stubEnv("VITE_ZIWEI_HUYEN_KHI_PREVIEW_V01", "false");
    expect(isHuyenKhiPreviewV01Enabled()).toBe(false);
  });

  it("env false + query 1 => false", () => {
    vi.stubEnv("VITE_ZIWEI_HUYEN_KHI_PREVIEW_V01", "false");
    globalThis.window.location.search = `?${HUYEN_KHI_PREVIEW_V01_FEATURE_FLAG}=1`;
    expect(isHuyenKhiPreviewV01Enabled()).toBe(false);
  });

  it("env true + no override => true", () => {
    vi.stubEnv("VITE_ZIWEI_HUYEN_KHI_PREVIEW_V01", "true");
    (globalThis.window.sessionStorage.getItem as any).mockReturnValue(null);
    expect(isHuyenKhiPreviewV01Enabled()).toBe(true);
  });

  it("env true + query 0 => false", () => {
    vi.stubEnv("VITE_ZIWEI_HUYEN_KHI_PREVIEW_V01", "true");
    globalThis.window.location.search = `?${HUYEN_KHI_PREVIEW_V01_FEATURE_FLAG}=0`;
    (globalThis.window.sessionStorage.getItem as any).mockReturnValue("0");
    expect(isHuyenKhiPreviewV01Enabled()).toBe(false);
    expect(globalThis.window.sessionStorage.setItem).toHaveBeenCalledWith(HUYEN_KHI_PREVIEW_V01_FEATURE_FLAG, "0");
  });

  it("env true + stored 0 => false", () => {
    vi.stubEnv("VITE_ZIWEI_HUYEN_KHI_PREVIEW_V01", "true");
    (globalThis.window.sessionStorage.getItem as any).mockReturnValue("0");
    expect(isHuyenKhiPreviewV01Enabled()).toBe(false);
  });

  it("env true + query 1 => true", () => {
    vi.stubEnv("VITE_ZIWEI_HUYEN_KHI_PREVIEW_V01", "true");
    globalThis.window.location.search = `?${HUYEN_KHI_PREVIEW_V01_FEATURE_FLAG}=1`;
    (globalThis.window.sessionStorage.getItem as any).mockReturnValue("1");
    expect(isHuyenKhiPreviewV01Enabled()).toBe(true);
    expect(globalThis.window.sessionStorage.setItem).toHaveBeenCalledWith(HUYEN_KHI_PREVIEW_V01_FEATURE_FLAG, "1");
  });

  it("env unset + no override => false", () => {
    vi.stubEnv("VITE_ZIWEI_HUYEN_KHI_PREVIEW_V01", ""); // Vitest doesn't have a clear unset, empty string might act as unset, but let's test.
    // Let's actually delete the env var to simulate "unset"
    delete import.meta.env.VITE_ZIWEI_HUYEN_KHI_PREVIEW_V01;
    (globalThis.window.sessionStorage.getItem as any).mockReturnValue(null);
    expect(isHuyenKhiPreviewV01Enabled()).toBe(false);
  });

  it("env unset + query 1 => true", () => {
    delete import.meta.env.VITE_ZIWEI_HUYEN_KHI_PREVIEW_V01;
    globalThis.window.location.search = `?${HUYEN_KHI_PREVIEW_V01_FEATURE_FLAG}=1`;
    (globalThis.window.sessionStorage.getItem as any).mockReturnValue("1");
    expect(isHuyenKhiPreviewV01Enabled()).toBe(true);
    expect(globalThis.window.sessionStorage.setItem).toHaveBeenCalledWith(HUYEN_KHI_PREVIEW_V01_FEATURE_FLAG, "1");
  });

  it("query override persists for the session", () => {
    let storedVal: string | null = null;
    globalThis.window.sessionStorage.setItem = vi.fn((k, v) => { storedVal = v; });
    globalThis.window.sessionStorage.getItem = vi.fn(() => storedVal);
    
    globalThis.window.location.search = `?${HUYEN_KHI_PREVIEW_V01_FEATURE_FLAG}=1`;
    expect(isHuyenKhiPreviewV01Enabled()).toBe(true);
    
    globalThis.window.location.search = "";
    expect(isHuyenKhiPreviewV01Enabled()).toBe(true);
  });
});
