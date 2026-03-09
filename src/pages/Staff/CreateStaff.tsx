import { useState } from "react";
import { useNavigate } from "react-router";
import axios from "axios";
import PageMeta from "../../components/common/PageMeta";
import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import ComponentCard from "../../components/common/ComponentCard";
import Label from "../../components/form/Label";
import Input from "../../components/form/input/InputField";

export default function CreateStaff() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    username: "",
    password: "",
    email: "",
    first_name: "",
    last_name: "",
    role: "staff",
    range_start: "",
    range_end: ""
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      const token = localStorage.getItem("access_token");
      await axios.post("https://de.imcbs.com/api/admin/create-staff/", formData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMessage("success");
      setTimeout(() => navigate("/list-staff"), 1500);
    } catch (err: any) {
      setMessage(err.response?.data?.error || JSON.stringify(err.response?.data) || "Failed to create staff");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <PageMeta
        title="Create Staff Member | Dream Entertainment"
        description="Add a new staff member to the ticket management system"
      />
      <PageBreadcrumb pageTitle="Create Staff Member" />
      
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <div className="space-y-6">
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            {message && (
              <div className={`p-3 text-sm rounded-lg mb-4 ${
                message === "success" 
                  ? "text-green-600 bg-green-50 border border-green-200 dark:bg-green-900/20 dark:border-green-800 dark:text-green-400"
                  : "text-red-600 bg-red-50 border border-red-200 dark:bg-red-900/20 dark:border-red-800 dark:text-red-400"
              }`}>
                {message === "success" ? "Staff created successfully!" : message}
              </div>
            )}
            
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
                  />
                </div>

                <div>
                  <Label htmlFor="password">Password *</Label>
                  <Input
                    type="password"
                    id="password"
                    name="password"
                    value={formData.password}
                    onChange={handleInputChange}
                    placeholder="Enter password"
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
                  placeholder="e.g., john@example.com"
                />
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
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="role">Role *</Label>
                <select
                  id="role"
                  name="role"
                  value={formData.role}
                  onChange={handleInputChange}
                  className="h-11 w-full rounded-lg border bg-transparent text-gray-800 border-gray-300 focus:border-brand-300 focus:ring-brand-500/20 dark:border-gray-700 dark:text-white/90 dark:focus:border-brand-800 px-4 py-2.5 text-sm shadow-theme-xs focus:outline-hidden focus:ring-3 dark:bg-gray-900 placeholder:text-gray-400 dark:placeholder:text-white/30"
                >
                  <option value="staff">Staff</option>
                  <option value="admin">Admin</option>
                </select>
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
                  />
                </div>

                <div>
                  <Label htmlFor="range_end">Ticket Range End *</Label>
                  <Input
                    type="number"
                    id="range_end"
                    name="range_end"
                    value={formData.range_end}
                    onChange={handleInputChange}
                    placeholder="e.g., 6000"
                    min="1"
                  />
                </div>
              </div>

              <div className="flex gap-4 pt-4">
                <button
                  type="button"
                  onClick={() => navigate("/dashboard")}
                  disabled={loading}
                  className="flex-1 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 font-medium py-2.5 px-4 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-gray-500/20"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-brand-500 hover:bg-brand-600 disabled:bg-brand-300 text-white font-medium py-2.5 px-4 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                >
                  {loading ? "Creating..." : "Create Staff"}
                </button>
              </div>
            </form>
          </div>
        </div>
        <div className="space-y-6">
          {/* Additional information or preview can be added here */}
        </div>
      </div>
    </>
  );
}