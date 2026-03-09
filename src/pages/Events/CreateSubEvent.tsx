import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router";
import axios from "axios";
import PageMeta from "../../components/common/PageMeta";
import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import ComponentCard from "../../components/common/ComponentCard";
import Label from "../../components/form/Label";
import Input from "../../components/form/input/InputField";
import Select from "../../components/form/Select";
import TextArea from "../../components/form/input/TextArea";

export default function CreateSubEvent() {
  const navigate = useNavigate();
  const location = useLocation();
  const [events, setEvents] = useState([]);
  const [formData, setFormData] = useState({
    event: location.state?.eventId || "",
    name: "",
    description: "",
    start_time: "",
    end_time: ""
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

  // Set the event ID after events are loaded
  useEffect(() => {
    console.log('Location state:', location.state);
    console.log('Events loaded:', events.length);
    console.log('Current formData.event:', formData.event);
    
    if (location.state?.eventId && events.length > 0) {
      console.log('Setting event ID:', location.state.eventId);
      setFormData(prev => ({
        ...prev,
        event: location.state.eventId.toString()
      }));
    }
  }, [events, location.state?.eventId]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSelectChange = (value: string) => {
    setFormData(prev => ({
      ...prev,
      event: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      const token = localStorage.getItem("access_token");
      await axios.post("https://de.imcbs.com/api/admin/create-sub-event/", formData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMessage("success");
      setTimeout(() => navigate("/ongoing-events"), 1500);
    } catch (err: any) {
      const errorMsg = err.response?.data?.error || err.response?.data?.detail || "Failed to create sub event";
      setMessage(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const eventOptions = events.map(event => ({
    value: event.id.toString(),
    label: event.name
  }));

  // Find the selected event to get its value
  const selectedEventValue = formData.event ? formData.event.toString() : "";
  
  console.log('Render - formData.event:', formData.event);
  console.log('Render - selectedEventValue:', selectedEventValue);
  console.log('Render - eventOptions:', eventOptions);

  return (
    <>
      <PageMeta
        title="Create Sub Event | Dream Entertainment"
        description="Add a sub-event or session to your main event"
      />
      <PageBreadcrumb pageTitle="Create Sub Event" />
      
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <div className="space-y-6">
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            {message && (
              <div className={`p-3 text-sm rounded-lg mb-4 ${
                message === "success" 
                  ? "text-green-600 bg-green-50 border border-green-200 dark:bg-green-900/20 dark:border-green-800 dark:text-green-400"
                  : "text-red-600 bg-red-50 border border-red-200 dark:bg-red-900/20 dark:border-red-800 dark:text-red-400"
              }`}>
                {message === "success" ? "Sub event created successfully!" : message}
              </div>
            )}
            
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <Label htmlFor="event">Parent Event *</Label>
                <select
                  id="event"
                  name="event"
                  value={formData.event}
                  onChange={handleInputChange}
                  required
                  disabled={loading}
                  className="h-11 w-full rounded-lg border appearance-none px-4 py-2.5 text-sm shadow-theme-xs placeholder:text-gray-400 focus:outline-hidden focus:ring-3 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 bg-transparent text-gray-800 border-gray-300 focus:border-brand-300 focus:ring-brand-500/20 dark:border-gray-700 dark:focus:border-brand-800"
                >
                  <option value="">Select parent event</option>
                  {events.map(event => (
                    <option key={event.id} value={event.id}>{event.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <Label htmlFor="name">Sub Event Name *</Label>
                <Input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder="e.g., DJ Night, Rock Concert"
                  required
                  disabled={loading}
                />
              </div>

              <div>
                <Label htmlFor="description">Description *</Label>
                <TextArea
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  placeholder="Enter description"
                  required
                  disabled={loading}
                  rows={4}
                />
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <Label htmlFor="start_time">Start Time *</Label>
                  <Input
                    type="datetime-local"
                    id="start_time"
                    name="start_time"
                    value={formData.start_time}
                    onChange={handleInputChange}
                    required
                    disabled={loading}
                  />
                </div>

                <div>
                  <Label htmlFor="end_time">End Time *</Label>
                  <Input
                    type="datetime-local"
                    id="end_time"
                    name="end_time"
                    value={formData.end_time}
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
                  {loading ? "Creating..." : "Create Sub Event"}
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
          {/* Additional form sections can be added here */}
        </div>
      </div>
    </>
  );
}