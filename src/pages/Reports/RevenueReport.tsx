import { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router";
import PageMeta from "../../components/common/PageMeta";
import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import ComponentCard from "../../components/common/ComponentCard";
import Label from "../../components/form/Label";
import DatePicker from "../../components/form/DatePicker";
import ExportWithDateRangeButton from "../../components/common/ExportWithDateRangeButton";
import { exportRevenueReport } from "../../utils/excelExport";

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

  const handleRevenueExport = async (exportStartDate: string, exportEndDate: string, includeEventFilter: boolean) => {
    try {
      const token = localStorage.getItem("access_token");
      
      console.log('=== REVENUE EXPORT DEBUG ===');
      console.log('Export parameters:', { exportStartDate, exportEndDate, includeEventFilter, selectedEvent });
      
      // Get tickets with date filter
      let ticketUrl = "https://de.imcbs.com/api/admin/reports/tickets/?";
      const ticketParams = [];
      if (includeEventFilter && selectedEvent) ticketParams.push(`event_id=${selectedEvent}`);
      if (exportStartDate) ticketParams.push(`start_date=${exportStartDate}`);
      if (exportEndDate) ticketParams.push(`end_date=${exportEndDate}`);
      ticketUrl += ticketParams.join("&");
      
      console.log('🎫 Fetching tickets URL:', ticketUrl);
      const ticketResponse = await axios.get(ticketUrl, { headers: { Authorization: `Bearer ${token}` } });
      
      console.log('🎫 Raw ticket response:', ticketResponse.data);
      const tickets = ticketResponse.data.tickets || ticketResponse.data || [];
      console.log('🎫 Tickets array length:', tickets.length);
      console.log('🎫 First 3 tickets:', tickets.slice(0, 3));
      
      // Client-side date filtering as backup
      let filteredTickets = tickets;
      if (exportStartDate || exportEndDate) {
        console.log('📅 Applying client-side date filtering...');
        filteredTickets = tickets.filter((ticket: any) => {
          const ticketDate = ticket.date || ticket.created_at || ticket.timestamp;
          if (!ticketDate) {
            console.log('⚠️ Ticket has no date field:', ticket);
            return true;
          }
          
          const tDate = new Date(ticketDate).toISOString().split('T')[0];
          const startOk = !exportStartDate || tDate >= exportStartDate;
          const endOk = !exportEndDate || tDate <= exportEndDate;
          
          return startOk && endOk;
        });
        console.log(`🔍 Date filtering: ${tickets.length} -> ${filteredTickets.length} tickets`);
      }
      
      if (filteredTickets.length === 0) {
        console.log('❌ No tickets found, exporting empty revenue');
        exportRevenueReport(
          { total_revenue: '0', revenue_by_event: [] },
          {
            eventName: includeEventFilter && selectedEvent ? events.find(e => e.id.toString() === selectedEvent)?.name : undefined,
            startDate: exportStartDate,
            endDate: exportEndDate
          }
        );
        return;
      }
      
      console.log('💰 Calculating revenue from filtered tickets...');
      const revenueByEvent = new Map();
      
      filteredTickets.forEach((ticket: any, index: number) => {
        if (index < 3) console.log(`Processing ticket ${index}:`, ticket);
        
        const eventName = ticket.event_name || ticket.event || 'Unknown Event';
        const eventCode = ticket.event_code || ticket.code || '';
        const price = parseFloat(ticket.price || '0');
        
        if (index < 3) console.log(`Event: ${eventName}, Price: ${price}`);
        
        if (revenueByEvent.has(eventName)) {
          const existing = revenueByEvent.get(eventName);
          existing.ticket_count += 1;
          existing.total_revenue += price;
        } else {
          revenueByEvent.set(eventName, {
            event_name: eventName,
            event_code: eventCode,
            ticket_count: 1,
            total_revenue: price
          });
        }
      });
      
      console.log('💰 Revenue by event map:', Array.from(revenueByEvent.entries()));
      
      const revenueEvents = Array.from(revenueByEvent.values()).map(event => ({
        event__name: event.event_name,
        event__code: event.event_code,
        ticket_count: event.ticket_count,
        total_revenue: event.total_revenue.toString()
      }));
      
      const totalRevenue = revenueEvents.reduce((sum, event) => sum + parseFloat(event.total_revenue), 0);
      
      const finalRevenueData = {
        total_revenue: totalRevenue.toString(),
        revenue_by_event: revenueEvents
      };
      
      console.log('✅ Final revenue data:', finalRevenueData);
      console.log('================================');
      
      const selectedEventName = includeEventFilter && selectedEvent 
        ? events.find(e => e.id.toString() === selectedEvent)?.name 
        : undefined;
      
      exportRevenueReport(
        finalRevenueData,
        {
          eventName: selectedEventName,
          startDate: exportStartDate,
          endDate: exportEndDate
        }
      );
    } catch (error) {
      console.error('❌ Revenue export failed:', error);
      throw error;
    }
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
              <DatePicker
                id="startDate"
                value={startDate}
                onChange={(date) => handleDateChange(date, endDate)}
                placeholder="Select start date"
                maxDate={endDate || undefined}
              />
            </div>
            <div>
              <Label htmlFor="endDate">End Date</Label>
              <DatePicker
                id="endDate"
                value={endDate}
                onChange={(date) => handleDateChange(startDate, date)}
                placeholder="Select end date"
                minDate={startDate || undefined}
              />
            </div>
          </div>
          <div className="mt-4 flex justify-end">
            <ExportWithDateRangeButton
              onExport={handleRevenueExport}
              disabled={!revenueData}
              title="Revenue Report"
              hasEventFilter={!!selectedEvent}
              eventFilterName={events.find(e => e.id.toString() === selectedEvent)?.name || ''}
            >
              Export Revenue Report
            </ExportWithDateRangeButton>
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