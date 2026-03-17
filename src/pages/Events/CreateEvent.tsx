import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import axios from "axios";
import PageMeta from "../../components/common/PageMeta";
import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import ComponentCard from "../../components/common/ComponentCard";
import Label from "../../components/form/Label";
import Input from "../../components/form/input/InputField";
import DatePicker from "../../components/form/date-picker";

export default function CreateEvent() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: "",
    place: "",
    address: "",
    start_date: "",
    end_date: ""
  });
  const [selectedSubEvents, setSelectedSubEvents] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [showConfirmation, setShowConfirmation] = useState(false);

  const SUB_EVENTS = [
    { id: "ENTRY TICKET", label: "🎫 ENTRY TICKET", emoji: "🎫" },
    { id: "Giant wheel", label: "🎡 Giant wheel", emoji: "🎡" },
    { id: "Break dance", label: "💃 Break dance", emoji: "💃" },
    { id: "Colombus", label: "🚢 Colombus", emoji: "🚢" },
    { id: "Well of death", label: "💀 Well of death", emoji: "💀" },
    { id: "Ranger", label: "🤠 Ranger", emoji: "🤠" },
    { id: "Dragon train", label: "🐉 Dragon train", emoji: "🐉" },
    { id: "Bouncy", label: "🏀 Bouncy", emoji: "🏀" },
    { id: "Toy car", label: "🚗 Toy car", emoji: "🚗" },
    { id: "Toy helicopter", label: "🚁 Toy helicopter", emoji: "🚁" },
    { id: "Toy Boat", label: "⛵ Toy Boat", emoji: "⛵" }
  ];

  // Check authentication on component mount
  useEffect(() => {
    const token = localStorage.getItem("access_token");
    console.log("=== COMPONENT MOUNT CHECK ===");
    console.log("Token exists:", !!token);
    console.log("Token preview:", token ? `${token.substring(0, 30)}...` : "NONE");
    
    if (!token) {
      console.log("No token found, redirecting to signin");
      setMessage("Please login to access this page");
      setTimeout(() => navigate("/signin"), 2000);
    }
  }, [navigate]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const refreshToken = async () => {
    try {
      const refresh = localStorage.getItem("refresh_token");
      if (!refresh) return null;
      
      const response = await axios.post("https://de.imcbs.com/api/token/refresh/", {
        refresh: refresh
      });
      
      localStorage.setItem("access_token", response.data.access);
      return response.data.access;
    } catch (error) {
      localStorage.removeItem("access_token");
      localStorage.removeItem("refresh_token");
      return null;
    }
  };

  const makeAuthenticatedRequest = async (token: string) => {
    const requestData = {
      ...formData,
      selected_sub_events: selectedSubEvents.length > 0 ? selectedSubEvents : undefined
    };
    
    console.log("=== API REQUEST DEBUG ===");
    console.log("Token being sent:", token ? `${token.substring(0, 20)}...` : "NULL/UNDEFINED");
    console.log("API Endpoint:", "https://de.imcbs.com/api/admin/create-event/");
    console.log("Form Data being sent:", JSON.stringify(requestData, null, 2));
    console.log("Request Headers:", {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });
    
    // Validate form data before sending
    if (!formData.name || !formData.place || !formData.address || !formData.start_date || !formData.end_date) {
      throw new Error("Missing required fields");
    }
    
    return await axios.post("https://de.imcbs.com/api/admin/create-event/", requestData, {
      headers: { 
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
  };

  const validateForm = () => {
    if (!formData.name.trim()) {
      setMessage("Event name is required");
      return false;
    }
    
    if (!formData.place.trim()) {
      setMessage("Venue/Place is required");
      return false;
    }
    
    if (!formData.address.trim()) {
      setMessage("Address is required");
      return false;
    }

    if (!formData.start_date || !formData.end_date) {
      setMessage("Please select both start and end dates");
      return false;
    }
    
    // Validate date order
    if (new Date(formData.start_date) >= new Date(formData.end_date)) {
      setMessage("End date must be after start date");
      return false;
    }

    return true;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setMessage("");

    if (validateForm()) {
      setShowConfirmation(true);
    }
  };

  const confirmCreateEvent = async () => {
    setShowConfirmation(false);
    setLoading(true);

    try {
      let token = localStorage.getItem("access_token");
      let refreshToken = localStorage.getItem("refresh_token");
      
      // DEBUG: Log token status
      console.log("=== TOKEN DEBUG ===");
      console.log("Access Token:", token ? `EXISTS (${token.substring(0, 20)}...)` : "MISSING");
      console.log("Refresh Token:", refreshToken ? `EXISTS (${refreshToken.substring(0, 20)}...)` : "MISSING");
      console.log("Form Data:", formData);
      
      if (!token) {
        setMessage("Authentication token not found. Please login again.");
        setTimeout(() => navigate("/signin"), 2000);
        setLoading(false);
        return;
      }

      try {
        console.log("=== MAKING FIRST REQUEST ===");
        const response = await makeAuthenticatedRequest(token);
        console.log("=== REQUEST SUCCESSFUL ===");
        console.log("Response:", response.data);
        setMessage("success");
        setTimeout(() => navigate("/ongoing-events"), 1500);
      } catch (err: any) {
        console.log("=== REQUEST FAILED ===");
        console.log("Error status:", err.response?.status);
        console.log("Error data:", err.response?.data);
        console.log("Full error:", err);
        
        if (err.response?.status === 401) {
          console.log("=== ATTEMPTING TOKEN REFRESH ===");
          // Token expired, try to refresh
          const newToken = await refreshToken();
          if (newToken) {
            console.log("=== TOKEN REFRESHED, RETRYING ===");
            // Retry with new token
            const response = await makeAuthenticatedRequest(newToken);
            console.log("=== RETRY SUCCESSFUL ===");
            setMessage("success");
            setTimeout(() => navigate("/ongoing-events"), 1500);
          } else {
            console.log("=== TOKEN REFRESH FAILED ===");
            setMessage("Session expired. Please login again.");
            setTimeout(() => navigate("/signin"), 2000);
          }
        } else {
          throw err;
        }
      }
    } catch (err: any) {
      console.log("=== FINAL ERROR HANDLING ===");
      console.log("Error status:", err.response?.status);
      console.log("Error data:", err.response?.data);
      console.log("Error message:", err.message);
      
      if (err.response?.status === 500) {
        setMessage("Server error occurred. Please check your data and try again.");
      } else if (err.response?.status === 400) {
        const errorMsg = err.response?.data?.error || err.response?.data?.detail || "Invalid data provided";
        setMessage(errorMsg);
      } else if (err.response?.data?.detail) {
        setMessage(err.response.data.detail);
      } else if (err.response?.data?.error) {
        setMessage(err.response.data.error);
      } else if (err.message) {
        setMessage(err.message);
      } else {
        setMessage("Failed to create event. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <PageMeta
        title="Create New Event | Dream Entertainment"
        description="Create a new festival or event for ticket management"
      />
      <PageBreadcrumb pageTitle="Create New Event" />
      
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <div className="space-y-6">
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            {message && (
              <div className={`p-3 text-sm rounded-lg mb-4 ${
                message === "success" 
                  ? "text-green-600 bg-green-50 border border-green-200 dark:bg-green-900/20 dark:border-green-800 dark:text-green-400"
                  : "text-red-600 bg-red-50 border border-red-200 dark:bg-red-900/20 dark:border-red-800 dark:text-red-400"
              }`}>
                {message === "success" ? "Event created successfully!" : message}
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
                  placeholder="Enter event name"
                  required
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
                />
              </div>

              <div>
                <Label htmlFor="start_date">Start Date *</Label>
                <DatePicker
                  id="start_date"
                  placeholder="Select start date"
                  defaultDate={formData.start_date}
                  onChange={(selectedDates, dateStr) => {
                    console.log('Start date selected:', dateStr);
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
                    console.log('End date selected:', dateStr);
                    setFormData(prev => ({
                      ...prev,
                      end_date: dateStr
                    }));
                  }}
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-3">
                  <Label className="mb-0">Select Sub-Events (Activities)</Label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setSelectedSubEvents(SUB_EVENTS.map(se => se.id))}
                      className="text-xs bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded-lg transition-colors"
                    >
                      Select All
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedSubEvents([])}
                      className="text-xs bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded-lg transition-colors"
                    >
                      Clear All
                    </button>
                  </div>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
                  Choose which activities/rides to include in this event. If none selected, default 'ENTRY TICKET' will be created.
                </p>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  {SUB_EVENTS.map((subEvent) => (
                    <label
                      key={subEvent.id}
                      className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                        selectedSubEvents.includes(subEvent.id)
                          ? "bg-brand-50 dark:bg-brand-900/20 border-brand-500 dark:border-brand-700"
                          : "bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:border-brand-300 dark:hover:border-brand-800"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={selectedSubEvents.includes(subEvent.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedSubEvents(prev => [...prev, subEvent.id]);
                          } else {
                            setSelectedSubEvents(prev => prev.filter(id => id !== subEvent.id));
                          }
                        }}
                        className="w-4 h-4 text-brand-500 border-gray-300 dark:border-gray-600 rounded focus:ring-brand-500 focus:ring-2"
                      />
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{subEvent.label}</span>
                    </label>
                  ))}
                  
                  {/* Add New Sub Event Option */}
                  <button
                    type="button"
                    onClick={() => navigate("/create-sub-event")}
                    className="flex items-center gap-3 p-3 rounded-lg border border-dashed border-brand-300 dark:border-brand-700 bg-brand-25 dark:bg-brand-900/10 hover:bg-brand-50 dark:hover:bg-brand-900/20 transition-all cursor-pointer group"
                  >
                    <div className="w-4 h-4 flex items-center justify-center">
                      <svg className="w-3 h-3 text-brand-500 dark:text-brand-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                      </svg>
                    </div>
                    <span className="text-sm font-medium text-brand-600 dark:text-brand-400 group-hover:text-brand-700 dark:group-hover:text-brand-300">
                      Add New Sub Event
                    </span>
                  </button>
                </div>
              </div>

              <div className="flex gap-4 pt-4">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-brand-500 hover:bg-brand-600 disabled:bg-brand-300 text-white font-medium py-2.5 px-4 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                >
                  {loading ? "Creating..." : "Create Event"}
                </button>
                <button
                  type="button"
                  onClick={() => navigate("/dashboard")}
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
          {/* Additional form sections can be added here */}
        </div>
      </div>

      {/* Confirmation Modal */}
      {showConfirmation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Confirm Event Creation
            </h3>
            <div className="space-y-3 mb-6">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                <span className="font-medium">Event:</span> {formData.name}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                <span className="font-medium">Venue:</span> {formData.place}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                <span className="font-medium">Duration:</span> {formData.start_date} to {formData.end_date}
              </p>
              {selectedSubEvents.length > 0 && (
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  <span className="font-medium">Sub-events:</span> {selectedSubEvents.length} selected
                </p>
              )}
            </div>
            <div className="flex gap-3">
              <button
                onClick={confirmCreateEvent}
                disabled={loading}
                className="flex-1 bg-brand-500 hover:bg-brand-600 disabled:bg-brand-300 text-white font-medium py-2.5 px-4 rounded-lg transition-colors"
              >
                {loading ? "Creating..." : "Confirm"}
              </button>
              <button
                onClick={() => setShowConfirmation(false)}
                disabled={loading}
                className="flex-1 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 font-medium py-2.5 px-4 rounded-lg transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}