import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router";
import axios from "axios";
import PageMeta from "../../components/common/PageMeta";
import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import ComponentCard from "../../components/common/ComponentCard";
import Label from "../../components/form/Label";
import Input from "../../components/form/input/InputField";
import Checkbox from "../../components/form/input/Checkbox";

export default function CreateEntryType() {
  const navigate = useNavigate();
  const location = useLocation();
  const [events, setEvents] = useState([]);
  const [subEvents, setSubEvents] = useState([]);
  const [existingEntryTypes, setExistingEntryTypes] = useState([]);
  const [loadingEntryTypes, setLoadingEntryTypes] = useState(false);
  const [formData, setFormData] = useState({
    event: location.state?.eventId || "",
    sub_event: "",
    name: "",
    price: "",
    is_active: true
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const token = localStorage.getItem("access_token");
        const response = await axios.get("https://de.imcbs.com/api/admin/event-list/", {
          headers: { Authorization: `Bearer ${token}` }
        });
        setEvents(response.data);
      } catch (err) {
        console.error("Failed to fetch events:", err);
      }
    };

    fetchEvents();
  }, []);

  useEffect(() => {
    const fetchSubEvents = async () => {
      if (formData.event) {
        try {
          const token = localStorage.getItem("access_token");
          const response = await axios.get(`https://de.imcbs.com/api/admin/sub-events/${formData.event}/`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          setSubEvents(response.data);
          
          // Auto-select first sub-event as default
          if (response.data.length > 0) {
            setFormData(prev => ({
              ...prev,
              sub_event: response.data[0].id
            }));
          }
        } catch (err) {
          console.error("Failed to fetch sub-events:", err);
          setSubEvents([]);
        }
      } else {
        setSubEvents([]);
        setExistingEntryTypes([]);
      }
    };

    fetchSubEvents();
  }, [formData.event]);

  // Fetch existing entry types when sub-event changes
  useEffect(() => {
    const fetchExistingEntryTypes = async () => {
      if (formData.sub_event) {
        setLoadingEntryTypes(true);
        console.log('Fetching entry types for sub-event:', formData.sub_event); // Debug log
        try {
          const token = localStorage.getItem("access_token");
          // Fetch entry types for the specific sub-event
          const response = await axios.get(`https://de.imcbs.com/api/admin/entry-types/${formData.sub_event}/`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          console.log('Entry types response:', response.data); // Debug log
          setExistingEntryTypes(response.data || []);
        } catch (err) {
          console.error("Failed to fetch existing entry types:", err);
          // Clear entry types on error
          setExistingEntryTypes([]);
        } finally {
          setLoadingEntryTypes(false);
        }
      } else {
        setExistingEntryTypes([]);
      }
    };

    fetchExistingEntryTypes();
  }, [formData.sub_event]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;
    
    setFormData(prev => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
      // Reset sub_event when event changes
      ...(name === "event" && { sub_event: "" })
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      const token = localStorage.getItem("access_token");
      await axios.post("https://de.imcbs.com/api/admin/create-entry-type/", formData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMessage("success");
      setTimeout(() => navigate("/ongoing-events"), 1500);
    } catch (err: any) {
      setMessage(err.response?.data?.error || "Failed to create entry type");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <PageMeta
        title="Create Entry Type | Dream Entertainment"
        description="Add ticket categories for your event"
      />
      <PageBreadcrumb pageTitle="Create Entry Type" />
      
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <div className="space-y-6">
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            {message && (
              <div className={`p-3 text-sm rounded-lg mb-4 ${
                message === "success" 
                  ? "text-green-600 bg-green-50 border border-green-200 dark:bg-green-900/20 dark:border-green-800 dark:text-green-400"
                  : "text-red-600 bg-red-50 border border-red-200 dark:bg-red-900/20 dark:border-red-800 dark:text-red-400"
              }`}>
                {message === "success" ? "Entry type created successfully!" : message}
              </div>
            )}
            
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <Label htmlFor="event">Event *</Label>
                  <select
                    id="event"
                    name="event"
                    value={formData.event}
                    onChange={handleInputChange}
                    required
                    disabled={loading}
                    className="h-11 w-full rounded-lg border appearance-none px-4 py-2.5 text-sm shadow-theme-xs placeholder:text-gray-400 focus:outline-hidden focus:ring-3 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 bg-transparent text-gray-800 border-gray-300 focus:border-brand-300 focus:ring-brand-500/20 dark:border-gray-700 dark:focus:border-brand-800"
                  >
                    <option value="">Select an event</option>
                    {events.map(event => (
                      <option key={event.id} value={event.id}>{event.name}</option>
                    ))}
                  </select>
                </div>

                {subEvents.length > 0 && (
                  <div>
                    <Label htmlFor="sub_event">Sub Event</Label>
                    <select
                      id="sub_event"
                      name="sub_event"
                      value={formData.sub_event}
                      onChange={handleInputChange}
                      disabled={loading}
                      className="h-11 w-full rounded-lg border appearance-none px-4 py-2.5 text-sm shadow-theme-xs placeholder:text-gray-400 focus:outline-hidden focus:ring-3 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 bg-transparent text-gray-800 border-gray-300 focus:border-brand-300 focus:ring-brand-500/20 dark:border-gray-700 dark:focus:border-brand-800"
                    >
                      <option value="">Select a sub event</option>
                      {subEvents.map(subEvent => (
                        <option key={subEvent.id} value={subEvent.id}>{subEvent.name}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <Label htmlFor="name">Entry Type Name *</Label>
                  <Input
                    type="text"
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    placeholder="e.g., Adult, Kids, VIP"
                    required
                    disabled={loading}
                  />
                </div>

                <div>
                  <Label htmlFor="price">Price *</Label>
                  <Input
                    type="number"
                    step="0.01"
                    id="price"
                    name="price"
                    value={formData.price}
                    onChange={handleInputChange}
                    placeholder="0.00"
                    required
                    disabled={loading}
                  />
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Checkbox
                  checked={formData.is_active}
                  onChange={(checked) => setFormData(prev => ({ ...prev, is_active: checked }))}
                  disabled={loading}
                />
                <Label>Active</Label>
              </div>

              <div className="flex gap-4 pt-4">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-brand-500 hover:bg-brand-600 disabled:bg-brand-300 text-white font-medium py-2.5 px-4 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                >
                  {loading ? "Creating..." : "Create Entry Type"}
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
          </div>
        </div>
        <div className="space-y-6">
          {/* Existing Entry Types Section */}
          {formData.sub_event && (
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Existing Entry Types for Selected Sub-Event
              </h3>
              
              {loadingEntryTypes ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-500"></div>
                  <span className="ml-2 text-gray-600 dark:text-gray-400">Loading entry types...</span>
                </div>
              ) : existingEntryTypes.length > 0 ? (
                <div className="space-y-3">
                  {existingEntryTypes.map((entryType) => (
                    <div key={entryType.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium text-gray-900 dark:text-white">
                            {entryType.name}
                          </h4>
                          <span className={`px-2 py-1 text-xs rounded-full ${
                            entryType.is_active 
                              ? "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400"
                              : "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400"
                          }`}>
                            {entryType.is_active ? "Active" : "Inactive"}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                          Price: ${entryType.price}
                          {entryType.description && (
                            <span className="ml-2">• {entryType.description}</span>
                          )}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          Event: {entryType.event_name} • Sub-Event: {entryType.sub_event_name}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="text-gray-400 dark:text-gray-500 mb-2">
                    <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <p className="text-gray-500 dark:text-gray-400">
                    No entry types found for this sub-event
                  </p>
                  <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
                    Create the first entry type using the form
                  </p>
                </div>
              )}
            </div>
          )}
          
          {/* Helper text when no sub-event selected */}
          {formData.event && !formData.sub_event && (
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  Select a sub-event to view existing entry types
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}