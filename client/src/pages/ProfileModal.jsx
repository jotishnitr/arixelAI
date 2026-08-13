import { useState, useEffect } from "react";
import profileIcon from "../assets/profile.png";
import "./Profile.css";

const API_BASE_URL = "https://arixelai.onrender.com";

export default function Profile({ setCurrentState }) {
    const [profileState, setProfileState] = useState("display");

    const [name, setName] = useState("");
    const [age, setAge] = useState("");
    const [country, setCountry] = useState("");
    const [mobile, setMobile] = useState("");
    const [email, setEmail] = useState("");
    const [loading, setLoading] = useState(true);

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
    }, []);

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

    if (loading) {
        return (
            <section className="profile-content-area">
                <div className="profile-loading">Loading Profile...</div>
            </section>
        );
    }

    if (profileState === "edit") {
        return (
            <section className="profile-content-area">
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
            <section className="profile-content-area">
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

                        <button className="edit-btn" onClick={() => setProfileState("edit")}>Edit Profile</button>
                    </div>
                </div>
            </section>
        );
    }
}