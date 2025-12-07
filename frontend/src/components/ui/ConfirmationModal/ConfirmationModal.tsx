import Modal from "../Modal/Modal";
import Button from "../Button/Button";

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  details?: Array<{ label: string; value: string }>;
  confirmText?: string;
  cancelText?: string;
  isLoading?: boolean;
}

const ConfirmationModal = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  details = [],
  confirmText = "Confirm",
  cancelText = "Cancel",
  isLoading = false,
}: ConfirmationModalProps) => {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} size="md">
      <div className="space-y-6">
        {/* Message */}
        <p className="text-gray-700">{message}</p>

        {/* Transaction Details */}
        {details.length > 0 && (
          <div className="bg-gray-50 rounded-lg p-4 space-y-3">
            {details.map((detail, index) => (
              <div key={index} className="flex justify-between items-center">
                <span className="text-sm text-gray-600">{detail.label}:</span>
                <span className="text-sm font-semibold text-gray-900">
                  {detail.value}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Warning */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
          <p className="text-sm text-yellow-800">
            ⚠️ This action cannot be undone. Please verify all details before
            confirming.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 pt-2">
          <Button
            variant="secondary"
            onClick={onClose}
            disabled={isLoading}
            className="flex-1"
          >
            {cancelText}
          </Button>
          <Button
            variant="primary"
            onClick={onConfirm}
            loading={isLoading}
            className="flex-1"
          >
            {confirmText}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default ConfirmationModal;
