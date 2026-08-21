import { useEffect } from "react";
import { Routes, Route, useNavigate } from "react-router-dom";

import Homepage from "./pages/Homepage";
import Register from "./pages/Register";
import Login from "./pages/Login";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";

export default function App() {
  const navigate = useNavigate();

  useEffect(() => {
    async function wakeupServer() {
      try {
        await fetch("https://arixelai.onrender.com/api/ping");
        console.log("Server is awake");
      }
      catch (error) {
        console.error("Error waking up server:", error);
        alert("Server is sleeping , Please refresh the page again.")
      }
    }
    wakeupServer();
  }, []);


  useEffect(() => {
    async function verification() {
      // Check if URL is for resetting password
      if (window.location.hash.startsWith("#/reset-password")) {
        navigate("/reset-password" + window.location.hash.replace("#/reset-password", ""));
        return;
      }

      const response = await fetch("https://arixelai.onrender.com/verify/verify", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
      })
      const data = await response.json();
      if (response.ok) {
        navigate("/");
      }
    }
    verification();
  }, [navigate]);


  return (
    <Routes>
      <Route path="/register" element={<Register />} />
      <Route path="/login" element={<Login />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/" element={<Homepage />} />
    </Routes>
  );
}
