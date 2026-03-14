import { useState } from 'react';
import DatePicker from '../form/DatePicker';

interface ExportDateRangeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onExport: (startDate: string, endDate: string, includeEventFilter: boolean) => void;
  title: string;
  isLoading?: boolean;
  hasEventFilter?: boolean;
  eventFilterName?: string;
}

export default function ExportDateRangeModal({
  isOpen,
  onClose,
  onExport,
  title,
  isLoading = false,
  hasEventFilter = false,
  eventFilterName = ''
}: ExportDateRangeModalProps) {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [includeEventFilter, setIncludeEventFilter] = useState(true);

  const handleExport = () => {
    onExport(startDate, endDate, includeEventFilter);
  };

  const handleClearDates = () => {
    setStartDate('');
    setEndDate('');
  };

  const handleClose = () => {
    setStartDate('');
    setEndDate('');
    setIncludeEventFilter(true);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black bg-opacity-50 transition-opacity" onClick={handleClose}></div>
      
      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Export {title}
            </h3>
            <button
              onClick={handleClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              disabled={isLoading}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Content */}
          <div className="p-6">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
              Select a date range to export data. Leave empty to export all data.
            </p>

            <div className="space-y-4">
              {hasEventFilter && eventFilterName && (
                <div>
                  <label className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      checked={includeEventFilter}
                      onChange={(e) => setIncludeEventFilter(e.target.checked)}
                      className="w-4 h-4 text-brand-600 bg-gray-100 border-gray-300 rounded focus:ring-brand-500 dark:focus:ring-brand-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                      disabled={isLoading}
                    />
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Include current event filter: <strong>{eventFilterName}</strong>
                    </span>
                  </label>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 ml-7">
                    Uncheck to export data from all events within the date range
                  </p>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Start Date (Optional)
                </label>
                <DatePicker
                  value={startDate}
                  onChange={setStartDate}
                  placeholder="Select start date"
                  maxDate={endDate || undefined}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  End Date (Optional)
                </label>
                <DatePicker
                  value={endDate}
                  onChange={setEndDate}
                  placeholder="Select end date"
                  minDate={startDate || undefined}
                />
              </div>

              {(startDate || endDate || (hasEventFilter && !includeEventFilter)) && (
                <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <div className="text-sm text-blue-700 dark:text-blue-300">
                    <strong>Export will include:</strong>
                    <ul className="mt-1 space-y-1">
                      {!includeEventFilter && hasEventFilter && (
                        <li>• All events (event filter ignored)</li>
                      )}
                      {includeEventFilter && hasEventFilter && eventFilterName && (
                        <li>• Only {eventFilterName}</li>
                      )}
                      {startDate && endDate && (
                        <li>• Date range: {startDate} to {endDate}</li>
                      )}
                      {startDate && !endDate && (
                        <li>• From {startDate} onwards</li>
                      )}
                      {!startDate && endDate && (
                        <li>• Until {endDate}</li>
                      )}
                      {!startDate && !endDate && (
                        <li>• All dates</li>
                      )}
                    </ul>
                  </div>
                  <button
                    onClick={handleClearDates}
                    className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 text-sm font-medium mt-2"
                    disabled={isLoading}
                  >
                    Reset all filters
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 dark:border-gray-700">
            <button
              onClick={handleClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-500 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-600"
              disabled={isLoading}
            >
              Cancel
            </button>
            <button
              onClick={handleExport}
              disabled={isLoading}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-green-600 border border-transparent rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isLoading ? (
                <>
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Exporting...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Export Excel
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}