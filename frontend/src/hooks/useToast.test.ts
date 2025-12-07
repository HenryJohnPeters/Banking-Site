import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { useToast } from "./useToast";

describe("useToast", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  it("should initialize with empty toasts", () => {
    const { result } = renderHook(() => useToast());
    expect(result.current.toasts).toEqual([]);
  });

  it("should add a toast", () => {
    const { result } = renderHook(() => useToast());

    act(() => {
      result.current.showToast("Test message");
    });

    expect(result.current.toasts).toHaveLength(1);
    expect(result.current.toasts[0].message).toBe("Test message");
    expect(result.current.toasts[0].type).toBe("info");
  });

  it("should add toast with custom type", () => {
    const { result } = renderHook(() => useToast());

    act(() => {
      result.current.showToast("Success message", { type: "success" });
    });

    expect(result.current.toasts[0].type).toBe("success");
  });

  it("should dismiss a toast", () => {
    const { result } = renderHook(() => useToast());

    act(() => {
      result.current.showToast("Test message");
    });

    const toastId = result.current.toasts[0].id;

    act(() => {
      result.current.dismissToast(toastId);
    });

    expect(result.current.toasts).toHaveLength(0);
  });

  it("should auto-dismiss toast after default duration", () => {
    const { result } = renderHook(() => useToast(5, 5000));

    act(() => {
      result.current.showToast("Auto-dismiss message");
    });

    expect(result.current.toasts).toHaveLength(1);

    act(() => {
      vi.advanceTimersByTime(5000);
    });

    expect(result.current.toasts).toHaveLength(0);
  });

  it("should respect custom duration", () => {
    const { result } = renderHook(() => useToast(5, 5000));

    act(() => {
      result.current.showToast("Custom duration", { duration: 3000 });
    });

    expect(result.current.toasts).toHaveLength(1);

    act(() => {
      vi.advanceTimersByTime(2999);
    });

    expect(result.current.toasts).toHaveLength(1);

    act(() => {
      vi.advanceTimersByTime(1);
    });

    expect(result.current.toasts).toHaveLength(0);
  });

  it("should limit toasts to maxToasts", () => {
    const { result } = renderHook(() => useToast(3, 5000));

    act(() => {
      result.current.showToast("Toast 1");
      result.current.showToast("Toast 2");
      result.current.showToast("Toast 3");
      result.current.showToast("Toast 4");
    });

    expect(result.current.toasts).toHaveLength(3);
    expect(result.current.toasts[0].message).toBe("Toast 2");
    expect(result.current.toasts[2].message).toBe("Toast 4");
  });

  it("should clear all toasts", () => {
    const { result } = renderHook(() => useToast());

    act(() => {
      result.current.showToast("Toast 1");
      result.current.showToast("Toast 2");
      result.current.showToast("Toast 3");
    });

    expect(result.current.toasts).toHaveLength(3);

    act(() => {
      result.current.clearAllToasts();
    });

    expect(result.current.toasts).toHaveLength(0);
  });

  it("should not auto-dismiss when duration is 0", () => {
    const { result } = renderHook(() => useToast(5, 5000));

    act(() => {
      result.current.showToast("No auto-dismiss", { duration: 0 });
    });

    expect(result.current.toasts).toHaveLength(1);

    act(() => {
      vi.advanceTimersByTime(10000);
    });

    expect(result.current.toasts).toHaveLength(1);
  });

  it("should generate unique IDs for each toast", () => {
    const { result } = renderHook(() => useToast());

    act(() => {
      result.current.showToast("Toast 1");
      result.current.showToast("Toast 2");
    });

    const ids = result.current.toasts.map((t) => t.id);
    expect(ids[0]).not.toBe(ids[1]);
    expect(new Set(ids).size).toBe(2);
  });
});
