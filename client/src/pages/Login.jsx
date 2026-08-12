import { useState } from "react";
import logoIcon from "../assets/icon.png";
import "./Login.css";

export default function Login({ setCurrentPage }) {
    const [formData, setFormData] = useState({
        email: "",
        password: "",
    });

    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    function handleChange(event) {
        const { name, value } = event.target;
        setFormData((prevFormData) => ({
            ...prevFormData,
            [name]: value,
        }));
    }

    async function handleSubmit(event) {
        event.preventDefault();
        try {
            const response = await fetch("https://arixelai.onrender.com/auth/login", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                credentials: "include",
                body: JSON.stringify(formData),
            });
            const data = await response.json();
            if (data.success) {
                setCurrentPage("homePage");
            }
        } catch (error) {
            setError(error.message);
        }
    }

    return (
        <section className="register-page">
            <div className="register-container">
                <div className="header-container">
                    <div className="logo-container">
                        <img src={logoIcon} alt="ArixelAI Logo" className="logo-banner" />
                    </div>
                    <h1 className="title">ArixelAI</h1>
                    <p className="tagline">Intelligence at the edge</p>
                </div>

                <div className="register-card">
                    <h2 className="card-title">Welcome Back</h2>
                    <p className="card-subtitle">Please enter your details to sign in.</p>

                    {error && <div className="error-message">{error}</div>}

                    <form onSubmit={handleSubmit} className="register-form">
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
                                    name="email"
                                    placeholder="name@company.com"
                                    value={formData.email}
                                    onChange={handleChange}
                                    required
                                />
                            </div>
                        </div>

                        <div className="input-group">
                            <label htmlFor="password">Password</label>
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
                                    name="password"
                                    placeholder="••••••••"
                                    value={formData.password}
                                    onChange={handleChange}
                                    required
                                />
                                <button
                                    type="button"
                                    className="toggle-password"
                                    onClick={() => setShowPassword(!showPassword)}
                                >
                                    {showPassword ? (
                                        <svg
                                            viewBox="0 0 24 24"
                                            fill="none"
                                            stroke="currentColor"
                                            strokeWidth="2"
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                        >
                                            <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                                            <line x1="1" y1="1" x2="23" y2="23" />
                                        </svg>
                                    ) : (
                                        <svg
                                            viewBox="0 0 24 24"
                                            fill="none"
                                            stroke="currentColor"
                                            strokeWidth="2"
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                        >
                                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                                            <circle cx="12" cy="12" r="3" />
                                        </svg>
                                    )}
                                </button>
                            </div>
                        </div>

                        <button type="submit" className="submit-btn">
                            Sign In
                        </button>
                    </form>

                    <div className="divider">
                        <span>OR CONTINUE WITH</span>
                    </div>

                    <a
                        className="social-btn google-btn"
                        href="https://arixelai.onrender.com/auth/google"
                    >
                        <svg
                            className="google-icon"
                            viewBox="0 0 24 24"
                            width="18"
                            height="18"
                        >
                            <path
                                fill="#4285F4"
                                d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v3.927h6.6c-.29 1.514-1.14 2.8-2.42 3.655v3.04H22.78c3.99-3.678 6.29-9.09 6.29-15.552z"
                            />
                            <path
                                fill="#34A853"
                                d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.64-2.82c-1.01.68-2.31 1.09-3.69 1.09-2.84 0-5.25-1.92-6.11-4.502H.87v3.13C2.84 21.84 7.13 24 12 24z"
                            />
                            <path
                                fill="#FBBC05"
                                d="M5.89 14.858A7.11 7.11 0 0 1 5.4 12c0-.98.17-1.93.49-2.858V6.01H.87A11.94 11.94 0 0 0 0 12c0 2.18.59 4.23 1.63 6.01l4.26-3.152z"
                            />
                            <path
                                fill="#EA4335"
                                d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.43-3.43C17.92 1.19 15.21 0 12 0 7.13 0 2.84 2.16.87 5.15l5.02 3.882c.86-2.58 3.27-4.502 6.11-4.502z"
                            />
                        </svg>
                        <span>Google</span>
                    </a>
                </div>

                <p className="footer-text">
                    Don't have an account? <span className="link" onClick={() => setCurrentPage("Register")}>Sign up now</span>
                </p>

                <div className="security-badges">
                    <div className="badge">
                        <svg
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            width="12"
                            height="12"
                        >
                            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                        </svg>
                        <span>ENTERPRISE SECURE</span>
                    </div>
                    <div className="badge">
                        <svg
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            width="12"
                            height="12"
                        >
                            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                        </svg>
                        <span>END-TO-END ENCRYPTION</span>
                    </div>
                </div>
            </div>
        </section>
    );
}
