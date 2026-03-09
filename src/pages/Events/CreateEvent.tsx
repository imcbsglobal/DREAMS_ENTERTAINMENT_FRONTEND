import { useState } from "react";
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

    // Validate that dates are selected
    if (!formData.start_date || !formData.end_date) {
      setMessage("Please select both start and end dates");
      setLoading(false);
      return;
    }

    try {
      const token = localStorage.getItem("access_token");
      await axios.post("https://de.imcbs.com/api/admin/create-event/", formData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMessage("success");
      setTimeout(() => navigate("/ongoing-events"), 1500);
    } catch (err: any) {
      setMessage(err.response?.data?.error || "Failed to create event");
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