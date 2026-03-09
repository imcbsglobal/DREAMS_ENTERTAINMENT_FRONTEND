import { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router";
import PageMeta from "../../components/common/PageMeta";
import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import ComponentCard from "../../components/common/ComponentCard";
import Label from "../../components/form/Label";
import Input from "../../components/form/input/InputField";

interface Event {
  id: number;
  name: string;
  code: string;
}

interface RevenueByEvent {
  event__name: string;
  event__code: string;
  ticket_count: number;
  total_revenue: string;
}

interface RevenueReportResponse {
  total_revenue: string;
  revenue_by_event: RevenueByEvent[];
}

export default function RevenueReport() {
  const navigate = useNavigate();
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedEvent, setSelectedEvent] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [revenueData, setRevenueData] = useState<RevenueReportResponse | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchEvents();
    fetchRevenue();
  }, []);

  const fetchEvents = async () => {
    try {
      const token = localStorage.getItem("access_token");
      const res = await axios.get<Event[]>("https://de.imcbs.com/api/admin/event-list/", {
        headers: { Authorization: `Bearer ${token}` }
      });
      setEvents(res.data);
    } catch (err) {
      console.error("Failed to fetch events:", err);
    }
  };

  const fetchRevenue = async (eventId = "", start = "", end = "") => {
    setLoading(true);
    try {
      const token = localStorage.getItem("access_token");
      let url = "https://de.imcbs.com/api/admin/reports/revenue/?";
      
      const params = [];
      if (eventId) params.push(`event_id=${eventId}`);
      if (start) params.push(`start_date=${start}`);
      if (end) params.push(`end_date=${end}`);
      
      url += params.join("&");
      
      const res = await axios.get<RevenueReportResponse>(url, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setRevenueData(res.data);
    } catch (err) {
      console.error("Failed to fetch revenue:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleEventChange = (eventId: string) => {
    setSelectedEvent(eventId);
    fetchRevenue(eventId, startDate, endDate);
  };

  const handleDateChange = (start: string, end: string) => {
    setStartDate(start);
    setEndDate(end);
    fetchRevenue(selectedEvent, start, end);
  };

  return (
    <>
      <PageMeta
        title="Revenue Report | Dream Entertainment"
        description="View revenue statistics by event"
      />
      <PageBreadcrumb pageTitle="Revenue Report" />
      
      <div className="space-y-6">
        {/* Filters */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="event">Event</Label>
              <select
                id="event"
                value={selectedEvent}
                onChange={(e) => handleEventChange(e.target.value)}
                className="h-11 w-full rounded-lg border bg-transparent text-gray-800 border-gray-300 focus:border-brand-300 focus:ring-brand-500/20 dark:border-gray-700 dark:text-white/90 dark:focus:border-brand-800 px-4 py-2.5 text-sm shadow-theme-xs focus:outline-hidden focus:ring-3 dark:bg-gray-900 placeholder:text-gray-400 dark:placeholder:text-white/30"
              >
                <option value="">All Events</option>
                {events.map(event => (
                  <option key={event.id} value={event.id}>
                    {event.name} ({event.code})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label htmlFor="startDate">Start Date</Label>
              <Input
                type="date"
                id="startDate"
                value={startDate}
                onChange={(e) => handleDateChange(e.target.value, endDate)}
              />
            </div>
            <div>
              <Label htmlFor="endDate">End Date</Label>
              <Input
                type="date"
                id="endDate"
                value={endDate}
                onChange={(e) => handleDateChange(startDate, e.target.value)}
              />
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="text-gray-500 dark:text-gray-400">Loading...</div>
          </div>
        ) : revenueData ? (
          <>
            {/* Summary Stats */}
            <ComponentCard title="Revenue Summary" desc="Overview of revenue statistics">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-green-50 dark:bg-green-900/20 p-6 rounded-lg border border-green-200 dark:border-green-800 flex items-center">
                  <div className="bg-green-100 dark:bg-green-800 p-3 rounded-lg mr-4">
                    <svg className="w-6 h-6 text-green-600 dark:text-green-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <line x1="12" y1="1" x2="12" y2="23" />
                      <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Revenue</h3>
                    <p className="text-2xl font-bold text-green-600 dark:text-green-400">₹{revenueData.total_revenue}</p>
                  </div>
                </div>
                <div className="bg-gray-50 dark:bg-gray-900/20 p-6 rounded-lg border border-gray-200 dark:border-gray-800 flex items-center">
                  <div className="bg-gray-100 dark:bg-gray-800 p-3 rounded-lg mr-4">
                    <svg className="w-6 h-6 text-gray-600 dark:text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                      <line x1="16" y1="2" x2="16" y2="6" />
                      <line x1="8" y1="2" x2="8" y2="6" />
                      <line x1="3" y1="10" x2="21" y2="10" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Events</h3>
                    <p className="text-2xl font-bold text-gray-600 dark:text-gray-400">{revenueData.revenue_by_event?.length || 0}</p>
                  </div>
                </div>
              </div>
            </ComponentCard>

            {/* Revenue by Event Table */}
            <ComponentCard title="Revenue by Event" desc="Detailed revenue breakdown by event">
              {revenueData.revenue_by_event?.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
                      <tr>
                        <th className="px-6 py-3">Event Name</th>
                        <th className="px-6 py-3">Event Code</th>
                        <th className="px-6 py-3 text-right">Tickets Sold</th>
                        <th className="px-6 py-3 text-right">Total Revenue</th>
                      </tr>
                    </thead>
                    <tbody>
                      {revenueData.revenue_by_event.map((event, index) => (
                        <tr key={index} className="bg-white border-b dark:bg-gray-800 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600">
                          <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">{event.event__name}</td>
                          <td className="px-6 py-4">{event.event__code}</td>
                          <td className="px-6 py-4 text-right">{event.ticket_count}</td>
                          <td className="px-6 py-4 text-right font-bold text-green-600 dark:text-green-400">₹{event.total_revenue}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12">
                  <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-gray-300 dark:text-gray-600 mb-4">
                    <line x1="12" y1="1" x2="12" y2="23" />
                    <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                  </svg>
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No Revenue Data</h3>
                  <p className="text-gray-500 dark:text-gray-400">No revenue data available</p>
                </div>
              )}
            </ComponentCard>
          </>
        ) : null}
      </div>
    </>
  );
}