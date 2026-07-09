import React from "react";
import "./App.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import AppLayout from "./components/Layout";
import Dashboard from "./pages/Dashboard";
import CalendarPage from "./pages/CalendarPage";
import Bookings from "./pages/Bookings";
import BookingForm from "./pages/BookingForm";
import BookingDetail from "./pages/BookingDetail";
import Finance from "./pages/Finance";
import Experiences from "./pages/Experiences";
import ExperienceForm from "./pages/ExperienceForm";
import Providers from "./pages/Providers";
import ProviderForm from "./pages/ProviderForm";
import Documents from "./pages/Documents";
import Property from "./pages/Property";
import Tasks from "./pages/Tasks";
import Settings from "./pages/Settings";
import { ThemeProvider } from "./hooks/useTheme";

export default function App() {
  return (
    <ThemeProvider>
      <div className="App">
        <BrowserRouter>
          <Routes>
            <Route element={<AppLayout />}>
              <Route path="/" element={<Dashboard />} />
              <Route path="/calendar" element={<CalendarPage />} />
              <Route path="/bookings" element={<Bookings />} />
              <Route path="/bookings/new" element={<BookingForm />} />
              <Route path="/bookings/:id/edit" element={<BookingForm />} />
              <Route path="/bookings/:id" element={<BookingDetail />} />
              <Route path="/finance" element={<Finance />} />
              <Route path="/experiences" element={<Experiences />} />
              <Route path="/experiences/new" element={<ExperienceForm />} />
              <Route path="/experiences/:id/edit" element={<ExperienceForm />} />
              <Route path="/contacts" element={<Providers />} />
              <Route path="/contacts/new" element={<ProviderForm />} />
              <Route path="/contacts/:id/edit" element={<ProviderForm />} />
              <Route path="/documents" element={<Documents />} />
              <Route path="/property" element={<Property />} />
              <Route path="/tasks" element={<Tasks />} />
              <Route path="/settings" element={<Settings />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </div>
    </ThemeProvider>
  );
}
