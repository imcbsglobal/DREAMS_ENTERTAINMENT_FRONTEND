import { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router";
import PageMeta from "../../components/common/PageMeta";
import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import ComponentCard from "../../components/common/ComponentCard";
import Label from "../../components/form/Label";
import Input from "../../components/form/input/InputField";

interface Ticket {
  id: number;
  ticket_id: string;
  event_name: string;
  sub_event_name?: string;
  entry_type_name: string;
  staff_username: string;
  price: string;
  created_at: string;
}

interface Event {
  id: number;
  name: string;
}

interface TicketReportResponse {
  total_tickets: number;
  tickets: Ticket[];
}

interface EntryTypeCount {
  entry_type_name: string;
  count: number;
}

export default function TicketReport() {
  const navigate = useNavigate();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedEvent, setSelectedEvent] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [loading, setLoading] = useState(true);
  const [totalTickets, setTotalTickets] = useState(0);
  const [entryTypeCounts, setEntryTypeCounts] = useState<EntryTypeCount[]>([]);

  useEffect(() => {
    loadEvents();
  }, []);

  useEffect(() => {
    loadTickets();
  }, [selectedEvent, startDate, endDate]);

  const loadEvents = async () => {
    try {
      const token = localStorage.getItem("access_token");
      const response = await axios.get<Event[]>("https://de.imcbs.com/api/admin/event-list/", {
        headers: { Authorization: `Bearer ${token}` }
      });
      setEvents(response.data);
    } catch (err) {
      console.error("Failed to fetch events:", err);
    }
  };

  const loadTickets = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("access_token");
      let url = "https://de.imcbs.com/api/admin/reports/tickets/?";
      
      const params = [];
      if (selectedEvent) params.push(`event_id=${selectedEvent}`);
      if (startDate) params.push(`start_date=${startDate}`);
      if (endDate) params.push(`end_date=${endDate}`);
      
      url += params.join("&");
      
      const response = await axios.get<TicketReportResponse>(url, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setTickets(response.data.tickets || []);
      setTotalTickets(response.data.total_tickets || 0);
      
      // Calculate entry type counts
      const counts = (response.data.tickets || []).reduce((acc: Record<string, number>, ticket) => {
        acc[ticket.entry_type_name] = (acc[ticket.entry_type_name] || 0) + 1;
        return acc;
      }, {});
      
      setEntryTypeCounts(Object.entries(counts).map(([name, count]) => ({ entry_type_name: name, count })));
    } catch (err) {
      console.error("Failed to fetch tickets:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <PageMeta
        title="Ticket Report | Dream Entertainment"
        description="View all generated tickets and filter by event"
      />
      <PageBreadcrumb pageTitle="Ticket Report" />
      
      <div className="space-y-6">
        {/* Filters */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="event">Event</Label>
              <select
                id="event"
                value={selectedEvent}
                onChange={(e) => setSelectedEvent(e.target.value)}
                className="h-11 w-full rounded-lg border bg-transparent text-gray-800 border-gray-300 focus:border-brand-300 focus:ring-brand-500/20 dark:border-gray-700 dark:text-white/90 dark:focus:border-brand-800 px-4 py-2.5 text-sm shadow-theme-xs focus:outline-hidden focus:ring-3 dark:bg-gray-900 placeholder:text-gray-400 dark:placeholder:text-white/30"
              >
                <option value="">All Events</option>
                {events.map(event => (
                  <option key={event.id} value={event.id}>{event.name}</option>
                ))}
              </select>
            </div>
            <div>
              <Label htmlFor="startDate">Start Date</Label>
              <Input
                type="date"
                id="startDate"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="endDate">End Date</Label>
              <Input
                type="date"
                id="endDate"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Summary Card */}
        <ComponentCard title="Report Summary" desc="Overview of ticket generation">
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-sm font-medium text-gray-900 dark:text-white">Entry Type Breakdown</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Entry Type</th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Count</th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">%</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {entryTypeCounts.map(entry => {
                    const percentage = totalTickets > 0 ? ((entry.count / totalTickets) * 100).toFixed(1) : '0';
                    return (
                      <tr key={entry.entry_type_name} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                        <td className="px-4 py-2 text-gray-900 dark:text-white">{entry.entry_type_name}</td>
                        <td className="px-4 py-2 text-right font-medium text-gray-900 dark:text-white">{entry.count}</td>
                        <td className="px-4 py-2 text-right text-gray-500 dark:text-gray-400">{percentage}%</td>
                      </tr>
                    );
                  })}
                  <tr className="bg-brand-50 dark:bg-brand-900/20 border-t-2 border-brand-200 dark:border-brand-800">
                    <td className="px-4 py-3 font-bold text-brand-600 dark:text-brand-400">Total</td>
                    <td className="px-4 py-3 text-right font-bold text-brand-600 dark:text-brand-400">{totalTickets}</td>
                    <td className="px-4 py-3 text-right font-bold text-brand-600 dark:text-brand-400">100%</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </ComponentCard>

        {/* Tickets Table */}
        <ComponentCard title="Tickets" desc="List of all generated tickets">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-gray-500 dark:text-gray-400">Loading tickets...</div>
            </div>
          ) : tickets.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-gray-300 dark:text-gray-600 mb-4">
                <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/>
                <polyline points="13 2 13 9 20 9"/>
              </svg>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No Tickets Found</h3>
              <p className="text-gray-500 dark:text-gray-400">No tickets have been generated yet</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
                  <tr>
                    <th className="px-6 py-3">Ticket ID</th>
                    <th className="px-6 py-3">Event</th>
                    <th className="px-6 py-3">Sub Event</th>
                    <th className="px-6 py-3">Entry Type</th>
                    <th className="px-6 py-3">Staff</th>
                    <th className="px-6 py-3">Price</th>
                    <th className="px-6 py-3">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {tickets.map(ticket => (
                    <tr key={ticket.id} className="bg-white border-b dark:bg-gray-800 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600">
                      <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">{ticket.ticket_id}</td>
                      <td className="px-6 py-4">{ticket.event_name}</td>
                      <td className="px-6 py-4">{ticket.sub_event_name || "-"}</td>
                      <td className="px-6 py-4">{ticket.entry_type_name}</td>
                      <td className="px-6 py-4">{ticket.staff_username}</td>
                      <td className="px-6 py-4 font-medium text-green-600 dark:text-green-400">₹{ticket.price}</td>
                      <td className="px-6 py-4">{new Date(ticket.created_at).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </ComponentCard>
      </div>
    </>
  );
}