import icon from "../assets/icon.png"
import emailIcon from "../assets/emailIcon.png"
import codeIcon from "../assets/codeIcon.png"
import docIcon from "../assets/documentIcon.png"
import compassIcon from "../assets/compassIcon.png"
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useState, useEffect, useRef } from "react"
import "./Chatarea.css"
import Markdown from "react-markdown"
export default function Chatarea({ setContext, context, currentState, setCurrentState, currentContext, setCurrentContext, getContextHistory, isSidebarOpen, setIsSidebarOpen }) {

    const [chatInput, setChatInput] = useState("");

    const [chatHistory, setChatHistory] = useState([""]);

    const messagesEndRef = useRef(null);
    const textareaRef = useRef(null);


    const [showPopup, setShowPopup] = useState(false);
    const [filePreview, setFilePreview] = useState(null);
    const [selectedFile, setSelectedFile] = useState(null);
    const [name, setName] = useState("");

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
            }
            reader.onerror = reject;
        })
    }



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
            })
            const data = await res.json();
            if (res.ok) {
                setName(data.name);
            }
        }
        getUserName();
    }, [])

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
        const messageToSend = overrideInput || chatInput;
        if (!messageToSend.trim()) return;
        const base64Image = selectedFile ? await fileToBase64(selectedFile) : null;
        const userMessage = { role: "user", content: messageToSend };
        const thinkingMessage = { role: "model", content: "Generating response..." };
        setChatHistory((prev) => [...prev.filter(msg => msg && msg !== ""), userMessage, thinkingMessage]);
        setCurrentState("chat");
        setChatInput("");
        setFilePreview(null);
        setSelectedFile(null);
        setShowPopup(false);

        try {
            const response = await fetch("https://arixelai.onrender.com/api/postChat", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                credentials: "include",
                body: JSON.stringify({
                    text: messageToSend,
                    context: currentContext === "new" ? "" : context,
                    image: selectedFile ? {
                        base64: base64Image,
                        mimeType: selectedFile.type,
                    } : null
                })
            })
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
                    { role: "model", content: "I'm really sorry, but I encountered an error while processing your request. Please try sending your message again." }
                ]);
            }
        } catch (error) {
            console.error("Error posting chat:", error);
            setChatHistory((prev) => [
                ...prev.slice(0, -1),
                { role: "model", content: "I apologize, but I am unable to reach the server right now. Please verify your connection and try again." }
            ]);
        }

    }

    async function getChatHistory(currentContext) {
        const activeContext = currentContext || context;
        if (!activeContext) return;

        try {
            const response = await fetch("https://arixelai.onrender.com/api/getChatHistory", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                credentials: "include",
                body: JSON.stringify({
                    context: activeContext,
                })
            });
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
            <button className="mobile-sidebar-toggle" onClick={() => setIsSidebarOpen(true)} aria-label="Open Sidebar">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="3" y1="12" x2="21" y2="12"></line>
                    <line x1="3" y1="6" x2="21" y2="6"></line>
                    <line x1="3" y1="18" x2="21" y2="18"></line>
                </svg>
            </button>

            {/* Sidebar backdrop overlay on mobile */}
            {isSidebarOpen && <div className="sidebar-overlay" onClick={() => setIsSidebarOpen(false)} />}
            {currentState === "hero" && (
                <div className="hero-container">
                    <div className="logo-display-container">
                        <img src={icon} alt="Axiel AI Icon" />
                    </div>
                    <div className="welcome-text-container">
                        <h1>Welcome back, {name || "Guest"}! How can I help you today?</h1>
                    </div>
                    <div className="tagline-container">
                        Start a new conversation or pick a suggested task below to get things moving.
                    </div>
                    <div className="suggestions-container">
                        <div className="suggestion-card" onClick={() => handleSubmit("Write a marketing email")}>
                            <div className="card-icon-container">
                                <img src={emailIcon} alt="email-icon" />
                            </div>
                            <div className="card-content">
                                <div className="suggestion-text-container">Write a marketing email</div>
                                <div className="suggestion-desc-container">Generate a high-converting announcement for a new product launch.</div>
                            </div>
                        </div>
                        <div className="suggestion-card" onClick={() => handleSubmit("Debug my Python script")}>
                            <div className="card-icon-container">
                                <img src={codeIcon} alt="code-icon" />
                            </div>
                            <div className="card-content">
                                <div className="suggestion-text-container">Debug my Python script</div>
                                <div className="suggestion-desc-container">Upload a snippet and I'll find potential bottlenecks or logic errors.</div>
                            </div>
                        </div>
                        <div className="suggestion-card" onClick={() => handleSubmit("Summarize this article")}>
                            <div className="card-icon-container">
                                <img src={docIcon} alt="doc-icon" />
                            </div>
                            <div className="card-content">
                                <div className="suggestion-text-container">Summarize this article</div>
                                <div className="suggestion-desc-container">Paste a long-form URL or text and get the key bullet points instantly.</div>
                            </div>
                        </div>
                        <div className="suggestion-card" onClick={() => handleSubmit("Plan a 3-day trip")}>
                            <div className="card-icon-container">
                                <img src={compassIcon} alt="compass-icon" />
                            </div>
                            <div className="card-content">
                                <div className="suggestion-text-container">Plan a 3-day trip</div>
                                <div className="suggestion-desc-container">Customized itinerary based on your interests and budget constraints.</div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {currentState === "chat" && (
                <div className="chat-messages-container">
                    {chatHistory.map((msg, index) => (
                        <div key={index} className={`chat-message-row ${msg.role === "user" ? "user-row" : "ai-row"}`}>
                            {msg.role !== "user" && (
                                <div className="message-avatar">
                                    <img src={icon} alt="AI Avatar" className="ai-avatar-icon" />
                                </div>
                            )}
                            <div className={`chat-bubble ${msg.role === "user" ? "user-bubble" : "ai-bubble"}`}>
                                <div className={msg.role === "model" && msg.content === "Generating response..." ? "thinking-message" : ""}><Markdown remarkPlugins={[remarkGfm]}>{msg.content}</Markdown></div>
                            </div>
                        </div>
                    ))}
                    <div ref={messagesEndRef} />
                </div>
            )}

            <div className="chat-input-wrapper">
                {showPopup && (
                    <section className="upload-popup">
                        <div className="upload-popup-header">
                            <h3>Upload attachment</h3>
                            <button className="close-popup-btn" aria-label="Close popup" onClick={() => setShowPopup(false)}>×</button>
                        </div>
                        <div className="upload-popup-body">
                            <label className="file-drop-area">
                                <input type="file" onChange={previewFile} style={{ display: "none" }} />
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                                    <polyline points="17 8 12 3 7 8" />
                                    <line x1="12" y1="3" x2="12" y2="15" />
                                </svg>
                                <span>Choose a file to upload</span>
                            </label>
                            {filePreview && (
                                <div className="preview-container">
                                    {selectedFile && selectedFile.type.startsWith("image/") ? (
                                        <img src={filePreview} alt="Preview" className="image-preview" />
                                    ) : (
                                        <div className="file-icon-preview">
                                            <span>📄 {selectedFile?.name}</span>
                                        </div>
                                    )}
                                    <button className="remove-file-btn" onClick={() => { setFilePreview(null); setSelectedFile(null); }}>
                                        Remove file
                                    </button>
                                </div>
                            )}
                        </div>
                    </section>
                )}
                <div className="chat-input-container">
                    <div className="input-row">
                        <button className="attach-btn" aria-label="Attach file" onClick={() => setShowPopup(!showPopup)}>
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
                        <button className="send-btn" aria-label="Send message" onClick={handleSubmit}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
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
    )
}