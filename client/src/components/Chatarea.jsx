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
import { API_BASE_URL } from "../config";

function CodeBlock({ children, ...props }) {
  const [copied, setCopied] = useState(false);
  const preRef = useRef(null);

  const childProps = children?.props || {};
  const langMatch = /language-([a-zA-Z0-9_-]+)/.exec(childProps.className || "");
  const language = langMatch ? langMatch[1] : "";

  const handleCopyCode = async (e) => {
    e.stopPropagation();
    const codeText = preRef.current?.innerText || "";
    if (!codeText) return;
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(codeText);
      } else {
        const textArea = document.createElement("textarea");
        textArea.value = codeText;
        textArea.style.position = "fixed";
        textArea.style.opacity = "0";
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand("copy");
        document.body.removeChild(textArea);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy code block:", err);
    }
  };

  return (
    <div className="code-block-container">
      <div className="code-block-header">
        <span className="code-block-lang">{language || "code"}</span>
        <button
          type="button"
          className={`copy-code-btn ${copied ? "copied" : ""}`}
          onClick={handleCopyCode}
          title={copied ? "Copied code!" : "Copy code"}
          aria-label="Copy code to clipboard"
        >
          {copied ? (
            <>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              <span>Copied!</span>
            </>
          ) : (
            <>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
              </svg>
              <span>Copy code</span>
            </>
          )}
        </button>
      </div>
      <pre ref={preRef} {...props}>
        {children}
      </pre>
    </div>
  );
}

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
  setContextHistory,
}) {
  const [chatInput, setChatInput] = useState("");
  const [chatHistory, setChatHistory] = useState([]);


  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);

  const [showPopup, setShowPopup] = useState(false);
  const [filePreview, setFilePreview] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [name, setName] = useState("");

  // GitHub Integration state
  const [githubConnected, setGithubConnected] = useState(false);
  const [githubUsername, setGithubUsername] = useState("");
  const [githubLoading, setGithubLoading] = useState(false);
  const [githubRepos, setGithubRepos] = useState([]);
  const [selectedRepo, setSelectedRepo] = useState(null);
  const [showRepoPicker, setShowRepoPicker] = useState(false);
  const [repoSearch, setRepoSearch] = useState("");
  const [githubError, setGithubError] = useState("");
  const [allowReadCode, setAllowReadCode] = useState(false);

  // Prompt Token Inspector state
  const [showPromptTokens, setShowPromptTokens] = useState(false);
  const [activePromptTokenIndex, setActivePromptTokenIndex] = useState(null);
  const popoverRef = useRef(null);

  // Copy to clipboard state & handler
  const [copiedId, setCopiedId] = useState(null);

  const handleCopyMessage = async (content, copyId) => {
    if (!content) return;
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(content);
      } else {
        const textArea = document.createElement("textarea");
        textArea.value = content;
        textArea.style.position = "fixed";
        textArea.style.opacity = "0";
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand("copy");
        document.body.removeChild(textArea);
      }
      setCopiedId(copyId);
      setTimeout(() => {
        setCopiedId((prev) => (prev === copyId ? null : prev));
      }, 2000);
    } catch (err) {
      console.error("Failed to copy message:", err);
      try {
        const textArea = document.createElement("textarea");
        textArea.value = content;
        textArea.style.position = "fixed";
        textArea.style.opacity = "0";
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand("copy");
        document.body.removeChild(textArea);
        setCopiedId(copyId);
        setTimeout(() => {
          setCopiedId((prev) => (prev === copyId ? null : prev));
        }, 2000);
      } catch (fallbackErr) {
        console.error("Fallback copy failed:", fallbackErr);
      }
    }
  };

  // Click outside listener for token popover
  useEffect(() => {
    function handleClickOutside(event) {
      if (popoverRef.current && !popoverRef.current.contains(event.target)) {
        setShowPromptTokens(false);
      }
    }
    if (showPromptTokens) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showPromptTokens]);

  const currentPromptTokens = chatInput.trim()
    ? Math.ceil(chatInput.trim().length / 3.8)
    : 0;
  const currentPromptWords = chatInput.trim()
    ? chatInput.trim().split(/\s+/).filter(Boolean).length
    : 0;
  const currentPromptChars = chatInput.length;
  const fileTokensEstimate = selectedFile ? 250 : 0;
  const repoTokensEstimate = selectedRepo ? (allowReadCode ? 1200 : 80) : 0;
  const totalEstimatedPromptTokens =
    currentPromptTokens + fileTokensEstimate + repoTokensEstimate;

  // for text-speech convertion (state)
  const [isListening, setIsListening] = useState(false);



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
      const res = await fetch(`${API_BASE_URL}/api/getProfile`, {
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

  const checkGithubStatus = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/github/status`, {
        method: "GET",
        credentials: "include",
      });
      if (res.ok) {
        const data = await res.json();
        if (data.connected) {
          setGithubConnected(true);
          setGithubUsername(data.username || "");
        } else {
          setGithubConnected(false);
          setGithubUsername("");
        }
      }
    } catch (err) {
      console.error("Error checking GitHub status:", err);
    }
  };

  const fetchGithubRepos = async () => {
    setGithubLoading(true);
    setGithubError("");
    try {
      const res = await fetch(`${API_BASE_URL}/api/github/repositories`, {
        method: "GET",
        credentials: "include",
      });
      const data = await res.json();
      if (res.ok && data.repositories) {
        setGithubRepos(data.repositories);
        if (data.username) setGithubUsername(data.username);
      } else {
        setGithubError(data.error || "Failed to load repositories");
      }
    } catch (err) {
      console.error("Error fetching repositories:", err);
      setGithubError("Failed to fetch repositories");
    } finally {
      setGithubLoading(false);
    }
  };

  const handleConnectGithub = async () => {
    setGithubLoading(true);
    setGithubError("");

    try {
      const res = await fetch(`${API_BASE_URL}/api/github/auth-url`, {
        method: "GET",
        credentials: "include",
      });
      const data = await res.json();
      if (data.authUrl) {
        window.location.href = data.authUrl;
      } else if (data.clientId) {
        window.location.href = `https://github.com/login/oauth/authorize?client_id=${data.clientId}&scope=repo,read:user`;
      } else {
        setGithubError("GitHub connection is temporarily unavailable. Please try again later.");
      }
    } catch (err) {
      console.error("Error starting GitHub connect:", err);
      setGithubError("Could not initiate GitHub connection. Please try again.");
    } finally {
      setGithubLoading(false);
    }
  };

  const handleDisconnectGithub = async () => {
    if (!window.confirm("Disconnect your GitHub account from ArixelAI?")) return;
    setGithubLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/github/disconnect`, {
        method: "POST",
        credentials: "include",
      });
      if (res.ok) {
        setGithubConnected(false);
        setGithubUsername("");
        setGithubRepos([]);
        setSelectedRepo(null);
        setShowRepoPicker(false);
      }
    } catch (err) {
      console.error("Error disconnecting GitHub:", err);
    } finally {
      setGithubLoading(false);
    }
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");
    const ghStatus = params.get("github");

    if (code) {
      fetch(`${API_BASE_URL}/api/github?code=${code}`, {
        method: "GET",
        credentials: "include",
      })
        .then((r) => r.json())
        .then((data) => {
          if (data.success || data.connected) {
            setGithubConnected(true);
            if (data.username) setGithubUsername(data.username);
            setShowPopup(true);
            fetchGithubRepos();
          } else {
            setGithubError(data.error || "Failed to obtain GitHub access token");
            setShowPopup(true);
          }
          window.history.replaceState({}, document.title, window.location.pathname);
        })
        .catch((err) => {
          console.error("Error during GitHub OAuth callback:", err);
          setGithubError("GitHub connection failed");
          setShowPopup(true);
          window.history.replaceState({}, document.title, window.location.pathname);
        });
    } else if (ghStatus === "connected") {
      setGithubConnected(true);
      setShowPopup(true);
      window.history.replaceState({}, document.title, window.location.pathname);
      checkGithubStatus();
      fetchGithubRepos();
    } else if (ghStatus === "error") {
      const errMsg = params.get("message") || "Failed to link GitHub account";
      setGithubError(decodeURIComponent(errMsg));
      setShowPopup(true);
      window.history.replaceState({}, document.title, window.location.pathname);
    } else {
      checkGithubStatus();
    }
  }, []);

  const filteredRepos = githubRepos.filter((repo) =>
    repo.fullName?.toLowerCase().includes(repoSearch.toLowerCase()) ||
    repo.name?.toLowerCase().includes(repoSearch.toLowerCase())
  );


  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  useEffect(() => {
    if (context) {
      getChatHistory(context);
    } else {
      setChatHistory([]);
    }
  }, [context]);

  useEffect(() => {
    if (currentContext === "new") {
      setChatHistory([]);
    }
  }, [currentContext]);

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

    const attachedRepo = selectedRepo
      ? {
        ...selectedRepo,
        allowReadCode: allowReadCode,
      }
      : null;
    const promptToSend = attachedRepo
      ? `${messageToSend}\n\n[Attached GitHub Repository: ${attachedRepo.fullName} (${attachedRepo.htmlUrl || `https://github.com/${attachedRepo.fullName}`})]${allowReadCode ? ' (Codebase inspection permitted by user)' : ' (Metadata only, no code inspection)'}`
      : messageToSend;

    const userMessage = {
      role: "user",
      content: messageToSend,
      attachment: attachmentObj,
      repo: attachedRepo,
    };
    const thinkingMessage = {
      role: "model",
      content: "Generating response...",
    };
    const isNewChat = currentContext === "new" || !context;

    if (isNewChat) {
      setChatHistory([userMessage, thinkingMessage]);
      if (setContextHistory) {
        const optimisticTitle = messageToSend.trim().slice(0, 32);
        setContextHistory((prev) => [
          { _id: "optimistic-" + Date.now(), context: optimisticTitle },
          ...prev.filter((c) => !c._id?.startsWith("optimistic-")),
        ]);
      }
    } else {
      setChatHistory((prev) => [
        ...prev.filter((msg) => msg && msg !== ""),
        userMessage,
        thinkingMessage,
      ]);
    }
    setCurrentState("chat");
    setChatInput("");
    setFilePreview(null);
    setSelectedFile(null);
    setSelectedRepo(null);
    setAllowReadCode(false);
    setShowPopup(false);

    let response;
    try {
      response = await fetch(`${API_BASE_URL}/api/postChat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          text: promptToSend,
          context: isNewChat ? "" : context,
          attachment: attachmentObj,
          repo: attachedRepo,
        }),
      });


      const data = await response.json();
      if (response.ok) {
        setContext(data.context);
        if (data.messages && data.messages.length > 0) {
          setChatHistory(data.messages);
        } else if (data.response) {
          setChatHistory((prev) => [
            ...prev.slice(0, -1),
            {
              role: "model",
              content: data.response,
              tokensUsed: data.tokensUsed,
              modelUsed: data.modelUsed,
            },
          ]);
        } else {
          getChatHistory(data.context);
        }
        if (isNewChat) {
          getContextHistory();
        }
        setCurrentContext("old");
        // Notify components (Sidebar, Profile) to update token counters
        window.dispatchEvent(new CustomEvent("tokensUpdated"));
      } else {
        setChatHistory((prev) => [
          ...prev.slice(0, -1),
          {
            role: "model",
            content:
              data?.message ||
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
        `${API_BASE_URL}/api/getChatHistory`,
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
      }
    } catch (error) {
      console.error("Error fetching chat history:", error);
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
            key="chat-messages"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
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
                        msg.attachment.mimeType.startsWith("image/") &&
                        msg.attachment.base64 ? (
                        <img
                          src={`data:${msg.attachment.mimeType};base64,${msg.attachment.base64}`}
                          alt={msg.attachment.name}
                          className="chat-attached-image"
                        />
                      ) : (
                        <div className="chat-attached-file">
                          <span className="file-icon">
                            {msg.attachment?.mimeType?.startsWith("image/") ? "🖼️" : "📄"}
                          </span>
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
                    {msg.content && (
                      /^data:image\/[a-zA-Z0-9+]+;base64,/i.test(msg.content.trim()) ||
                      /^https?:\/\/[^\s]+$/i.test(msg.content.trim())
                    ) ? (
                      <div className="chat-image-response">
                        <img
                          src={msg.content.trim()}
                          alt="AI Generated"
                          className="chat-generated-image"
                          loading="lazy"
                        />
                        <div className="chat-image-actions">
                          <a
                            href={msg.content.trim()}
                            download="ai-generated-image.png"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="download-image-btn"
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                              <polyline points="7 10 12 15 17 10"></polyline>
                              <line x1="12" y1="15" x2="12" y2="3"></line>
                            </svg>
                            Download Image
                          </a>
                        </div>
                      </div>
                    ) : (
                      <Markdown
                        remarkPlugins={[remarkGfm]}
                        components={{
                          pre: CodeBlock,
                        }}
                      >
                        {msg.content || ""}
                      </Markdown>
                    )}
                  </div>
                  {msg.role === "model" &&
                    msg.content !== "Generating response..." && (
                      <div className="ai-message-footer">
                        <div className="ai-meta-tags">
                          {msg.modelUsed?.model && (
                            <span
                              className="meta-model-tag"
                              title={`Provider: ${msg.modelUsed.provider || "AI"}`}
                            >
                              {msg.modelUsed.model}
                            </span>
                          )}
                          {msg.tokensUsed > 0 && (
                            <span
                              className="meta-tokens-tag"
                              title="Tokens consumed by this request"
                            >
                              ⚡ {msg.tokensUsed.toLocaleString()} tokens
                            </span>
                          )}
                        </div>
                        <div className="ai-actions-row">
                          <button
                            type="button"
                            className={`copy-response-btn ${copiedId === `ai-${index}` ? "copied" : ""}`}
                            onClick={() => handleCopyMessage(msg.content, `ai-${index}`)}
                            title={copiedId === `ai-${index}` ? "Copied!" : "Copy response"}
                            aria-label="Copy response to clipboard"
                          >
                            {copiedId === `ai-${index}` ? (
                              <>
                                <svg
                                  width="12"
                                  height="12"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="2.5"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                >
                                  <polyline points="20 6 9 17 4 12" />
                                </svg>
                                <span>Copied!</span>
                              </>
                            ) : (
                              <>
                                <svg
                                  width="12"
                                  height="12"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="2"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                >
                                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                                </svg>
                                <span>Copy</span>
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    )}
                  {msg.role === "user" && (
                    <div className="user-message-footer">
                      <div className="user-footer-actions">
                        <button
                          type="button"
                          className={`copy-response-btn user-copy-action-btn ${copiedId === `user-${index}` ? "copied" : ""}`}
                          onClick={() => handleCopyMessage(msg.content, `user-${index}`)}
                          title={copiedId === `user-${index}` ? "Copied prompt!" : "Copy prompt"}
                          aria-label="Copy prompt"
                        >
                          {copiedId === `user-${index}` ? (
                            <>
                              <svg
                                width="11"
                                height="11"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2.5"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              >
                                <polyline points="20 6 9 17 4 12" />
                              </svg>
                              <span>Copied!</span>
                            </>
                          ) : (
                            <>
                              <svg
                                width="11"
                                height="11"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              >
                                <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                              </svg>
                              <span>Copy</span>
                            </>
                          )}
                        </button>
                        <button
                          type="button"
                          className="user-token-inspect-btn"
                          onClick={() =>
                            setActivePromptTokenIndex(
                              activePromptTokenIndex === index ? null : index
                            )
                          }
                          title="Click to view token usage for this prompt"
                        >
                          <svg
                            width="11"
                            height="11"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>
                          </svg>
                          <span>
                            {activePromptTokenIndex === index
                              ? "Hide tokens"
                              : `⚡ ~${Math.ceil((msg.content?.length || 0) / 3.8)} tokens`}
                          </span>
                        </button>
                      </div>
                      {activePromptTokenIndex === index && (
                        <div className="user-token-breakdown-card">
                          <div className="token-breakdown-title">
                            Prompt Token Analysis
                          </div>
                          <div className="token-breakdown-row">
                            <span>Prompt Tokens:</span>
                            <strong className="token-value-highlight">
                              ~{Math.ceil((msg.content?.length || 0) / 3.8)}
                            </strong>
                          </div>
                          <div className="token-breakdown-row">
                            <span>Characters:</span>
                            <span>{msg.content?.length || 0}</span>
                          </div>
                          <div className="token-breakdown-row">
                            <span>Words:</span>
                            <span>
                              {msg.content
                                ? msg.content
                                    .trim()
                                    .split(/\s+/)
                                    .filter(Boolean).length
                                : 0}
                            </span>
                          </div>
                          {msg.attachment && (
                            <div className="token-breakdown-row">
                              <span>Attachment:</span>
                              <span>{msg.attachment.name || "Attached file"}</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
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

              {/* Connect GitHub Section */}
              <div className="popup-section-divider">
                <span>OR</span>
              </div>

              <div className="github-connect-section">
                <div className="github-section-header">
                  <div className="github-title-group">
                    <svg
                      className="github-svg-icon"
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                    >
                      <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
                    </svg>
                    <span className="github-section-title">Connect GitHub</span>
                  </div>

                  {githubConnected && (
                    <span className="github-badge">
                      <span className="online-dot"></span>
                      @{githubUsername || "Connected"}
                    </span>
                  )}
                </div>

                {!githubConnected ? (
                  <div className="github-connect-cta">
                    <p className="github-connect-desc">
                      Connect your GitHub account to import and analyze repositories with AI.
                    </p>

                    <button
                      type="button"
                      className="connect-github-btn"
                      onClick={handleConnectGithub}
                      disabled={githubLoading}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
                      </svg>
                      {githubLoading ? "Redirecting to GitHub..." : "Connect GitHub Account"}
                    </button>

                    {githubError && <span className="github-error-msg">{githubError}</span>}
                  </div>
                ) : (
                  <div className="github-connected-content">
                    <div className="github-actions-row">
                      <button
                        type="button"
                        className="browse-repos-btn"
                        onClick={() => {
                          const nextState = !showRepoPicker;
                          setShowRepoPicker(nextState);
                          if (nextState && !githubRepos.length) {
                            fetchGithubRepos();
                          }
                        }}
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                          <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
                        </svg>
                        {showRepoPicker ? "Hide Repositories" : "Browse Repositories"}
                      </button>

                      <button
                        type="button"
                        className="disconnect-github-btn"
                        onClick={handleDisconnectGithub}
                        title="Disconnect GitHub account"
                      >
                        Disconnect
                      </button>
                    </div>

                    {showRepoPicker && (
                      <div className="repo-picker-container">
                        <input
                          type="text"
                          className="repo-filter-input"
                          placeholder="Search repositories..."
                          value={repoSearch}
                          onChange={(e) => setRepoSearch(e.target.value)}
                        />
                        <div className="repo-items-list">
                          {githubLoading ? (
                            <div className="repo-loading-state">Loading repositories...</div>
                          ) : filteredRepos.length > 0 ? (
                            filteredRepos.map((repo) => (
                              <button
                                key={repo.id}
                                type="button"
                                className={`repo-select-item ${selectedRepo?.id === repo.id ? "active-repo" : ""}`}
                                onClick={() => {
                                  setSelectedRepo(repo);
                                  setShowRepoPicker(false);
                                }}
                              >
                                <span className="repo-item-icon">
                                  {repo.private ? "🔒" : "📁"}
                                </span>
                                <div className="repo-item-info">
                                  <span className="repo-item-name">{repo.fullName}</span>
                                  {repo.description && (
                                    <span className="repo-item-desc">{repo.description}</span>
                                  )}
                                </div>
                                {repo.defaultBranch && (
                                  <span className="repo-item-branch">{repo.defaultBranch}</span>
                                )}
                              </button>
                            ))
                          ) : (
                            <div className="repo-loading-state">
                              {githubRepos.length === 0
                                ? "No repositories found. Ensure your GitHub App has access granted."
                                : "No matching repositories"}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {selectedRepo && (
                  <div className="selected-repo-wrapper">
                    <div className="selected-repo-chip">
                      <div className="repo-chip-left">
                        <span className="repo-badge-icon">📦</span>
                        <div className="repo-badge-details">
                          <span className="repo-badge-name">{selectedRepo.fullName}</span>
                          <span className="repo-badge-sub">
                            {selectedRepo.defaultBranch ? `Branch: ${selectedRepo.defaultBranch}` : "Attached repository"}
                          </span>
                        </div>
                      </div>
                      <button
                        type="button"
                        className="remove-repo-chip-btn"
                        onClick={() => {
                          setSelectedRepo(null);
                          setAllowReadCode(false);
                        }}
                        title="Remove repository"
                      >
                        ×
                      </button>
                    </div>

                    <label className="repo-permission-card">
                      <input
                        type="checkbox"
                        checked={allowReadCode}
                        onChange={(e) => setAllowReadCode(e.target.checked)}
                      />
                      <span className="permission-slider"></span>
                      <div className="permission-text-box">
                        <span className="permission-title">Grant AI permission to inspect codebase</span>
                        <span className="permission-desc">
                          {allowReadCode
                            ? "🔓 Allowed: AI will read files and folder structure to answer code questions."
                            : "🔒 Off: AI only knows the repository name and link."}
                        </span>
                      </div>
                    </label>
                  </div>
                )}
              </div>
            </div>
          </section>
        )}

        {selectedRepo && !showPopup && (
          <div className="active-repo-bar">
            <div className="active-repo-meta">
              <span className="active-repo-icon">📦</span>
              <span className="active-repo-name">{selectedRepo.fullName}</span>
              {selectedRepo.defaultBranch && (
                <span className="active-repo-branch">({selectedRepo.defaultBranch})</span>
              )}
              <button
                type="button"
                className={`repo-perm-badge ${allowReadCode ? "enabled" : "disabled"}`}
                onClick={() => setAllowReadCode(!allowReadCode)}
                title="Click to toggle code inspection permission"
              >
                {allowReadCode ? "🔓 Code read allowed" : "🔒 Metadata only (click to allow code read)"}
              </button>
            </div>
            <button
              type="button"
              className="active-repo-remove"
              onClick={() => {
                setSelectedRepo(null);
                setAllowReadCode(false);
              }}
              aria-label="Remove repository"
            >
              ×
            </button>
          </div>
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
            <div className="prompt-token-bar-item" ref={popoverRef}>
              <button
                type="button"
                className={`prompt-tokens-trigger-btn ${showPromptTokens ? "active" : ""}`}
                onClick={() => setShowPromptTokens(!showPromptTokens)}
                title="Click to view token usage for current prompt"
              >
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>
                </svg>
                <span>
                  {chatInput.trim()
                    ? `⚡ ~${totalEstimatedPromptTokens} tokens`
                    : "⚡ Check Prompt Tokens"}
                </span>
              </button>

              {showPromptTokens && (
                <div className="prompt-tokens-popover">
                  <div className="popover-header">
                    <div className="popover-title">
                      <svg
                        width="13"
                        height="13"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>
                      </svg>
                      Current Prompt Tokens
                    </div>
                    <button
                      type="button"
                      className="popover-close-btn"
                      onClick={() => setShowPromptTokens(false)}
                      title="Close"
                    >
                      ×
                    </button>
                  </div>

                  <div className="popover-body">
                    <div className="popover-metric-hero">
                      <span className="popover-metric-number">
                        {totalEstimatedPromptTokens}
                      </span>
                      <span className="popover-metric-label">Estimated Tokens</span>
                    </div>

                    <div className="popover-stat-grid">
                      <div className="popover-stat-item">
                        <span className="stat-label">Prompt Text</span>
                        <span className="stat-val">{currentPromptTokens} tokens</span>
                      </div>
                      <div className="popover-stat-item">
                        <span className="stat-label">Length</span>
                        <span className="stat-val">{currentPromptChars} chars</span>
                      </div>
                      <div className="popover-stat-item">
                        <span className="stat-label">Words</span>
                        <span className="stat-val">{currentPromptWords} words</span>
                      </div>
                      <div className="popover-stat-item">
                        <span className="stat-label">Context Ratio</span>
                        <span className="stat-val">~3.8 ch/tok</span>
                      </div>
                      {selectedFile && (
                        <div className="popover-stat-item full-width">
                          <span className="stat-label">File Overhead</span>
                          <span className="stat-val">+{fileTokensEstimate} tokens ({selectedFile.name})</span>
                        </div>
                      )}
                      {selectedRepo && (
                        <div className="popover-stat-item full-width">
                          <span className="stat-label">GitHub Repo Context</span>
                          <span className="stat-val">+{repoTokensEstimate} tokens ({selectedRepo.fullName})</span>
                        </div>
                      )}
                    </div>

                    <div className="popover-formula-note">
                      Estimated using standard AI tokenizer ratio (~3.8 characters per token).
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
