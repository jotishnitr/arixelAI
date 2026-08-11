import { useEffect, useState } from "react";

import Homepage from "./pages/Homepage";
import Register from "./pages/Register";
import Login from "./pages/Login";

export default function App() {
  const [currentPage, setCurrentPage] = useState("Register");

  useEffect(() => {
    async function verification() {
      const response = await fetch("http://localhost:5000/verify/verify", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
      })
      const data = await response.json();
      if (response.ok) {
        setCurrentPage("homePage");
      }
    }
    verification();
  }, []);


  return (
    <>
      {currentPage === "Register" && <Register setCurrentPage={setCurrentPage} />}
      {currentPage === "Login" && <Login setCurrentPage={setCurrentPage} />}
      {currentPage === "homePage" && <Homepage />}
    </>
  );
}
