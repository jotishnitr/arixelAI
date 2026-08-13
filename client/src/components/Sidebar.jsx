import "./Sidebar.css";
import icon from "../assets/icon.png";
import historyIcon from "../assets/history.png";
import settingsIcon from "../assets/settings.png";
import profileIcon from "../assets/profile.png";
import { useState, useEffect, useRef } from "react";
export default function Sidebar({ context, setContext, currentState, setCurrentState, currentContext, setCurrentContext, contextHistory, setContextHistory, getContextHistory, isSidebarOpen, setIsSidebarOpen }) {
  const [currentChat, setCurrentChat] = useState(null);

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
