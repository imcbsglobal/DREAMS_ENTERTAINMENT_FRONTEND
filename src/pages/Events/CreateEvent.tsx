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
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

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
    console.log("=== API REQUEST DEBUG ===");
    console.log("Token being sent:", token ? `${token.substring(0, 20)}...` : "NULL/UNDEFINED");
    console.log("API Endpoint:", "https://de.imcbs.com/api/admin/create-event/");
    console.log("Form Data being sent:", JSON.stringify(formData, null, 2));
    console.log("Request Headers:", {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });
    
    // Validate form data before sending
    if (!formData.name || !formData.place || !formData.address || !formData.start_date || !formData.end_date) {
      throw new Error("Missing required fields");
    }
    
    return await axios.post("https://de.imcbs.com/api/admin/create-event/", formData, {
      headers: { 
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
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
    </>
  );
}