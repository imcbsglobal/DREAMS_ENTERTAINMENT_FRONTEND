import { useState, useEffect } from "react";
import axios from "axios";
import Label from "../form/Label";
import Input from "../form/input/InputField";
import DatePicker from "../form/date-picker";

interface EditEventModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (updatedEvent: any) => void;
  eventId: number | null;
}

export default function EditEventModal({ isOpen, onClose, onSuccess, eventId }: EditEventModalProps) {
  const [formData, setFormData] = useState({
    name: "",
    place: "",
    address: "",
    start_date: "",
    end_date: ""
  });
  const [loading, setLoading] = useState(false);
  const [fetchLoading, setFetchLoading] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (isOpen && eventId) {
      fetchEventData();
    }
  }, [isOpen, eventId]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }

    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  const fetchEventData = async () => {
    setFetchLoading(true);
    try {
      const token = localStorage.getItem("access_token");
      const response = await axios.get(`https://de.imcbs.com/api/admin/event-detail/${eventId}/`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      const event = response.data;
      setFormData({
        name: event.name || "",
        place: event.place || "",
        address: event.address || "",
        start_date: event.start_date || "",
        end_date: event.end_date || ""
      });
    } catch (err: any) {
      setMessage(err.response?.data?.error || "Failed to fetch event data");
    } finally {
      setFetchLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    // Validate all required fields
    if (!formData.name.trim()) {
      setMessage("Event name is required");
      setLoading(false);
      return;
    }
    
    if (!formData.place.trim()) {
      setMessage("Venue/Place is required");
      setLoading(false);
      return;
    }
    
    if (!formData.address.trim()) {
      setMessage("Address is required");
      setLoading(false);
      return;
    }

    if (!formData.start_date || !formData.end_date) {
      setMessage("Please select both start and end dates");
      setLoading(false);
      return;
    }
    
    // Validate date order
    if (new Date(formData.start_date) >= new Date(formData.end_date)) {
      setMessage("End date must be after start date");
      setLoading(false);
      return;
    }

    try {
      const token = localStorage.getItem("access_token");
      const response = await axios.put(`https://de.imcbs.com/api/admin/update-event/${eventId}/`, formData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      onSuccess(response.data);
      onClose();
    } catch (err: any) {
      setMessage(err.response?.data?.error || "Failed to update event");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
        <div 
          className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity dark:bg-gray-900 dark:bg-opacity-75"
          onClick={onClose}
        />
        
        <div className="relative transform overflow-hidden rounded-lg bg-white dark:bg-gray-800 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-2xl">
          {/* Header */}
          <div className="bg-white dark:bg-gray-800 px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Edit Event
              </h3>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="bg-white dark:bg-gray-800 px-6 py-4 max-h-96 overflow-y-auto">
            {fetchLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="text-gray-500 dark:text-gray-400">Loading event data...</div>
              </div>
            ) : (
              <>
                {message && (
                  <div className="p-3 text-sm rounded-lg mb-4 text-red-600 bg-red-50 border border-red-200 dark:bg-red-900/20 dark:border-red-800 dark:text-red-400">
                    {message}
                  </div>
                )}
                
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <Label htmlFor="name">Event Name *</Label>
                    <Input
                      type="text"
                      id="name"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      placeholder="Enter event name"
                      required
                      disabled={loading}
                    />
                  </div>

                  <div>
                    <Label htmlFor="place">Venue/Place *</Label>
                    <Input
                      type="text"
                      id="place"
                      name="place"
                      value={formData.place}
                      onChange={handleInputChange}
                      placeholder="Enter venue or place"
                      required
                      disabled={loading}
                    />
                  </div>

                  <div>
                    <Label htmlFor="address">Full Address *</Label>
                    <Input
                      type="text"
                      id="address"
                      name="address"
                      value={formData.address}
                      onChange={handleInputChange}
                      placeholder="Enter full address"
                      required
                      disabled={loading}
                    />
                  </div>

                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div>
                      <Label htmlFor="start_date">Start Date *</Label>
                      <DatePicker
                        id="start_date"
                        placeholder="Select start date"
                        defaultDate={formData.start_date}
                        onChange={(selectedDates, dateStr) => {
                          setFormData(prev => ({
                            ...prev,
                            start_date: dateStr
                          }));
                        }}
                      />
                    </div>

                    <div>
                      <Label htmlFor="end_date">End Date *</Label>
                      <DatePicker
                        id="end_date"
                        placeholder="Select end date"
                        defaultDate={formData.end_date}
                        onChange={(selectedDates, dateStr) => {
                          setFormData(prev => ({
                            ...prev,
                            end_date: dateStr
                          }));
                        }}
                      />
                    </div>
                  </div>
                </form>
              </>
            )}
          </div>

          {/* Footer */}
          <div className="bg-gray-50 dark:bg-gray-700 px-6 py-3 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-600 border border-gray-300 dark:border-gray-500 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-500"
            >
              Cancel
            </button>
            <button
              type="submit"
              onClick={handleSubmit}
              disabled={loading || fetchLoading}
              className="px-4 py-2 text-sm font-medium text-white bg-brand-500 hover:bg-brand-600 disabled:bg-brand-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500/20"
            >
              {loading ? "Updating..." : "Update Event"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}