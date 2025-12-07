import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../../context/AuthContext";
import { useToast } from "../../../hooks/useToast";
import { ToastContainer } from "../../../components/ui/Toast/Toast";
import FormField from "../../../components/ui/FormField/FormField";
import ErrorAlert from "../../../components/ui/ErrorAlert/ErrorAlert";
import Button from "../../../components/ui/Button/Button";
import { useAuthForm } from "../hooks/useAuthForm";

const Register = () => {
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();
  const { toasts, showToast, dismissToast } = useToast();

  const { formData, errors, updateField, validateForm, setGeneralError } =
    useAuthForm({ isRegister: true });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setLoading(true);

    try {
      await register({
        email: formData.email,
        password: formData.password,
        first_name: formData.firstName!,
        last_name: formData.lastName!,
      });
      showToast("Account created successfully! Welcome aboard! 🎉", {
        type: "success",
      });
      navigate("/dashboard");
    } catch (err: any) {
      const errorMessage =
        err.response?.data?.message || "Registration failed. Please try again.";
      setGeneralError(errorMessage);
      showToast(errorMessage, { type: "error" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-blue-50 via-white to-cyan-50 py-12 px-4 sm:px-6 lg:px-8">
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />

      <div className="max-w-md w-full">
        {/* Logo/Brand Section */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-linear-to-r from-blue-600 to-cyan-600 rounded-xl shadow-lg mb-4">
            <span className="text-2xl font-bold text-white">🏦</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Join Us Today
          </h1>
          <p className="text-gray-600">Create your new banking account</p>
        </div>

        {/* Main Card */}
        <div className="bg-white/70 backdrop-blur-sm border border-white/20 rounded-2xl shadow-xl shadow-blue-100/50 p-8">
          <form className="space-y-6" onSubmit={handleSubmit}>
            {errors.general && <ErrorAlert message={errors.general} />}

            <div className="space-y-5">
              <div className="grid grid-cols-2 gap-3">
                <FormField
                  label=""
                  value={formData.firstName || ""}
                  onChange={(value) => updateField("firstName", value)}
                  placeholder="First name"
                  required
                  error={errors.firstName}
                />
                <FormField
                  label=""
                  value={formData.lastName || ""}
                  onChange={(value) => updateField("lastName", value)}
                  placeholder="Last name"
                  required
                  error={errors.lastName}
                />
              </div>

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

              <FormField
                label=""
                type="password"
                value={formData.confirmPassword || ""}
                onChange={(value) => updateField("confirmPassword", value)}
                placeholder="Confirm Password"
                required
                error={errors.confirmPassword}
              />
            </div>

            <Button type="submit" loading={loading} className="w-full">
              Create Account
            </Button>

            <div className="text-center">
              <p className="text-sm text-gray-600">
                Already have an account?{" "}
                <Link
                  to="/login"
                  className="font-medium text-blue-600 hover:text-blue-500 transition-colors"
                >
                  Sign in here
                </Link>
              </p>
            </div>
          </form>
        </div>

        {/* Benefits Info */}
        <div className="mt-6 bg-green-50/50 backdrop-blur-sm border border-green-100 rounded-xl p-4 text-center">
          <p className="text-sm font-medium text-green-900 mb-1">
            🎉 Welcome Bonus
          </p>
          <p className="text-xs text-green-700">
            New accounts receive $1,000 USD + €500 EUR to get started!
          </p>
        </div>
      </div>
    </div>
  );
};

export default Register;
