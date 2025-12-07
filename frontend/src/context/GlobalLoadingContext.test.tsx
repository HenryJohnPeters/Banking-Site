import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import {
  GlobalLoadingProvider,
  useGlobalLoading,
} from "./GlobalLoadingContext";

const TestComponent = () => {
  const { isLoading, requestsInFlight, showToast } = useGlobalLoading();

  return (
    <div>
      <div>Loading: {isLoading ? "Yes" : "No"}</div>
      <div>Requests: {requestsInFlight}</div>
      <button onClick={() => showToast("Test message", "success")}>
        Show Toast
      </button>
    </div>
  );
};

describe("GlobalLoadingContext", () => {
  it("should initialize with no loading state", () => {
    render(
      <GlobalLoadingProvider>
        <TestComponent />
      </GlobalLoadingProvider>
    );

    expect(screen.getByText("Loading: No")).toBeInTheDocument();
    expect(screen.getByText("Requests: 0")).toBeInTheDocument();
  });

  it("should provide loading context to children", () => {
    render(
      <GlobalLoadingProvider>
        <TestComponent />
      </GlobalLoadingProvider>
    );

    expect(screen.getByText("Show Toast")).toBeInTheDocument();
  });

  it("should throw error when used outside provider", () => {
    // Suppress console.error for this test
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});

    expect(() => render(<TestComponent />)).toThrow(
      "useGlobalLoading must be used within a GlobalLoadingProvider"
    );

    consoleError.mockRestore();
  });
});
