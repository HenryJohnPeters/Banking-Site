import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";

export const apiClient = axios.create({
  baseURL: `${API_URL}/api`,
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true, // Enable sending cookies with requests
});

// Track requests for global loading state
let requestInterceptor: number;
let responseInterceptor: number;

// Initialize interceptors with loading context
export const initializeInterceptors = (
  incrementRequests: () => void,
  decrementRequests: () => void,
  setGlobalError: (error: string | null) => void
) => {
  // Remove existing interceptors if any
  if (requestInterceptor !== undefined) {
    apiClient.interceptors.request.eject(requestInterceptor);
  }
  if (responseInterceptor !== undefined) {
    apiClient.interceptors.response.eject(responseInterceptor);
  }

  // Request interceptor - track loading state
  requestInterceptor = apiClient.interceptors.request.use(
    (config) => {
      incrementRequests();
      return config;
    },
    (error) => {
      decrementRequests();
      return Promise.reject(error);
    }
  );

  // Response interceptor - handle errors globally
  responseInterceptor = apiClient.interceptors.response.use(
    (response) => {
      decrementRequests();
      return response;
    },
    (error) => {
      decrementRequests();

      // Handle specific error cases
      if (error.code === "ERR_NETWORK") {
        setGlobalError(
          "Network error. Please check your internet connection and try again."
        );
      } else if (error.response?.status === 500) {
        setGlobalError(
          "Server error. Please try again later or contact support."
        );
      } else if (error.response?.status === 503) {
        setGlobalError("Service temporarily unavailable. Please try again.");
      }
      // Let component-level errors handle 400-level errors (validation, etc.)

      return Promise.reject(error);
    }
  );
};
