import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router";
import axios from "axios";
import PageMeta from "../../components/common/PageMeta";
import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import ComponentCard from "../../components/common/ComponentCard";
import SuccessPopup from "../../components/common/SuccessPopup";
import Label from "../../components/form/Label";
import Input from "../../components/form/input/InputField";
import Checkbox from "../../components/form/input/Checkbox";

export default function CreateEntryType() {
  const navigate = useNavigate();
  const location = useLocation();
  const [events, setEvents] = useState([]);
  const [subEvents, setSubEvents] = useState([]);
  const [existingEntryTypes, setExistingEntryTypes] = useState([]);
  const [loadingEntryTypes, setLoadingEntryTypes] = useState(false);
  const [useDefaultName, setUseDefaultName] = useState(true);
  const [formData, setFormData] = useState({
    event: location.state?.eventId || "",
    sub_event: "",
    name: "Ticket",
    price: "",
    is_active: true
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [showSuccessPopup, setShowSuccessPopup] = useState(false);
  const [editingEntryType, setEditingEntryType] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletingEntryType, setDeletingEntryType] = useState(null);
  const [editFormData, setEditFormData] = useState({
    name: "",
    price: "",
    description: "",
    is_active: true
  });

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const token = localStorage.getItem("access_token");
        const response = await axios.get("https://de.imcbs.com/api/admin/event-list/", {
          headers: { Authorization: `Bearer ${token}` }
        });
        setEvents(response.data);
      } catch (err) {
        console.error("Failed to fetch events:", err);
      }
    };

    fetchEvents();
  }, []);

  useEffect(() => {
    const fetchSubEvents = async () => {
      if (formData.event) {
        try {
          const token = localStorage.getItem("access_token");
          const response = await axios.get(`https://de.imcbs.com/api/admin/sub-events/${formData.event}/`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          setSubEvents(response.data);
          
          // Smart default selection: prioritize sub-events with "Entry" tickets
          if (response.data.length > 0) {
            let defaultSubEvent = response.data[0]; // Fallback to first
            
            // Check each sub-event for existing "Entry" tickets
            for (const subEvent of response.data) {
              try {
                const entryTypesResponse = await axios.get(`https://de.imcbs.com/api/admin/entry-types/${subEvent.id}/`, {
                  headers: { Authorization: `Bearer ${token}` }
                });
                
                // Check if any entry type contains "Entry" in the name
                const hasEntryTicket = entryTypesResponse.data.some(entryType => 
                  entryType.name.toLowerCase().includes('entry')
                );
                
                if (hasEntryTicket) {
                  defaultSubEvent = subEvent;
                  break; // Use first sub-event found with "Entry" tickets
                }
              } catch (err) {
                // Continue checking other sub-events if this one fails
                continue;
              }
            }
            
            setFormData(prev => ({
              ...prev,
              sub_event: defaultSubEvent.id
            }));
          }
        } catch (err) {
          console.error("Failed to fetch sub-events:", err);
          setSubEvents([]);
        }
      } else {
        setSubEvents([]);
        setExistingEntryTypes([]);
      }
    };

    fetchSubEvents();
  }, [formData.event]);

  // Fetch existing entry types when sub-event changes
  useEffect(() => {
    fetchExistingEntryTypes();
  }, [formData.sub_event]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;
    
    setFormData(prev => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
      // Reset sub_event when event changes
      ...(name === "event" && { sub_event: "" })
    }));
  };

  const handleToggleDefaultName = (checked: boolean) => {
    setUseDefaultName(checked);
    if (checked) {
      setFormData(prev => ({ ...prev, name: "Ticket" }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      const token = localStorage.getItem("access_token");
      await axios.post("https://de.imcbs.com/api/admin/create-entry-type/", formData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setShowSuccessPopup(true);
      // Refresh the existing entry types list
      if (formData.sub_event) {
        fetchExistingEntryTypes();
      }
      // Reset form after successful creation
      setFormData({
        event: formData.event, // Keep the selected event
        sub_event: formData.sub_event, // Keep the selected sub_event
        name: useDefaultName ? "Ticket" : "", // Reset name based on toggle
        price: "", // Clear the price
        is_active: true // Reset to default
      });
    } catch (err: any) {
      setMessage(err.response?.data?.error || "Failed to create entry type");
    } finally {
      setLoading(false);
    }
  };

  const fetchExistingEntryTypes = async () => {
    if (formData.sub_event) {
      setLoadingEntryTypes(true);
      try {
        const token = localStorage.getItem("access_token");
        const response = await axios.get(`https://de.imcbs.com/api/admin/entry-types/${formData.sub_event}/`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        // Check if each entry type is in use (has sold tickets)
        const entryTypesWithUsageStatus = await Promise.all(
          (response.data || []).map(async (entryType) => {
            try {
              // Try to get details for this entry type to check if it's in use
              const detailResponse = await axios.get(`https://de.imcbs.com/api/admin/entry-type/${entryType.id}/`, {
                headers: { Authorization: `Bearer ${token}` }
              });
              
              // Check if entry type has tickets sold or is otherwise in use
              const isInUse = detailResponse.data.tickets_sold > 0 || 
                             detailResponse.data.is_in_use || 
                             detailResponse.data.has_bookings;
              
              return {
                ...entryType,
                is_in_use: isInUse,
                tickets_sold: detailResponse.data.tickets_sold || 0
              };
            } catch (err) {
              // If we can't get details, assume it's safe to edit/delete
              return {
                ...entryType,
                is_in_use: false,
                tickets_sold: 0
              };
            }
          })
        );
        
        setExistingEntryTypes(entryTypesWithUsageStatus);
      } catch (err) {
        console.error("Failed to fetch existing entry types:", err);
        setExistingEntryTypes([]);
      } finally {
        setLoadingEntryTypes(false);
      }
    }
  };

  const handleEditEntryType = (entryType) => {
    setEditingEntryType(entryType);
    setEditFormData({
      name: entryType.name,
      price: entryType.price.toString(),
      description: entryType.description || "",
      is_active: entryType.is_active
    });
    setShowEditModal(true);
  };

  const handleUpdateEntryType = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEntryType) return;

    setLoading(true);
    try {
      const token = localStorage.getItem("access_token");
      const updateData = {
        name: editFormData.name,
        price: parseFloat(editFormData.price),
        description: editFormData.description,
        is_active: editFormData.is_active
      };

      await axios.put(`https://de.imcbs.com/api/admin/entry-type/${editingEntryType.id}/update/`, updateData, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setMessage("Entry type updated successfully!");
      setShowEditModal(false);
      setEditingEntryType(null);
      fetchExistingEntryTypes();
      
      setTimeout(() => setMessage(""), 3000);
    } catch (err: any) {
      setMessage(err.response?.data?.error || "Failed to update entry type");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteEntryType = async () => {
    if (!deletingEntryType) return;

    setLoading(true);
    try {
      const token = localStorage.getItem("access_token");
      await axios.delete(`https://de.imcbs.com/api/admin/entry-type/${deletingEntryType.id}/delete/`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setMessage("Entry type deleted successfully!");
      setShowDeleteModal(false);
      setDeletingEntryType(null);
      fetchExistingEntryTypes();
      
      setTimeout(() => setMessage(""), 3000);
    } catch (err: any) {
      setMessage(err.response?.data?.error || "Failed to delete entry type");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteClick = (entryType) => {
    setDeletingEntryType(entryType);
    setShowDeleteModal(true);
  };

  const handleEditInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;
    
    setEditFormData(prev => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value
    }));
  };

  return (
    <>
      <PageMeta
        title="Create Entry Type | Dream Entertainment"
        description="Add ticket categories for your event"
      />
      <PageBreadcrumb pageTitle="Create Entry Type" />
      
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <div className="space-y-6">
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            {message && message !== "success" && (
              <div className="p-3 text-sm rounded-lg mb-4 text-red-600 bg-red-50 border border-red-200 dark:bg-red-900/20 dark:border-red-800 dark:text-red-400">
                {message}
              </div>
            )}
            
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <Label htmlFor="event">Event *</Label>
                  <select
                    id="event"
                    name="event"
                    value={formData.event}
                    onChange={handleInputChange}
                    required
                    disabled={loading}
                    className="h-11 w-full rounded-lg border appearance-none px-4 py-2.5 text-sm shadow-theme-xs placeholder:text-gray-400 focus:outline-hidden focus:ring-3 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 bg-transparent text-gray-800 border-gray-300 focus:border-brand-300 focus:ring-brand-500/20 dark:border-gray-700 dark:focus:border-brand-800"
                  >
                    <option value="">Select an event</option>
                    {events.map(event => (
                      <option key={event.id} value={event.id}>{event.name}</option>
                    ))}
                  </select>
                </div>

                {subEvents.length > 0 && (
                  <div>
                    <Label htmlFor="sub_event">Sub Event</Label>
                    <select
                      id="sub_event"
                      name="sub_event"
                      value={formData.sub_event}
                      onChange={handleInputChange}
                      disabled={loading}
                      className="h-11 w-full rounded-lg border appearance-none px-4 py-2.5 text-sm shadow-theme-xs placeholder:text-gray-400 focus:outline-hidden focus:ring-3 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 bg-transparent text-gray-800 border-gray-300 focus:border-brand-300 focus:ring-brand-500/20 dark:border-gray-700 dark:focus:border-brand-800"
                    >
                      <option value="">Select a sub event</option>
                      {subEvents.map(subEvent => (
                        <option key={subEvent.id} value={subEvent.id}>{subEvent.name}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <Label htmlFor="price">Price *</Label>
                  <Input
                    type="number"
                    step="0.01"
                    id="price"
                    name="price"
                    value={formData.price}
                    onChange={handleInputChange}
                    placeholder="0.00"
                    required
                    disabled={loading}
                  />
                </div>

                <div>
                  {useDefaultName ? (
                    // Show simple text with custom option when using default
                    <div className="space-y-2">
                      <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            Entry Type: 
                          </span>
                          <span className="text-sm font-semibold text-brand-600 dark:text-brand-400">
                            Ticket
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleToggleDefaultName(false)}
                          disabled={loading}
                          className="text-sm text-brand-600 hover:text-brand-700 dark:text-brand-400 dark:hover:text-brand-300 flex items-center gap-1 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                          </svg>
                          Custom entry name
                        </button>
                      </div>
                    </div>
                  ) : (
                    // Show full input field with toggle when custom
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <Label htmlFor="name">Entry Type Name</Label>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            Use default
                          </span>
                          <button
                            type="button"
                            onClick={() => handleToggleDefaultName(!useDefaultName)}
                            disabled={loading}
                            className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-brand-500/20 disabled:opacity-50 disabled:cursor-not-allowed ${
                              useDefaultName
                                ? "bg-brand-500"
                                : "bg-gray-200 dark:bg-gray-700"
                            }`}
                          >
                            <span
                              className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
                                useDefaultName ? "translate-x-5" : "translate-x-1"
                              }`}
                            />
                          </button>
                        </div>
                      </div>
                      <Input
                        type="text"
                        id="name"
                        name="name"
                        value={formData.name}
                        onChange={handleInputChange}
                        placeholder="e.g., Adult, Kids, VIP"
                        required
                        disabled={loading}
                      />
                    </div>
                  )}
                </div>

              </div>

              <div className="flex items-center gap-3">
                <Checkbox
                  checked={formData.is_active}
                  onChange={(checked) => setFormData(prev => ({ ...prev, is_active: checked }))}
                  disabled={loading}
                />
                <Label>Active</Label>
              </div>

              <div className="flex gap-4 pt-4">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-brand-500 hover:bg-brand-600 disabled:bg-brand-300 text-white font-medium py-2.5 px-4 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                >
                  {loading ? "Creating..." : "Create Entry Type"}
                </button>
                <button
                  type="button"
                  onClick={() => navigate("/ongoing-events")}
                  disabled={loading}
                  className="flex-1 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 font-medium py-2.5 px-4 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-gray-500/20"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
        <div className="space-y-6">
          {/* Existing Entry Types Section */}
          {formData.sub_event && (
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Existing Entry Types for Selected Sub-Event
              </h3>
              
              {loadingEntryTypes ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-500"></div>
                  <span className="ml-2 text-gray-600 dark:text-gray-400">Loading entry types...</span>
                </div>
              ) : existingEntryTypes.length > 0 ? (
                <div className="space-y-3">
                  {existingEntryTypes.map((entryType) => {
                    const isInUse = entryType.is_in_use || false;
                    const ticketsSold = entryType.tickets_sold || 0;
                    
                    return (
                    <div key={entryType.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium text-gray-900 dark:text-white">
                            {entryType.name}
                          </h4>
                          <span className={`px-2 py-1 text-xs rounded-full ${
                            entryType.is_active 
                              ? "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400"
                              : "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400"
                          }`}>
                            {entryType.is_active ? "Active" : "Inactive"}
                          </span>
                          {isInUse && (
                            <span className="px-2 py-1 text-xs rounded-full bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400">
                              In Use
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                          Price: ₹{entryType.price}
                          {ticketsSold > 0 && (
                            <span className="ml-2 text-orange-600 dark:text-orange-400">• {ticketsSold} tickets sold</span>
                          )}
                          {entryType.description && (
                            <span className="ml-2">• {entryType.description}</span>
                          )}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          Event: {entryType.event_name} • Sub-Event: {entryType.sub_event_name}
                        </p>
                        {isInUse && (
                          <p className="text-xs text-orange-600 dark:text-orange-400 mt-1 italic">
                            Cannot edit or delete - entry type is in use
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2 ml-4">
                        <button
                          onClick={() => handleEditEntryType(entryType)}
                          disabled={loading || isInUse}
                          className={`p-2 rounded-lg transition-colors ${
                            isInUse 
                              ? "text-gray-400 dark:text-gray-600 cursor-not-allowed opacity-50" 
                              : "text-blue-600 hover:text-blue-800 hover:bg-blue-50 dark:text-blue-400 dark:hover:text-blue-300 dark:hover:bg-blue-900/20 disabled:opacity-50 disabled:cursor-not-allowed"
                          }`}
                          title={isInUse ? "Cannot edit - entry type is in use" : "Edit entry type"}
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleDeleteClick(entryType)}
                          disabled={loading || isInUse}
                          className={`p-2 rounded-lg transition-colors ${
                            isInUse 
                              ? "text-gray-400 dark:text-gray-600 cursor-not-allowed opacity-50" 
                              : "text-red-600 hover:text-red-800 hover:bg-red-50 dark:text-red-400 dark:hover:text-red-300 dark:hover:bg-red-900/20 disabled:opacity-50 disabled:cursor-not-allowed"
                          }`}
                          title={isInUse ? "Cannot delete - entry type is in use" : "Delete entry type"}
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  )})}
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="text-gray-400 dark:text-gray-500 mb-2">
                    <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <p className="text-gray-500 dark:text-gray-400">
                    No entry types found for this sub-event
                  </p>
                  <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
                    Create the first entry type using the form
                  </p>
                </div>
              )}
            </div>
          )}
          
          {/* Helper text when no sub-event selected */}
          {formData.event && !formData.sub_event && (
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  Select a sub-event to view existing entry types
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Success Popup */}
      <SuccessPopup
        isOpen={showSuccessPopup}
        onClose={() => {
          setShowSuccessPopup(false);
          // Stay on the same page, don't navigate
        }}
        title="Entry Type Created Successfully!"
        message="Your entry type has been created and is now available for ticket sales. You can create another entry type or go back to ongoing events."
        autoClose={true}
        autoCloseDelay={3000}
      />

      {/* Delete Confirmation Modal */}
      {showDeleteModal && deletingEntryType && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 w-full max-w-md">
            <div className="flex items-center justify-center mb-4">
              <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center">
                <svg className="w-6 h-6 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
            </div>
            
            <div className="text-center mb-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Delete Entry Type
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                Are you sure you want to delete <span className="font-medium text-gray-900 dark:text-white">"{deletingEntryType.name}"</span>?
              </p>
              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3 text-left">
                <div className="text-xs text-gray-500 dark:text-gray-400 space-y-1">
                  <div>Price: ₹{deletingEntryType.price}</div>
                  <div>Event: {deletingEntryType.event_name}</div>
                  <div>Sub-Event: {deletingEntryType.sub_event_name}</div>
                  <div>Status: {deletingEntryType.is_active ? "Active" : "Inactive"}</div>
                  {deletingEntryType.tickets_sold > 0 && (
                    <div className="text-orange-600 dark:text-orange-400 font-medium">
                      Tickets Sold: {deletingEntryType.tickets_sold}
                    </div>
                  )}
                </div>
              </div>
              <p className="text-xs text-red-600 dark:text-red-400 mt-3">
                This action cannot be undone.
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setDeletingEntryType(null);
                }}
                disabled={loading}
                className="flex-1 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 font-medium py-2.5 px-4 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-gray-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteEntryType}
                disabled={loading}
                className="flex-1 bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white font-medium py-2.5 px-4 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-red-500/20 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Deleting...
                  </span>
                ) : (
                  "Delete Entry Type"
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && editingEntryType && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Edit Entry Type
              </h3>
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setEditingEntryType(null);
                }}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleUpdateEntryType} className="space-y-4">
              <div>
                <Label htmlFor="editName">Entry Type Name *</Label>
                <Input
                  type="text"
                  id="editName"
                  name="name"
                  value={editFormData.name}
                  onChange={handleEditInputChange}
                  placeholder="e.g., Adult, Kids, VIP"
                  required
                  disabled={loading}
                />
              </div>

              <div>
                <Label htmlFor="editPrice">Price *</Label>
                <Input
                  type="number"
                  step="0.01"
                  id="editPrice"
                  name="price"
                  value={editFormData.price}
                  onChange={handleEditInputChange}
                  placeholder="0.00"
                  required
                  disabled={loading}
                />
              </div>

              <div>
                <Label htmlFor="editDescription">Description</Label>
                <textarea
                  id="editDescription"
                  name="description"
                  value={editFormData.description}
                  onChange={handleEditInputChange}
                  placeholder="Optional description"
                  disabled={loading}
                  rows={3}
                  className="w-full rounded-lg border appearance-none px-4 py-2.5 text-sm shadow-theme-xs placeholder:text-gray-400 focus:outline-hidden focus:ring-3 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 bg-transparent text-gray-800 border-gray-300 focus:border-brand-300 focus:ring-brand-500/20 dark:border-gray-700 dark:focus:border-brand-800 resize-none"
                />
              </div>

              <div className="flex items-center gap-3">
                <Checkbox
                  checked={editFormData.is_active}
                  onChange={(checked) => setEditFormData(prev => ({ ...prev, is_active: checked }))}
                  disabled={loading}
                />
                <Label>Active</Label>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-brand-500 hover:bg-brand-600 disabled:bg-brand-300 text-white font-medium py-2.5 px-4 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                >
                  {loading ? "Updating..." : "Update Entry Type"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowEditModal(false);
                    setEditingEntryType(null);
                  }}
                  disabled={loading}
                  className="flex-1 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 font-medium py-2.5 px-4 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-gray-500/20"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}