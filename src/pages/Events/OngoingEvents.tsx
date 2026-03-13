import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import axios from "axios";
import PageMeta from "../../components/common/PageMeta";
import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import ComponentCard from "../../components/common/ComponentCard";

export default function OngoingEvents() {
  const navigate = useNavigate();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("active");

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
      } finally {
        setLoading(false);
      }
    };

    fetchEvents();
  }, []);

  const filteredEvents = events.filter((event: any) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const endDate = new Date(event.end_date);
    endDate.setHours(0, 0, 0, 0);
    
    if (filter === "active") {
      return endDate >= today;
    } else {
      return endDate < today;
    }
  });

  if (loading) {
    return (
      <>
        <PageMeta
          title="Ongoing Events | Dream Entertainment"
          description="Manage your active festival events"
        />
        <PageBreadcrumb pageTitle="Ongoing Events" />
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-500">Loading events...</div>
        </div>
      </>
    );
  }

  return (
    <>
      <PageMeta
        title="Events | Dream Entertainment"
        description="Manage your festival events"
      />
      <PageBreadcrumb pageTitle="Events Details" />
      
      <div className="mb-6 flex gap-2">
        <button
          onClick={() => setFilter("active")}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            filter === "active"
              ? "bg-brand-500 text-white"
              : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
          }`}
        >
          Ongoing Events
        </button>
        <button
          onClick={() => setFilter("expired")}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            filter === "expired"
              ? "bg-brand-500 text-white"
              : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
          }`}
        >
          Expired Events
        </button>
      </div>
      
      {filteredEvents.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 text-center">
          <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="#cbd5e1" strokeWidth="1.5" className="mb-4">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
            <line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8" y1="2" x2="8" y2="6" />
            <line x1="3" y1="10" x2="21" y2="10" />
          </svg>
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-2">No {filter === "active" ? "Ongoing" : "Expired"} Events</h3>
          <p className="text-gray-500 dark:text-gray-400 mb-4">{filter === "active" ? "Create your first event to get started!" : "No expired events found."}</p>
          {filter === "active" && (
            <button 
              className="bg-brand-500 hover:bg-brand-600 text-white font-medium py-2.5 px-4 rounded-lg transition-colors"
              onClick={() => navigate("/create-event")}
            >
              Create Event
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredEvents.map(event => (
            <ComponentCard key={event.id} title={event.name}>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium bg-brand-100 text-brand-700 px-2 py-1 rounded-full dark:bg-brand-900/20 dark:text-brand-400">
                    {event.code}
                  </span>
                </div>
                
                <div className="space-y-3">
                  <div className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-400">
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                      <circle cx="12" cy="10" r="3" />
                    </svg>
                    <span>{event.place}</span>
                  </div>
                  
                  <div className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-400">
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                      <line x1="16" y1="2" x2="16" y2="6" />
                      <line x1="8" y1="2" x2="8" y2="6" />
                      <line x1="3" y1="10" x2="21" y2="10" />
                    </svg>
                    <span>{event.start_date} to {event.end_date}</span>
                  </div>
                  
                  <div className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-400">
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                      <polyline points="9 22 9 12 15 12 15 22" />
                    </svg>
                    <span className="truncate">{event.address}</span>
                  </div>
                </div>
                
                <div className="flex gap-2 pt-4">
                  <button 
                    className="flex-1 bg-brand-500 hover:bg-brand-600 text-white text-xs font-medium py-2 px-3 rounded-lg transition-colors"
                    onClick={() => navigate("/create-entry-type", { state: { eventId: event.id } })}
                  >
                    Add Entry Type
                  </button>
                  <button 
                    className="flex-1 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 text-xs font-medium py-2 px-3 rounded-lg transition-colors"
                    onClick={() => navigate("/edit-event", { state: { eventId: event.id } })}
                  >
                    Edit Event
                  </button>
                </div>
              </div>
            </ComponentCard>
          ))}
        </div>
      )}
    </>
  );
}