import { apiClient } from "./client";
import {
  LoginRequest,
  RegisterRequest,
  AuthResponse,
  User,
} from "../models/User";

export const authApi = {
  register: async (data: RegisterRequest): Promise<AuthResponse> => {
    const response = await apiClient.post("/auth/register", data);
    return response.data;
  },

  login: async (data: LoginRequest): Promise<AuthResponse> => {
    const response = await apiClient.post("/auth/login", data);
    return response.data;
  },

  getProfile: async (): Promise<User> => {
    const response = await apiClient.get("/auth/profile");
    return response.data;
  },

  logout: async (): Promise<void> => {
    await apiClient.post("/auth/logout");
  },
};
