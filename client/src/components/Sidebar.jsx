import "./Sidebar.css";
import icon from "../assets/icon.png";
import historyIcon from "../assets/history.png";
import settingsIcon from "../assets/settings.png";
import profileIcon from "../assets/profile.png";
import { useState, useEffect, useRef } from "react";
import { API_BASE_URL } from "../config";
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

  const handleEditTitle = async (chatId, currentTitle) => {
    setActiveMenuId(null);

    const newTitle = prompt("Edit chat title:", currentTitle);
    if (newTitle && newTitle.trim() && newTitle.trim() !== currentTitle) {
      try {
        await fetch(`${API_BASE_URL}/api/editContext`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            id: chatId,
            context: newTitle.trim()
          })
        });
        // Update the title in the UI
        const updatedHistory = contextHistory.map(chat =>
          chat._id === chatId ? { ...chat, context: newTitle.trim() } : chat
        );
        setContextHistory(updatedHistory);

        // If the current chat is this one, update the display
        if (currentChat === chatId) {
          setContext(newTitle.trim());
        }
      } catch (err) {
        console.error("Error editing chat title:", err);
        alert("Failed to update chat title , Please try again");
      }
    }
  };

  const handleDeleteChat = async (e, chatId) => {
    e.stopPropagation();
    setActiveMenuId(null);

    if (window.confirm("Are you sure you want to delete this chat?")) {
      try {
        await fetch(`${API_BASE_URL}/api/deleteChat`, {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            id: chatId
          })
        });

        const updatedHistory = contextHistory.filter(chat => chat._id !== chatId);
        setContextHistory(updatedHistory);

        // If we deleted the current chat, switch to a new chat
        if (currentChat === chatId) {
          setCurrentChat(null);
          setCurrentState("hero");
          setCurrentContext("new");
          setContext("");
        }
      } catch (err) {
        console.error("Error deleting chat:", err);
        alert("Failed to delete chat , Please try again");
      }
    }
  };

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
              <p className="chat-title" title={chat.context}>{chat.context}</p>
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
                  <button className="menu-item" onClick={(e) => { e.stopPropagation(); setActiveMenuId(null); handleEditTitle(chat._id, chat.context); /* User stub for edit */ }}>
                    ✏️ Edit Title
                  </button>
                  <button className="menu-item delete" onClick={(e) => { e.stopPropagation(); setActiveMenuId(null); handleDeleteChat(e, chat._id); /* User stub for delete */ }}>
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
