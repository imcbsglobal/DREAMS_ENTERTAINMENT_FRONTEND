import { useState, useEffect, useRef } from "react";
import axios from "axios";
import PageMeta from "../../components/common/PageMeta";
import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import ComponentCard from "../../components/common/ComponentCard";
import Label from "../../components/form/Label";
import DatePicker from "../../components/form/DatePicker";
import ExportWithDateRangeButton from "../../components/common/ExportWithDateRangeButton";
import { exportTicketReport, exportRevenueReport } from "../../utils/excelExport";

// AnimatedCounter Component for live updates
function AnimatedCounter({ value, duration = 500 }) {
  const [displayValue, setDisplayValue] = useState(value);
  const [prevValue, setPrevValue] = useState(value);

  useEffect(() => {
    if (value === prevValue) return;

    const prevStr = String(prevValue).padStart(String(value).length, '0');
    const newStr = String(value).padStart(String(value).length, '0');

    let startTime;
    const animate = (currentTime) => {
      if (!startTime) startTime = currentTime;
      const progress = Math.min((currentTime - startTime) / duration, 1);
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        setDisplayValue(value);
        setPrevValue(value);
      }
    };
    
    requestAnimationFrame(animate);
  }, [value, prevValue, duration]);

  const valueStr = String(displayValue);
  const newValueStr = String(value);
  
  return (
    <span className="inline-flex">
      {valueStr.split('').map((digit, index) => {
        const isChanging = digit !== newValueStr[index];
        return (
          <span
            key={index}
            className={`inline-block transition-all duration-300 ${
              isChanging ? 'animate-pulse scale-110 text-green-600 dark:text-green-400' : ''
            }`}
            style={{
              minWidth: '0.6em',
              textAlign: 'center'
            }}
          >
            {newValueStr[index] || digit}
          </span>
        );
      })}
    </span>
  );
}

interface Ticket {
  id: number;
  ticket_id: string;
  ticket_code?: string;
  event_name: string;
  event_code?: string;
  sub_event_name?: string;
  entry_type_name: string;
  entry_type?: string;
  staff_username: string;
  customer_name?: string;
  customer_email?: string;
  price: string;
  created_at: string;
}

interface Event {
  id: number;
  name: string;
  code: string;
}

interface TicketReportResponse {
  total_tickets: number;
  tickets: Ticket[];
}

interface PaginatedTicketReportResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: TicketReportResponse;
}

