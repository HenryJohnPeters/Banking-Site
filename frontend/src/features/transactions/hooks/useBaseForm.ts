import { useState } from "react";

export interface BaseFormData {
  from_account_id: string;
  to_account_id: string;
  amount?: string;
  from_amount?: string;
  description: string;
}

export interface ValidationErrors {
  from_account_id?: string;
  to_account_id?: string;
  amount?: string;
  from_amount?: string;
  description?: string;
  general?: string;
}

export interface ValidationRule<T = any> {
  field: keyof BaseFormData;
  validator: (
    value: any,
    formData: BaseFormData,
    context?: T
  ) => string | undefined;
}

export const useBaseForm = <T extends BaseFormData, C = any>(
  initialData: T,
  validationRules: ValidationRule<C>[] = [],
  context?: C
) => {
  const [formData, setFormData] = useState<T>(initialData);
  const [errors, setErrors] = useState<ValidationErrors>({});

  const resetForm = () => {
    setFormData(initialData);
    setErrors({});
  };

  const updateField = (field: keyof T, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));

    // Clear field-specific error when user starts typing
    if (errors[field as keyof ValidationErrors]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: ValidationErrors = {};

    validationRules.forEach(({ field, validator }) => {
      const error = validator(formData[field], formData, context);
      if (error) {
        newErrors[field as keyof ValidationErrors] = error;
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const setGeneralError = (error: string) => {
    setErrors((prev) => ({ ...prev, general: error }));
  };

  return {
    formData,
    errors,
    updateField,
    validateForm,
    resetForm,
    setGeneralError,
  };
};
