import { Link } from "react-router-dom";
import logoIcon from "../assets/icon.png";
import "./ForgotPassword.css"; // Reuse card layouts

export default function Policies() {
    return (
        <section className="forgot-password-page">
            <div className="forgot-password-container" style={{ maxWidth: "600px" }}>
                <div className="header-container">
                    <div className="logo-container">
                        <img src={logoIcon} alt="ArixelAI Logo" className="logo-banner" />
                    </div>
                    <h1 className="title">ArixelAI</h1>
                    <p className="tagline">Intelligence at the edge</p>
                </div>

                <div className="forgot-password-card" style={{ padding: "40px" }}>
                    <h2 className="card-title" style={{ marginBottom: "24px" }}>App Policies</h2>
                    
                    <div className="policies-content" style={{ 
                        maxHeight: "350px", 
                        overflowY: "auto", 
                        textAlign: "left", 
                        fontSize: "14px", 
                        color: "#94a3b8",
                        lineHeight: "1.6",
                        paddingRight: "10px",
                        marginBottom: "24px"
                    }}>
                        <h3 style={{ color: "#f3f4f6", fontSize: "16px", marginTop: "0" }}>1. Terms & Conditions</h3>
                        <p>
                            Welcome to ArixelAI. By accessing or using our services, you agree to comply with and be bound by these terms. 
                            You are responsible for maintaining the confidentiality of your account credentials and for all activities 
                            that occur under your account.
                        </p>
                        
                        <h3 style={{ color: "#f3f4f6", fontSize: "16px", marginTop: "20px" }}>2. Privacy Policy</h3>
                        <p>
                            We value your privacy. We collect limited profile information such as your name, email, and age to customize 
                            your experience. Your chats and search contexts are stored securely in our protected database. We do not sell or 
                            share your data with third parties.
                        </p>
                        
                        <h3 style={{ color: "#f3f4f6", fontSize: "16px", marginTop: "20px" }}>3. Data Storage & Security</h3>
                        <p>
                            All interactions processed by ArixelAI are hosted on secure servers with industrial grade protection. 
                            We take physical, electronic, and administrative steps to secure your personal data.
                        </p>
                        
                        <h3 style={{ color: "#f3f4f6", fontSize: "16px", marginTop: "20px" }}>4. Service Availability</h3>
                        <p>
                            While we aim to maintain high availability, ArixelAI is provided on an "as-is" and "as-available" basis. 
                            We reserve the right to modify, suspend, or discontinue services at any time.
                        </p>
                    </div>

                    <p className="footer-text" style={{ margin: "0" }}>
                        <Link className="link" to="/login" style={{ color: "#a78bfa", fontWeight: "600", textDecoration: "none" }}>
                            Back to Sign In
                        </Link>
                    </p>
                </div>
            </div>
        </section>
    );
}
