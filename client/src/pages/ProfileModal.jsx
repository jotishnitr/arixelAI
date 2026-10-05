import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import profileIcon from "../assets/profile.png";
import "./Profile.css";

import { API_BASE_URL } from "../config";

export default function Profile({ setCurrentState }) {
    const navigate = useNavigate();
    const [profileState, setProfileState] = useState("display");

    const [name, setName] = useState("");
    const [age, setAge] = useState("");
    const [country, setCountry] = useState("");
    const [mobile, setMobile] = useState("");
    const [email, setEmail] = useState("");
    const [loading, setLoading] = useState(true);
    const [tokenStats, setTokenStats] = useState(null);

    const fetchTokenStats = async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/api/getTokenStats`, {
                method: "GET",
                headers: {
                    "Content-Type": "application/json",
                },
                credentials: "include",
            });
            const data = await response.json();
            if (response.ok && data.success) {
                setTokenStats(data);
            }
        } catch (error) {
            console.error("Error fetching token stats:", error);
        }
    };

    const fetchProfile = async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/api/getProfile`, {
                method: "GET",
                headers: {
                    "Content-Type": "application/json",
                },
                credentials: "include",
            });
            const data = await response.json();
            if (response.ok) {
                setName(data.name || "");
                setAge(data.age || "");
                setCountry(data.country || "");
                setMobile(data.mobile || "");
                setEmail(data.email || "");
            }
        } catch (error) {
            console.error("Error fetching profile:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchProfile();
        fetchTokenStats();
    }, []);

    useEffect(() => {
        function handleKeyDown(e) {
            if (e.key === "Escape" && setCurrentState) {
                setCurrentState("hero");
            }
        }
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [setCurrentState]);

    async function handleSubmit(e) {
        if (e) e.preventDefault();
        try {
            const response = await fetch(`${API_BASE_URL}/api/postProfile`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ name, age, country, mobile }),
                credentials: "include",
            });
            const data = await response.json();
            if (response.ok) {
                setProfileState("display");
            } else {
                console.error("Failed to update profile:", data.message);
            }
        } catch (error) {
            console.error("Error updating profile:", error);
        }
    }

    async function handleLogout() {
        try {
            const response = await fetch(`${API_BASE_URL}/auth/logout`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                credentials: "include",
            });
            if (response.ok) {
                if (setCurrentState) setCurrentState("hero");
                navigate("/login");
            } else {
                console.error("Failed to sign out");
            }
        } catch (error) {
            console.error("Error signing out:", error);
        }
    }

    if (loading) {
        return (
            <section className="profile-content-area">
                <div className="profile-loading">Loading Profile...</div>
            </section>
        );
    }

    if (profileState === "edit") {
        return (
            <section
                className="profile-content-area"
                onClick={(e) => { if (e.target === e.currentTarget && setCurrentState) setCurrentState("hero"); }}
            >
                <div className="profile-card">
                    <div className="profile-header">
                        <h2 className="profile-title">Edit Profile</h2>
                        <button className="close-profile-btn" aria-label="Close Profile" onClick={() => setCurrentState("hero")}>×</button>
                    </div>

                    <div className="profile-avatar-container">
                        {name ? (
                            <div className="profile-initial-avatar">
                                {name.charAt(0).toUpperCase()}
                            </div>
                        ) : (
                            <img src={profileIcon} alt="Profile Avatar" className="profile-avatar" />
                        )}
                    </div>

                    <form className="profile-form" onSubmit={handleSubmit}>
                        <div className="profile-input-group">
                            <label htmlFor="name">Name</label>
                            <input
                                type="text"
                                id="name"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="Name"
                                required
                            />
                        </div>
                        <div className="profile-input-group">
                            <label htmlFor="email">Email Address</label>
                            <input
                                type="email"
                                id="email"
                                value={email}
                                placeholder="Email Address"
                                disabled
                                className="disabled-input"
                            />
                        </div>
                        <div className="profile-input-group">
                            <label htmlFor="age">Age</label>
                            <input
                                type="number"
                                id="age"
                                value={age}
                                onChange={(e) => setAge(e.target.value)}
                                placeholder="16"
                            />
                        </div>
                        <div className="profile-input-group">
                            <label htmlFor="country">Country</label>
                            <input
                                type="text"
                                id="country"
                                value={country}
                                onChange={(e) => setCountry(e.target.value)}
                                placeholder="Country"
                            />
                        </div>
                        <div className="profile-input-group">
                            <label htmlFor="mobile">Mobile Number</label>
                            <input
                                type="tel"
                                id="mobile"
                                value={mobile}
                                onChange={(e) => setMobile(e.target.value)}
                                placeholder="Mobile Number"
                            />
                        </div>
                        <div className="profile-actions-row">
                            <button type="submit" className="save-btn">Save Changes</button>
                            <button type="button" className="cancel-btn" onClick={() => setProfileState("display")}>Cancel</button>
                        </div>
                    </form>
                </div>
            </section>
        );
    } else {
        return (
            <section
                className="profile-content-area"
                onClick={(e) => { if (e.target === e.currentTarget && setCurrentState) setCurrentState("hero"); }}
            >
                <div className="profile-card">
                    <div className="profile-header">
                        <h2 className="profile-title">User Profile</h2>
                        <button className="close-profile-btn" aria-label="Close Profile" onClick={() => setCurrentState("hero")}>×</button>
                    </div>

                    <div className="profile-avatar-container">
                        {name ? (
                            <div className="profile-initial-avatar">
                                {name.charAt(0).toUpperCase()}
                            </div>
                        ) : (
                            <img src={profileIcon} alt="Profile Avatar" className="profile-avatar" />
                        )}
                    </div>

                    <div className="profile-info-display">
                        <h2 className="profile-display-name">{name || "Alex"}</h2>

                        <div className="profile-details-grid">
                            <div className="profile-detail-item">
                                <span className="detail-label">Age</span>
                                <span className="detail-value">{age || "Not set"}</span>
                            </div>
                            <div className="profile-detail-item">
                                <span className="detail-label">Country</span>
                                <span className="detail-value">{country || "Not set"}</span>
                            </div>
                            <div className="profile-detail-item col-span-2">
                                <span className="detail-label">Email Address</span>
                                <span className="detail-value">{email}</span>
                            </div>
                            <div className="profile-detail-item col-span-2">
                                <span className="detail-label">Mobile Number</span>
                                <span className="detail-value">{mobile || "Not set"}</span>
                            </div>
                        </div>

                        {tokenStats?.summary && (
                            <div className="profile-tokens-container">
                                <div className="tokens-header-line">
                                    <span className="tokens-heading">⚡ Daily Token Quota</span>
                                    <span className="tokens-tier-pill">
                                        {tokenStats.summary.subscriptionTier?.toUpperCase() || "FREE"}
                                    </span>
                                </div>

                                <div className="tokens-progress-bg">
                                    <div
                                        className="tokens-progress-bar"
                                        style={{
                                            width: `${Math.min(
                                                100,
                                                Math.max(
                                                    0,
                                                    ((tokenStats.summary.remainingDailyTokens || 0) /
                                                        (tokenStats.summary.totalDailyCapacity || 1)) *
                                                        100
                                                )
                                            )}%`,
                                        }}
                                    />
                                </div>

                                <div className="tokens-capacity-info">
                                    <span className="tokens-rem-num">
                                        <strong>{tokenStats.summary.remainingDailyTokens?.toLocaleString()}</strong> remaining
                                    </span>
                                    <span className="tokens-total-num">
                                        of {tokenStats.summary.totalDailyCapacity?.toLocaleString()} daily
                                    </span>
                                </div>

                                {tokenStats.providers && (
                                    <div className="tokens-provider-grid">
                                        <div className="provider-stat-card">
                                            <span className="provider-name">Gemini</span>
                                            <span className="provider-remaining">
                                                {tokenStats.providers.gemini.remaining.toLocaleString()} left
                                            </span>
                                        </div>
                                        <div className="provider-stat-card">
                                            <span className="provider-name">Groq</span>
                                            <span className="provider-remaining">
                                                {tokenStats.providers.groq.remaining.toLocaleString()} left
                                            </span>
                                        </div>
                                        <div className="provider-stat-card">
                                            <span className="provider-name">Cerebras</span>
                                            <span className="provider-remaining">
                                                {tokenStats.providers.cerebras.remaining.toLocaleString()} left
                                            </span>
                                        </div>
                                        <div className="provider-stat-card">
                                            <span className="provider-name">OpenRouter</span>
                                            <span className="provider-remaining">
                                                {tokenStats.providers.openrouter.remaining.toLocaleString()} left
                                            </span>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        <div className="profile-display-actions">
                            <button className="edit-btn" onClick={() => setProfileState("edit")}>Edit Profile</button>
                            <button className="signout-btn" onClick={handleLogout}>Sign Out</button>
                        </div>
                    </div>
                </div>
            </section>
        );
    }
}