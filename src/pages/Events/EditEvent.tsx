import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router";
import axios from "axios";
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
  const [loading, setLoading] = useState(false);
  const [fetchingEvent, setFetchingEvent] = useState(true);
  const [message, setMessage] = useState("");
  const [warnings, setWarnings] = useState([]);

  useEffect(() => {
    if (!eventId) {
      setMessage("No event ID provided");
      setFetchingEvent(false);
      return;
    }

    const fetchEvent = async () => {
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
        setMessage(err.response?.data?.error || "Failed to fetch event details");
      } finally {
        setFetchingEvent(false);
      }
    };

    fetchEvent();
  }, [eventId]);

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
      const response = await axios.put(`https://de.imcbs.com/api/admin/update-event/${eventId}/`, formData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setMessage("success");
      if (response.data.warnings && response.data.warnings.length > 0) {
        setWarnings(response.data.warnings);
      }
      setTimeout(() => navigate("/ongoing-events"), 2000);
    } catch (err: any) {
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
                  <Input
                    type="date"
                    id="start_date"
                    name="start_date"
                    value={formData.start_date}
                    onChange={handleInputChange}
                    required
                    disabled={loading}
                  />
                </div>

                <div>
                  <Label htmlFor="end_date">End Date *</Label>
                  <Input
                    type="date"
                    id="end_date"
                    name="end_date"
                    value={formData.end_date}
                    onChange={handleInputChange}
                    required
                    disabled={loading}
                  />
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