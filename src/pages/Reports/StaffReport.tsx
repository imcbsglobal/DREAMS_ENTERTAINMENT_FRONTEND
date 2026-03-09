import { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router";
import PageMeta from "../../components/common/PageMeta";
import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import ComponentCard from "../../components/common/ComponentCard";
import Label from "../../components/form/Label";

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
  const navigate = useNavigate();
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [selectedStaff, setSelectedStaff] = useState("");
  const [summaryData, setSummaryData] = useState<StaffSummaryResponse | null>(null);
  const [loading, setLoading] = useState(false);

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

  const totalTickets = summaryData?.staff_summary.reduce((sum, s) => sum + s.tickets_generated, 0) || 0;
  const totalRevenue = summaryData?.staff_summary.reduce((sum, s) => sum + parseFloat(s.total_revenue), 0) || 0;

  return (
    <>
      <PageMeta
        title="Staff Report | Dream Entertainment"
        description="View staff performance and ticket statistics"
      />
      <PageBreadcrumb pageTitle="Staff Report" />
      
      <div className="space-y-6">
        {/* Filter */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <div>
            <select
              id="staff"
              value={selectedStaff}
              onChange={(e) => handleStaffChange(e.target.value)}
              className="h-11 w-full rounded-lg border bg-transparent text-gray-800 border-gray-300 focus:border-brand-300 focus:ring-brand-500/20 dark:border-gray-700 dark:text-white/90 dark:focus:border-brand-800 px-4 py-2.5 text-sm shadow-theme-xs focus:outline-hidden focus:ring-3 dark:bg-gray-900 placeholder:text-gray-400 dark:placeholder:text-white/30"
            >
              <option value="">All Staff</option>
              {staffList.map(staff => (
                <option key={staff.id} value={staff.id}>
                  {staff.user.username} ({staff.staff_code})
                </option>
              ))}
            </select>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="text-gray-500 dark:text-gray-400">Loading...</div>
          </div>
        ) : summaryData?.staff_summary?.length > 0 ? (
          <>
            {/* Staff Performance Table */}
            <ComponentCard title="Staff Performance" desc="Detailed staff performance breakdown">
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
                    <tr>
                      <th className="px-6 py-3">Staff Name</th>
                      <th className="px-6 py-3 text-center">Staff Code</th>
                      <th className="px-6 py-3 text-center">Role</th>
                      <th className="px-6 py-3 text-center">Current Counter</th>
                      <th className="px-6 py-3 text-center">Tickets Generated</th>
                      <th className="px-6 py-3 text-center">Remaining</th>
                      <th className="px-6 py-3 text-right">Total Revenue</th>
                    </tr>
                  </thead>
                  <tbody>
                    {summaryData.staff_summary.map((staff, index) => (
                      <tr key={index} className="bg-white border-b dark:bg-gray-800 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600">
                        <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">{staff.username}</td>
                        <td className="px-6 py-4 text-center">
                          <span className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300 text-xs font-medium px-2.5 py-0.5 rounded">
                            {staff.staff_code}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center capitalize">{staff.role}</td>
                        <td className="px-6 py-4 text-center">{staff.current_counter}</td>
                        <td className="px-6 py-4 text-center font-medium text-blue-600 dark:text-blue-400">{staff.tickets_generated}</td>
                        <td className="px-6 py-4 text-center">
                          <span className={`text-xs font-medium px-2.5 py-0.5 rounded ${
                            staff.remaining_tickets < 10 
                              ? "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300"
                              : "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300"
                          }`}>
                            {staff.remaining_tickets}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right font-bold text-green-600 dark:text-green-400">₹{staff.total_revenue}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </ComponentCard>
          </>
        ) : (
          <ComponentCard title="Staff Performance" desc="No data available">
            <div className="flex flex-col items-center justify-center py-12">
              <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-gray-300 dark:text-gray-600 mb-4">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                <circle cx="12" cy="7" r="4"/>
              </svg>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No Staff Data</h3>
              <p className="text-gray-500 dark:text-gray-400">No staff data available</p>
            </div>
          </ComponentCard>
        )}
      </div>
    </>
  );
}