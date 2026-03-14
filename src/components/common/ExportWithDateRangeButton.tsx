import { useState } from 'react';
import ExportDateRangeModal from './ExportDateRangeModal';
import Toast from './Toast';

interface ExportWithDateRangeButtonProps {
  onExport: (startDate: string, endDate: string, includeEventFilter: boolean) => Promise<void>;
  disabled?: boolean;
  className?: string;
  children?: React.ReactNode;
  title: string; // e.g., "Ticket Report", "Revenue Report"
  hasEventFilter?: boolean;
  eventFilterName?: string;
}

export default function ExportWithDateRangeButton({ 
  onExport, 
  disabled = false, 
  className = "",
  children,
  title,
  hasEventFilter = false,
  eventFilterName = ''
}: ExportWithDateRangeButtonProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [toast, setToast] = useState<{
    show: boolean;
    message: string;
    type: 'success' | 'error' | 'info';
  }>({ show: false, message: '', type: 'info' });

  const showToast = (message: string, type: 'success' | 'error' | 'info') => {
    setToast({ show: true, message, type });
  };

  const hideToast = () => {
    setToast(prev => ({ ...prev, show: false }));
  };

  const handleButtonClick = () => {
    if (disabled) return;
    setIsModalOpen(true);
  };

  const handleModalClose = () => {
    if (isExporting) return; // Prevent closing while exporting
    setIsModalOpen(false);
  };

  const handleExport = async (startDate: string, endDate: string, includeEventFilter: boolean) => {
    setIsExporting(true);
    try {
      await onExport(startDate, endDate, includeEventFilter);
      showToast('Excel file downloaded successfully!', 'success');
      setIsModalOpen(false);
    } catch (error) {
      console.error('Export failed:', error);
      showToast('Failed to download Excel file. Please try again.', 'error');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <>
      <button
        onClick={handleButtonClick}
        disabled={disabled}
        className={`inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-green-600 border border-transparent rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors ${className}`}
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        {children || 'Export Excel'}
      </button>

      <ExportDateRangeModal
        isOpen={isModalOpen}
        onClose={handleModalClose}
        onExport={handleExport}
        title={title}
        isLoading={isExporting}
        hasEventFilter={hasEventFilter}
        eventFilterName={eventFilterName}
      />
      
      <Toast
        message={toast.message}
        type={toast.type}
        show={toast.show}
        onClose={hideToast}
      />
    </>
  );
}