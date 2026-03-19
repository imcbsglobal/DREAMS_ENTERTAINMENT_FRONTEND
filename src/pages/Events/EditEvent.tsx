import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router";
import axios from "axios";
import flatpickr from "flatpickr";
import PageMeta from "../../components/common/PageMeta";
import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import ComponentCard from "../../components/common/ComponentCard";
import Label from "../../components/form/Label";
import Input from "../../components/form/input/InputField";

export default function EditEvent() {
  const navigate = useNavigate();
  const location = useLocation();
  const eventId = location.state?.eventId;
  
  const [formData, setFormData] = useState({
    name: "",
    place: "",
    address: "",
    start_date: "",
    end_date: ""
  });
  const [selectedSubEvents, setSelectedSubEvents] = useState<string[]>([]);
  const [currentSubEvents, setCurrentSubEvents] = useState<string[]>([]);
  const [availableSubEvents, setAvailableSubEvents] = useState<string[]>([]);
  const [enableSubEventUpdate, setEnableSubEventUpdate] = useState(false);
  const [loading, setLoading] = useState(false);
  const [fetchingEvent, setFetchingEvent] = useState(true);
  const [loadingSubEvents, setLoadingSubEvents] = useState(true);
  const [message, setMessage] = useState("");
  const [warnings, setWarnings] = useState([]);

  // Load predefined sub-events from backend
  const loadPredefinedSubEvents = async () => {
    try {
      setLoadingSubEvents(true);
      const token = localStorage.getItem("access_token");
      
      const response = await axios.get("https://de.imcbs.com/api/admin/master-sub-events/", {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      console.log("=== MASTER SUB-EVENTS LOADED ===");
      console.log("Master sub-events data:", response.data);
      
      // Filter active sub-events and extract names
      const activeSubEvents = response.data
        .filter(item => item.is_active)
        .map(item => item.name);
      
      console.log("Available active sub-events:", activeSubEvents);
      setAvailableSubEvents(activeSubEvents);
    } catch (error: any) {
      console.error("Failed to load master sub-events:", error);
      setAvailableSubEvents([]);
    } finally {
      setLoadingSubEvents(false);
    }
  };

  const fetchEvent = async () => {
    try {
      const token = localStorage.getItem("access_token");
      
      // Fetch event details
      const response = await axios.get(`https://de.imcbs.com/api/admin/event-list/`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      const event = response.data.find(e => e.id === parseInt(eventId));
      if (!event) {
        setMessage("Event not found");
        return;
      }
      
      setFormData({
        name: event.name || "",
        place: event.place || "",
        address: event.address || "",
        start_date: event.start_date || "",
        end_date: event.end_date || ""
      });

      // Fetch current sub-events for this event
      try {
        console.log('Fetching sub-events for event ID:', eventId);
        const subEventsResponse = await axios.get(`https://de.imcbs.com/api/admin/sub-events/${eventId}/`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        console.log('Sub-events API response:', subEventsResponse.data);
        const currentSubEventNames = subEventsResponse.data.map(se => se.name);
        console.log('Current sub-event names from API:', currentSubEventNames);
        
        setCurrentSubEvents(currentSubEventNames);
        setSelectedSubEvents(currentSubEventNames); // Pre-select current sub-events
      } catch (subEventError) {
        console.log("Error fetching sub-events:", subEventError);
        console.log("Sub-event error response:", subEventError.response?.data);
        setCurrentSubEvents([]);
        setSelectedSubEvents([]);
      }
      
    } catch (err: any) {
      setMessage(err.response?.data?.error || "Failed to fetch event details");
    }
  };

  useEffect(() => {
    if (!eventId) {
      setMessage("No event ID provided");
      setFetchingEvent(false);
      return;
    }

    // Load data sequentially to avoid race conditions
    const initializeData = async () => {
      try {
        // First load available sub-events
        await loadPredefinedSubEvents();
        // Then load event details and current sub-events
        await fetchEvent();
      } catch (error) {
        console.error('Failed to initialize data:', error);
      } finally {
        setFetchingEvent(false);
      }
    };

    initializeData();
  }, [eventId]);

  // Initialize date pickers after form data is loaded
  useEffect(() => {
    if (!fetchingEvent && formData.start_date && formData.end_date) {
      // Initialize start date picker
      const startDatePicker = flatpickr("#start_date", {
        dateFormat: "Y-m-d",
        defaultDate: formData.start_date,
        onChange: (selectedDates, dateStr) => {
          setFormData(prev => ({ ...prev, start_date: dateStr }));
        }
      });

      // Initialize end date picker
      const endDatePicker = flatpickr("#end_date", {
        dateFormat: "Y-m-d",
        defaultDate: formData.end_date,
        minDate: formData.start_date, // End date should be after start date
        onChange: (selectedDates, dateStr) => {
          setFormData(prev => ({ ...prev, end_date: dateStr }));
        }
      });

      // Update end date picker's minDate when start date changes
      const startInput = document.getElementById("start_date") as HTMLInputElement;
      if (startInput) {
        const handleStartDateChange = (e: Event) => {
          const target = e.target as HTMLInputElement;
          endDatePicker.set('minDate', target.value);
        };
        startInput.addEventListener('change', handleStartDateChange);
        
        // Cleanup function
        return () => {
          startInput.removeEventListener('change', handleStartDateChange);
          startDatePicker.destroy();
          endDatePicker.destroy();
        };
      }

      // Cleanup function if startInput is not found
      return () => {
        startDatePicker.destroy();
        endDatePicker.destroy();
      };
    }
  }, [fetchingEvent, formData.start_date, formData.end_date]);

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
    setWarnings([]);

    try {
      const token = localStorage.getItem("access_token");
      
      // Prepare the update payload
      const updateData = {
        name: formData.name,
        place: formData.place,
        address: formData.address,
        start_date: formData.start_date,
        end_date: formData.end_date
      };

      // Include sub-events only if update is enabled
      if (enableSubEventUpdate) {
        updateData.selected_sub_events = selectedSubEvents;
        console.log('Updating event with sub-events:', updateData);
      } else {
        console.log('Updating event details only (sub-events disabled):', updateData);
      }

      console.log('Full API request payload:', JSON.stringify(updateData, null, 2));
      console.log('Event ID being updated:', eventId);
      console.log('API endpoint:', `https://de.imcbs.com/api/admin/update-event/${eventId}/`);

      const response = await axios.put(`https://de.imcbs.com/api/admin/update-event/${eventId}/`, updateData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      console.log('API Response:', response.data);
      
      setMessage("success");
      if (response.data.warnings && response.data.warnings.length > 0) {
        setWarnings(response.data.warnings);
        console.log('API Warnings:', response.data.warnings);
      }
      
      // Log success details
      console.log('Event updated successfully!');
      console.log('Sub-events that were sent:', selectedSubEvents);
      
      setTimeout(() => navigate("/ongoing-events"), 2000);
    } catch (err: any) {
      console.error('Update event error:', err);
      if (err.response?.data) {
        const errorData = err.response.data;
        if (typeof errorData === 'object' && !errorData.error) {
          // Handle validation errors
          const errorMessages = Object.entries(errorData)
            .map(([field, messages]) => `${field}: ${Array.isArray(messages) ? messages.join(', ') : messages}`)
            .join('; ');
          setMessage(errorMessages);
        } else {
          setMessage(errorData.error || "Failed to update event");
        }
      } else {
        setMessage("Failed to update event");
      }
    } finally {
      setLoading(false);
    }
  };

  if (fetchingEvent) {
    return (
      <>
        <PageMeta
          title="Edit Event | Dream Entertainment"
          description="Update event details"
        />
        <PageBreadcrumb pageTitle="Edit Event" />
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-500">Loading event details...</div>
        </div>
      </>
    );
  }

  return (
    <>
      <PageMeta
        title="Edit Event | Dream Entertainment"
        description="Update event details"
      />
      <PageBreadcrumb pageTitle="Edit Event" />
      
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <div className="space-y-6">
          <ComponentCard title="Event Details" desc="Update event information">
            {message && (
              <div className={`p-3 text-sm rounded-lg mb-4 ${
                message === "success" 
                  ? "text-green-600 bg-green-50 border border-green-200 dark:bg-green-900/20 dark:border-green-800 dark:text-green-400"
                  : "text-red-600 bg-red-50 border border-red-200 dark:bg-red-900/20 dark:border-red-800 dark:text-red-400"
              }`}>
                {message === "success" ? "Event updated successfully!" : message}
              </div>
            )}

            {warnings.length > 0 && (
              <div className="p-3 text-sm rounded-lg mb-4 text-yellow-600 bg-yellow-50 border border-yellow-200 dark:bg-yellow-900/20 dark:border-yellow-800 dark:text-yellow-400">
                <div className="font-medium mb-2">Warnings:</div>
                <ul className="list-disc list-inside space-y-1">
                  {warnings.map((warning, index) => (
                    <li key={index}>{warning}</li>
                  ))}
                </ul>
              </div>
            )}
            
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <Label htmlFor="name">Event Name *</Label>
                <Input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder="e.g., Summer Music Festival"
                  required
                  disabled={loading}
                />
              </div>

              <div>
                <Label htmlFor="place">Place *</Label>
                <Input
                  type="text"
                  id="place"
                  name="place"
                  value={formData.place}
                  onChange={handleInputChange}
                  placeholder="e.g., Central Park"
                  required
                  disabled={loading}
                />
              </div>

              <div>
                <Label htmlFor="address">Address *</Label>
                <Input
                  type="text"
                  id="address"
                  name="address"
                  value={formData.address}
                  onChange={handleInputChange}
                  placeholder="e.g., 123 Park Avenue, New York, NY 10001"
                  required
                  disabled={loading}
                />
              </div>

              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <div>
                  <Label htmlFor="start_date">Start Date *</Label>
                  <div className="relative">
                    <Input
                      type="text"
                      id="start_date"
                      name="start_date"
                      value={formData.start_date}
                      onChange={handleInputChange}
                      placeholder="Select start date"
                      required
                      disabled={loading}
                      className="cursor-pointer"
                    />
                    <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                      <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                  </div>
                </div>

                <div>
                  <Label htmlFor="end_date">End Date *</Label>
                  <div className="relative">
                    <Input
                      type="text"
                      id="end_date"
                      name="end_date"
                      value={formData.end_date}
                      onChange={handleInputChange}
                      placeholder="Select end date"
                      required
                      disabled={loading}
                      className="cursor-pointer"
                    />
                    <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                      <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                  </div>
                </div>
              </div>

              {/* Sub-Events Section */}
              <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
                      <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Event Activities</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Manage sub-events and activities</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setSelectedSubEvents([...availableSubEvents])}
                      disabled={loadingSubEvents}
                      className="text-xs bg-green-500 hover:bg-green-600 disabled:bg-green-300 text-white px-3 py-1.5 rounded-lg transition-colors font-medium"
                    >
                      Select All
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedSubEvents([])}
                      disabled={loadingSubEvents}
                      className="text-xs bg-red-500 hover:bg-red-600 disabled:bg-red-300 text-white px-3 py-1.5 rounded-lg transition-colors font-medium"
                    >
                      Clear All
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedSubEvents([...currentSubEvents])}
                      disabled={loadingSubEvents}
                      className="text-xs bg-purple-500 hover:bg-purple-600 disabled:bg-purple-300 text-white px-3 py-1.5 rounded-lg transition-colors font-medium"
                    >
                      Reset
                    </button>
                    <button
                      type="button"
                      onClick={loadPredefinedSubEvents}
                      disabled={loadingSubEvents}
                      className="text-xs bg-blue-500 hover:bg-blue-600 disabled:bg-blue-300 text-white px-3 py-1.5 rounded-lg transition-colors font-medium"
                    >
                      {loadingSubEvents ? "Loading..." : "Refresh"}
                    </button>
                  </div>
                </div>
                
                {/* Current Sub-Events Info */}
                {currentSubEvents.length > 0 && (
                  <div className="p-4 text-sm rounded-lg mb-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-300">
                    <div className="flex items-center gap-2 mb-2">
                      <svg className="w-4 h-4 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <strong>Current Activities ({currentSubEvents.length})</strong>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {currentSubEvents.map((subEvent, index) => (
                        <span key={index} className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200">
                          {subEvent}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Enable Sub-Event Update Toggle */}
                <div className="mb-4">
                  <div className="flex items-center justify-between p-4 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
                    <div className="flex items-center gap-3">
                      <svg className="w-5 h-5 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                      </svg>
                      <div>
                        <span className="text-sm font-semibold text-gray-900 dark:text-white">
                          Enable Activities Update
                        </span>
                        <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                          {enableSubEventUpdate 
                            ? "Activities will be updated when you save the event"
                            : "Only event details will be updated (activities remain unchanged)"
                          }
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setEnableSubEventUpdate(!enableSubEventUpdate);
                        console.log('Sub-event update enabled:', !enableSubEventUpdate);
                        console.log('Current selected sub-events:', selectedSubEvents);
                      }}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 ${
                        enableSubEventUpdate
                          ? 'bg-brand-500'
                          : 'bg-gray-300 dark:bg-gray-600'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          enableSubEventUpdate ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>
                </div>
                
                <div className={`transition-all duration-300 ${
                  enableSubEventUpdate ? 'opacity-100' : 'opacity-50 pointer-events-none'
                }`}>
                  {loadingSubEvents ? (
                    <div className="flex items-center justify-center p-8">
                      <div className="text-gray-500 dark:text-gray-400">Loading available activities...</div>
                    </div>
                  ) : availableSubEvents.length === 0 ? (
                    <div className="text-center p-8 text-gray-500 dark:text-gray-400">
                      <p>No activities available. Please contact administrator.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                      {availableSubEvents.map((subEventName) => (
                        <label
                          key={subEventName}
                          className={`group flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all duration-200 hover:shadow-md ${
                            selectedSubEvents.includes(subEventName)
                              ? "bg-white dark:bg-gray-800 border-brand-500 dark:border-brand-400 shadow-sm ring-2 ring-brand-500/20 dark:ring-brand-400/20"
                              : "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:border-brand-300 dark:hover:border-brand-600"
                          }`}
                        >
                          <div className="flex-shrink-0">
                            <input
                              type="checkbox"
                              checked={selectedSubEvents.includes(subEventName)}
                              onChange={(e) => {
                                console.log(`Checkbox ${subEventName} changed to:`, e.target.checked);
                                if (e.target.checked) {
                                  setSelectedSubEvents(prev => {
                                    const newSelection = [...prev, subEventName];
                                    console.log('New selection after adding:', newSelection);
                                    return newSelection;
                                  });
                                } else {
                                  setSelectedSubEvents(prev => {
                                    const newSelection = prev.filter(name => name !== subEventName);
                                    console.log('New selection after removing:', newSelection);
                                    return newSelection;
                                  });
                                }
                              }}
                              disabled={!enableSubEventUpdate}
                              className="w-5 h-5 text-brand-500 border-2 border-gray-300 dark:border-gray-600 rounded focus:ring-brand-500 focus:ring-2"
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <span className="text-sm font-medium text-gray-900 dark:text-white group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors">
                              {subEventName}
                            </span>
                          </div>
                          {selectedSubEvents.includes(subEventName) && (
                            <div className="flex-shrink-0">
                              <svg className="w-4 h-4 text-brand-500 dark:text-brand-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                              </svg>
                            </div>
                          )}
                        </label>
                      ))}
                      
                      {/* Add New Sub Event Option */}
                      <button
                        type="button"
                        onClick={() => navigate("/manage-sub-event", { state: { eventId } })}
                        disabled={!enableSubEventUpdate}
                        className="group flex items-center gap-3 p-4 rounded-xl border-2 border-dashed border-brand-300 dark:border-brand-700 bg-brand-25 dark:bg-brand-900/10 hover:bg-brand-50 dark:hover:bg-brand-900/20 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed hover:border-brand-400 dark:hover:border-brand-600"
                      >
                        <div className="w-5 h-5 flex items-center justify-center flex-shrink-0">
                          <svg className="w-4 h-4 text-brand-500 dark:text-brand-400 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                          </svg>
                        </div>
                        <span className="text-sm font-medium text-brand-600 dark:text-brand-400 group-hover:text-brand-700 dark:group-hover:text-brand-300 transition-colors">
                          Manage Activities
                        </span>
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex gap-4 pt-4">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-brand-500 hover:bg-brand-600 disabled:bg-brand-300 text-white font-medium py-2.5 px-4 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                >
                  {loading ? "Updating..." : "Update Event"}
                </button>
                <button
                  type="button"
                  onClick={() => navigate("/ongoing-events")}
                  disabled={loading}
                  className="flex-1 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 font-medium py-2.5 px-4 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-gray-500/20"
                >
                  Cancel
                </button>
              </div>
            </form>
          </ComponentCard>
        </div>
        <div className="space-y-6">
          {/* Additional information or preview can be added here */}
        </div>
      </div>
    </>
  );
}