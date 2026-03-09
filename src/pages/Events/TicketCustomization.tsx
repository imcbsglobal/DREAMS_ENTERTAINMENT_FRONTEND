import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import axios from "axios";
import PageMeta from "../../components/common/PageMeta";
import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import Label from "../../components/form/Label";
import Input from "../../components/form/input/InputField";

export default function TicketCustomization() {
  const navigate = useNavigate();
  const [events, setEvents] = useState([]);
  const [selectedEvent, setSelectedEvent] = useState("");
  const [formData, setFormData] = useState({
    event: "",
    header_text: "",
    footer_text: "",
    show_event_name: true,
    show_place: true,
    show_entry_type: true,
    show_price: true,
    printer_format: ""
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [preview, setPreview] = useState<any>(null);

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    try {
      const token = localStorage.getItem("access_token");
      const res = await axios.get("https://de.imcbs.com/api/admin/event-list/", {
        headers: { Authorization: `Bearer ${token}` }
      });
      setEvents(res.data);
    } catch (err) {
      setMessage("Failed to load events");
    }
  };

  const handleEventChange = (eventId: string) => {
    setSelectedEvent(eventId);
    setFormData({ ...formData, event: eventId });
    const event: any = events.find((e: any) => e.id === parseInt(eventId));
    if (event) {
      generatePreview(event);
    }
  };

  const generatePreview = (event: any) => {
    setPreview({
      event_name: event?.name || "Event Name",
      place: event?.place || "Venue",
      entry_type: "Adult",
      price: "50.00"
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      const token = localStorage.getItem("access_token");
      await axios.post("https://de.imcbs.com/api/admin/configure-ticket/", formData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMessage("success");
      setTimeout(() => navigate("/dashboard"), 2000);
    } catch (err: any) {
      setMessage(err.response?.data?.error || "Failed to save customization");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <PageMeta
        title="Ticket Customization | Dream Entertainment"
        description="Configure how tickets will appear when printed"
      />
      <PageBreadcrumb pageTitle="Ticket Customization" />

      {message && (
        <div className={`p-3 text-sm rounded-lg mb-6 ${
          message === "success"
            ? "text-green-600 bg-green-50 border border-green-200 dark:bg-green-900/20 dark:border-green-800 dark:text-green-400"
            : "text-red-600 bg-red-50 border border-red-200 dark:bg-red-900/20 dark:border-red-800 dark:text-red-400"
        }`}>
          {message === "success" ? "Ticket customization saved successfully!" : message}
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <Label htmlFor="event">Select Event *</Label>
              <select
                id="event"
                value={selectedEvent}
                onChange={(e) => handleEventChange(e.target.value)}
                required
                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-4 py-2.5 text-gray-900 dark:text-white focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
              >
                <option value="">Choose an event...</option>
                {events.map((event: any) => (
                  <option key={event.id} value={event.id}>
                    {event.name} ({event.code})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <Label htmlFor="header_text">Header Text</Label>
              <Input
                type="text"
                id="header_text"
                placeholder="e.g., Welcome to Summer Festival 2024"
                value={formData.header_text}
                onChange={(e) => setFormData({ ...formData, header_text: e.target.value })}
              />
            </div>

            <div>
              <Label htmlFor="footer_text">Footer Text</Label>
              <Input
                type="text"
                id="footer_text"
                placeholder="e.g., Thank you for your visit!"
                value={formData.footer_text}
                onChange={(e) => setFormData({ ...formData, footer_text: e.target.value })}
              />
            </div>

            <div>
              <Label>Display Options</Label>
              <div className="space-y-2 mt-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.show_event_name}
                    onChange={(e) => setFormData({ ...formData, show_event_name: e.target.checked })}
                    className="w-4 h-4 text-brand-500 border-gray-300 rounded focus:ring-brand-500"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">Show Event Name</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.show_place}
                    onChange={(e) => setFormData({ ...formData, show_place: e.target.checked })}
                    className="w-4 h-4 text-brand-500 border-gray-300 rounded focus:ring-brand-500"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">Show Venue/Place</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.show_entry_type}
                    onChange={(e) => setFormData({ ...formData, show_entry_type: e.target.checked })}
                    className="w-4 h-4 text-brand-500 border-gray-300 rounded focus:ring-brand-500"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">Show Entry Type</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.show_price}
                    onChange={(e) => setFormData({ ...formData, show_price: e.target.checked })}
                    className="w-4 h-4 text-brand-500 border-gray-300 rounded focus:ring-brand-500"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">Show Price</span>
                </label>
              </div>
            </div>

            <div className="flex gap-4 pt-4">
              <button
                type="submit"
                disabled={loading || !selectedEvent}
                className="flex-1 bg-brand-500 hover:bg-brand-600 disabled:bg-brand-300 text-white font-medium py-2.5 px-4 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-brand-500/20"
              >
                {loading ? "Saving..." : "Save Customization"}
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

        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Ticket Preview</h3>
          {preview ? (
            <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 p-8 bg-white dark:bg-gray-900 rounded-lg font-mono text-sm leading-relaxed">
              {formData.header_text && (
                <div className="text-center font-bold mb-4 pb-3 border-b border-gray-200 dark:border-gray-700">
                  {formData.header_text}
                </div>
              )}

              <div className="mb-2 text-gray-900 dark:text-white">
                <strong>Ticket ID:</strong> U2-SF-SUM-5001
              </div>

              {formData.show_event_name && (
                <div className="mb-2 text-gray-900 dark:text-white">
                  <strong>Event:</strong> {preview.event_name}
                </div>
              )}

              {formData.show_place && (
                <div className="mb-2 text-gray-900 dark:text-white">
                  <strong>Venue:</strong> {preview.place}
                </div>
              )}

              {formData.show_entry_type && (
                <div className="mb-2 text-gray-900 dark:text-white">
                  <strong>Type:</strong> {preview.entry_type}
                </div>
              )}

              {formData.show_price && (
                <div className="mb-2 text-gray-900 dark:text-white">
                  <strong>Price:</strong> ${preview.price}
                </div>
              )}

              <div className="mb-2 text-gray-900 dark:text-white">
                <strong>Date:</strong> {new Date().toLocaleString()}
              </div>

              {formData.footer_text && (
                <div className="text-center italic mt-4 pt-3 border-t border-gray-200 dark:border-gray-700 text-xs text-gray-600 dark:text-gray-400">
                  {formData.footer_text}
                </div>
              )}
            </div>
          ) : (
            <div className="text-center text-gray-500 dark:text-gray-400 py-20">
              Select an event to see preview
            </div>
          )}
        </div>
      </div>
    </>
  );
}
