import { useEffect } from "react";

interface SuccessPopupProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  message: string;
  autoClose?: boolean;
  autoCloseDelay?: number;
}

export default function SuccessPopup({
  isOpen,
  onClose,
  title = "Success!",
  message,
  autoClose = true,
  autoCloseDelay = 3000
}: SuccessPopupProps) {
  useEffect(() => {
    if (isOpen && autoClose) {
      const timer = setTimeout(() => {
        onClose();
      }, autoCloseDelay);

      return () => clearTimeout(timer);
    }
  }, [isOpen, autoClose, autoCloseDelay, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-md w-full mx-4 transform transition-all duration-300 scale-100">
        <div className="p-6">
          {/* Success Icon */}
          <div className="flex items-center justify-center w-16 h-16 mx-auto mb-4 bg-green-100 dark:bg-green-900/30 rounded-full">
            <svg
              className="w-8 h-8 text-green-500 dark:text-green-400"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>

          {/* Title */}
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white text-center mb-2">
            {title}
          </h3>

          {/* Message */}
          <p className="text-gray-600 dark:text-gray-400 text-center mb-6">
            {message}
          </p>

          {/* Close Button */}
          <div className="flex justify-center">
            <button
              onClick={onClose}
              className="bg-green-500 hover:bg-green-600 text-white font-medium py-2.5 px-6 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-green-500/20"
            >
              OK
            </button>
          </div>
        </div>

        {/* Progress Bar (if auto-close is enabled) */}
        {autoClose && (
          <div className="h-1 bg-gray-200 dark:bg-gray-700 rounded-b-xl overflow-hidden">
            <div
              className="h-full bg-green-500 transition-all ease-linear"
              style={{
                animation: `shrink ${autoCloseDelay}ms linear forwards`
              }}
            />
          </div>
        )}
      </div>

      <style jsx>{`
        @keyframes shrink {
          from {
            width: 100%;
          }
          to {
            width: 0%;
          }
        }
      `}</style>
    </div>
  );
}