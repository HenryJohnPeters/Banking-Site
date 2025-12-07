import { useState } from "react";

interface AuthFormData {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
  confirmPassword?: string;
}

interface ValidationErrors {
  email?: string;
  password?: string;
  firstName?: string;
  lastName?: string;
  confirmPassword?: string;
  general?: string;
}

interface UseAuthFormOptions {
  isRegister?: boolean;
  initialData?: Partial<AuthFormData>;
}

export const useAuthForm = (options: UseAuthFormOptions = {}) => {
  const { isRegister = false, initialData = {} } = options;

  const [formData, setFormData] = useState<AuthFormData>({
    email: initialData.email || "",
    password: initialData.password || "",
    firstName: initialData.firstName || "",
    lastName: initialData.lastName || "",
    confirmPassword: initialData.confirmPassword || "",
  });

  const [errors, setErrors] = useState<ValidationErrors>({});

  const resetForm = () => {
    setFormData({
      email: "",
      password: "",
      firstName: "",
      lastName: "",
      confirmPassword: "",
    });
    setErrors({});
  };

  const updateField = (field: keyof AuthFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear field-specific error when user starts typing
    if (errors[field as keyof ValidationErrors]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const validateEmail = (email: string): string | undefined => {
    if (!email) return "Email is required";
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) return "Please enter a valid email address";
    return undefined;
  };

  const validatePassword = (password: string): string | undefined => {
    if (!password) return "Password is required";
    if (password.length < 6)
      return "Password must be at least 6 characters long";
    return undefined;
  };

  const validateForm = (): boolean => {
    const newErrors: ValidationErrors = {};

    // Email validation
    const emailError = validateEmail(formData.email);
    if (emailError) newErrors.email = emailError;

    // Password validation
    const passwordError = validatePassword(formData.password);
    if (passwordError) newErrors.password = passwordError;

    // Registration-specific validations
    if (isRegister) {
      if (!formData.firstName?.trim()) {
        newErrors.firstName = "First name is required";
      }

      if (!formData.lastName?.trim()) {
        newErrors.lastName = "Last name is required";
      }

      if (!formData.confirmPassword) {
        newErrors.confirmPassword = "Please confirm your password";
      } else if (formData.password !== formData.confirmPassword) {
        newErrors.confirmPassword = "Passwords do not match";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  return {
    formData,
    errors,
    updateField,
    validateForm,
    resetForm,
    setGeneralError: (error: string) =>
      setErrors((prev) => ({ ...prev, general: error })),
  };
};
