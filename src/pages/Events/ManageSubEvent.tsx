import { useState, useEffect } from "react";
import PageMeta from "../../components/common/PageMeta";
import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import ComponentCard from "../../components/common/ComponentCard";
import Label from "../../components/form/Label";
import Input from "../../components/form/input/InputField";
import axios from "axios";
import { useTheme } from "../../context/ThemeContext";

interface MasterSubEvent {
  id: number;
  name: string;
  description: string;
  is_active: boolean;
  usage_count: number;
  can_delete: boolean;
  created_at: string;
}

export default function ManageSubEvent() {
  const { theme } = useTheme();
  const [masterSubEvents, setMasterSubEvents] = useState<MasterSubEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<{ message: string; isError: boolean }>({ message: "", isError: false });
  
  // Modal states
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<MasterSubEvent | null>(null);
  const [editForm, setEditForm] = useState({ name: "", description: "", is_active: false });
  const [createForm, setCreateForm] = useState({ name: "", description: "", is_active: true });
  
  const baseURL = 'https://de.imcbs.com/api';
  
  useEffect(() => {
    // Load master sub-events on component mount
    loadMasterSubEvents();
  }, []);
  
  const showResponse = (message: string, isError = false) => {
    setResponse({ message, isError });
    setTimeout(() => setResponse({ message: "", isError: false }), 5000);
  };
  
  const loadMasterSubEvents = async () => {
    const token = localStorage.getItem("access_token");
    if (!token) {
      showResponse('Please login first', true);
      return;
    }
    
    try {
      setLoading(true);
      const response = await axios.get(`${baseURL}/admin/master-sub-events/`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      setMasterSubEvents(response.data);
    } catch (error: any) {
      showResponse('Failed to load: ' + (error.response?.data?.message || error.message), true);
    } finally {
      setLoading(false);
    }
  };
  
  const openEditModal = (item: MasterSubEvent) => {
    setSelectedItem(item);
    setEditForm({
      name: item.name,
      description: item.description,
      is_active: item.is_active
    });
    setShowEditModal(true);
  };
  
  const openDeleteModal = (item: MasterSubEvent) => {
    setSelectedItem(item);
    setShowDeleteModal(true);
  };
  
  const openCreateModal = () => {
    setCreateForm({ name: "", description: "", is_active: true });
    setShowCreateModal(true);
  };
  
  const handleCreate = async () => {
    const token = localStorage.getItem("access_token");
    if (!token) {
      showResponse('Please login first', true);
      return;
    }
    
    if (!createForm.name.trim()) {
      showResponse('Name is required', true);
      return;
    }
    
    try {
      setLoading(true);
      const response = await axios.post(`${baseURL}/admin/master-sub-events/create/`, createForm, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      showResponse(`Master sub-event "${response.data.name}" created successfully!`);
      setShowCreateModal(false);
      loadMasterSubEvents();
    } catch (error: any) {
      showResponse('Create failed: ' + (error.response?.data?.message || error.message), true);
    } finally {
      setLoading(false);
    }
  };
  
  const handleEdit = async () => {
    if (!selectedItem) return;
    
    const token = localStorage.getItem("access_token");
    if (!token) {
      showResponse('Please login first', true);
      return;
    }
    
    if (!editForm.name.trim()) {
      showResponse('Name is required', true);
      return;
    }
    
    try {
      setLoading(true);
      const response = await axios.put(`${baseURL}/admin/master-sub-events/${selectedItem.id}/`, editForm, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      showResponse(`Master sub-event "${response.data.name}" updated successfully!`);
      setShowEditModal(false);
      loadMasterSubEvents();
    } catch (error: any) {
      showResponse('Update failed: ' + (error.response?.data?.message || error.message), true);
    } finally {
      setLoading(false);
    }
  };
  
  const handleDelete = async () => {
    if (!selectedItem) return;
    
    const token = localStorage.getItem("access_token");
    if (!token) {
      showResponse('Please login first', true);
      return;
    }
    
    try {
      setLoading(true);
      const response = await axios.delete(`${baseURL}/admin/master-sub-events/${selectedItem.id}/delete/`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      showResponse(response.data.message);
      setShowDeleteModal(false);
      loadMasterSubEvents();
    } catch (error: any) {
      showResponse('Delete failed: ' + (error.response?.data?.message || error.message), true);
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <>
      <PageMeta
        title="Master Sub-Events Management | Dream Entertainment"
        description="Manage master sub-events data"
      />
      <PageBreadcrumb pageTitle="Master Sub-Events Management" />
      
      <div className="grid grid-cols-1 gap-6">
        {/* Response Message */}
        {response.message && (
          <div className={`p-4 rounded-lg border ${
            response.isError 
              ? 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800'
              : 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800'
          }`}>
            <div className="flex items-center gap-2">
              {response.isError ? (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              )}
              {response.message}
            </div>
          </div>
        )}

        {/* Master Sub-Events List */}
        <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
          {/* Card Header with Action Buttons */}
          <div className="px-6 py-5 flex justify-between items-start">
            <div>
              <h3 className="text-base font-medium text-gray-800 dark:text-white/90">
                Master Sub-Events
              </h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                View and manage all master sub-events
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={openCreateModal}
                className="bg-green-500 hover:bg-green-600 text-white p-2 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-green-500/20"
                title="Add New Sub-Event"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </button>
              <button
                onClick={() => loadMasterSubEvents()}
                disabled={loading}
                className="bg-brand-500 hover:bg-brand-600 disabled:bg-brand-300 text-white p-2 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                title="Refresh List"
              >
                {loading ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          {/* Card Body */}
          <div className="p-4 border-t border-gray-100 dark:border-gray-800 sm:p-6">
            <div className="space-y-4">
              {masterSubEvents.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center">
                    <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No master sub-events found</h3>
                  <p className="text-gray-500 dark:text-gray-400">Create your first master sub-event to get started.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4">
                  {masterSubEvents.map((item) => (
                    <div
                      key={item.id}
                      className={`p-6 rounded-xl border-2 transition-all hover:shadow-md ${
                        item.is_active
                          ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
                          : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-3">
                            <div className={`w-3 h-3 rounded-full ${
                              item.is_active ? 'bg-green-500' : 'bg-red-500'
                            }`}></div>
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                              {item.name}
                            </h3>
                            <span className="text-sm text-gray-500 dark:text-gray-400">
                              ID: {item.id}
                            </span>
                          </div>
                          
                          <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                            <p>
                              <span className="font-medium">Description:</span> {item.description || 'No description provided'}
                            </p>
                            <div className="flex items-center gap-4">
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                item.is_active 
                                  ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'
                                  : 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300'
                              }`}>
                                {item.is_active ? 'Active' : 'Inactive'}
                              </span>
                              <span className="text-xs">
                                Used in {item.usage_count} events
                              </span>
                              <span className={`text-xs ${
                                item.can_delete ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                              }`}>
                                {item.can_delete ? 'Can delete' : 'Cannot delete'}
                              </span>
                            </div>
                            <p className="text-xs">
                              Created: {new Date(item.created_at).toLocaleString()}
                            </p>
                          </div>
                        </div>
                        
                        <div className="flex gap-2 ml-4">
                          <button
                            onClick={() => openEditModal(item)}
                            className="bg-yellow-500 hover:bg-yellow-600 text-white p-2 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-yellow-500/20"
                            title="Edit"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => openDeleteModal(item)}
                            disabled={!item.can_delete}
                            className="bg-red-500 hover:bg-red-600 disabled:bg-red-300 disabled:cursor-not-allowed text-white p-2 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-red-500/20"
                            title={!item.can_delete ? 'Cannot delete - in use' : 'Delete'}
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Create New Master Sub-Event
            </h3>
            
            <div className="space-y-4">
              <div>
                <Label htmlFor="createName">Sub-Event Name *</Label>
                <Input
                  type="text"
                  id="createName"
                  value={createForm.name}
                  onChange={(e) => setCreateForm({...createForm, name: e.target.value})}
                  placeholder="e.g., Giant Wheel, Break Dance"
                />
              </div>
              
              <div>
                <Label htmlFor="createDescription">Description</Label>
                <textarea
                  id="createDescription"
                  value={createForm.description}
                  onChange={(e) => setCreateForm({...createForm, description: e.target.value})}
                  placeholder="Optional description of the activity"
                  rows={3}
                  className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-colors"
                />
              </div>
              
              <div>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={createForm.is_active}
                    onChange={(e) => setCreateForm({...createForm, is_active: e.target.checked})}
                    className="w-5 h-5 text-brand-500 border-2 border-gray-300 dark:border-gray-600 rounded focus:ring-brand-500 focus:ring-2"
                  />
                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                    Active (available for selection in events)
                  </span>
                </label>
              </div>
            </div>
            
            <div className="flex gap-3 mt-6">
              <button
                onClick={handleCreate}
                disabled={loading}
                className="flex-1 bg-green-500 hover:bg-green-600 disabled:bg-green-300 text-white font-medium py-2.5 px-4 rounded-lg transition-colors"
              >
                {loading ? 'Creating...' : 'Create'}
              </button>
              <button
                onClick={() => setShowCreateModal(false)}
                disabled={loading}
                className="flex-1 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 font-medium py-2.5 px-4 rounded-lg transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Edit Master Sub-Event
            </h3>
            
            <div className="space-y-4">
              <div>
                <Label htmlFor="editName">Sub-Event Name *</Label>
                <Input
                  type="text"
                  id="editName"
                  value={editForm.name}
                  onChange={(e) => setEditForm({...editForm, name: e.target.value})}
                  placeholder="Enter sub-event name"
                />
              </div>
              
              <div>
                <Label htmlFor="editDescription">Description</Label>
                <textarea
                  id="editDescription"
                  value={editForm.description}
                  onChange={(e) => setEditForm({...editForm, description: e.target.value})}
                  placeholder="Enter description"
                  rows={3}
                  className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-colors"
                />
              </div>
              
              <div>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editForm.is_active}
                    onChange={(e) => setEditForm({...editForm, is_active: e.target.checked})}
                    className="w-5 h-5 text-brand-500 border-2 border-gray-300 dark:border-gray-600 rounded focus:ring-brand-500 focus:ring-2"
                  />
                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                    Active (available for selection in events)
                  </span>
                </label>
              </div>
            </div>
            
            <div className="flex gap-3 mt-6">
              <button
                onClick={handleEdit}
                disabled={loading}
                className="flex-1 bg-yellow-500 hover:bg-yellow-600 disabled:bg-yellow-300 text-white font-medium py-2.5 px-4 rounded-lg transition-colors"
              >
                {loading ? 'Updating...' : 'Update'}
              </button>
              <button
                onClick={() => setShowEditModal(false)}
                disabled={loading}
                className="flex-1 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 font-medium py-2.5 px-4 rounded-lg transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Modal */}
      {showDeleteModal && selectedItem && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Delete Master Sub-Event
            </h3>
            
            <div className="mb-6">
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                Are you sure you want to delete this master sub-event?
              </p>
              
              <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                <h4 className="font-medium text-gray-900 dark:text-white">{selectedItem.name}</h4>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  {selectedItem.description || 'No description'}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                  Used in {selectedItem.usage_count} events
                </p>
              </div>
              
              <p className="text-red-600 dark:text-red-400 text-sm mt-4">
                This action cannot be undone.
              </p>
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={handleDelete}
                disabled={loading}
                className="flex-1 bg-red-500 hover:bg-red-600 disabled:bg-red-300 text-white font-medium py-2.5 px-4 rounded-lg transition-colors"
              >
                {loading ? 'Deleting...' : 'Delete'}
              </button>
              <button
                onClick={() => setShowDeleteModal(false)}
                disabled={loading}
                className="flex-1 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 font-medium py-2.5 px-4 rounded-lg transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}