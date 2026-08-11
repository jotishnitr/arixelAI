import "./Sidebar.css";
import icon from "../assets/icon.png";
import historyIcon from "../assets/history.png";
import settingsIcon from "../assets/settings.png";
import profileIcon from "../assets/profile.png";
import { useState, useEffect, useRef } from "react";
export default function Sidebar({ context, setContext, currentState, setCurrentState }) {
  const [currentChat, setCurrentChat] = useState(null);
  const [contextHistory, setContextHistory] = useState([]);

  useEffect(() => {
    async function getContextHistory() {
      try {
        const response = await fetch(
          "http://localhost:5000/api/getChatContextHistory",
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
    }
    getContextHistory();
  }, []);

  return (
    <section className="sidebar-section">
      <div className="header-container">
        <div className="icon-container">
          <img src={icon} alt="ArixelAI Logo" />
        </div>
        <div className="title-container">
          <div className="title">ArixelAI</div>
          <div className="tagline">AI Assistant</div>
        </div>
      </div>

      <div className="new-chat-btn-container">
        <button className="new-chat-btn">+ New Chat</button>
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
              onClick={() => { setCurrentChat(chat._id); setContext(chat.context); setCurrentState("chat") }}>
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
        <div className="settings-container">
          <img src={settingsIcon} alt="Settings Icon" />
          Settings
        </div>
        <div className="profile-container">
          <img src={profileIcon} alt="Profile Icon" />
          Profile
        </div>
      </div>
    </section>
  );
}
