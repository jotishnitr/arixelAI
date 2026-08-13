import Sidebar from "../components/Sidebar";
import Chatarea from "../components/Chatarea";
import Profile from "./ProfileModal";
import { useState, useEffect } from "react";
export default function Homepage() {
  const [context, setContext] = useState("");
  const [currentState, setCurrentState] = useState("hero");
  const [currentContext, setCurrentContext] = useState("new");
  const [contextHistory, setContextHistory] = useState([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const getContextHistory = async () => {
    try {
      const response = await fetch(
        "https://arixelai.onrender.com/api/getChatContextHistory",
        {
          method: "GET",
          credentials: "include",
        },
      );
      const data = await response.json();
      if (data.contextHistory) {
        setContextHistory(data.contextHistory);
      }
    } catch (error) {
      console.error("Error fetching context history:", error);
    }
  };

  useEffect(() => {
    getContextHistory();
  }, []);

  return (
    <>
      <Sidebar 
        context={context} 
        setContext={setContext} 
        currentState={currentState} 
        setCurrentState={setCurrentState} 
        currentContext={currentContext}
        setCurrentContext={setCurrentContext}
        contextHistory={contextHistory}
        setContextHistory={setContextHistory}
        getContextHistory={getContextHistory}
        isSidebarOpen={isSidebarOpen}
        setIsSidebarOpen={setIsSidebarOpen}
      />
      <Chatarea 
        context={context} 
        setContext={setContext} 
        currentState={currentState} 
        setCurrentState={setCurrentState} 
        currentContext={currentContext}
        setCurrentContext={setCurrentContext}
        getContextHistory={getContextHistory}
        isSidebarOpen={isSidebarOpen}
        setIsSidebarOpen={setIsSidebarOpen}
      />
      {currentState === "profile" && <Profile setCurrentState={setCurrentState} />}
    </>
  );
}
