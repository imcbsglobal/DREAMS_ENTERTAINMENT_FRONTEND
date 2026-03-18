import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import axios from "axios";
import PageMeta from "../../components/common/PageMeta";
import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import ComponentCard from "../../components/common/ComponentCard";
import ConfirmDialog from "../../components/ui/ConfirmDialog";
import Toast from "../../components/ui/Toast";

export default function ListStaff() {
  const navigate = useNavigate();
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleteLoading, setDeleteLoading] = useState<number | null>(null);
  
  // Dialog and Toast states
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    staffId: number | null;
    staffName: string;
  }>({ isOpen: false, staffId: null, staffName: "" });
  
  const [toast, setToast] = useState<{
    isVisible: boolean;
    message: string;
    type: "success" | "error" | "info";
  }>({ isVisible: false, message: "", type: "info" });

  useEffect(() => {
    const fetchStaff = async () => {
      try {
        const token = localStorage.getItem("access_token");
        const response = await axios.get("https://de.imcbs.com/api/admin/staff-list/", {
          headers: { Authorization: `Bearer ${token}` }
        });
        setStaff(response.data);
      } catch (err) {
        console.error("Failed to fetch staff:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchStaff();
  }, []);

  const showToast = (message: string, type: "success" | "error" | "info") => {
    setToast({ isVisible: true, message, type });
  };

  const handleDeleteStaff = async (staffId: number, staffName: string) => {
    setConfirmDialog({ isOpen: true, staffId, staffName });
  };

  const handleEditStaff = (staffId: number) => {
    navigate("/edit-staff", { state: { staffId } });
  };

  const confirmDelete = async () => {
    const { staffId, staffName } = confirmDialog;
    if (!staffId) return;

    setConfirmDialog({ isOpen: false, staffId: null, staffName: "" });
    setDeleteLoading(staffId);
    
    try {
      const token = localStorage.getItem("access_token");
      await axios.delete(`https://de.imcbs.com/api/admin/delete-staff/${staffId}/`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // Remove staff from state
      setStaff(staff.filter((member: any) => member.id !== staffId));
      showToast(`Staff member "${staffName}" deleted successfully!`, "success");
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || err.response?.data?.message || "Failed to delete staff member";
      showToast(errorMessage, "error");
      console.error("Failed to delete staff:", err);
    } finally {
      setDeleteLoading(null);
    }
  };

  if (loading) {
    return (
      <>
        <PageMeta
          title="Staff Members | Dream Entertainment"
          description="Manage your team members and their ticket ranges"
        />
        <PageBreadcrumb pageTitle="Staff Members" />
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-500">Loading staff...</div>
        </div>
      </>
    );
  }

  return (
    <>
      <PageMeta
        title="Staff Members | Dream Entertainment"
        description="Manage your team members and their ticket ranges"
      />
      <PageBreadcrumb pageTitle="Staff Members" />
      
      {staff.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 text-center">
          <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="#cbd5e1" strokeWidth="1.5" className="mb-4">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
            <circle cx="12" cy="7" r="4" />
          </svg>
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-2">No Staff Members Yet</h3>
          <p className="text-gray-500 dark:text-gray-400 mb-4">Add your first staff member to get started!</p>
          <button 
            className="bg-brand-500 hover:bg-brand-600 text-white font-medium py-2.5 px-4 rounded-lg transition-colors"
            onClick={() => navigate("/create-staff")}
          >
            Create Staff
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {staff.map(member => (
            <ComponentCard key={member.id} title={`${member.user.first_name} ${member.user.last_name}`}>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-brand-100 dark:bg-brand-900/20 text-brand-700 dark:text-brand-400 rounded-full flex items-center justify-center font-semibold">
                      {member.user.first_name?.charAt(0) || member.user.username?.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">@{member.user.username}</p>
                    </div>
                  </div>
                  <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                    member.role === 'admin' 
                      ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/20 dark:text-purple-400'
                      : 'bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400'
                  }`}>
                    {member.role}
                  </span>
                </div>
                
                <div className="space-y-3">
                  <div className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-400">
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                      <polyline points="22,6 12,13 2,6"/>
                    </svg>
                    <span className="truncate">{member.user.email}</span>
                  </div>
                  
                  <div className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-400">
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/>
                      <polyline points="13 2 13 9 20 9"/>
                    </svg>
                    <span>Staff Code: {member.staff_code}</span>
                  </div>
                  
                  <div className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-400">
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <line x1="12" y1="1" x2="12" y2="23"/>
                      <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
                    </svg>
                    <span>Range: {member.range_start} - {member.range_end}</span>
                  </div>
                  
                  <div className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-400">
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
                    </svg>
                    <span>Counter: {member.current_counter}</span>
                  </div>
                </div>
                
                <div className="flex gap-2 pt-4">
                  <button 
                    className="bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 p-2 rounded-lg transition-colors"
                    onClick={() => handleEditStaff(member.id)}
                    title="Edit Staff"
                  >
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                    </svg>
                  </button>
                  <button 
                    className="bg-red-100 hover:bg-red-200 dark:bg-red-900/20 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400 p-2 rounded-lg transition-colors disabled:opacity-50"
                    onClick={() => handleDeleteStaff(member.id, `${member.user.first_name} ${member.user.last_name}`)}
                    disabled={deleteLoading === member.id}
                    title="Delete Staff"
                  >
                    {deleteLoading === member.id ? (
                      <svg className="w-5 h-5 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="3 6 5 6 21 6" />
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                        <line x1="10" y1="11" x2="10" y2="17" />
                        <line x1="14" y1="11" x2="14" y2="17" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>
            </ComponentCard>
          ))}
        </div>
      )}
      
      {/* Confirm Dialog */}
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        onClose={() => setConfirmDialog({ isOpen: false, staffId: null, staffName: "" })}
        onConfirm={confirmDelete}
        title="Delete Staff Member"
        message={`Are you sure you want to delete "${confirmDialog.staffName}"?\n\nThis will permanently delete:\n• The staff member\n• All assigned tickets\n• All related data\n\nThis action CANNOT be undone!`}
        confirmText="Delete Staff"
        cancelText="Cancel"
        type="danger"
      />
      
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