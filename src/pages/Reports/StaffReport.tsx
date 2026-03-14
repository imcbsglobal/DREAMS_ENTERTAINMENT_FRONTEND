import { useState, useEffect } from "react";
import axios from "axios";
import PageMeta from "../../components/common/PageMeta";
import PageBreadcrumb from "../../components/common/PageBreadCrumb";

interface Staff {
  id: number;
  user: {
    username: string;
  };
  staff_code: string;
}

interface StaffSummary {
  staff_id: number;
  username: string;
  staff_code: string;
  role: string;
  range_start: number;
  range_end: number;
  current_counter: number;
  tickets_generated: number;
  total_revenue: string;
  remaining_tickets: number;
}

interface StaffSummaryResponse {
  staff_summary: StaffSummary[];
}

export default function StaffReport() {
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [selectedStaff, setSelectedStaff] = useState("");
  const [summaryData, setSummaryData] = useState<StaffSummaryResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [isTableMinimized, setIsTableMinimized] = useState(false);

  useEffect(() => {
    fetchStaffList();
    fetchSummary();
  }, []);

  const fetchStaffList = async () => {
    try {
      const token = localStorage.getItem("access_token");
      const res = await axios.get<Staff[]>("https://de.imcbs.com/api/admin/staff-list/", {
        headers: { Authorization: `Bearer ${token}` }
      });
      setStaffList(res.data);
    } catch (err) {
      console.error("Failed to fetch staff:", err);
    }
  };

  const fetchSummary = async (staffId = "") => {
    setLoading(true);
    try {
      const token = localStorage.getItem("access_token");
      const url = staffId 
        ? `https://de.imcbs.com/api/admin/reports/staff-summary/?staff_id=${staffId}`
        : "https://de.imcbs.com/api/admin/reports/staff-summary/";
      
      const res = await axios.get<StaffSummaryResponse>(url, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSummaryData(res.data);
    } catch (err) {
      console.error("Failed to fetch summary:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleStaffChange = (staffId: string) => {
    setSelectedStaff(staffId);
    fetchSummary(staffId);
  };



  return (
    <>
      <PageMeta
        title="Staff Report | Dream Entertainment"
        description="View staff performance and ticket statistics"
      />
      <PageBreadcrumb pageTitle="Staff Report" />
      
      <div className="space-y-6">
        {/* Filter Section */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="bg-brand-100 dark:bg-brand-900/30 p-2 rounded-lg">
                <svg className="w-4 h-4 text-brand-600 dark:text-brand-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.414A1 1 0 013 6.707V4z" />
                </svg>
              </div>
              <span className="text-sm font-semibold text-gray-900 dark:text-white">Filter by Staff:</span>
            </div>
            
            <div className="flex-1 min-w-[250px]">
              <select
                id="staff"
                value={selectedStaff}
                onChange={(e) => handleStaffChange(e.target.value)}
                className="h-10 w-full rounded-lg border bg-transparent text-gray-800 border-gray-300 focus:border-brand-300 focus:ring-brand-500/20 dark:border-gray-700 dark:text-white/90 dark:focus:border-brand-800 px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 dark:bg-gray-900 placeholder:text-gray-400 dark:placeholder:text-white/30 transition-colors"
              >
                <option value="">All Staff</option>
                {staffList.map(staff => (
                  <option key={staff.id} value={staff.id}>
                    {staff.user.username} ({staff.staff_code})
                  </option>
                ))}
              </select>
            </div>
            
            {selectedStaff && (
              <button
                onClick={() => handleStaffChange('')}
                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-lg hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-500 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-600 transition-colors"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Staff Performance Table */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="bg-blue-100 dark:bg-blue-900/30 p-1.5 rounded">
                  <svg className="w-4 h-4 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white">Staff Performance</h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {summaryData?.staff_summary?.length || 0} staff members • Sorted by tickets generated
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsTableMinimized(!isTableMinimized)}
                className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                title={isTableMinimized ? 'Expand' : 'Minimize'}
              >
                <svg className={`w-4 h-4 transition-transform duration-200 ${isTableMinimized ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
            </div>
          </div>
          
          {!isTableMinimized && (
            <div className="overflow-x-auto">
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="flex items-center gap-2">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-brand-600"></div>
                    <span className="text-sm text-gray-500 dark:text-gray-400">Loading staff data...</span>
                  </div>
                </div>
              ) : summaryData?.staff_summary?.length > 0 ? (
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Staff</th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Role</th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Range</th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Current</th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Generated</th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Remaining</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Revenue</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {summaryData.staff_summary
                      .sort((a, b) => b.tickets_generated - a.tickets_generated)
                      .map((staff, index) => (
                      <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center text-white text-xs font-semibold">
                              {staff.username?.charAt(0)?.toUpperCase() || 'S'}
                            </div>
                            <div>
                              <div className="font-medium text-gray-900 dark:text-white">{staff.username}</div>
                              <div className="text-xs text-gray-500 dark:text-gray-400">{staff.staff_code}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200 capitalize">
                            {staff.role}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center text-gray-600 dark:text-gray-400">
                          <div className="text-xs">{staff.range_start} - {staff.range_end}</div>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                            {staff.current_counter}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center font-semibold text-blue-600 dark:text-blue-400">
                          {staff.tickets_generated}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                            staff.remaining_tickets < 10 
                              ? "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300"
                              : staff.remaining_tickets < 50
                              ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300"
                              : "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300"
                          }`}>
                            {staff.remaining_tickets}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right font-semibold text-gray-900 dark:text-white">
                          ₹{parseFloat(staff.total_revenue).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="p-8 text-center">
                  <div className="bg-gray-100 dark:bg-gray-700 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3">
                    <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  </div>
                  <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-1">No Staff Data</h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400">No staff data available for the selected filter.</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}