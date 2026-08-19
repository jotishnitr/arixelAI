import icon from "../assets/icon.png";
import emailIcon from "../assets/emailIcon.png";
import codeIcon from "../assets/codeIcon.png";
import docIcon from "../assets/documentIcon.png";
import compassIcon from "../assets/compassIcon.png";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import "./Chatarea.css";
import Markdown from "react-markdown";
import recognition from "../utils/speechRecognition";
export default function Chatarea({
  setContext,
  context,
  currentState,
  setCurrentState,
  currentContext,
  setCurrentContext,
  getContextHistory,
  isSidebarOpen,
  setIsSidebarOpen,
}) {
  const [chatInput, setChatInput] = useState("");
  const [chatHistory, setChatHistory] = useState([]);


  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);

  const [showPopup, setShowPopup] = useState(false);
  const [filePreview, setFilePreview] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [name, setName] = useState("");

  // for text-speech convertion (state)
  const [isListening, setIsListening] = useState(false);

  const [selectedChoice, setSelectedChoice] = useState("general");
  const [showChoiceDropdown, setShowChoiceDropdown] = useState(false);
  const choiceDropdownRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (
        choiceDropdownRef.current &&
        !choiceDropdownRef.current.contains(event.target)
      ) {
        setShowChoiceDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const startListening = () => {
    if (!recognition) {
      alert("Speech Recognition is not supported");
      return;
    }
    try {
      recognition.start();
      setIsListening(true);
    } catch (error) {
      console.error("Failed to start speech recognition:", error);
    }
  };

  const stopListening = () => {
    if (recognition) {
      recognition.stop();
    }
    setIsListening(false);
  };

  useEffect(() => {
    if (!recognition) {
      return;
    }

    const handleResult = (event) => {
      let transcript = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript;
      }
      setChatInput(transcript);
    };

    const handleEnd = () => {
      setIsListening(false);
    };

    const handleError = (event) => {
      console.error("Speech recognition error:", event.error);
      setIsListening(false);
    };

    recognition.addEventListener("result", handleResult);
    recognition.addEventListener("end", handleEnd);
    recognition.addEventListener("error", handleError);

    return () => {
      recognition.removeEventListener("result", handleResult);
      recognition.removeEventListener("end", handleEnd);
      recognition.removeEventListener("error", handleError);
    };
  }, []);

  function previewFile(e) {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setFilePreview(reader.result);
      };
      reader.readAsDataURL(file);
    } else {
      setSelectedFile(null);
      setFilePreview(null);
    }
  }

  const fileToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const base64String = reader.result.split(",")[1];
        resolve(base64String);
      };
      reader.onerror = reject;
    });
  };

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "24px";
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [chatInput]);

  useEffect(() => {
    async function getUserName() {
      const res = await fetch("https://arixelai.onrender.com/api/getProfile", {
        method: "GET",
        credentials: "include",
      });
      const data = await res.json();
      if (res.ok) {
        setName(data.name);
      }
    }
    getUserName();
  }, []);

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  useEffect(() => {
    if (context) {
      getChatHistory(context);
    }
  }, [context]);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [chatHistory]);

  async function handleSubmit(overrideInput) {
    const messageToSend =
      (typeof overrideInput === "string" ? overrideInput : "") || chatInput;
    if (!messageToSend.trim()) return;
    const base64Image = selectedFile ? await fileToBase64(selectedFile) : null;
    const attachmentObj = selectedFile
      ? {
        name: selectedFile.name,
        mimeType: selectedFile.type,
        base64: base64Image,
      }
      : null;

    const userMessage = {
      role: "user",
      content: messageToSend,
      attachment: attachmentObj,
    };
    const thinkingMessage = {
      role: "model",
      content: "Generating response...",
    };
    setChatHistory((prev) => [
      ...prev.filter((msg) => msg && msg !== ""),
      userMessage,
      thinkingMessage,
    ]);
    setCurrentState("chat");
    setChatInput("");
    setFilePreview(null);
    setSelectedFile(null);
    setShowPopup(false);

    let response;
    try {
      if (selectedChoice === "general") {
        response = await fetch(
          "https://arixelai.onrender.com/api/postChat/general",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            credentials: "include",
            body: JSON.stringify({
              text: messageToSend,
              context: currentContext === "new" ? "" : context,
              attachment: attachmentObj,
            }),
          },
        )
      };
      if (selectedChoice === "image generation") {
        response = await fetch(
          "https://arixelai.onrender.com/api/postChat/image",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            credentials: "include",
            body: JSON.stringify({
              text: messageToSend,
              context: currentContext === "new" ? "" : context,
            }),
          },
        )
      };
      if (selectedChoice === "coding expert") {
        response = await fetch(
          "https://arixelai.onrender.com/api/postChat/code",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            credentials: "include",
            body: JSON.stringify({
              text: messageToSend,
              context: currentContext === "new" ? "" : context,
            }),
          },
        )
      };
      if (selectedChoice === "document analysis") {
        response = await fetch(
          "https://arixelai.onrender.com/api/postChat/doc",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            credentials: "include",
            body: JSON.stringify({
              text: messageToSend,
              context: currentContext === "new" ? "" : context,
              attachment: attachmentObj,
            }),
          },
        )
      };


      const data = await response.json();
      if (response.ok) {
        setContext(data.context);
        getChatHistory(data.context);
        if (currentContext === "new") {
          getContextHistory();
        }
        setCurrentContext("old");
      } else {
        setChatHistory((prev) => [
          ...prev.slice(0, -1),
          {
            role: "model",
            content:
              "I'm really sorry, but I encountered an error while processing your request. Please try sending your message again.",
          },
        ]);
      }
    } catch (error) {
      console.error("Error posting chat:", error);
      setChatHistory((prev) => [
        ...prev.slice(0, -1),
        {
          role: "model",
          content:
            "I apologize, but I am unable to reach the server right now. Please verify your connection and try again.",
        },
      ]);
    }
  }

  async function getChatHistory(currentContext) {
    const activeContext = currentContext || context;
    if (!activeContext) return;

    try {
      const response = await fetch(
        "https://arixelai.onrender.com/api/getChatHistory",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify({
            context: activeContext,
          }),
        },
      );
      const data = await response.json();
      if (response.ok && data && data.messages) {
        setChatHistory(data.messages);
      } else {
        setChatHistory([]);
      }
    } catch (error) {
      console.error("Error fetching chat history:", error);
      setChatHistory([]);
    }
  }

  return (
    <section className="chat-content-area">
      {/* Mobile Hamburger Toggle Button */}
      <button
        className="mobile-sidebar-toggle"
        onClick={() => setIsSidebarOpen(true)}
        aria-label="Open Sidebar"
      >
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <line x1="3" y1="12" x2="21" y2="12"></line>
          <line x1="3" y1="6" x2="21" y2="6"></line>
          <line x1="3" y1="18" x2="21" y2="18"></line>
        </svg>
      </button>

      {/* Sidebar backdrop overlay on mobile */}
      {isSidebarOpen && (
        <div
          className="sidebar-overlay"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}
      <AnimatePresence mode="wait">
        {currentState === "hero" && (
          <motion.div
            className="hero-container"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.5 }}
          >
            <div className="logo-display-container">
              <img src={icon} alt="Axiel AI Icon" />
            </div>
            <div className="welcome-text-container">
              <h1>
                Welcome back, {name || "Guest"}! How can I help you today?
              </h1>
            </div>
            <div className="tagline-container">
              Start a new conversation or pick a suggested task below to get
              things moving.
            </div>
            <div className="suggestions-container">
              <div
                className="suggestion-card"
                onClick={() => handleSubmit("Write a marketing email")}
              >
                <div className="card-icon-container">
                  <img src={emailIcon} alt="email-icon" />
                </div>
                <div className="card-content">
                  <div className="suggestion-text-container">
                    Write a marketing email
                  </div>
                  <div className="suggestion-desc-container">
                    Generate a high-converting announcement for a new product
                    launch.
                  </div>
                </div>
              </div>
              <div
                className="suggestion-card"
                onClick={() => handleSubmit("Debug my Python script")}
              >
                <div className="card-icon-container">
                  <img src={codeIcon} alt="code-icon" />
                </div>
                <div className="card-content">
                  <div className="suggestion-text-container">
                    Debug my Python script
                  </div>
                  <div className="suggestion-desc-container">
                    Upload a snippet and I'll find potential bottlenecks or
                    logic errors.
                  </div>
                </div>
              </div>
              <div
                className="suggestion-card"
                onClick={() => handleSubmit("Summarize this article")}
              >
                <div className="card-icon-container">
                  <img src={docIcon} alt="doc-icon" />
                </div>
                <div className="card-content">
                  <div className="suggestion-text-container">
                    Summarize this article
                  </div>
                  <div className="suggestion-desc-container">
                    Paste a long-form URL or text and get the key bullet
                    points instantly.
                  </div>
                </div>
              </div>
              <div
                className="suggestion-card"
                onClick={() => handleSubmit("Plan a 3-day trip")}
              >
                <div className="card-icon-container">
                  <img src={compassIcon} alt="compass-icon" />
                </div>
                <div className="card-content">
                  <div className="suggestion-text-container">
                    Plan a 3-day trip
                  </div>
                  <div className="suggestion-desc-container">
                    Customized itinerary based on your interests and budget
                    constraints.
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {currentState === "chat" && (
          <motion.div
            className="chat-messages-container"
            key={context || "chat"}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.5 }}
          >
            {chatHistory.map((msg, index) => (
              <div
                key={index}
                className={`chat-message-row ${msg.role === "user" ? "user-row" : "ai-row"}`}
              >
                {msg.role !== "user" && (
                  <div className="message-avatar">
                    <img
                      src={icon}
                      alt="AI Avatar"
                      className="ai-avatar-icon"
                    />
                  </div>
                )}
                <div
                  className={`chat-bubble ${msg.role === "user" ? "user-bubble" : "ai-bubble"}`}
                >
                  {msg.attachment && (
                    <div className="chat-attachment-preview">
                      {msg.attachment.mimeType &&
                        msg.attachment.mimeType.startsWith("image/") ? (
                        <img
                          src={`data:${msg.attachment.mimeType};base64,${msg.attachment.base64}`}
                          alt={msg.attachment.name}
                          className="chat-attached-image"
                        />
                      ) : (
                        <div className="chat-attached-file">
                          <span className="file-icon">📄</span>
                          <span className="file-name">
                            {msg.attachment.name}
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                  <div
                    className={
                      msg.role === "model" &&
                        msg.content === "Generating response..."
                        ? "thinking-message"
                        : ""
                    }
                  >
                    {msg.content && /^https?:\/\/[^\s]+$/i.test(msg.content.trim()) ? (
                      <div className="chat-image-response">
                        <img
                          src={msg.content.trim()}
                          alt="AI Generated"
                          className="chat-generated-image"
                          loading="lazy"
                        />
                        <a
                          href={msg.content.trim()}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="download-image-btn"
                        >
                          Open image in new tab ↗
                        </a>
                      </div>
                    ) : (
                      <Markdown remarkPlugins={[remarkGfm]}>
                        {msg.content || ""}
                      </Markdown>
                    )}
                  </div>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </motion.div>
        )}
      </AnimatePresence>

      <div className="chat-input-wrapper">
        {showPopup && (
          <section className="upload-popup">
            <div className="upload-popup-header">
              <h3>Upload attachment</h3>
              <button
                className="close-popup-btn"
                aria-label="Close popup"
                onClick={() => setShowPopup(false)}
              >
                ×
              </button>
            </div>
            <div className="upload-popup-body">
              <label className="file-drop-area">
                <input
                  type="file"
                  onChange={previewFile}
                  style={{ display: "none" }}
                />
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="17 8 12 3 7 8" />
                  <line x1="12" y1="3" x2="12" y2="15" />
                </svg>
                <span>Choose a file to upload</span>
              </label>
              {filePreview && (
                <div className="preview-container">
                  {selectedFile && selectedFile.type.startsWith("image/") ? (
                    <img
                      src={filePreview}
                      alt="Preview"
                      className="image-preview"
                    />
                  ) : (
                    <div className="file-icon-preview">
                      <span>📄 {selectedFile?.name}</span>
                    </div>
                  )}
                  <button
                    className="remove-file-btn"
                    onClick={() => {
                      setFilePreview(null);
                      setSelectedFile(null);
                    }}
                  >
                    Remove file
                  </button>
                </div>
              )}
            </div>
          </section>
        )}
        <div className="chat-input-container">
          <div className="input-row">
            <button
              className="attach-btn"
              aria-label="Attach file"
              onClick={() => setShowPopup(!showPopup)}
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.57a2 2 0 0 1-2.83-2.83l8.49-8.48" />
              </svg>
            </button>
            <textarea
              ref={textareaRef}
              placeholder="Message ArixelAI..."
              className="chat-input"
              value={chatInput}
              rows={1}
              onKeyDown={handleKeyDown}
              onChange={(e) => setChatInput(e.target.value)}
            />

            <div className="choice-dropdown-wrapper" ref={choiceDropdownRef}>
              <button
                className="choice-dropdown-btn"
                type="button"
                onClick={() => setShowChoiceDropdown(!showChoiceDropdown)}
                aria-label="Select mode"
              >
                <span className="current-choice-text">
                  {selectedChoice === "general" && "✨ "}
                  {selectedChoice === "coding expert" && "💻 "}
                  {selectedChoice === "image generation" && "🎨 "}
                  {selectedChoice === "image/doc analysis" && "🔍 "}
                  {selectedChoice}
                </span>
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className={`chevron-icon ${showChoiceDropdown ? "open" : ""}`}
                >
                  <polyline points="6 9 12 15 18 9"></polyline>
                </svg>
              </button>

              {showChoiceDropdown && (
                <div className="choice-dropdown-popup">
                  {[
                    "general",
                    "coding expert",
                    "image generation",
                    "image/doc analysis",
                  ].map((choice) => (
                    <button
                      key={choice}
                      className={`choice-option-btn ${selectedChoice === choice ? "active" : ""}`}
                      type="button"
                      onClick={() => {
                        setSelectedChoice(choice);
                        setShowChoiceDropdown(false);
                      }}
                    >
                      {choice === "general" && (
                        <span className="option-icon">✨</span>
                      )}
                      {choice === "coding expert" && (
                        <span className="option-icon">💻</span>
                      )}
                      {choice === "image generation" && (
                        <span className="option-icon">🎨</span>
                      )}
                      {choice === "image/doc analysis" && (
                        <span className="option-icon">🔍</span>
                      )}
                      <span className="option-text">{choice}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <button
              className={`mic-btn ${isListening ? "listening" : ""}`}
              aria-label={isListening ? "Stop listening" : "Start listening"}
              onClick={isListening ? stopListening : startListening}
              type="button"
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
                <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                <line x1="12" y1="19" x2="12" y2="22" />
              </svg>
            </button>
            <button
              className="send-btn"
              aria-label="Send message"
              onClick={handleSubmit}
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="12" y1="19" x2="12" y2="5"></line>
                <polyline points="5 12 12 5 19 12"></polyline>
              </svg>
            </button>
          </div>
          <div className="input-footer-row">
            <div className="model-info">Model: Core-1o</div>
          </div>
        </div>
      </div>
    </section>
  );
}
