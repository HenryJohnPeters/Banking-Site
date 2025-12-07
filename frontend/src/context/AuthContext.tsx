import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import { User, LoginRequest, RegisterRequest } from "../models/User";
import { authApi } from "../api/auth";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (data: LoginRequest) => Promise<void>;
  register: (data: RegisterRequest) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      try {
        // Try to get user profile from the server to verify session
        // This relies solely on the httpOnly cookie for authentication
        const profile = await authApi.getProfile();
        setUser(profile);
      } catch {
        // Session is invalid or doesn't exist
        console.log("No valid session found");
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    initAuth();
  }, []);

  const login = async (data: LoginRequest) => {
    try {
      const response = await authApi.login(data);
      // Only store user data in React state, no localStorage
      // Authentication is handled via httpOnly cookies
      setUser(response.user);
    } catch (error) {
      // Re-throw the error so the login component can handle it
      throw error;
    }
  };

  const register = async (data: RegisterRequest) => {
    try {
      const response = await authApi.register(data);
      // Only store user data in React state, no localStorage
      // Authentication is handled via httpOnly cookies
      setUser(response.user);
    } catch (error) {
      // Re-throw the error so the register component can handle it
      throw error;
    }
  };

  const logout = async () => {
    try {
      // Call logout endpoint to clear the httpOnly cookie
      await authApi.logout();
      console.log("Logged out successfully");
    } catch (error) {
      // Ignore errors during logout but log them
      console.log("Logout API call failed, but clearing local state", error);
    } finally {
      // Clear user data from React state only
      setUser(null);
    }
  };

  const value = {
    user,
    loading,
    login,
    register,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
