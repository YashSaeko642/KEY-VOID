import { useAuth } from "../src/context/useAuth";
import { Link } from "react-router-dom";

export default function Dashboard() {
  const { isAdmin, isCreator, user } = useAuth();

  return (
    <section style={{
      minHeight: "100vh",
      background: "linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #0f172a 100%)",
      padding: "80px 40px",
      fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif"
    }}>
      <div style={{maxWidth: "1400px", margin: "0 auto"}}>
        {/* Welcome Section */}
        <div style={{
          textAlign: "center",
          marginBottom: "80px"
        }}>
          <p style={{
            fontSize: "12px",
            letterSpacing: "3px",
            color: "#a5b4fc",
            marginBottom: "20px",
            fontWeight: "600",
            textTransform: "uppercase"
          }}>
            👋 Welcome Back
          </p>
          <h1 style={{
            fontSize: "clamp(2.5rem, 6vw, 5rem)",
            color: "#f1f5f9",
            fontWeight: "700",
            marginBottom: "20px",
            fontFamily: "'Michroma', monospace",
            lineHeight: "1.2"
          }}>
            {user?.username || "listener"}
          </h1>
          <p style={{
            fontSize: "18px",
            color: "#cbd5e1",
            maxWidth: "700px",
            margin: "0 auto",
            lineHeight: "1.8"
          }}>
            Your audio hub awaits. Connect with creators, build your profile, and explore the KeyVoid community.
          </p>
        </div>

        {/* Main Grid - 2x2 */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(350px, 1fr))",
          gap: "40px",
          marginBottom: "80px"
        }}>
          {/* Card 1 */}
          <div 
            style={{
              background: "rgba(15, 23, 42, 0.4)",
              border: "1px solid rgba(99, 102, 241, 0.2)",
              borderRadius: "20px",
              padding: "50px 40px",
              backdropFilter: "blur(10px)",
              transition: "all 0.4s ease",
              cursor: "default"
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = "rgba(99, 102, 241, 0.8)";
              e.currentTarget.style.background = "rgba(15, 23, 42, 0.7)";
              e.currentTarget.style.transform = "translateY(-8px)";
              e.currentTarget.style.boxShadow = "0 20px 40px rgba(99, 102, 241, 0.15)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = "rgba(99, 102, 241, 0.2)";
              e.currentTarget.style.background = "rgba(15, 23, 42, 0.4)";
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.boxShadow = "none";
            }}
          >
            <div style={{marginBottom: "20px", fontSize: "32px"}}>👤</div>
            <p style={{fontSize: "12px", letterSpacing: "2px", color: "#94a3b8", textTransform: "uppercase", marginBottom: "16px", fontWeight: "600"}}>Display Name</p>
            <h3 style={{fontSize: "36px", fontWeight: "700", color: "#f1f5f9", marginBottom: "8px"}}>{user?.username || "Listener"}</h3>
            <p style={{fontSize: "14px", color: "#cbd5e1"}}>Your unique identity</p>
          </div>

          {/* Card 2 */}
          <div 
            style={{
              background: "rgba(168, 85, 247, 0.08)",
              border: "1px solid rgba(168, 85, 247, 0.2)",
              borderRadius: "20px",
              padding: "50px 40px",
              backdropFilter: "blur(10px)",
              transition: "all 0.4s ease",
              cursor: "default"
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = "rgba(168, 85, 247, 0.8)";
              e.currentTarget.style.background = "rgba(168, 85, 247, 0.15)";
              e.currentTarget.style.transform = "translateY(-8px)";
              e.currentTarget.style.boxShadow = "0 20px 40px rgba(168, 85, 247, 0.15)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = "rgba(168, 85, 247, 0.2)";
              e.currentTarget.style.background = "rgba(168, 85, 247, 0.08)";
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.boxShadow = "none";
            }}
          >
            <div style={{marginBottom: "20px", fontSize: "32px"}}>🎭</div>
            <p style={{fontSize: "12px", letterSpacing: "2px", color: "#d8b4fe", textTransform: "uppercase", marginBottom: "16px", fontWeight: "600"}}>Account Type</p>
            <h3 style={{fontSize: "36px", fontWeight: "700", color: "#f1f5f9", marginBottom: "8px"}}>
              {isAdmin ? "Admin" : user?.role === "creator" ? "Creator" : "Listener"}
            </h3>
            <p style={{fontSize: "14px", color: "#cbd5e1"}}>Your role on KeyVoid</p>
          </div>

          {/* Card 3 */}
          <div 
            style={{
              background: "rgba(16, 185, 129, 0.08)",
              border: "1px solid rgba(16, 185, 129, 0.2)",
              borderRadius: "20px",
              padding: "50px 40px",
              backdropFilter: "blur(10px)",
              transition: "all 0.4s ease",
              cursor: "default"
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = "rgba(16, 185, 129, 0.8)";
              e.currentTarget.style.background = "rgba(16, 185, 129, 0.15)";
              e.currentTarget.style.transform = "translateY(-8px)";
              e.currentTarget.style.boxShadow = "0 20px 40px rgba(16, 185, 129, 0.15)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = "rgba(16, 185, 129, 0.2)";
              e.currentTarget.style.background = "rgba(16, 185, 129, 0.08)";
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.boxShadow = "none";
            }}
          >
            <div style={{marginBottom: "20px", fontSize: "32px"}}>✉️</div>
            <p style={{fontSize: "12px", letterSpacing: "2px", color: "#86efac", textTransform: "uppercase", marginBottom: "16px", fontWeight: "600"}}>Email Status</p>
            <h3 style={{fontSize: "36px", fontWeight: "700", color: "#f1f5f9", marginBottom: "8px"}}>
              {user?.emailVerified ? "Verified" : "Pending"}
            </h3>
            <p style={{fontSize: "14px", color: "#cbd5e1"}}>Email verification status</p>
          </div>

          {/* Card 4 */}
          <div 
            style={{
              background: "rgba(6, 182, 212, 0.08)",
              border: "1px solid rgba(6, 182, 212, 0.2)",
              borderRadius: "20px",
              padding: "50px 40px",
              backdropFilter: "blur(10px)",
              transition: "all 0.4s ease",
              cursor: "default"
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = "rgba(6, 182, 212, 0.8)";
              e.currentTarget.style.background = "rgba(6, 182, 212, 0.15)";
              e.currentTarget.style.transform = "translateY(-8px)";
              e.currentTarget.style.boxShadow = "0 20px 40px rgba(6, 182, 212, 0.15)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = "rgba(6, 182, 212, 0.2)";
              e.currentTarget.style.background = "rgba(6, 182, 212, 0.08)";
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.boxShadow = "none";
            }}
          >
            <div style={{marginBottom: "20px", fontSize: "32px"}}>⭐</div>
            <p style={{fontSize: "12px", letterSpacing: "2px", color: "#a5f3fc", textTransform: "uppercase", marginBottom: "16px", fontWeight: "600"}}>Next Step</p>
            <h3 style={{fontSize: "28px", fontWeight: "700", color: "#f1f5f9", marginBottom: "8px"}}>
              {isAdmin ? "Manage Platform" : isCreator ? "Creator Tools" : "Build Profile"}
            </h3>
            <p style={{fontSize: "14px", color: "#cbd5e1"}}>Your next milestone</p>
          </div>
        </div>

        {/* Stats Section */}
        {user?.followersCount !== undefined && (
          <div style={{
            background: "rgba(15, 23, 42, 0.3)",
            border: "1px solid rgba(99, 102, 241, 0.2)",
            borderRadius: "20px",
            padding: "60px 50px",
            marginBottom: "80px",
            backdropFilter: "blur(10px)"
          }}>
            <h2 style={{
              fontSize: "28px",
              fontWeight: "700",
              color: "#f1f5f9",
              marginBottom: "50px"
            }}>📊 Your Stats</h2>
            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
              gap: "60px"
            }}>
              <div>
                <p style={{fontSize: "12px", letterSpacing: "2px", color: "#94a3b8", textTransform: "uppercase", marginBottom: "20px", fontWeight: "600"}}>Followers</p>
                <p style={{fontSize: "48px", fontWeight: "700", color: "#818cf8"}}>{user?.followersCount || 0}</p>
              </div>
              <div>
                <p style={{fontSize: "12px", letterSpacing: "2px", color: "#94a3b8", textTransform: "uppercase", marginBottom: "20px", fontWeight: "600"}}>Following</p>
                <p style={{fontSize: "48px", fontWeight: "700", color: "#a855f7"}}>{user?.followingCount || 0}</p>
              </div>
              <div>
                <p style={{fontSize: "12px", letterSpacing: "2px", color: "#94a3b8", textTransform: "uppercase", marginBottom: "20px", fontWeight: "600"}}>Member Since</p>
                <p style={{fontSize: "28px", fontWeight: "700", color: "#cbd5e1"}}>
                  {user?.joinedAt ? new Date(user.joinedAt).getFullYear() : "Recently"}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "20px",
          justifyContent: "center"
        }}>
          <Link 
            to="/profile"
            style={{
              padding: "18px 40px",
              fontSize: "16px",
              fontWeight: "600",
              borderRadius: "12px",
              border: "1px solid rgba(99, 102, 241, 0.3)",
              background: "linear-gradient(135deg, #4f46e5 0%, #6366f1 100%)",
              color: "white",
              textDecoration: "none",
              display: "inline-block",
              cursor: "pointer",
              transition: "all 0.3s ease"
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = "translateY(-4px)";
              e.currentTarget.style.boxShadow = "0 15px 30px rgba(99, 102, 241, 0.3)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.boxShadow = "none";
            }}
          >
            ✎ Edit Profile
          </Link>
          <Link 
            to={`/u/${encodeURIComponent(user?.username || "")}`}
            style={{
              padding: "18px 40px",
              fontSize: "16px",
              fontWeight: "600",
              borderRadius: "12px",
              border: "1px solid rgba(71, 85, 105, 0.5)",
              background: "rgba(30, 41, 59, 0.6)",
              color: "#f1f5f9",
              textDecoration: "none",
              display: "inline-block",
              cursor: "pointer",
              transition: "all 0.3s ease"
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = "rgba(168, 85, 247, 0.6)";
              e.currentTarget.style.background = "rgba(168, 85, 247, 0.15)";
              e.currentTarget.style.transform = "translateY(-4px)";
              e.currentTarget.style.boxShadow = "0 15px 30px rgba(168, 85, 247, 0.2)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = "rgba(71, 85, 105, 0.5)";
              e.currentTarget.style.background = "rgba(30, 41, 59, 0.6)";
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.boxShadow = "none";
            }}
          >
            👁 View Public Profile
          </Link>
          {(isCreator || isAdmin) && (
            <Link 
              to={isAdmin ? "/admin" : "/creator"}
              style={{
                padding: "18px 40px",
                fontSize: "16px",
                fontWeight: "600",
                borderRadius: "12px",
                border: "1px solid rgba(71, 85, 105, 0.5)",
                background: "rgba(30, 41, 59, 0.6)",
                color: "#f1f5f9",
                textDecoration: "none",
                display: "inline-block",
                cursor: "pointer",
                transition: "all 0.3s ease"
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = "rgba(16, 185, 129, 0.6)";
                e.currentTarget.style.background = "rgba(16, 185, 129, 0.15)";
                e.currentTarget.style.transform = "translateY(-4px)";
                e.currentTarget.style.boxShadow = "0 15px 30px rgba(16, 185, 129, 0.2)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = "rgba(71, 85, 105, 0.5)";
                e.currentTarget.style.background = "rgba(30, 41, 59, 0.6)";
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = "none";
              }}
            >
              ⚙ {isAdmin ? "Admin Panel" : "Creator Tools"}
            </Link>
          )}
        </div>
      </div>
    </section>
  );
}
