import { BrowserRouter as Router, Routes, Route } from "react-router";
import SignIn from "./pages/AuthPages/SignIn";
import SignUp from "./pages/AuthPages/SignUp";
import NotFound from "./pages/OtherPage/NotFound";
import UserProfiles from "./pages/UserProfiles";
import Videos from "./pages/UiElements/Videos";
import Images from "./pages/UiElements/Images";
import Alerts from "./pages/UiElements/Alerts";
import Badges from "./pages/UiElements/Badges";
import Avatars from "./pages/UiElements/Avatars";
import Buttons from "./pages/UiElements/Buttons";
import LineChart from "./pages/Charts/LineChart";
import BarChart from "./pages/Charts/BarChart";
import Calendar from "./pages/Calendar";
import BasicTables from "./pages/Tables/BasicTables";
import FormElements from "./pages/Forms/FormElements";
import Blank from "./pages/Blank";
import AppLayout from "./layout/AppLayout";
import { ScrollToTop } from "./components/common/ScrollToTop";
import Home from "./pages/Dashboard/Home";
import CreateEvent from "./pages/Events/CreateEvent";
import OngoingEvents from "./pages/Events/OngoingEvents";
import CreateSubEvent from "./pages/Events/CreateSubEvent";
import CreateEntryType from "./pages/Events/CreateEntryType";
import EditEvent from "./pages/Events/EditEvent";
import ManageSubEvent from "./pages/Events/ManageSubEvent";
// import TicketCustomization from "./pages/Events/TicketCustomization";
import CreateStaff from "./pages/Staff/CreateStaff";
import ListStaff from "./pages/Staff/ListStaff";
import EditStaff from "./pages/Staff/EditStaff";
import AssignSubEvents from "./pages/Staff/AssignSubEvents";
import TicketRevenueReport from "./pages/Reports/TicketRevenueReport";
import StaffReport from "./pages/Reports/StaffReport";
import AdvanceControl from "./pages/AdvanceControl";
import DeleteTickets from "./pages/AdvanceControl/DeleteTickets";

export default function App() {
  return (
    <>
      <Router>
        <ScrollToTop />
        <Routes>
          {/* Dashboard Layout */}
          <Route element={<AppLayout />}>
            <Route index path="/dashboard" element={<Home />} />

            {/* Others Page */}
            <Route path="/profile" element={<UserProfiles />} />
            <Route path="/calendar" element={<Calendar />} />
            <Route path="/blank" element={<Blank />} />

            {/* Events */}
            <Route path="/create-event" element={<CreateEvent />} />
            <Route path="/ongoing-events" element={<OngoingEvents />} />
            <Route path="/create-sub-event" element={<CreateSubEvent />} />
            <Route path="/create-entry-type" element={<CreateEntryType />} />
            <Route path="/edit-event" element={<EditEvent />} />
            <Route path="/manage-sub-event" element={<ManageSubEvent />} />
            {/* <Route path="/ticket-customization" element={<TicketCustomization />} /> */}

            {/* Staff */}
            <Route path="/create-staff" element={<CreateStaff />} />
            <Route path="/list-staff" element={<ListStaff />} />
            <Route path="/edit-staff" element={<EditStaff />} />
            <Route path="/assign-event-staff" element={<AssignSubEvents />} />

            {/* Reports */}
            <Route path="/ticket-revenue-report" element={<TicketRevenueReport />} />
            <Route path="/staff-report" element={<StaffReport />} />

            {/* Advance Control */}
            <Route path="/advance-control" element={<AdvanceControl />} />
            <Route path="/delete-tickets" element={<DeleteTickets />} />

            {/* Forms */}
            <Route path="/form-elements" element={<FormElements />} />

            {/* Tables */}
            <Route path="/basic-tables" element={<BasicTables />} />

            {/* Ui Elements */}
            <Route path="/alerts" element={<Alerts />} />
            <Route path="/avatars" element={<Avatars />} />
            <Route path="/badge" element={<Badges />} />
            <Route path="/buttons" element={<Buttons />} />
            <Route path="/images" element={<Images />} />
            <Route path="/videos" element={<Videos />} />

            {/* Charts */}
            <Route path="/line-chart" element={<LineChart />} />
            <Route path="/bar-chart" element={<BarChart />} />
          </Route>

          {/* Auth Layout */}
          <Route index path="/" element={<SignIn />} />
          <Route path="/signin" element={<SignIn />} />
          <Route path="/signup" element={<SignUp />} />

          {/* Fallback Route */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Router>
    </>
  );
}