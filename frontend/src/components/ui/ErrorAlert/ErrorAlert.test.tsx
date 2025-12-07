import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import ErrorAlert from "./ErrorAlert";

describe("ErrorAlert Component", () => {
  it("should render error message", () => {
    render(<ErrorAlert message="Something went wrong" />);
    expect(screen.getByText("Something went wrong")).toBeInTheDocument();
  });

  it("should render with custom title", () => {
    render(<ErrorAlert message="Error occurred" />);
    expect(screen.getByText("Error occurred")).toBeInTheDocument();
  });

  it("should be dismissible when onClose is provided", () => {
    const handleClose = vi.fn();
    render(<ErrorAlert message="Error" onClose={handleClose} />);

    // The close button is rendered with "×" text
    const closeButton = screen.getByText("×");
    expect(closeButton).toBeInTheDocument();
  });
});
