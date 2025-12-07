import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import LoadingSpinner from "./LoadingSpinner";

describe("LoadingSpinner Component", () => {
  it("should render loading spinner", () => {
    const { container } = render(<LoadingSpinner />);
    expect(container.querySelector(".animate-spin")).toBeInTheDocument();
  });

  it("should render with custom size", () => {
    const { container } = render(<LoadingSpinner size="lg" />);
    expect(container.firstChild).toBeInTheDocument();
  });
});
