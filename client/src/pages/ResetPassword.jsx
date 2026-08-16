import { useState, useEffect } from "react";
import logoIcon from "../assets/icon.png";
import "./ForgotPassword.css"; // We can reuse standard forgot-password styles or load dedicated styles

export default function ResetPassword({ setCurrentPage }) {
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState("");
    const [error, setError] = useState("");
    const [userId, setUserId] = useState("");
    const [token, setToken] = useState("");

    useEffect(() => {
        const queryParams = new URLSearchParams(window.location.search);
        const urlId = queryParams.get("id");
        const urlToken = queryParams.get("token");

        if (urlId && urlToken) {
            setUserId(urlId);
            setToken(urlToken);
        } else {
            setError("Invalid or missing password reset parameters in link.");
        }
    }, []);

    async function handleSubmit(event) {
        event.preventDefault();
        if (password !== confirmPassword) {
            setError("Passwords do not match.");
            return;
        }

        setLoading(true);
        setError("");
        setMessage("");

        try {
            const response = await fetch("https://arixelai.onrender.com/auth/resetPassword", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    id: userId,
                    token: token,
                    password: password,
                }),
            });

            const data = await response.json();
            if (response.ok) {
                setMessage(data.message || "Password reset successfully!");
                // Clear path query params so they can't be reused easily
                window.history.replaceState({}, document.title, window.location.pathname);
            } else {
                setError(data.message || "Failed to reset password. Link may be expired.");
            }
        } catch (err) {
            setError(err.message || "Something went wrong. Please try again.");
        } finally {
            setLoading(false);
        }
    }

    return (
        <section className="forgot-password-page">
            <div className="forgot-password-container">
                <div className="header-container">
                    <div className="logo-container">
                        <img src={logoIcon} alt="ArixelAI Logo" className="logo-banner" />
                    </div>
                    <h1 className="title">ArixelAI</h1>
                    <p className="tagline">Intelligence at the edge</p>
                </div>

                <div className="forgot-password-card">
                    <h2 className="card-title">Reset Password</h2>
                    <p className="card-subtitle">
                        Please enter your new password below.
                    </p>

                    {error && <div className="error-message">{error}</div>}
                    {message && <div className="success-message">{message}</div>}

                    {!message && userId && token && (
                        <form onSubmit={handleSubmit} className="forgot-password-form">
                            <div className="input-group">
                                <label htmlFor="password">New Password</label>
                                <div className="input-wrapper">
                                    <svg
                                        className="input-icon"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="2"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                    >
                                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                                        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                                    </svg>
                                    <input
                                        type={showPassword ? "text" : "password"}
                                        id="password"
                                        placeholder="••••••••"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        required
                                    />
                                    <button
                                        type="button"
                                        className="toggle-password"
                                        onClick={() => setShowPassword(!showPassword)}
                                        style={{
                                            position: "absolute",
                                            right: "16px",
                                            background: "none",
                                            border: "none",
                                            color: "#475569",
                                            cursor: "pointer",
                                        }}
                                    >
                                        {showPassword ? "Hide" : "Show"}
                                    </button>
                                </div>
                            </div>

                            <div className="input-group">
                                <label htmlFor="confirmPassword">Confirm New Password</label>
                                <div className="input-wrapper">
                                    <svg
                                        className="input-icon"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="2"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                    >
                                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                                        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                                    </svg>
                                    <input
                                        type={showPassword ? "text" : "password"}
                                        id="confirmPassword"
                                        placeholder="••••••••"
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        required
                                    />
                                </div>
                            </div>

                            <button type="submit" className="submit-btn" disabled={loading}>
                                {loading ? "Updating..." : "Reset Password"}
                            </button>
                        </form>
                    )}

                    <p className="footer-text" style={{ marginTop: "20px" }}>
                        <span className="link" onClick={() => {
                            // Reset pathname so it doesn't try to load reset-password on page refresh
                            const baseDir = window.location.pathname.replace("/reset-password", "") || "/";
                            window.history.replaceState({}, document.title, baseDir);
                            setCurrentPage("Login");
                        }}>
                            Back to Sign In
                        </span>
                    </p>
                </div>
            </div>
        </section>
    );
}
