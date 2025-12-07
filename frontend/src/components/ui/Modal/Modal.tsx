import React from "react";
import { X } from "lucide-react";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  size?: "sm" | "md" | "lg";
}

const Modal = ({
  isOpen,
  onClose,
  title,
  children,
  size = "md",
}: ModalProps) => {
  if (!isOpen) return null;

  const sizeClasses = {
    sm: "w-80 max-w-sm",
    md: "w-96 max-w-md",
    lg: "w-[32rem] max-w-2xl",
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm overflow-y-auto h-full w-full z-50 flex items-center justify-center p-4">
      <div
        className={`relative bg-white/95 backdrop-blur-md border border-white/20 shadow-2xl shadow-gray-900/20 rounded-2xl mx-auto ${sizeClasses[size]} animate-in fade-in zoom-in-95 duration-300`}
      >
        {/* Header */}
        <div className="flex justify-between items-center p-6 pb-4 border-b border-gray-100/50">
          <h3 className="text-xl font-semibold text-gray-900">{title}</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 hover:bg-gray-100/50 rounded-full p-1.5 transition-all duration-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 pt-4">{children}</div>
      </div>
    </div>
  );
};

export default Modal;
