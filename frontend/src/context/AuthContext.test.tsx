import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import { AuthProvider, useAuth } from "./AuthContext";
import * as authApi from "../api/auth";

// Mock the auth API
vi.mock("../api/auth", () => ({
  authApi: {
    getProfile: vi.fn(),
    login: vi.fn(),
    register: vi.fn(),
    logout: vi.fn(),
  },
}));

const TestComponent = () => {
  const { user, loading } = useAuth();

  if (loading) return <div>Loading...</div>;
  if (user) return <div>Welcome {user.email}</div>;
  return <div>Not logged in</div>;
};

describe("AuthContext", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should show loading state initially", () => {
    vi.mocked(authApi.authApi.getProfile).mockImplementation(
      () => new Promise(() => {}) // Never resolves
    );

    render(
      <BrowserRouter>
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      </BrowserRouter>
    );

    expect(screen.getByText("Loading...")).toBeInTheDocument();
  });

  it("should show user when authenticated", async () => {
    vi.mocked(authApi.authApi.getProfile).mockResolvedValue({
      id: "1",
      email: "test@example.com",
      first_name: "Test",
      last_name: "User",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    render(
      <BrowserRouter>
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("Welcome test@example.com")).toBeInTheDocument();
    });
  });

  it("should show not logged in when no session", async () => {
    vi.mocked(authApi.authApi.getProfile).mockRejectedValue(
      new Error("Unauthorized")
    );

    render(
      <BrowserRouter>
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("Not logged in")).toBeInTheDocument();
    });
  });
});
