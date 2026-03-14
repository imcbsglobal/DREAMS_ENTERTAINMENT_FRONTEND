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
    first_name: string;
    last_name: string;
  };
  staff_code: string;
  role: string;
  range_start: number;
  range_end: number;
  current_counter: number;
  assigned_sub_events?: number[];
}

interface SubEvent {
  id: number;
  name: string;
  event_name: string;
  code: string;
  start_time: string;
  end_time: string;
}

export default function AssignSubEvents() {
  const navigate = useNavigate();
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [subEventsList, setSubEventsList] = useState<SubEvent[]>([]);
  const [selectedStaffId, setSelectedStaffId] = useState("");
  const [selectedSubEvents, setSelectedSubEvents] = useState(new Set<number>());
  const [currentAssignments, setCurrentAssignments] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [assignmentCount, setAssignmentCount] = useState(0);
  const [expandedEvents, setExpandedEvents] = useState<Set<string>>(new Set());

  const API_BASE = "https://de.imcbs.com/api";
  const token = localStorage.getItem("access_token");

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      await Promise.all([loadStaff(), loadSubEvents()]);
    } catch (error) {
      setMessage("Error loading data");
    } finally {
      setLoading(false);
    }
  };

  const loadStaff = async () => {
    try {
      const response = await axios.get<Staff[]>(`${API_BASE}/admin/staff-list/`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const filteredStaff = response.data.filter(s => s.role === "staff");
      setStaffList(filteredStaff);
      return filteredStaff;
    } catch (error) {
      setMessage("Error loading staff");
      return [];
    }
  };

  const loadSubEvents = async () => {
    try {
      const response = await axios.get<SubEvent[]>(`${API_BASE}/admin/sub-events/0/`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSubEventsList(response.data);
    } catch (error) {
      setMessage("Error loading sub-events");
    }
  };

  const handleStaffChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const staffId = e.target.value;
    setSelectedStaffId(staffId);

    if (!staffId) {
      setSelectedSubEvents(new Set());
      setCurrentAssignments([]);
      return;
    }

    const staff = staffList.find(s => s.id === parseInt(staffId));
    if (staff && staff.assigned_sub_events) {
      setSelectedSubEvents(new Set(staff.assigned_sub_events));
      const assignments = staff.assigned_sub_events.map(seId => {
        const se = subEventsList.find(s => s.id === seId);
        return se ? `${se.event_name} - ${se.name}` : "";
      }).filter(Boolean);
      setCurrentAssignments(assignments);
    } else {
      setSelectedSubEvents(new Set());
      setCurrentAssignments([]);
    }
  };

  const toggleSubEvent = (subEventId: number) => {
    const newSelected = new Set(selectedSubEvents);
    if (newSelected.has(subEventId)) {
      newSelected.delete(subEventId);
    } else {
      if (newSelected.size >= 1) {
        setMessage("A staff member can only be assigned to one event at a time");
        setTimeout(() => setMessage(""), 3000);
        return;
      }
      newSelected.add(subEventId);
    }
    setSelectedSubEvents(newSelected);
  };

  const assignSubEvents = async () => {
    if (!selectedStaffId) {
      setMessage("Please select a staff member");
      return;
    }

    if (selectedSubEvents.size > 1) {
      setMessage("A staff member can only be assigned to one event at a time");
      return;
    }

    try {
      await axios.post(
        `${API_BASE}/admin/assign-events/`,
        {
          staff_id: parseInt(selectedStaffId),
          sub_event_ids: Array.from(selectedSubEvents),
          replace: true
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setMessage("success");
      setAssignmentCount(prev => prev + 1);
      
      const updatedStaffList = await loadStaff();
      const staff = updatedStaffList.find(s => s.id === parseInt(selectedStaffId));
      
      if (staff && staff.assigned_sub_events) {
        setSelectedSubEvents(new Set(staff.assigned_sub_events));
        const assignments = staff.assigned_sub_events.map(seId => {
          const se = subEventsList.find(s => s.id === seId);
          return se ? `${se.event_name} - ${se.name}` : "";
        }).filter(Boolean);
        setCurrentAssignments(assignments);
      }
      
      setTimeout(() => setMessage(""), 3000);
    } catch (error: any) {
      setMessage(error.response?.data?.error || "Assignment failed");
    }
  };

  const selectedStaff = staffList.find(s => s.id === parseInt(selectedStaffId));

  // Group sub-events by parent event
  const groupedSubEvents = subEventsList.reduce((acc, subEvent) => {
    const eventName = subEvent.event_name;
    if (!acc[eventName]) {
      acc[eventName] = [];
    }
    acc[eventName].push(subEvent);
    return acc;
  }, {} as Record<string, SubEvent[]>);

  const toggleEventExpansion = (eventName: string) => {
    const newExpanded = new Set(expandedEvents);
    if (newExpanded.has(eventName)) {
      newExpanded.delete(eventName);
    } else {
      newExpanded.add(eventName);
    }
    setExpandedEvents(newExpanded);
  };

  return (
    <>
      <PageMeta
        title="Assign Events | Dream Entertainment"
        description="Manage staff access to festival sub-events"
      />
      <PageBreadcrumb pageTitle="Assign Events to Staff" />
      
      <div className="space-y-6">
        {/* Stats */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-gray-50 dark:bg-gray-900/20 p-6 rounded-lg border border-gray-200 dark:border-gray-800 text-center">
              <div className="text-2xl font-bold text-gray-600 dark:text-gray-400">{staffList.length}</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Total Staff</div>
            </div>
            <div className="bg-gray-50 dark:bg-gray-900/20 p-6 rounded-lg border border-gray-200 dark:border-gray-800 text-center">
              <div className="text-2xl font-bold text-gray-600 dark:text-gray-400">{subEventsList.length}</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Total Sub-Events</div>
            </div>
            <div className="bg-gray-50 dark:bg-gray-900/20 p-6 rounded-lg border border-gray-200 dark:border-gray-800 text-center">
              <div className="text-2xl font-bold text-gray-600 dark:text-gray-400">{assignmentCount}</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Assignments Made</div>
            </div>
          </div>
        </div>

        {/* Staff Selection */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <div>
            <Label htmlFor="staff">Select Staff Member</Label>
            <select
              id="staff"
              value={selectedStaffId}
              onChange={handleStaffChange}
              className="h-11 w-full rounded-lg border bg-transparent text-gray-800 border-gray-300 focus:border-brand-300 focus:ring-brand-500/20 dark:border-gray-700 dark:text-white/90 dark:focus:border-brand-800 px-4 py-2.5 text-sm shadow-theme-xs focus:outline-hidden focus:ring-3 dark:bg-gray-900 placeholder:text-gray-400 dark:placeholder:text-white/30"
            >
              <option value="">-- Select Staff --</option>
              {staffList.map(staff => (
                <option key={staff.id} value={staff.id}>
                  {staff.user.username} ({staff.staff_code}) - Range: {staff.range_start}-{staff.range_end}
                </option>
              ))}
            </select>
          </div>
        </div>

        {message && (
          <div className={`p-3 text-sm rounded-lg ${
            message === "success" 
              ? "text-green-600 bg-green-50 border border-green-200 dark:bg-green-900/20 dark:border-green-800 dark:text-green-400"
              : "text-red-600 bg-red-50 border border-red-200 dark:bg-red-900/20 dark:border-red-800 dark:text-red-400"
          }`}>
            {message === "success" ? `Successfully assigned ${selectedSubEvents.size} sub-events!` : message}
          </div>
        )}

        {/* Staff Details & Assignment */}
        {selectedStaff && (
          <ComponentCard title="Staff Assignment" desc="Assign sub-events to selected staff member">
            <div className="space-y-6">
              {/* Staff Info */}
              <div className="bg-gray-50 dark:bg-gray-900/20 p-4 rounded-lg">
                <div className="font-medium text-gray-900 dark:text-white">
                  {selectedStaff.user.first_name} {selectedStaff.user.last_name} (@{selectedStaff.user.username})
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  Staff Code: {selectedStaff.staff_code} | Range: {selectedStaff.range_start}-{selectedStaff.range_end} | Counter: {selectedStaff.current_counter}
                </div>
              </div>

              {/* Current Assignments */}
              {currentAssignments.length > 0 && (
                <div>
                  <h4 className="font-medium text-gray-900 dark:text-white mb-2">Currently Assigned Sub-Events:</h4>
                  <ul className="space-y-1">
                    {currentAssignments.map((assignment, idx) => (
                      <li key={idx} className="text-sm text-green-600 dark:text-green-400">✓ {assignment}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Sub-Events List */}
              <div>
                <Label>Available Sub-Events</Label>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {loading ? (
                    <div className="text-center py-4 text-gray-500">Loading sub-events...</div>
                  ) : Object.keys(groupedSubEvents).length === 0 ? (
                    <div className="text-center py-4 text-gray-500">No sub-events available</div>
                  ) : (
                    Object.entries(groupedSubEvents).map(([eventName, subEvents]) => {
                      const isExpanded = expandedEvents.has(eventName);
                      const hasSelectedChild = subEvents.some(se => selectedSubEvents.has(se.id));
                      
                      return (
                        <div key={eventName} className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                          {/* Parent Event Header */}
                          <div
                            className={`p-3 cursor-pointer transition-colors flex items-center justify-between ${
                              hasSelectedChild
                                ? "bg-brand-50 dark:bg-brand-900/20"
                                : "bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700"
                            }`}
                            onClick={() => toggleEventExpansion(eventName)}
                          >
                            <div className="flex items-center gap-2">
                              <svg
                                className={`w-4 h-4 transition-transform ${
                                  isExpanded ? 'rotate-90' : ''
                                }`}
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                              </svg>
                              <div>
                                <div className="font-semibold text-gray-900 dark:text-white">{eventName}</div>
                                <div className="text-xs text-gray-500 dark:text-gray-400">
                                  {subEvents.length} sub-event{subEvents.length !== 1 ? 's' : ''}
                                </div>
                              </div>
                            </div>
                            {hasSelectedChild && (
                              <span className="text-xs bg-brand-500 text-white px-2 py-1 rounded-full">
                                Selected
                              </span>
                            )}
                          </div>
                          
                          {/* Child Sub-Events */}
                          {isExpanded && (
                            <div className="border-t border-gray-200 dark:border-gray-700">
                              {subEvents.map(se => (
                                <div
                                  key={se.id}
                                  className={`p-3 border-b last:border-b-0 border-gray-200 dark:border-gray-700 cursor-pointer transition-colors ${
                                    selectedSubEvents.has(se.id)
                                      ? "bg-brand-50 dark:bg-brand-900/20"
                                      : "bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800"
                                  }`}
                                  onClick={() => toggleSubEvent(se.id)}
                                >
                                  <div className="flex items-center pl-6">
                                    <input
                                      type="checkbox"
                                      checked={selectedSubEvents.has(se.id)}
                                      onChange={() => toggleSubEvent(se.id)}
                                      className="mr-3"
                                      onClick={(e) => e.stopPropagation()}
                                    />
                                    <div className="flex-1">
                                      <div className="font-medium text-gray-900 dark:text-white">{se.name}</div>
                                      <div className="text-sm text-gray-600 dark:text-gray-400">
                                        Code: {se.code} | {new Date(se.start_time).toLocaleDateString()} - {new Date(se.end_time).toLocaleDateString()}
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-4">
                <button
                  onClick={assignSubEvents}
                  className="flex-1 bg-brand-500 hover:bg-brand-600 text-white font-medium py-2.5 px-4 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                >
                  Save Assignments
                </button>
                <button
                  onClick={() => setSelectedSubEvents(new Set())}
                  className="flex-1 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 font-medium py-2.5 px-4 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-gray-500/20"
                >
                  Clear Selection
                </button>
              </div>
            </div>
          </ComponentCard>
        )}
      </div>
    </>
  );
}