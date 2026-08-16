import { useState } from "react";
import logoIcon from "../assets/icon.png";
import "./ForgotPassword.css";

export default function ForgotPassword({ setCurrentPage }) {
    const [email, setEmail] = useState("");
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState("");
    const [error, setError] = useState("");

    async function handleSubmit(event) {
        event.preventDefault();
        setLoading(true);
        setError("");
        setMessage("");
        try {
            const response = await fetch("https://arixelai.onrender.com/auth/requestPasswordReset", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ email }),
            });
            const data = await response.json();
            if (response.ok) {
                setMessage(data.message || "Password reset link sent to your email!");
            } else {
                setError(data.message || "Could not request password reset. Please try again.");
            }
        } catch (err) {
            setError(err.message || "Something went wrong. Please check your internet connection.");
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
                    <h2 className="card-title">Forgot Password?</h2>
                    <p className="card-subtitle">
                        Enter your email address and we'll send you a link to reset your password.
                    </p>

                    {error && <div className="error-message">{error}</div>}
                    {message && <div className="success-message">{message}</div>}

                    {!message && (
                        <form onSubmit={handleSubmit} className="forgot-password-form">
                            <div className="input-group">
                                <label htmlFor="email">Email Address</label>
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
                                        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                                        <polyline points="22,6 12,13 2,6" />
                                    </svg>
                                    <input
                                        type="email"
                                        id="email"
                                        placeholder="name@company.com"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        required
                                    />
                                </div>
                            </div>

                            <button type="submit" className="submit-btn" disabled={loading}>
                                {loading ? "Sending..." : "Send Reset Link"}
                            </button>
                        </form>
                    )}

                    <p className="footer-text">
                        Remember your password?{" "}
                        <span className="link" onClick={() => setCurrentPage("Login")}>
                            Back to Sign In
                        </span>
                    </p>
                </div>
            </div>
        </section>
    );
}
