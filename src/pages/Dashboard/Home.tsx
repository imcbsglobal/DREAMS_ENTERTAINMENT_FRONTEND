import PageMeta from "../../components/common/PageMeta";
import { Link } from "react-router";
import ReactApexChart from "react-apexcharts";
import { useState, useEffect } from "react";
import axios from "axios";
import { useTheme } from "../../context/ThemeContext";

function AnimatedCounter({ value, duration = 500 }) {
  const [displayValue, setDisplayValue] = useState(value);
  const [prevValue, setPrevValue] = useState(value);

  useEffect(() => {
    if (value === prevValue) return;

    // Convert numbers to strings to compare digits
    const prevStr = String(prevValue).padStart(String(value).length, '0');
    const newStr = String(value).padStart(String(value).length, '0');
    
    // Find which digits changed
    const digits = newStr.split('').map((digit, index) => ({
      value: digit,
      changed: digit !== prevStr[index],
      prevValue: prevStr[index]
    }));

    // Animate only changed digits
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

  // Split display value into individual digits for animation
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

export default function Home() {
  const { theme } = useTheme();
  const [chartData, setChartData] = useState([]);
  const [stats, setStats] = useState({
    totalEvents: 0,
    totalStaff: 0,
    ticketsSold: 0
  });
  const [loading, setLoading] = useState(true);
  const [lastTicketCount, setLastTicketCount] = useState(0);
  
  // New state for graph filters
  const [chartDateRange, setChartDateRange] = useState('last30days');
  const [chartEventFilter, setChartEventFilter] = useState('');
  const [events, setEvents] = useState([]);
  const [chartStats, setChartStats] = useState({
    avgDaily: 0,
    peakDay: { date: '', count: 0 },
    lowDay: { date: '', count: 0 },
    totalInRange: 0
  });

  useEffect(() => {
    fetchData();
  }, []);

  // Separate effect for live ticket count monitoring
  useEffect(() => {
    const checkTicketCount = async () => {
      try {
        const token = localStorage.getItem("access_token");
        const headers = { Authorization: `Bearer ${token}` };
        
        const revenueRes = await axios.get('https://de.imcbs.com/api/admin/reports/revenue/', { headers });
        const currentTicketCount = revenueRes.data.revenue_by_event?.reduce((sum, e) => sum + (e.ticket_count || 0), 0) || 0;
        
        // Only update if count has changed
        if (currentTicketCount !== lastTicketCount) {
          setStats(prevStats => ({
            ...prevStats,
            ticketsSold: currentTicketCount
          }));
          setLastTicketCount(currentTicketCount);
          
          // Graph live update removed - chart will not auto-refresh
          // fetchChartData(headers);
        }
      } catch (error) {
        console.error('Failed to check ticket count:', error);
      }
    };
    
    // Check every 5 seconds for changes
    const intervalId = setInterval(checkTicketCount, 5000);
    
    return () => clearInterval(intervalId);
  }, [lastTicketCount]);

  const fetchData = async () => {
    try {
      const token = localStorage.getItem("access_token");
      const headers = { Authorization: `Bearer ${token}` };

      const [eventsRes, staffRes, revenueRes] = await Promise.all([
        axios.get('https://de.imcbs.com/api/admin/event-list/', { headers }),
        axios.get('https://de.imcbs.com/api/admin/staff-list/', { headers }),
        axios.get('https://de.imcbs.com/api/admin/reports/revenue/', { headers })
      ]);

      const ticketsSold = revenueRes.data.revenue_by_event?.reduce((sum, e) => sum + (e.ticket_count || 0), 0) || 0;
      
      setStats({
        totalEvents: eventsRes.data.length || 0,
        totalStaff: staffRes.data.length || 0,
        ticketsSold: ticketsSold
      });
      setLastTicketCount(ticketsSold);
      setEvents(eventsRes.data || []);

      // Fetch ticket data for chart
      await fetchChartData(headers);
    } catch (error) {
      console.error('Failed to fetch data:', error);
      setChartData([
        { x: 'Jan', y: 120 },
        { x: 'Feb', y: 95 },
        { x: 'Mar', y: 150 },
        { x: 'Apr', y: 200 },
        { x: 'May', y: 180 },
        { x: 'Jun', y: 220 }
      ]);
    } finally {
      setLoading(false);
    }
  };
  
  const fetchChartData = async (headers) => {
    try {
      console.log('🔄 Fetching chart data with pagination...');
      
      // Fetch all tickets using pagination
      let allTickets = [];
      let currentPage = 1;
      const pageSize = 500; // Fetch 500 tickets per page
      let hasMore = true;
      
      while (hasMore) {
        const url = `https://de.imcbs.com/api/admin/reports/tickets/?page=${currentPage}&page_size=${pageSize}`;
        console.log(`Fetching page ${currentPage}...`);
        
        const ticketsRes = await axios.get(url, { headers });
        
        // Handle both paginated and non-paginated responses
        let pageTickets = [];
        if (ticketsRes.data.results && ticketsRes.data.results.tickets) {
          // Paginated response
          pageTickets = ticketsRes.data.results.tickets;
          hasMore = !!ticketsRes.data.next;
        } else if (ticketsRes.data.tickets) {
          // Non-paginated response
          pageTickets = ticketsRes.data.tickets;
          hasMore = false;
        } else if (Array.isArray(ticketsRes.data)) {
          // Direct array response
          pageTickets = ticketsRes.data;
          hasMore = false;
        }
        
        allTickets = [...allTickets, ...pageTickets];
        console.log(`Page ${currentPage}: Loaded ${pageTickets.length} tickets. Total: ${allTickets.length}`);
        
        currentPage++;
        
        // Safety limit to prevent infinite loops
        if (currentPage > 50) {
          console.warn('⚠️ Reached page limit (50 pages)');
          break;
        }
        
        if (!hasMore) break;
      }
      
      console.log(`✅ Total tickets fetched: ${allTickets.length}`);
      console.log('Sample ticket:', allTickets[0]);
      
      processChartData(allTickets);
    } catch (error) {
      console.error('Failed to fetch chart data:', error);
      console.error('Error details:', error.response?.data);
      
      // Set empty chart data on error
      setChartData([]);
    }
  };
  
  const processChartData = (tickets) => {
    console.log('=== PROCESS CHART DATA START ===');
    console.log('Total tickets received:', tickets.length);
    console.log('Current date range filter:', chartDateRange);
    console.log('Current event filter:', chartEventFilter);
    
    if (tickets.length === 0) {
      console.warn('No tickets received from API');
      setChartData([]);
      return;
    }
    
    // Calculate date range
    const now = new Date();
    let startDate = new Date();
    
    switch(chartDateRange) {
      case 'today':
        startDate.setHours(0, 0, 0, 0);
        break;
      case 'last7days':
        startDate.setDate(now.getDate() - 7);
        break;
      case 'last30days':
        startDate.setDate(now.getDate() - 30);
        break;
      case 'thisMonth':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case 'last6months':
        startDate.setMonth(now.getMonth() - 6);
        break;
      case 'thisYear':
        startDate = new Date(now.getFullYear(), 0, 1);
        break;
      default:
        startDate.setDate(now.getDate() - 30);
    }
    
    console.log('Date range:', { 
      startDate: startDate.toISOString(), 
      endDate: now.toISOString(),
      startDateLocal: startDate.toLocaleDateString(),
      endDateLocal: now.toLocaleDateString()
    });
    
    // Log first few tickets to see their dates
    console.log('Sample tickets (first 3):', tickets.slice(0, 3).map(t => ({
      created_at: t.created_at,
      event_name: t.event_name,
      parsed_date: new Date(t.created_at).toISOString()
    })));
    
    // Filter tickets by date range and event
    let filteredTickets = tickets.filter(ticket => {
      const ticketDate = new Date(ticket.created_at);
      const inDateRange = ticketDate >= startDate && ticketDate <= now;
      const matchesEvent = !chartEventFilter || ticket.event_name === chartEventFilter;
      
      if (!inDateRange) {
        console.log('Ticket outside date range:', {
          ticket_date: ticketDate.toISOString(),
          start: startDate.toISOString(),
          end: now.toISOString()
        });
      }
      
      return inDateRange && matchesEvent;
    });
    
    console.log('Filtered tickets count:', filteredTickets.length);
    
    // If no tickets in date range, show all tickets (fallback)
    if (filteredTickets.length === 0 && tickets.length > 0) {
      console.warn('⚠️ No tickets in selected date range, using ALL tickets as fallback');
      filteredTickets = tickets;
    }
    
    if (filteredTickets.length === 0) {
      console.error('❌ No tickets to display after filtering');
      setChartData([]);
      return;
    }
    
    // Group by appropriate time unit
    const groupedData = {};
    const isHourly = chartDateRange === 'today';
    const isDaily = ['last7days', 'last30days', 'thisMonth'].includes(chartDateRange);
    const isMonthly = ['last6months', 'thisYear'].includes(chartDateRange);
    
    filteredTickets.forEach(ticket => {
      const date = new Date(ticket.created_at);
      let key;
      
      if (isHourly) {
        // Group by hour for today
        key = date.toLocaleTimeString('en-US', { hour: '2-digit', hour12: true });
      } else if (isDaily) {
        // Group by day
        key = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      } else if (isMonthly) {
        // Group by month with year
        key = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
      } else {
        // Default: month-year
        key = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
      }
      
      groupedData[key] = (groupedData[key] || 0) + 1;
    });
    
    // Convert to chart series format
    const chartSeries = Object.entries(groupedData)
      .map(([key, count]) => ({ x: key, y: count }))
      .sort((a, b) => {
        // Sort chronologically
        const dateA = new Date(a.x);
        const dateB = new Date(b.x);
        return dateA - dateB;
      });
    
    setChartData(chartSeries);
    
    // Calculate statistics
    if (chartSeries.length > 0) {
      const counts = chartSeries.map(d => d.y);
      const total = counts.reduce((sum, c) => sum + c, 0);
      const avg = Math.round(total / chartSeries.length);
      const max = Math.max(...counts);
      const min = Math.min(...counts);
      const peakIndex = counts.indexOf(max);
      const lowIndex = counts.indexOf(min);
      
      setChartStats({
        avgDaily: avg,
        peakDay: { date: chartSeries[peakIndex].x, count: max },
        lowDay: { date: chartSeries[lowIndex].x, count: min },
        totalInRange: total
      });
    }
  };
  
  // Refresh chart when filters change
  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (token) {
      const headers = { Authorization: `Bearer ${token}` };
      fetchChartData(headers);
    }
  }, [chartDateRange, chartEventFilter]);
  return (
    <>
      <PageMeta
        title="Dashboard | Dreams Entertainment"
        description="Dreams Entertainment Dashboard"
      />
      <div className="p-4">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
          <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span>Live Updates</span>
            </div>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Events</h3>
                <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">
                  <AnimatedCounter value={stats.totalEvents} />
                </p>
              </div>
              <svg className="w-10 h-10 text-brand-500 dark:text-brand-400" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
          </div>
          
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Staff</h3>
                <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">
                  <AnimatedCounter value={stats.totalStaff} />
                </p>
              </div>
              <svg className="w-10 h-10 text-brand-500 dark:text-brand-400" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
          </div>
          
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Tickets Sold</h3>
                <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">
                  <AnimatedCounter value={stats.ticketsSold} />
                </p>
              </div>
              <svg className="w-10 h-10 text-brand-500 dark:text-brand-400" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="mt-8">
          <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <button className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-4 hover:border-brand-500 dark:hover:border-brand-500 transition-colors text-left">
              <Link to="/create-event" className="flex items-center gap-3">
                <svg className="w-6 h-6 text-brand-500 dark:text-brand-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
                <span className="font-medium text-gray-900 dark:text-white">Create New Event</span>
              </Link>
            </button>

            <button className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-4 hover:border-brand-500 dark:hover:border-brand-500 transition-colors text-left">
              <Link to="/create-staff" className="flex items-center gap-3">
                <svg className="w-6 h-6 text-brand-500 dark:text-brand-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                </svg>
                <span className="font-medium text-gray-900 dark:text-white">Add Staff Member</span>
              </Link>
            </button>

            <button className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-4 hover:border-brand-500 dark:hover:border-brand-500 transition-colors text-left">
              <Link to="/ticket-revenue-report" className="flex items-center gap-3">
                <svg className="w-6 h-6 text-brand-500 dark:text-brand-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <span className="font-medium text-gray-900 dark:text-white">View Reports</span>
              </Link>
            </button>
          </div>
        </div>

        <div className="mt-8">
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-6">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Tickets Sold Report</h2>
              
              <div className="flex flex-wrap items-center gap-3">
                {/* Debug Info */}
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  {stats.ticketsSold > 0 && `${stats.ticketsSold} total tickets`}
                </div>
                
                {/* Date Range Filter */}
                <select
                  value={chartDateRange}
                  onChange={(e) => setChartDateRange(e.target.value)}
                  className="h-9 rounded-lg border bg-white text-gray-800 border-gray-300 focus:border-brand-500 focus:ring-brand-500/20 dark:border-gray-700 dark:text-white dark:focus:border-brand-500 px-3 py-1.5 text-sm shadow-sm focus:outline-none focus:ring-2 dark:bg-gray-800 transition-colors"
                >
                  <option value="today">Today</option>
                  <option value="last7days">Last 7 Days</option>
                  <option value="last30days">Last 30 Days</option>
                  <option value="thisMonth">This Month</option>
                  <option value="last6months">Last 6 Months</option>
                  <option value="thisYear">This Year</option>
                </select>
                
                {/* Event Filter */}
                <select
                  value={chartEventFilter}
                  onChange={(e) => setChartEventFilter(e.target.value)}
                  className="h-9 rounded-lg border bg-white text-gray-800 border-gray-300 focus:border-brand-500 focus:ring-brand-500/20 dark:border-gray-700 dark:text-white dark:focus:border-brand-500 px-3 py-1.5 text-sm shadow-sm focus:outline-none focus:ring-2 dark:bg-gray-800 transition-colors"
                >
                  <option value="">All Events</option>
                  {events.map(event => (
                    <option key={event.id} value={event.name}>
                      {event.name}
                    </option>
                  ))}
                </select>
                
                {/* Clear Filters */}
                {(chartDateRange !== 'last30days' || chartEventFilter) && (
                  <button
                    onClick={() => {
                      setChartDateRange('last30days');
                      setChartEventFilter('');
                    }}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-lg hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-500 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-600 transition-colors"
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    Reset
                  </button>
                )}
              </div>
            </div>
            
            {/* Statistics Cards - Removed as requested */}
            {/* {chartData.length > 0 && (
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
                  <div className="text-xs text-blue-600 dark:text-blue-400 font-medium mb-1">Total in Range</div>
                  <div className="text-xl font-bold text-blue-900 dark:text-blue-100">{chartStats.totalInRange}</div>
                </div>
                
                <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3">
                  <div className="text-xs text-green-600 dark:text-green-400 font-medium mb-1">Average</div>
                  <div className="text-xl font-bold text-green-900 dark:text-green-100">{chartStats.avgDaily}/period</div>
                </div>
                
                <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg p-3">
                  <div className="text-xs text-purple-600 dark:text-purple-400 font-medium mb-1">Peak Day</div>
                  <div className="text-sm font-bold text-purple-900 dark:text-purple-100">{chartStats.peakDay.count}</div>
                  <div className="text-xs text-purple-600 dark:text-purple-400 truncate">{chartStats.peakDay.date}</div>
                </div>
                
                <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg p-3">
                  <div className="text-xs text-orange-600 dark:text-orange-400 font-medium mb-1">Low Day</div>
                  <div className="text-sm font-bold text-orange-900 dark:text-orange-100">{chartStats.lowDay.count}</div>
                  <div className="text-xs text-orange-600 dark:text-orange-400 truncate">{chartStats.lowDay.date}</div>
                </div>
              </div>
            )} */}
            {loading ? (
              <div className="flex items-center justify-center h-64">
                <div className="flex items-center gap-2">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-brand-600"></div>
                  <span className="text-gray-500 dark:text-gray-400">Loading chart...</span>
                </div>
              </div>
            ) : chartData.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64">
                <div className="bg-gray-100 dark:bg-gray-700 w-16 h-16 rounded-full flex items-center justify-center mb-3">
                  <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-1">No Data Available</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">No tickets found for the selected filters.</p>
              </div>
            ) : (
              <ReactApexChart
                options={{
                  chart: {
                    type: 'line',
                    height: 300,
                    toolbar: { show: false },
                    background: 'transparent',
                    zoom: { enabled: false },
                    animations: {
                      enabled: true,
                      easing: 'easeinout',
                      speed: 800,
                      animateGradually: {
                        enabled: true,
                        delay: 150
                      },
                      dynamicAnimation: {
                        enabled: true,
                        speed: 350
                      }
                    }
                  },
                  colors: [theme === 'dark' ? '#FFFFFF' : '#000000'],
                  dataLabels: { enabled: false },
                  stroke: { 
                    width: 3,
                    curve: 'smooth'
                  },
                  markers: {
                    size: 5,
                    colors: [theme === 'dark' ? '#FFFFFF' : '#000000'],
                    strokeColors: theme === 'dark' ? '#000000' : '#fff',
                    strokeWidth: 2,
                    hover: {
                      size: 7
                    }
                  },
                  grid: {
                    borderColor: theme === 'dark' ? '#374151' : '#E5E7EB',
                    strokeDashArray: 4,
                    xaxis: {
                      lines: {
                        show: true
                      }
                    },
                    yaxis: {
                      lines: {
                        show: true
                      }
                    }
                  },
                  xaxis: {
                    type: 'category',
                    title: { 
                      text: chartDateRange === 'today' ? 'Hours' : chartDateRange.includes('month') || chartDateRange.includes('Year') ? 'Months' : 'Days',
                      style: {
                        color: theme === 'dark' ? '#9CA3AF' : '#6B7280',
                        fontSize: '12px',
                        fontWeight: 500
                      }
                    },
                    labels: {
                      style: { 
                        colors: theme === 'dark' ? '#9CA3AF' : '#6B7280'
                      },
                      rotate: -45,
                      rotateAlways: chartData.length > 10
                    }
                  },
                  yaxis: {
                    title: {
                      text: 'Tickets Sold',
                      style: {
                        color: theme === 'dark' ? '#9CA3AF' : '#6B7280',
                        fontSize: '12px',
                        fontWeight: 500
                      }
                    },
                    labels: {
                      style: { 
                        colors: theme === 'dark' ? '#9CA3AF' : '#6B7280'
                      },
                      formatter: function(val) {
                        return Math.round(val);
                      }
                    }
                  },
                  tooltip: {
                    theme: theme === 'dark' ? 'dark' : 'light',
                    style: {
                      fontSize: '12px'
                    },
                    x: {
                      show: true
                    },
                    y: {
                      formatter: function(val) {
                        return val + ' tickets sold';
                      },
                      title: {
                        formatter: () => ''
                      }
                    }
                  }
                }}
                series={[
                  {
                    name: 'Tickets Sold',
                    data: chartData
                  }
                ]}
                type="line"
                height={300}
              />
            )}
          </div>
        </div>
      </div>
    </>
  );
}
