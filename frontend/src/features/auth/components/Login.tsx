import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../../context/AuthContext";
import FormField from "../../../components/ui/FormField/FormField";
import ErrorAlert from "../../../components/ui/ErrorAlert/ErrorAlert";
import Button from "../../../components/ui/Button/Button";
import { useAuthForm } from "../hooks/useAuthForm";

const Login = () => {
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const { formData, errors, updateField, validateForm, setGeneralError } =
    useAuthForm({ isRegister: false });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setLoading(true);

    try {
      await login({
        email: formData.email,
        password: formData.password,
      });
      navigate("/dashboard");
    } catch (err: any) {
      setGeneralError(
        err.response?.data?.message || "Login failed. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-blue-50 via-white to-cyan-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full">
        {/* Logo/Brand Section */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-linear-to-r from-blue-600 to-cyan-600 rounded-xl shadow-lg mb-4">
            <span className="text-2xl font-bold text-white">🏦</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Welcome Back
          </h1>
          <p className="text-gray-600">Sign in to your banking account</p>
        </div>

        {/* Main Card */}
        <div className="bg-white/70 backdrop-blur-sm border border-white/20 rounded-2xl shadow-xl shadow-blue-100/50 p-8">
          <form className="space-y-6" onSubmit={handleSubmit}>
            {errors.general && <ErrorAlert message={errors.general} />}

            <div className="space-y-5">
              <FormField
                label=""
                type="email"
                value={formData.email}
                onChange={(value) => updateField("email", value)}
                placeholder="Email address"
                required
                error={errors.email}
              />

              <FormField
                label=""
                type="password"
                value={formData.password}
                onChange={(value) => updateField("password", value)}
                placeholder="Password"
                required
                error={errors.password}
              />
            </div>

            <Button type="submit" loading={loading} className="w-full">
              Sign In
            </Button>

            <div className="text-center">
              <p className="text-sm text-gray-600">
                Don't have an account?{" "}
                <Link
                  to="/register"
                  className="font-medium text-blue-600 hover:text-blue-500 transition-colors"
                >
                  Create one here
                </Link>
              </p>
            </div>
          </form>
        </div>

        {/* Demo Info */}
        <div className="mt-6 bg-blue-50/50 backdrop-blur-sm border border-blue-100 rounded-xl p-4 text-center">
          <p className="text-sm font-medium text-blue-900 mb-1">Demo Account</p>
          <p className="text-xs text-blue-700">alice@example.com</p>
          <p className="text-xs text-blue-700 font-mono">
            Password: password123
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
