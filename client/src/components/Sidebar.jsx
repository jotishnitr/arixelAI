import "./Sidebar.css";
import icon from "../assets/icon.png";
import historyIcon from "../assets/history.png";
import settingsIcon from "../assets/settings.png";
import profileIcon from "../assets/profile.png";
import { useState, useEffect, useRef } from "react";
export default function Sidebar({ context, setContext, currentState, setCurrentState, currentContext, setCurrentContext, contextHistory, setContextHistory, getContextHistory, isSidebarOpen, setIsSidebarOpen }) {
  const [currentChat, setCurrentChat] = useState(null);
  const [activeMenuId, setActiveMenuId] = useState(null);

  useEffect(() => {
    const handleOutsideClick = () => {
      setActiveMenuId(null);
    };
    window.addEventListener("click", handleOutsideClick);
    return () => {
      window.removeEventListener("click", handleOutsideClick);
    };
  }, []);

  return (
    <section className={`sidebar-section ${isSidebarOpen ? "open" : ""}`}>
      <div className="sidebar-header-container">
        <div className="sidebar-icon-container">
          <img src={icon} alt="ArixelAI Logo" />
        </div>
        <div className="sidebar-title-container">
          <div className="sidebar-title">ArixelAI</div>
        </div>
      </div>

      <div className="new-chat-btn-container">
        <button className="new-chat-btn" onClick={() => { setCurrentState("hero"); setCurrentChat(null); setCurrentContext("new"); setContext(""); setIsSidebarOpen(false); }}>+ New Chat</button>
      </div>

      <div className="history-chat-display-container">
        <div className="recent-title">Recent</div>
        <div className="history-chat-display">
          {contextHistory.map((chat) => (
            <div
              className={
                currentChat == chat._id
                  ? "chat-container-active"
                  : "chat-container"
              }
              key={chat._id}
              onClick={() => { setCurrentChat(chat._id); setContext(chat.context); setCurrentState("chat"); setCurrentContext("old"); setIsSidebarOpen(false); }}>
              <img
                className="history-icon"
                src={historyIcon}
                alt="History Icon"
              />
              <p className="chat-title">{chat.context}</p>
              <button 
                className="context-menu-btn" 
                onClick={(e) => { 
                  e.stopPropagation(); 
                  setActiveMenuId(activeMenuId === chat._id ? null : chat._id);
                }}
                aria-label="Chat options"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="1.5" fill="currentColor"></circle>
                  <circle cx="12" cy="5" r="1.5" fill="currentColor"></circle>
                  <circle cx="12" cy="19" r="1.5" fill="currentColor"></circle>
                </svg>
              </button>

              {activeMenuId === chat._id && (
                <div className="context-menu-dropdown" onClick={(e) => e.stopPropagation()}>
                  <button className="menu-item" onClick={(e) => { e.stopPropagation(); setActiveMenuId(null); /* User stub for edit */ }}>
                    ✏️ Edit Title
                  </button>
                  <button className="menu-item delete" onClick={(e) => { e.stopPropagation(); setActiveMenuId(null); /* User stub for delete */ }}>
                    🗑️ Delete Chat
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="user-section">
        <div 
          className={currentState === "profile" ? "profile-container-active" : "profile-container"}
          onClick={() => { setCurrentState("profile"); setIsSidebarOpen(false); }}
        >
          <div className="profile-icon">
            <img src={profileIcon} alt="Profile Icon" />
          </div>
          <div className="user-info">
            <div className="username">Profile</div>
          </div>
        </div>
      </div>
    </section>
  );
}
