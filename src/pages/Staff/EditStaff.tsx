import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router";
import axios from "axios";
import PageMeta from "../../components/common/PageMeta";
import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import Label from "../../components/form/Label";
import Input from "../../components/form/input/InputField";
import Toast from "../../components/ui/Toast";

interface StaffData {
  id: number;
  user: {
    id: number;
    username: string;
    email: string;
    first_name: string;
    last_name: string;
  };
  role: string;
  range_start: number;
  range_end: number;
  current_counter: number;
  staff_code: string;
  assigned_sub_events: number[];
}

export default function EditStaff() {
  const navigate = useNavigate();
  const location = useLocation();
  const staffId = location.state?.staffId;

  const [staffData, setStaffData] = useState<StaffData | null>(null);
  const [formData, setFormData] = useState({
    username: "",
    password: "",
    email: "",
    first_name: "",
    last_name: "",
    role: "staff",
    range_start: "",
    range_end: "",
    assigned_sub_events: [] as number[]
  });
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editMode, setEditMode] = useState<'FULL' | 'RESTRICTED'>('FULL');
  const [ticketsGenerated, setTicketsGenerated] = useState(0);
  const [isUnlimitedRange, setIsUnlimitedRange] = useState(false);
  const [originalRangeEnd, setOriginalRangeEnd] = useState("");
  
  const [toast, setToast] = useState<{
    isVisible: boolean;
    message: string;
    type: "success" | "error" | "info";
  }>({ isVisible: false, message: "", type: "info" });

  useEffect(() => {
    if (!staffId) {
      navigate("/list-staff");
      return;
    }
    fetchStaffData();
  }, [staffId, navigate]);

  const showToast = (message: string, type: "success" | "error" | "info") => {
    setToast({ isVisible: true, message, type });
  };

  const fetchStaffData = async () => {
    try {
      const token = localStorage.getItem("access_token");
      
      // Fetch staff details
      const staffResponse = await axios.get(`https://de.imcbs.com/api/admin/staff-list/`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      const staff = staffResponse.data.find((s: StaffData) => s.id === staffId);
      if (!staff) {
        showToast("Staff member not found", "error");
        navigate("/list-staff");
        return;
      }

      // Check if staff has generated tickets to determine edit mode
      try {
        const summaryResponse = await axios.get(`https://de.imcbs.com/api/admin/reports/staff-summary/?staff_id=${staffId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const tickets = summaryResponse.data.staff_summary[0]?.tickets_generated || 0;
        setTicketsGenerated(tickets);
        setEditMode(tickets > 0 ? 'RESTRICTED' : 'FULL');
      } catch (err) {
        // If summary endpoint fails, assume no tickets (full edit mode)
        setEditMode('FULL');
        setTicketsGenerated(0);
      }

      setStaffData(staff);
      
      // Check if range is unlimited
      const isUnlimited = staff.range_end >= 999999999;
      setIsUnlimitedRange(isUnlimited);
      
      setFormData({
        username: staff.user.username,
        password: "",
        email: staff.user.email,
        first_name: staff.user.first_name,
        last_name: staff.user.last_name,
        role: staff.role,
        range_start: staff.range_start.toString(),
        range_end: isUnlimited ? "" : staff.range_end.toString(),
        assigned_sub_events: staff.assigned_sub_events || []
      });

      if (isUnlimited) {
        setOriginalRangeEnd(staff.range_end.toString());
      }

    } catch (err: any) {
      console.error("Failed to fetch staff data:", err);
      showToast("Failed to load staff data", "error");
      navigate("/list-staff");
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleUnlimitedToggle = (checked: boolean) => {
    setIsUnlimitedRange(checked);
    if (checked) {
      setOriginalRangeEnd(formData.range_end);
      setFormData(prev => ({
        ...prev,
        range_end: "999999999"
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        range_end: originalRangeEnd
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const token = localStorage.getItem("access_token");
      
      // Prepare data - only send fields that have values
      const updateData: any = {};
      
      if (formData.username && formData.username !== staffData?.user.username) {
        updateData.username = formData.username;
      }
      if (formData.password) {
        updateData.password = formData.password;
      }
      if (formData.email && formData.email !== staffData?.user.email) {
        updateData.email = formData.email;
      }
      if (formData.first_name && formData.first_name !== staffData?.user.first_name) {
        updateData.first_name = formData.first_name;
      }
      if (formData.last_name && formData.last_name !== staffData?.user.last_name) {
        updateData.last_name = formData.last_name;
      }
      if (formData.role && formData.role !== staffData?.role) {
        updateData.role = formData.role;
      }
      if (formData.range_start && parseInt(formData.range_start) !== staffData?.range_start) {
        updateData.range_start = parseInt(formData.range_start);
      }
      if (formData.range_end && parseInt(formData.range_end) !== staffData?.range_end) {
        updateData.range_end = parseInt(formData.range_end);
      }

      const response = await axios.put(`https://de.imcbs.com/api/admin/update-staff/${staffId}/`, updateData, {
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const result = response.data;
      showToast(result.message, "success");
      
      if (result.note) {
        setTimeout(() => showToast(result.note, "info"), 2000);
      }
      
      if (result.updated_fields && result.updated_fields.length > 0) {
        setTimeout(() => showToast(`Updated fields: ${result.updated_fields.join(', ')}`, "info"), 4000);
      }

      // Navigate back after successful update
      setTimeout(() => navigate("/list-staff"), 3000);

    } catch (err: any) {
      console.error("Failed to update staff:", err);
      
      if (err.response?.data?.details) {
        const details = err.response.data.details;
        showToast(
          `Cannot edit restricted fields. Tickets generated: ${details.tickets_generated}. ` +
          `Restricted: ${details.restricted_fields.join(', ')}`, 
          "error"
        );
      } else if (err.response?.data?.errors) {
        const errors = Object.entries(err.response.data.errors)
          .map(([field, message]) => `${field}: ${message}`)
          .join(', ');
        showToast(errors, "error");
      } else {
        showToast(err.response?.data?.error || "Failed to update staff", "error");
      }
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <>
        <PageMeta
          title="Edit Staff Member | Dream Entertainment"
          description="Edit staff member details"
        />
        <PageBreadcrumb pageTitle="Edit Staff Member" />
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-500">Loading staff data...</div>
        </div>
      </>
    );
  }

  if (!staffData) {
    return (
      <>
        <PageMeta
          title="Edit Staff Member | Dream Entertainment"
          description="Edit staff member details"
        />
        <PageBreadcrumb pageTitle="Edit Staff Member" />
        <div className="flex items-center justify-center h-64">
          <div className="text-red-500">Staff member not found</div>
        </div>
      </>
    );
  }

  const isFieldDisabled = (fieldName: string) => {
    if (editMode === 'FULL') return false;
    return ['username', 'role', 'range_start', 'range_end'].includes(fieldName);
  };

  return (
    <>
      <PageMeta
        title={`Edit ${staffData.user.first_name} ${staffData.user.last_name} | Dream Entertainment`}
        description="Edit staff member details"
      />
      <PageBreadcrumb pageTitle="Edit Staff Member" />
      
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <div className="space-y-6">
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            
            {/* Edit Mode Warning */}
            <div className={`p-4 rounded-lg mb-6 ${
              editMode === 'RESTRICTED' 
                ? 'bg-yellow-50 border border-yellow-200 dark:bg-yellow-900/20 dark:border-yellow-800'
                : 'bg-blue-50 border border-blue-200 dark:bg-blue-900/20 dark:border-blue-800'
            }`}>
              <div className="flex items-start gap-3">
                <span className="text-xl">
                  {editMode === 'RESTRICTED' ? '⚠️' : 'ℹ️'}
                </span>
                <div>
                  <h4 className={`font-medium ${
                    editMode === 'RESTRICTED' 
                      ? 'text-yellow-800 dark:text-yellow-200'
                      : 'text-blue-800 dark:text-blue-200'
                  }`}>
                    {editMode === 'RESTRICTED' ? 'Restricted Editing Mode' : 'Full Editing Mode'}
                  </h4>
                  <p className={`text-sm mt-1 ${
                    editMode === 'RESTRICTED' 
                      ? 'text-yellow-700 dark:text-yellow-300'
                      : 'text-blue-700 dark:text-blue-300'
                  }`}>
                    {editMode === 'RESTRICTED' 
                      ? `This staff member has generated ${ticketsGenerated} tickets. Only safe fields can be edited (name, email, password, sub-events).`
                      : 'This is a new staff member with no generated tickets. All fields can be edited.'
                    }
                  </p>
                </div>
              </div>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
                <div>
                  <Label htmlFor="username">Username *</Label>
                  <Input
                    type="text"
                    id="username"
                    name="username"
                    value={formData.username}
                    onChange={handleInputChange}
                    placeholder="e.g., john_doe"
                    disabled={isFieldDisabled('username') || saving}
                    className={isFieldDisabled('username') ? 'opacity-50' : ''}
                  />
                  {isFieldDisabled('username') && (
                    <p className="text-xs text-yellow-600 dark:text-yellow-400 mt-1">
                      🔒 Cannot edit - would break ticket ID consistency
                    </p>
                  )}
                </div>

                <div>
                  <Label htmlFor="password">Password</Label>
                  <Input
                    type="password"
                    id="password"
                    name="password"
                    value={formData.password}
                    onChange={handleInputChange}
                    placeholder="Leave empty to keep current password"
                    disabled={saving}
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Leave empty to keep current password
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
                <div>
                  <Label htmlFor="first_name">First Name *</Label>
                  <Input
                    type="text"
                    id="first_name"
                    name="first_name"
                    value={formData.first_name}
                    onChange={handleInputChange}
                    placeholder="e.g., John"
                    disabled={saving}
                  />
                </div>

                <div>
                  <Label htmlFor="last_name">Last Name *</Label>
                  <Input
                    type="text"
                    id="last_name"
                    name="last_name"
                    value={formData.last_name}
                    onChange={handleInputChange}
                    placeholder="e.g., Doe"
                    disabled={saving}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="email">Email *</Label>
                <Input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  placeholder="staff@dreamentertainment.com"
                  disabled={saving}
                />
              </div>

              <div>
                <Label htmlFor="role">Role *</Label>
                <select
                  id="role"
                  name="role"
                  value={formData.role}
                  onChange={handleInputChange}
                  disabled={isFieldDisabled('role') || saving}
                  className={`h-11 w-full rounded-lg border bg-transparent text-gray-800 border-gray-300 focus:border-brand-300 focus:ring-brand-500/20 dark:border-gray-700 dark:text-white/90 dark:focus:border-brand-800 px-4 py-2.5 text-sm shadow-theme-xs focus:outline-hidden focus:ring-3 dark:bg-gray-900 placeholder:text-gray-400 dark:placeholder:text-white/30 ${
                    isFieldDisabled('role') ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                >
                  <option value="staff">Staff</option>
                  <option value="admin">Admin</option>
                </select>
                {isFieldDisabled('role') && (
                  <p className="text-xs text-yellow-600 dark:text-yellow-400 mt-1">
                    🔒 Cannot edit - would affect permissions for existing tickets
                  </p>
                )}
              </div>

              <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
                <div>
                  <Label htmlFor="range_start">Ticket Range Start *</Label>
                  <Input
                    type="number"
                    id="range_start"
                    name="range_start"
                    value={formData.range_start}
                    onChange={handleInputChange}
                    placeholder="e.g., 5001"
                    min="1"
                    disabled={isFieldDisabled('range_start') || saving}
                    className={isFieldDisabled('range_start') ? 'opacity-50' : ''}
                  />
                  {isFieldDisabled('range_start') && (
                    <p className="text-xs text-yellow-600 dark:text-yellow-400 mt-1">
                      🔒 Cannot edit - would break ticket sequence
                    </p>
                  )}
                </div>

                <div>
                  <Label htmlFor="range_end">Ticket Range End *</Label>
                  <Input
                    type={isUnlimitedRange ? "text" : "number"}
                    id="range_end"
                    name="range_end"
                    value={isUnlimitedRange ? "∞ Unlimited" : formData.range_end}
                    onChange={handleInputChange}
                    placeholder="e.g., 6000"
                    min="1"
                    readOnly={isUnlimitedRange}
                    disabled={isFieldDisabled('range_end') || saving || isUnlimitedRange}
                    className={`${isFieldDisabled('range_end') ? 'opacity-50' : ''} ${
                      isUnlimitedRange ? 'bg-gray-100 dark:bg-gray-700 text-center font-medium' : ''
                    }`}
                  />
                  {!isFieldDisabled('range_end') && (
                    <div className="flex items-center gap-2 mt-2">
                      <input
                        type="checkbox"
                        id="unlimited_range"
                        checked={isUnlimitedRange}
                        onChange={(e) => handleUnlimitedToggle(e.target.checked)}
                        disabled={saving}
                        className="w-4 h-4 text-brand-500 border-gray-300 dark:border-gray-600 rounded focus:ring-brand-500 focus:ring-2"
                      />
                      <label 
                        htmlFor="unlimited_range" 
                        className="text-sm text-gray-600 dark:text-gray-400 cursor-pointer"
                      >
                        Set as Unlimited Range
                      </label>
                    </div>
                  )}
                  {isFieldDisabled('range_end') && (
                    <p className="text-xs text-yellow-600 dark:text-yellow-400 mt-1">
                      🔒 Cannot edit - would break ticket sequence
                    </p>
                  )}
                  {isUnlimitedRange && !isFieldDisabled('range_end') && (
                    <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                      ℹ️ Staff can generate unlimited tickets (no range limit)
                    </p>
                  )}
                </div>
              </div>

              <div className="flex gap-4 pt-4">
                <button
                  type="button"
                  onClick={() => navigate("/list-staff")}
                  disabled={saving}
                  className="flex-1 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 font-medium py-2.5 px-4 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-gray-500/20 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 bg-brand-500 hover:bg-brand-600 disabled:bg-brand-300 text-white font-medium py-2.5 px-4 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                >
                  {saving ? "Updating..." : "Update Staff"}
                </button>
              </div>
            </form>
          </div>
        </div>
        
        <div className="space-y-6">
          {/* Staff Information Card */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="text-lg font-medium text-gray-800 dark:text-white mb-4">Current Staff Information</h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500 dark:text-gray-400">Staff Code:</span>
                <span className="font-medium text-gray-800 dark:text-white">{staffData.staff_code}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500 dark:text-gray-400">Current Counter:</span>
                <span className="font-medium text-gray-800 dark:text-white">{staffData.current_counter}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500 dark:text-gray-400">Tickets Generated:</span>
                <span className="font-medium text-gray-800 dark:text-white">{ticketsGenerated}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500 dark:text-gray-400">Edit Mode:</span>
                <span className={`font-medium ${
                  editMode === 'RESTRICTED' 
                    ? 'text-yellow-600 dark:text-yellow-400' 
                    : 'text-green-600 dark:text-green-400'
                }`}>
                  {editMode === 'RESTRICTED' ? 'Restricted' : 'Full'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Toast Notifications */}
      <Toast
        isVisible={toast.isVisible}
        message={toast.message}
        type={toast.type}
        onClose={() => setToast({ ...toast, isVisible: false })}
      />
    </>
  );
}