interface EntryTypeCount {
  entry_type_name: string;
  count: number;
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

export default function TicketRevenueReport() {
  const [activeTab] = useState<"ticket" | "revenue">("ticket");
  
  // Ticket Report State
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [totalTickets, setTotalTickets] = useState(0);
  const [todayTickets, setTodayTickets] = useState(0);
  const [entryTypeCounts, setEntryTypeCounts] = useState<EntryTypeCount[]>([]);
  const [ticketLoading, setTicketLoading] = useState(true);
  const [entryTypeLoading, setEntryTypeLoading] = useState(false);
  
  // Revenue Report State
  const [revenueData, setRevenueData] = useState<RevenueReportResponse | null>(null);
  const [revenueLoading, setRevenueLoading] = useState(false);
  
  // Shared State
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedEvent, setSelectedEvent] = useState(""); // Default to all events
  const [startDate, setStartDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split('T')[0]; // Format: YYYY-MM-DD
  });
  const [endDate, setEndDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split('T')[0]; // Format: YYYY-MM-DD
  });
  const [dateFilter, setDateFilter] = useState<"all" | "today" | "custom">("custom"); // Default to custom
  
  // Minimize/Expand State
  const [isRevenueMinimized, setIsRevenueMinimized] = useState(false);
  const [isEntryTypeMinimized, setIsEntryTypeMinimized] = useState(false);
  const [isTicketTableMinimized, setIsTicketTableMinimized] = useState(false);
  
  // API Pagination State (for backend pagination)
  const [apiPage, setApiPage] = useState(1);
  const [apiPageSize, setApiPageSize] = useState(100); // Backend page size
  const [hasNextPage, setHasNextPage] = useState(false);
  const [hasPreviousPage, setHasPreviousPage] = useState(false);
  
  // Live update state
  const [lastTotalTickets, setLastTotalTickets] = useState(0);
  const [lastTodayTickets, setLastTodayTickets] = useState(0);
  const [lastRevenue, setLastRevenue] = useState("0");
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    loadEvents();
    fetchTodayTicketCount(); // Fetch today's count on mount
  }, []);
  
  // Live update effect - polls every 5 seconds
  useEffect(() => {
    const checkLiveUpdates = async () => {
      // Only poll when page is visible
      if (document.hidden) return;
      
      try {
        // Cancel previous request if still running
        if (abortControllerRef.current) {
          abortControllerRef.current.abort();
        }
        abortControllerRef.current = new AbortController();
        
        const token = localStorage.getItem("access_token");
        const headers = { Authorization: `Bearer ${token}` };
        
        // Build URL with current filters
        let ticketUrl = "https://de.imcbs.com/api/admin/reports/tickets/?page=1&page_size=1";
        let revenueUrl = "https://de.imcbs.com/api/admin/reports/revenue/";
        let todayUrl = "https://de.imcbs.com/api/admin/reports/tickets/?today=true&page=1&page_size=1";
        
        const params = [];
        if (selectedEvent) params.push(`event_id=${selectedEvent}`);
        if (startDate) params.push(`start_date=${startDate}`);
        if (endDate) params.push(`end_date=${endDate}`);
        
        if (params.length > 0) {
          const paramStr = params.join("&");
          ticketUrl += '&' + paramStr;
          revenueUrl += '?' + paramStr;
        }
        
        // Fetch all three in parallel
        const [ticketRes, revenueRes, todayRes] = await Promise.all([
          axios.get(ticketUrl, { headers, signal: abortControllerRef.current.signal }),
          axios.get(revenueUrl, { headers, signal: abortControllerRef.current.signal }),
          axios.get(todayUrl, { headers, signal: abortControllerRef.current.signal })
        ]);
        
        // Update total tickets if changed
        const isPaginated = 'results' in ticketRes.data;
        const newTotalTickets = isPaginated ? ticketRes.data.count : (ticketRes.data as any).total_tickets || 0;
        
        if (newTotalTickets !== lastTotalTickets) {
          setTotalTickets(newTotalTickets);
          setLastTotalTickets(newTotalTickets);
        }
        
        // Update today's tickets if changed
        const isTodayPaginated = 'results' in todayRes.data;
        const newTodayTickets = isTodayPaginated ? todayRes.data.count : (todayRes.data as any).total_tickets || 0;
        
        if (newTodayTickets !== lastTodayTickets) {
          setTodayTickets(newTodayTickets);
          setLastTodayTickets(newTodayTickets);
        }
        
        // Update revenue if changed
        const newRevenue = revenueRes.data.total_revenue || "0";
        if (newRevenue !== lastRevenue) {
          setRevenueData(revenueRes.data);
          setLastRevenue(newRevenue);
        }
        
      } catch (error: any) {
        // Ignore abort errors
        if (error.name !== 'CanceledError' && error.name !== 'AbortError') {
          console.error('Live update failed:', error);
        }
      }
    };
    
    // Initial check
    checkLiveUpdates();
    
    // Poll every 5 seconds
    const intervalId = setInterval(checkLiveUpdates, 5000);
    
    // Cleanup
    return () => {
      clearInterval(intervalId);
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [selectedEvent, startDate, endDate, lastTotalTickets, lastTodayTickets, lastRevenue]);

  useEffect(() => {
    console.log('TicketRevenueReport useEffect triggered:', {
      selectedEvent,
      startDate,
      endDate
    });
    setApiPage(1); // Reset API page
    
    loadTickets();
    fetchRevenue();
    fetchEntryTypeBreakdown(); // Fetch complete entry type breakdown
  }, [selectedEvent, startDate, endDate]);
  
  useEffect(() => {
    // Load tickets when API page changes
    loadTickets();
  }, [apiPage, apiPageSize]);

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

  const fetchTodayTicketCount = async () => {
    try {
      const token = localStorage.getItem("access_token");
      const response = await axios.get<PaginatedTicketReportResponse>(
        "https://de.imcbs.com/api/admin/reports/tickets/?today=true",
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      const isPaginated = 'results' in response.data;
      const count = isPaginated ? response.data.count : (response.data as any).total_tickets || 0;
      setTodayTickets(count);
      console.log('Today\'s ticket count:', count);
    } catch (err) {
      console.error("Failed to fetch today's ticket count:", err);
    }
  };

  const loadTickets = async () => {
    setTicketLoading(true);
    try {
      const token = localStorage.getItem("access_token");
      let url = "https://de.imcbs.com/api/admin/reports/tickets/";
      
      const params = [];
      if (selectedEvent) params.push(`event_id=${selectedEvent}`);
      if (startDate) {
        params.push(`start_date=${startDate}`);
        console.log('Adding start_date filter:', startDate);
      }
      if (endDate) {
        params.push(`end_date=${endDate}`);
        console.log('Adding end_date filter:', endDate);
      }
      
      // Add pagination parameters
      params.push(`page=${apiPage}`);
      params.push(`page_size=${apiPageSize}`);
      
      if (params.length > 0) {
        url += '?' + params.join("&");
      }
      
      console.log('Loading tickets with URL:', url);
      console.log('Current filter state:', { selectedEvent, startDate, endDate, apiPage, apiPageSize });
      
      const response = await axios.get<PaginatedTicketReportResponse>(url, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // Check if response is paginated or not
      const isPaginated = 'results' in response.data;
      
      let ticketData: Ticket[];
      let totalCount: number;
      
      if (isPaginated) {
        // Paginated response
        console.log('Paginated API Response:', {
          count: response.data.count,
          hasNext: !!response.data.next,
          hasPrevious: !!response.data.previous,
          ticketsInPage: response.data.results.tickets?.length
        });
        
        ticketData = response.data.results.tickets || [];
        totalCount = response.data.count;
        setHasNextPage(!!response.data.next);
        setHasPreviousPage(!!response.data.previous);
      } else {
        // Non-paginated response (backward compatibility)
        console.log('Non-paginated API Response:', {
          totalTickets: (response.data as any).total_tickets,
          ticketsCount: (response.data as any).tickets?.length
        });
        
        ticketData = (response.data as any).tickets || [];
        totalCount = (response.data as any).total_tickets || 0;
        setHasNextPage(false);
        setHasPreviousPage(false);
      }
      
      console.log('Processed ticket data:', {
        totalCount,
        ticketsLoaded: ticketData.length,
        firstTicket: ticketData[0],
        lastTicket: ticketData[ticketData.length - 1]
      });
      
      // Backend now handles all date filtering - no client-side filtering needed
      setTickets(ticketData);
      setTotalTickets(totalCount);
    } catch (err: any) {
      console.error("Failed to fetch tickets:", err);
      
      // Check if it's a large dataset error
      if (err.response?.data?.error) {
        console.warn('Large dataset detected:', err.response.data);
        alert(`Dataset too large. Using pagination automatically.\n\nTotal tickets: ${err.response.data.total_tickets}`);
      }
    } finally {
      setTicketLoading(false);
    }
  };

  const fetchEntryTypeBreakdown = async () => {
    setEntryTypeLoading(true);
    try {
      const token = localStorage.getItem("access_token");
      
      // Fetch ALL tickets to calculate accurate entry type breakdown
      // Backend now handles date filtering, so no client-side filtering needed
      let allTickets: Ticket[] = [];
      let currentBreakdownPage = 1;
      const breakdownPageSize = 500;
      let hasMore = true;
      
      while (hasMore) {
        let url = "https://de.imcbs.com/api/admin/reports/tickets/";
        
        const params = [];
        if (selectedEvent) params.push(`event_id=${selectedEvent}`);
        if (startDate) params.push(`start_date=${startDate}`);
        if (endDate) params.push(`end_date=${endDate}`);
        params.push(`page=${currentBreakdownPage}`);
        params.push(`page_size=${breakdownPageSize}`);
        
        if (params.length > 0) {
          url += '?' + params.join("&");
        }
        
        console.log(`Fetching entry type breakdown page ${currentBreakdownPage}`);
        
        const response = await axios.get<PaginatedTicketReportResponse>(url, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        const isPaginated = 'results' in response.data;
        
        if (isPaginated) {
          const pageTickets = response.data.results.tickets || [];
          allTickets = [...allTickets, ...pageTickets];
          hasMore = !!response.data.next;
        } else {
          allTickets = (response.data as any).tickets || [];
          hasMore = false;
        }
        
        currentBreakdownPage++;
        
        if (currentBreakdownPage > 100) {
          console.warn('Entry type breakdown page limit reached');
          break;
        }
      }
      
      console.log(`Calculating entry type breakdown from ${allTickets.length} tickets`);
      
      // Calculate entry type counts from all tickets (backend already filtered by date)
      const counts = allTickets.reduce((acc: Record<string, number>, ticket) => {
        acc[ticket.entry_type_name] = (acc[ticket.entry_type_name] || 0) + 1;
        return acc;
      }, {});
      
      setEntryTypeCounts(Object.entries(counts).map(([name, count]) => ({ entry_type_name: name, count })));
      
      console.log('Entry type breakdown calculated:', counts);
      
    } catch (err) {
      console.error('Failed to fetch entry type breakdown:', err);
    } finally {
      setEntryTypeLoading(false);
    }
  };

  const fetchRevenue = async () => {
    setRevenueLoading(true);
    try {
      const token = localStorage.getItem("access_token");
      
      // Build URL with filters - backend now handles date filtering
      let url = "https://de.imcbs.com/api/admin/reports/revenue/";
      
      const params = [];
      if (selectedEvent) params.push(`event_id=${selectedEvent}`);
      if (startDate) params.push(`start_date=${startDate}`);
      if (endDate) params.push(`end_date=${endDate}`);
      
      if (params.length > 0) {
        url += '?' + params.join("&");
      }
      
      console.log('Loading revenue with URL:', url);
      
      const res = await axios.get<RevenueReportResponse>(url, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      console.log('Revenue API Response:', {
        totalRevenue: res.data.total_revenue,
        eventsCount: res.data.revenue_by_event?.length,
        events: res.data.revenue_by_event,
        sampleEvent: res.data.revenue_by_event?.[0] ? Object.keys(res.data.revenue_by_event[0]) : []
      });
      
      setRevenueData(res.data);
    } catch (err) {
      console.error("Failed to fetch revenue:", err);
    } finally {
      setRevenueLoading(false);
    }
  };
  


  const handleTicketExport = async () => {
    try {
      const token = localStorage.getItem("access_token");
      
      console.log('=== EXPORT DEBUG INFO ===');
      console.log('Export parameters:', {
        startDate,
        endDate,
        selectedEvent,
        selectedEventName: events.find(e => e.id.toString() === selectedEvent)?.name
      });
      
      // For export, we need to fetch ALL data (not paginated)
      // We'll fetch in batches and combine
      let allTickets: Ticket[] = [];
      let currentExportPage = 1;
      const exportPageSize = 500; // Larger page size for export
      let hasMore = true;
      
      while (hasMore) {
        let url = "https://de.imcbs.com/api/admin/reports/tickets/?";
        
        const params = [];
        if (selectedEvent) {
          params.push(`event_id=${selectedEvent}`);
        }
        if (startDate) params.push(`start_date=${startDate}`);
        if (endDate) params.push(`end_date=${endDate}`);
        params.push(`page=${currentExportPage}`);
        params.push(`page_size=${exportPageSize}`);
        
        url += params.join("&");
        
        console.log(`Fetching export page ${currentExportPage}:`, url);
        
        const response = await axios.get<PaginatedTicketReportResponse>(url, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        const isPaginated = 'results' in response.data;
        
        if (isPaginated) {
          const pageTickets = response.data.results.tickets || [];
          allTickets = [...allTickets, ...pageTickets];
          hasMore = !!response.data.next;
          console.log(`Page ${currentExportPage}: Loaded ${pageTickets.length} tickets, Total so far: ${allTickets.length}`);
        } else {
          // Non-paginated response
          allTickets = (response.data as any).tickets || [];
          hasMore = false;
          console.log(`Non-paginated response: Loaded ${allTickets.length} tickets`);
        }
        
        currentExportPage++;
        
        // Safety limit to prevent infinite loops
        if (currentExportPage > 100) {
          console.warn('Export page limit reached (100 pages)');
          break;
        }
      }
      
      console.log('=== EXPORT DATA COLLECTED ===');
      console.log('Total tickets for export:', allTickets.length);
      
      if (allTickets.length === 0) {
        alert('No tickets to export');
        return;
      }
      
      const exportCounts = allTickets.reduce((acc: Record<string, number>, ticket) => {
        acc[ticket.entry_type_name] = (acc[ticket.entry_type_name] || 0) + 1;
        return acc;
      }, {});
      
      const exportEntryTypeCounts = Object.entries(exportCounts).map(([name, count]) => ({ 
        entry_type_name: name, 
        count 
      }));
      
      const selectedEventName = selectedEvent 
        ? events.find(e => e.id.toString() === selectedEvent)?.name 
        : undefined;
      
      exportTicketReport(
        allTickets,
        exportEntryTypeCounts,
        allTickets.length,
        {
          eventName: selectedEventName,
          startDate: startDate,
          endDate: endDate
        }
      );
      
      console.log('=== EXPORT COMPLETED ===');
    } catch (error) {
      console.error('Failed to fetch data for export:', error);
      alert('Failed to export tickets. Please try again.');
      throw error;
    }
  };

  const handleRevenueExport = async () => {
    try {
      console.log('=== REVENUE EXPORT DEBUG ===');
      console.log('Export parameters:', {
        startDate,
        endDate,
        selectedEvent,
        selectedEventName: events.find(e => e.id.toString() === selectedEvent)?.name
      });
      
      const token = localStorage.getItem("access_token");
      
      // Use revenue API with filters - backend handles date filtering
      let url = "https://de.imcbs.com/api/admin/reports/revenue/";
      
      const params = [];
      if (selectedEvent) params.push(`event_id=${selectedEvent}`);
      if (startDate) params.push(`start_date=${startDate}`);
      if (endDate) params.push(`end_date=${endDate}`);
      
      if (params.length > 0) {
        url += '?' + params.join("&");
      }
      
      console.log('Revenue API URL for export:', url);
      
      const response = await axios.get<RevenueReportResponse>(url, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      const revenueDataToExport = response.data;
      
      const selectedEventName = selectedEvent 
        ? events.find(e => e.id.toString() === selectedEvent)?.name 
        : undefined;
      
      console.log('Exporting revenue data:', {
        totalRevenue: revenueDataToExport.total_revenue,
        eventsCount: revenueDataToExport.revenue_by_event?.length
      });
      
      exportRevenueReport(
        revenueDataToExport,
        {
          eventName: selectedEventName,
          startDate: startDate,
          endDate: endDate
        }
      );
      
      console.log('=== REVENUE EXPORT COMPLETED ===');
    } catch (error) {
      console.error('Failed to export revenue data:', error);
      throw error;
    }
  };
  


  return (
    <>
      <PageMeta
        title="Ticket & Revenue Report | Dream Entertainment"
        description="View tickets and revenue statistics"
      />
      <PageBreadcrumb pageTitle="Ticket & Revenue Report" />
      
      {/* Live Updates Indicator & Manual Refresh */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span>Live Updates Active</span>
          </div>
        </div>
        <button
          onClick={() => {
            setApiPage(1);
            loadTickets();
            fetchRevenue();
            fetchEntryTypeBreakdown();
          }}
          className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-500 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-700 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Refresh Table Data
        </button>
      </div>
      
      <div className="space-y-6">
        {/* Dashboard Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Total Tickets Card */}
          <div className="relative overflow-hidden bg-gradient-to-br from-blue-500 via-blue-600 to-indigo-700 rounded-2xl p-6 text-white shadow-xl">
            {/* Soft abstract circles */}
            <div className="absolute -top-6 -right-6 w-32 h-32 bg-white/8 rounded-full blur-2xl opacity-60"></div>
            <div className="absolute -bottom-8 -left-8 w-40 h-40 bg-white/4 rounded-full blur-3xl opacity-40"></div>
            <div className="absolute top-1/3 right-1/5 w-20 h-20 bg-white/12 rounded-full blur-xl opacity-50"></div>
            <div className="absolute bottom-1/4 left-1/3 w-16 h-16 bg-white/6 rounded-full blur-lg opacity-70"></div>
            <div className="absolute top-3/4 right-2/3 w-12 h-12 bg-white/10 rounded-full blur-md opacity-30"></div>
            
            <div className="relative z-10 flex items-center justify-between">
              <div>
                <p className="text-blue-100 text-sm font-medium mb-1">Total Tickets</p>
                <p className="text-3xl font-bold mb-1"><AnimatedCounter value={totalTickets} /></p>
                <p className="text-blue-100/80 text-xs">
                  {activeTab === 'ticket' ? 'Filtered Results' : 'All Time'}
                </p>
              </div>
              <div className="bg-white/15 backdrop-blur-sm p-3 rounded-xl">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
                </svg>
              </div>
            </div>
          </div>

          {/* Total Revenue Card */}
          <div className="relative overflow-hidden bg-gradient-to-br from-emerald-500 via-green-600 to-teal-700 rounded-2xl p-6 text-white shadow-xl">
            {/* Soft abstract circles */}
            <div className="absolute -top-4 -left-4 w-28 h-28 bg-white/10 rounded-full blur-2xl opacity-50"></div>
            <div className="absolute -bottom-6 -right-6 w-36 h-36 bg-white/5 rounded-full blur-3xl opacity-35"></div>
            <div className="absolute top-1/2 left-1/4 w-18 h-18 bg-white/8 rounded-full blur-xl opacity-60"></div>
            <div className="absolute bottom-1/3 right-1/4 w-14 h-14 bg-white/12 rounded-full blur-lg opacity-45"></div>
            <div className="absolute top-1/4 right-1/2 w-10 h-10 bg-white/7 rounded-full blur-md opacity-55"></div>
            
            <div className="relative z-10 flex items-center justify-between">
              <div>
                <p className="text-green-100 text-sm font-medium mb-1">Total Revenue</p>
                <p className="text-3xl font-bold mb-1">
                  ₹<AnimatedCounter value={revenueData ? Math.round(parseFloat(revenueData.total_revenue)) : 0} />
                </p>
                <p className="text-green-100/80 text-xs">
                  {(startDate || endDate) ? 'Filtered Period' : 'All Time'}
                </p>
              </div>
              <div className="bg-white/15 backdrop-blur-sm p-3 rounded-xl">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                </svg>
              </div>
            </div>
          </div>

          {/* Active Events Card */}
          <div className="relative overflow-hidden bg-gradient-to-br from-purple-500 via-violet-600 to-purple-700 rounded-2xl p-6 text-white shadow-xl">
            {/* Soft abstract circles */}
            <div className="absolute -top-8 -right-8 w-34 h-34 bg-white/6 rounded-full blur-3xl opacity-40"></div>
            <div className="absolute -bottom-4 -left-4 w-24 h-24 bg-white/11 rounded-full blur-2xl opacity-55"></div>
            <div className="absolute top-2/3 right-1/3 w-16 h-16 bg-white/9 rounded-full blur-xl opacity-65"></div>
            <div className="absolute top-1/4 left-1/5 w-20 h-20 bg-white/7 rounded-full blur-lg opacity-45"></div>
            <div className="absolute bottom-1/5 right-1/2 w-8 h-8 bg-white/13 rounded-full blur-sm opacity-70"></div>
            
            <div className="relative z-10 flex items-center justify-between">
              <div>
                <p className="text-purple-100 text-sm font-medium mb-1">Total Events</p>
                <p className="text-3xl font-bold mb-1">
                  {events.length}
                </p>
                <p className="text-purple-100/80 text-xs">
                  In System
                </p>
              </div>
              <div className="bg-white/15 backdrop-blur-sm p-3 rounded-xl">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
            </div>
          </div>

          {/* Today's Tickets Card */}
          <div className="relative overflow-hidden bg-gradient-to-br from-orange-500 via-amber-600 to-yellow-600 rounded-2xl p-6 text-white shadow-xl">
            {/* Soft abstract circles */}
            <div className="absolute -top-6 -left-6 w-30 h-30 bg-white/9 rounded-full blur-2xl opacity-50"></div>
            <div className="absolute -bottom-10 -right-10 w-42 h-42 bg-white/4 rounded-full blur-3xl opacity-30"></div>
            <div className="absolute top-1/4 right-1/4 w-22 h-22 bg-white/12 rounded-full blur-xl opacity-60"></div>
            <div className="absolute bottom-1/3 left-1/4 w-14 h-14 bg-white/8 rounded-full blur-lg opacity-55"></div>
            <div className="absolute top-2/3 left-2/3 w-10 h-10 bg-white/15 rounded-full blur-md opacity-40"></div>
            
            <div className="relative z-10 flex items-center justify-between">
              <div>
                <p className="text-orange-100 text-sm font-medium mb-1">Today's Tickets</p>
                <p className="text-3xl font-bold mb-1">
                  <AnimatedCounter value={todayTickets} />
                </p>
                <p className="text-orange-100/80 text-xs">
                  Generated Today
                </p>
              </div>
              <div className="bg-white/15 backdrop-blur-sm p-3 rounded-xl">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>
        </div>


        {/* Compact Filters Section */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-4 mb-6">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="bg-brand-100 dark:bg-brand-900/30 p-2 rounded-lg">
                <svg className="w-4 h-4 text-brand-600 dark:text-brand-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.414A1 1 0 013 6.707V4z" />
                </svg>
              </div>
              <span className="text-sm font-semibold text-gray-900 dark:text-white">Filters:</span>
              {/* Today's Data Badge */}
              {startDate === new Date().toISOString().split('T')[0] && 
               endDate === new Date().toISOString().split('T')[0] && 
               !selectedEvent && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 border border-blue-200 dark:border-blue-800">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Showing Today's Data
                </span>
              )}
            </div>
            
            <div className="flex-1 min-w-[200px]">
              <select
                id="event"
                value={selectedEvent}
                onChange={(e) => {
                  const value = e.target.value;
                  console.log('Event filter changed:', value);
                  setSelectedEvent(value);
                }}
                className="h-10 w-full rounded-lg border bg-transparent text-gray-800 border-gray-300 focus:border-brand-300 focus:ring-brand-500/20 dark:border-gray-700 dark:text-white/90 dark:focus:border-brand-800 px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 dark:bg-gray-900 placeholder:text-gray-400 dark:placeholder:text-white/30 transition-colors"
              >
                <option value="">All Events</option>
                {events.map(event => (
                  <option key={event.id} value={event.id}>
                    {event.name} {event.code && `(${event.code})`}
                  </option>
                ))}
              </select>
            </div>
            
            <div className="flex-1 min-w-[180px]">
              <DatePicker
                id="startDate"
                value={startDate}
                onChange={(date) => {
                  console.log('Start date changed:', date);
                  setStartDate(date);
                }}
                placeholder="Start date"
                maxDate={endDate || undefined}
              />
            </div>
            
            <div className="flex-1 min-w-[180px]">
              <DatePicker
                id="endDate"
                value={endDate}
                onChange={(date) => {
                  console.log('End date changed:', date);
                  setEndDate(date);
                }}
                placeholder="End date"
                minDate={startDate || undefined}
              />
            </div>
            
            <div className="flex items-center gap-2">
              {(selectedEvent || startDate || endDate) && (
                <>
                  <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 border border-green-200 dark:border-green-800">
                    {[selectedEvent && 'Event', startDate && 'Start', endDate && 'End'].filter(Boolean).length} Active
                  </span>
                  <button
                    onClick={() => {
                      console.log('Clearing all filters');
                      setSelectedEvent('');
                      setStartDate('');
                      setEndDate('');
                      setApiPage(1);
                    }}
                    className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-lg hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-500 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-600 transition-colors"
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    Clear
                  </button>
                </>
              )}
              <div className="flex items-center gap-2">
                <button
                  onClick={handleTicketExport}
                  disabled={ticketLoading}
                  className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-white bg-brand-600 border border-transparent rounded-lg hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Export Ticket
                </button>
                
                <button
                  onClick={handleRevenueExport}
                  disabled={revenueLoading}
                  className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-white bg-green-600 border border-transparent rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Export Revenue
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Revenue Report Content - Moved before tickets */}
        <div className="space-y-6">


          {/* Revenue by Event Table - Compact */}
          {revenueLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="flex items-center gap-2">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-brand-600"></div>
                <span className="text-sm text-gray-500 dark:text-gray-400">Loading revenue data...</span>
              </div>
            </div>
          ) : revenueData?.revenue_by_event?.length > 0 ? (
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
              <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="bg-emerald-100 dark:bg-emerald-900/30 p-1.5 rounded">
                      <svg className="w-4 h-4 text-emerald-600 dark:text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 dark:text-white">Revenue by Event</h3>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {revenueData.revenue_by_event.length} events • Sorted by revenue
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setIsRevenueMinimized(!isRevenueMinimized)}
                    className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                    title={isRevenueMinimized ? 'Expand' : 'Minimize'}
                  >
                    <svg className={`w-4 h-4 transition-transform duration-200 ${isRevenueMinimized ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                </div>
              </div>
              
              {!isRevenueMinimized && (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 dark:bg-gray-700">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Event</th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Tickets</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Revenue</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                      {revenueData.revenue_by_event
                        .sort((a, b) => parseFloat(b.total_revenue) - parseFloat(a.total_revenue))
                        .map((event, index) => {
                          const revenue = parseFloat(event.total_revenue);
                          
                          return (
                            <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-2">
                                  <div className={`w-2 h-2 rounded-full ${
                                    index === 0 ? 'bg-yellow-400' : 
                                    index === 1 ? 'bg-gray-400' : 
                                    index === 2 ? 'bg-amber-600' : 'bg-gray-300'
                                  }`}></div>
                                  <div>
                                    <div className="font-medium text-gray-900 dark:text-white">{event.event__name}</div>
                                    {event.event__code && (
                                      <div className="text-xs text-gray-500 dark:text-gray-400">{event.event__code}</div>
                                    )}
                                  </div>
                                </div>
                              </td>
                              <td className="px-4 py-3 text-center">
                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                                  {event.ticket_count}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-right font-semibold text-gray-900 dark:text-white">
                                ₹{revenue.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm p-8">
              <div className="text-center">
                <div className="bg-gray-100 dark:bg-gray-700 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3">
                  <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-1">No Revenue Data</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">No revenue data available for the selected filters.</p>
              </div>
            </div>
          )}
        </div>

        {/* Ticket Report Content */}
        <div className="space-y-6">
          {/* Entry Type Breakdown */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="bg-blue-100 dark:bg-blue-900/30 p-1.5 rounded">
                    <svg className="w-4 h-4 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white">Entry Type Breakdown</h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {totalTickets.toLocaleString()} total tickets • {entryTypeCounts.length} entry types
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsEntryTypeMinimized(!isEntryTypeMinimized)}
                  className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  title={isEntryTypeMinimized ? 'Expand' : 'Minimize'}
                >
                  <svg className={`w-4 h-4 transition-transform duration-200 ${isEntryTypeMinimized ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
              </div>
            </div>
            
            {!isEntryTypeMinimized && (
              <div className="p-4">
                {entryTypeLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="flex items-center gap-2">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-brand-600"></div>
                      <span className="text-sm text-gray-500 dark:text-gray-400">Loading entry type breakdown...</span>
                    </div>
                  </div>
                ) : entryTypeCounts.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {entryTypeCounts.map((entry) => {
                    const percentage = totalTickets > 0 ? (entry.count / totalTickets) * 100 : 0;
                    const colors = {
                      'VIP': 'bg-purple-500',
                      'General': 'bg-blue-500',
                      'Student': 'bg-green-500',
                      'Senior': 'bg-orange-500',
                      'Child': 'bg-pink-500'
                    };
                    const bgColor = colors[entry.entry_type_name as keyof typeof colors] || 'bg-gray-500';
                    
                    return (
                      <div key={entry.entry_type_name} className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-gray-900 dark:text-white">{entry.entry_type_name}</span>
                          <span className="text-sm font-bold text-gray-900 dark:text-white">{entry.count}</span>
                        </div>
                        <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2">
                          <div 
                            className={`h-2 rounded-full ${bgColor} transition-all duration-300`}
                            style={{ width: `${percentage}%` }}
                          ></div>
                        </div>
                        <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                          {percentage.toFixed(1)}% of total
                        </div>
                      </div>
                    );
                  })}
                </div>
                ) : (
                  <div className="p-8 text-center">
                    <p className="text-sm text-gray-500 dark:text-gray-400">No entry type data available</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Tickets Table */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="bg-indigo-100 dark:bg-indigo-900/30 p-1.5 rounded">
                    <svg className="w-4 h-4 text-indigo-600 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white">Ticket Details</h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Showing {Math.min((apiPage - 1) * apiPageSize + 1, totalTickets)}-{Math.min(apiPage * apiPageSize, totalTickets)} of {totalTickets} tickets • Page {apiPage} of {Math.ceil(totalTickets / apiPageSize)}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsTicketTableMinimized(!isTicketTableMinimized)}
                  className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  title={isTicketTableMinimized ? 'Expand' : 'Minimize'}
                >
                  <svg className={`w-4 h-4 transition-transform duration-200 ${isTicketTableMinimized ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
              </div>
            </div>
            
            {!isTicketTableMinimized && (
              <div className="overflow-x-auto">
                {ticketLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="flex items-center gap-2">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-brand-600"></div>
                      <span className="text-sm text-gray-500 dark:text-gray-400">Loading tickets...</span>
                    </div>
                  </div>
                ) : tickets.length > 0 ? (
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 dark:bg-gray-700">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Ticket</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Staff</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Event</th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Entry Type</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Price</th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                      {tickets.map((ticket) => (
                        <tr key={ticket.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <div className="bg-brand-100 dark:bg-brand-900/30 p-1.5 rounded">
                                <svg className="w-3 h-3 text-brand-600 dark:text-brand-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
                                </svg>
                              </div>
                              <div>
                                <div className="font-medium text-gray-900 dark:text-white">#{ticket.ticket_id}</div>
                                <div className="text-xs text-gray-500 dark:text-gray-400">{ticket.ticket_code || ticket.ticket_id}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center text-white text-xs font-semibold">
                                {ticket.staff_username?.charAt(0)?.toUpperCase() || 'S'}
                              </div>
                              <div>
                                <div className="font-medium text-gray-900 dark:text-white">{ticket.staff_username || 'Staff'}</div>
                                <div className="text-xs text-gray-500 dark:text-gray-400">Staff Member</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div>
                              <div className="font-medium text-gray-900 dark:text-white">{ticket.event_name}</div>
                              {ticket.event_code && (
                                <div className="text-xs text-gray-500 dark:text-gray-400">{ticket.event_code}</div>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                              ticket.entry_type_name === 'VIP' || ticket.entry_type === 'VIP' ? 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200' :
                              ticket.entry_type_name === 'General' || ticket.entry_type === 'General' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' :
                              ticket.entry_type_name === 'Student' || ticket.entry_type === 'Student' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                              ticket.entry_type_name === 'Senior' || ticket.entry_type === 'Senior' ? 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200' :
                              'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
                            }`}>
                              {ticket.entry_type_name || ticket.entry_type}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right font-semibold text-gray-900 dark:text-white">
                            ₹{parseFloat(ticket.price || '0').toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                          <td className="px-4 py-3 text-center text-xs text-gray-500 dark:text-gray-400">
                            <div className="text-sm">
                              <div className="text-gray-900 dark:text-white">
                                {new Date(ticket.created_at).toLocaleDateString('en-IN', {
                                  day: '2-digit',
                                  month: 'short',
                                  year: 'numeric'
                                })}
                              </div>
                              <div className="text-gray-500 dark:text-gray-400">
                                {new Date(ticket.created_at).toLocaleTimeString('en-IN', { 
                                  hour: '2-digit', 
                                  minute: '2-digit',
                                  hour12: true
                                })}
                              </div>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div className="p-8 text-center">
                    <div className="bg-gray-100 dark:bg-gray-700 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3">
                      <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
                      </svg>
                    </div>
                    <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-1">No Tickets Found</h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400">No tickets match the selected filters.</p>
                  </div>
                )}
              </div>
            )}
            {/* Pagination Controls - Backend Pagination */}
            {!isTicketTableMinimized && tickets.length > 0 && (
                <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700">
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                    {/* Page size selector */}
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-700 dark:text-gray-300">Show:</span>
                      <select
                        value={apiPageSize}
                        onChange={(e) => {
                          setApiPageSize(Number(e.target.value));
                          setApiPage(1);
                        }}
                        className="h-8 rounded-lg border bg-transparent text-gray-800 border-gray-300 focus:border-brand-300 focus:ring-brand-500/20 dark:border-gray-700 dark:text-white/90 dark:focus:border-brand-800 px-2 py-1 text-sm shadow-sm focus:outline-none focus:ring-2 dark:bg-gray-900 transition-colors"
                      >
                        <option value={10}>10</option>
                        <option value={50}>50</option>
                        <option value={100}>100</option>
                        <option value={200}>200</option>
                        <option value={500}>500</option>
                      </select>
                      <span className="text-sm text-gray-700 dark:text-gray-300">per page</span>
                    </div>
                    
                    {/* Pagination info */}
                    <div className="text-sm text-gray-700 dark:text-gray-300">
                      Showing {Math.min((apiPage - 1) * apiPageSize + 1, totalTickets)}-{Math.min(apiPage * apiPageSize, totalTickets)} of {totalTickets} tickets
                    </div>
                    
                    {/* Pagination buttons */}
                    <div className="flex items-center gap-2">
                      {/* Previous button */}
                      <button
                        onClick={() => setApiPage(Math.max(1, apiPage - 1))}
                        disabled={!hasPreviousPage || ticketLoading}
                        className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 hover:text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-gray-800 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-300 transition-colors"
                      >
                        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                        Previous
                      </button>
                      
                      {/* Page indicator */}
                      <div className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-gray-300">
                        Page {apiPage} of {Math.ceil(totalTickets / apiPageSize)}
                      </div>
                      
                      {/* Next button */}
                      <button
                        onClick={() => setApiPage(apiPage + 1)}
                        disabled={!hasNextPage || ticketLoading}
                        className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 hover:text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-gray-800 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-300 transition-colors"
                      >
                        Next
                        <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              )}
          </div>
        </div>
      </div>
    </>
  );
}
