import PageMeta from "../../components/common/PageMeta";
import { Link } from "react-router";
import ReactApexChart from "react-apexcharts";
import { useState, useEffect } from "react";
import axios from "axios";
import { useTheme } from "../../context/ThemeContext";

function AnimatedCounter({ value, duration = 2000 }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let startTime;
    const animate = (currentTime) => {
      if (!startTime) startTime = currentTime;
      const progress = Math.min((currentTime - startTime) / duration, 1);
      setCount(Math.floor(progress * value));
      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };
    requestAnimationFrame(animate);
  }, [value, duration]);

  return <span>{count}</span>;
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

  useEffect(() => {
    fetchData();
  }, []);

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

      // Fetch ticket data for chart
      const ticketsRes = await axios.get('https://de.imcbs.com/api/admin/reports/tickets/', { headers });
      const monthlyData = {};
      ticketsRes.data.tickets?.forEach(ticket => {
        const month = new Date(ticket.created_at).toLocaleDateString('en-US', { month: 'short' });
        monthlyData[month] = (monthlyData[month] || 0) + 1;
      });
      
      const chartSeries = Object.entries(monthlyData).map(([month, count]) => ({
        x: month,
        y: count
      }));
      
      setChartData(chartSeries);
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
  return (
    <>
      <PageMeta
        title="Dashboard | Dream Entertainment"
        description="Dream Entertainment Dashboard"
      />
      <div className="p-4">
        <h1 className="text-2xl font-bold mb-6 text-gray-900 dark:text-white">Dashboard</h1>
        
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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

            <button className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-4 hover:border-brand-500 dark:hover:border-brand-500 transition-colors text-left">
              <Link to="/ticket-customization" className="flex items-center gap-3">
                <svg className="w-6 h-6 text-brand-500 dark:text-brand-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                <span className="font-medium text-gray-900 dark:text-white">Customize Tickets</span>
              </Link>
            </button>
          </div>
        </div>

        <div className="mt-8">
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-6">
            <h2 className="text-xl font-bold mb-6 text-gray-900 dark:text-white">Tickets Sold Report</h2>
            {loading ? (
              <div className="flex items-center justify-center h-64">
                <div className="text-gray-500 dark:text-gray-400">Loading chart...</div>
              </div>
            ) : (
              <ReactApexChart
                options={{
                  chart: {
                    type: 'line',
                    height: 300,
                    toolbar: { show: false },
                    background: 'transparent',
                    zoom: { enabled: false }
                  },
                  colors: [theme === 'dark' ? '#ffffff' : '#000000'],
                  dataLabels: { enabled: false },
                  stroke: { 
                    width: 3,
                    curve: 'smooth'
                  },
                  grid: {
                    borderColor: '#E5E7EB',
                    strokeDashArray: 4
                  },
                  xaxis: {
                    type: 'category',
                    title: { text: 'Months' },
                    labels: {
                      style: { colors: '#6B7280' }
                    }
                  },
                  yaxis: {
                    labels: {
                      style: { colors: '#6B7280' }
                    }
                  },
                  tooltip: {
                    theme: 'light',
                    style: {
                      fontSize: '12px',
                      color: '#000000'
                    },
                    x: {
                      show: true,
                      format: 'MMM'
                    },
                    y: {
                      formatter: function(val) {
                        return val + ' tickets sold'
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
