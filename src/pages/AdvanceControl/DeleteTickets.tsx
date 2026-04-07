import { useState, useEffect } from "react";
import PageMeta from "../../components/common/PageMeta";
import axios from "axios";
import DatePicker from "../../components/form/DatePicker";

interface Event {
  id: number;
  name: string;
  code: string;
}

interface PreviewData {
  event_name: string;
  event_code: string;
  date_range: string;
  total_tickets: number;
  total_revenue: string;
  affected_staff: string[];
  sub_event_breakdown: Array<{
    sub_event__name: string;
    ticket_count: number;
    revenue: string;
  }>;
  entry_type_breakdown: Array<{
    entry_type__name: string;
    ticket_count: number;
    revenue: string;
  }>;
  safety_notes: string[];
}

interface DeletionSummary {
  event_name: string;
  event_code: string;
  date_range: string;
  total_revenue_impact: string;
  affected_staff: Array<{
    username: string;
    staff_code: string;
    tickets_deleted: number;
    revenue_impact: string;
  }>;
  counter_policy: string;
  deletion_timestamp: string;
  tickets_deleted: number;
}

export default function DeleteTickets() {
  const [events, setEvents] = useState<Event[]>([]);
  const [eventId, setEventId] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [preview, setPreview] = useState<PreviewData | null>(null);
  const [deletionSummary, setDeletionSummary] = useState<DeletionSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [step, setStep] = useState<"form" | "preview" | "success" | "no-data">("form");
  const [showDeletingModal, setShowDeletingModal] = useState(false);

  useEffect(() => {
    loadEvents();
  }, []);

  const loadEvents = async () => {
    try {
      const token = localStorage.getItem("access_token");
      const response = await axios.get("https://de.imcbs.com/api/admin/event-list/", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setEvents(response.data);
    } catch (err) {
      console.error("Error loading events:", err);
    }
  };

  const handlePreview = async () => {
    setError("");
    setLoading(true);
    try {
      const token = localStorage.getItem("access_token");
      const response = await axios.post(
        "https://de.imcbs.com/api/admin/tickets/bulk-delete/",
        {
          event_id: parseInt(eventId),
          start_date: startDate,
          end_date: endDate,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      
      // Check if there are no tickets to delete
      if (response.data.preview && response.data.preview.total_tickets === 0) {
        setPreview(null);
        setStep("no-data");
      } else if (response.data.preview) {
        setPreview(response.data.preview);
        setStep("preview");
      } else {
        // If no preview data at all
        setPreview(null);
        setStep("no-data");
      }
    } catch (err: any) {
      // Check if error is about no data found
      if (err.response?.status === 404 || err.response?.data?.error?.includes('No tickets found')) {
        setPreview(null);
        setStep("no-data");
      } else {
        setError(err.response?.data?.error || "Failed to load preview");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmDelete = async () => {
    setError("");
    setLoading(true);
    setShowDeletingModal(true);
    try {
      const token = localStorage.getItem("access_token");
      const response = await axios.delete(
        "https://de.imcbs.com/api/admin/tickets/bulk-delete/",
        {
          headers: { Authorization: `Bearer ${token}` },
          data: {
            event_id: parseInt(eventId),
            start_date: startDate,
            end_date: endDate,
            confirmation_token: "DELETE_TICKETS_CONFIRMED",
          },
        }
      );
      setDeletionSummary(response.data.summary);
      setShowDeletingModal(false);
      setStep("success");
    } catch (err: any) {
      setShowDeletingModal(false);
      setError(err.response?.data?.error || "Failed to delete tickets");
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setStep("form");
    setPreview(null);
    setDeletionSummary(null);
    setEventId("");
    setStartDate("");
    setEndDate("");
    setError("");
  };

  return (
    <>
      <PageMeta title="Delete Tickets | Dreams Entertainment" />
      
      {/* Deleting Modal */}
      {showDeletingModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-99999">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-8 max-w-md w-full mx-4">
            <div className="text-center">
              <div className="flex justify-center mb-4">
                <svg className="animate-spin h-16 w-16 text-red-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                Deleting Tickets...
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                Please wait while we process your request
              </p>
              {/* Progress Bar */}
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5 overflow-hidden">
                <div className="bg-red-600 h-2.5 rounded-full animate-progress"></div>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="p-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
          🗑️ Bulk Delete Tickets
        </h1>

        {/* Safety Warning */}
        {step === "form" && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-6">
            <h3 className="text-red-800 dark:text-red-300 font-semibold mb-2">⚠️ Safety Protections Active</h3>
            <ul className="text-sm text-red-700 dark:text-red-400 space-y-1">
              <li>✓ Cannot delete today's tickets</li>
              <li>✓ Cannot delete yesterday's tickets (safety buffer)</li>
              <li>✓ Two-step confirmation required</li>
              <li>✓ Admin authentication required</li>
            </ul>
          </div>
        )}

        {error && (
          <div className="bg-red-100 dark:bg-red-900/30 border border-red-400 text-red-700 dark:text-red-300 px-4 py-3 rounded mb-6">
            {error}
          </div>
        )}

        {/* Step 1: Form */}
        {step === "form" && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              Step 1: Select Deletion Criteria
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Event
                </label>
                <select
                  value={eventId}
                  onChange={(e) => setEventId(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="">Select Event</option>
                  {events.map((event) => (
                    <option key={event.id} value={event.id}>
                      {event.name} ({event.code})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Start Date
                </label>
                <DatePicker
                  value={startDate}
                  onChange={setStartDate}
                  placeholder="Select start date"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  End Date
                </label>
                <DatePicker
                  value={endDate}
                  onChange={setEndDate}
                  placeholder="Select end date"
                  minDate={startDate}
                />
              </div>

              <button
                onClick={handlePreview}
                disabled={!eventId || !startDate || !endDate || loading}
                className="w-full bg-gray-900 hover:bg-gray-800 disabled:bg-gray-400 dark:bg-white dark:hover:bg-gray-100 dark:disabled:bg-gray-600 text-white dark:text-gray-900 font-semibold py-3 px-6 rounded-lg transition-colors"
              >
                {loading ? "Loading Preview..." : "Preview Deletion"}
              </button>
            </div>
          </div>
        )}

        {/* Step 2: No Data Found */}
        {step === "no-data" && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="text-center py-8">
              <div className="flex justify-center mb-4">
                <img 
                  src="/images/icons/icons8-database-100.gif" 
                  alt="No Data" 
                  className="w-24 h-24"
                />
              </div>
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
                No Data Found
              </h2>
              <p className="text-gray-600 dark:text-gray-400 mb-2">
                No tickets found in the selected date range ({startDate} to {endDate}).
              </p>
              <p className="text-gray-500 dark:text-gray-500 text-sm mb-6">
                This could mean the tickets were already deleted, or no events occurred during this period.
              </p>
              <button
                onClick={handleReset}
                className="bg-gray-900 hover:bg-gray-800 dark:bg-white dark:hover:bg-gray-100 text-white dark:text-gray-900 font-semibold py-3 px-6 rounded-lg transition-colors"
              >
                Try Different Date Range
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Preview */}
        {step === "preview" && preview && (
          <div className="space-y-6">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                Step 2: Review Before Deletion
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                  <p className="text-sm text-gray-600 dark:text-gray-400">Event</p>
                  <p className="text-lg font-semibold text-gray-900 dark:text-white">
                    {preview.event_name} ({preview.event_code})
                  </p>
                </div>
                <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                  <p className="text-sm text-gray-600 dark:text-gray-400">Date Range</p>
                  <p className="text-lg font-semibold text-gray-900 dark:text-white">
                    {preview.date_range}
                  </p>
                </div>
                <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg">
                  <p className="text-sm text-gray-600 dark:text-gray-400">Total Tickets</p>
                  <p className="text-lg font-semibold text-red-600 dark:text-red-400">
                    {preview.total_tickets}
                  </p>
                </div>
                <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg">
                  <p className="text-sm text-gray-600 dark:text-gray-400">Total Revenue Impact</p>
                  <p className="text-lg font-semibold text-red-600 dark:text-red-400">
                    ₹{preview.total_revenue}
                  </p>
                </div>
              </div>



              {/* Entry Type Breakdown */}
              <div className="mb-6">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-3">Entry Type Breakdown</h3>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 dark:bg-gray-700">
                      <tr>
                        <th className="px-4 py-2 text-left text-sm font-medium text-gray-700 dark:text-gray-300">Entry Type</th>
                        <th className="px-4 py-2 text-left text-sm font-medium text-gray-700 dark:text-gray-300">Tickets</th>
                        <th className="px-4 py-2 text-left text-sm font-medium text-gray-700 dark:text-gray-300">Revenue</th>
                      </tr>
                    </thead>
                    <tbody>
                      {preview.entry_type_breakdown.map((item, idx) => (
                        <tr key={idx} className="border-t border-gray-200 dark:border-gray-700">
                          <td className="px-4 py-2 text-sm text-gray-900 dark:text-white">{item.entry_type__name}</td>
                          <td className="px-4 py-2 text-sm text-gray-900 dark:text-white">{item.ticket_count}</td>
                          <td className="px-4 py-2 text-sm text-gray-900 dark:text-white">₹{item.revenue}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>



              {/* Safety Notes */}
              <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 mb-6">
                <h3 className="text-yellow-800 dark:text-yellow-300 font-semibold mb-2">📋 Safety Notes</h3>
                <ul className="text-sm text-yellow-700 dark:text-yellow-400 space-y-1">
                  {preview.safety_notes.map((note, idx) => (
                    <li key={idx}>• {note}</li>
                  ))}
                </ul>
              </div>

              <div className="flex gap-4">
                <button
                  onClick={handleReset}
                  disabled={loading}
                  className="flex-1 bg-gray-500 hover:bg-gray-600 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-semibold py-3 px-6 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmDelete}
                  disabled={loading}
                  className="flex-1 bg-red-600 hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-semibold py-3 px-6 rounded-lg transition-colors"
                >
                  Confirm Delete
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Success */}
        {step === "success" && deletionSummary && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="text-center mb-6">
              <div className="flex justify-center mb-4">
                <img 
                  src="/images/icons/icons8-tick.gif" 
                  alt="Success" 
                  className="w-24 h-24"
                />
              </div>
              <h2 className="text-2xl font-semibold text-green-600 dark:text-green-400 mb-2">
                Deletion Successful
              </h2>
              <p className="text-gray-600 dark:text-gray-400">
                {deletionSummary.tickets_deleted} tickets have been permanently deleted
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                <p className="text-sm text-gray-600 dark:text-gray-400">Event</p>
                <p className="text-lg font-semibold text-gray-900 dark:text-white">
                  {deletionSummary.event_name} ({deletionSummary.event_code})
                </p>
              </div>
              <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                <p className="text-sm text-gray-600 dark:text-gray-400">Date Range</p>
                <p className="text-lg font-semibold text-gray-900 dark:text-white">
                  {deletionSummary.date_range}
                </p>
              </div>
              <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                <p className="text-sm text-gray-600 dark:text-gray-400">Revenue Impact</p>
                <p className="text-lg font-semibold text-gray-900 dark:text-white">
                  ₹{deletionSummary.total_revenue_impact}
                </p>
              </div>
              <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                <p className="text-sm text-gray-600 dark:text-gray-400">Deletion Time</p>
                <p className="text-lg font-semibold text-gray-900 dark:text-white">
                  {new Date(deletionSummary.deletion_timestamp).toLocaleString()}
                </p>
              </div>
            </div>



<button
              onClick={handleReset}
              className="w-full bg-gray-900 hover:bg-gray-800 dark:bg-white dark:hover:bg-gray-100 text-white dark:text-gray-900 font-semibold py-3 px-6 rounded-lg transition-colors"
            >
              Delete More Tickets
            </button>
          </div>
        )}
      </div>
    </>
  );
}
