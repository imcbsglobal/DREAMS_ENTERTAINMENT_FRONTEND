import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router";
import axios from "axios";
import PageMeta from "../../components/common/PageMeta";
import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import ComponentCard from "../../components/common/ComponentCard";
import Label from "../../components/form/Label";
import Input from "../../components/form/input/InputField";
import TextArea from "../../components/form/input/TextArea";
import Checkbox from "../../components/form/input/Checkbox";

export default function CreateEntryType() {
  const navigate = useNavigate();
  const location = useLocation();
  const [events, setEvents] = useState([]);
  const [subEvents, setSubEvents] = useState([]);
  const [formData, setFormData] = useState({
    event: location.state?.eventId || "",
    sub_event: "",
    name: "",
    price: "",
    description: "",
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
        } catch (err) {
          console.error("Failed to fetch sub-events:", err);
          setSubEvents([]);
        }
      } else {
        setSubEvents([]);
      }
    };

    fetchSubEvents();
  }, [formData.event]);

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

              <div>
                <Label htmlFor="description">Description</Label>
                <TextArea
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  placeholder="Enter description (optional)"
                  disabled={loading}
                  rows={4}
                />
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
          {/* Additional form sections can be added here */}
        </div>
      </div>
    </>
  );
}