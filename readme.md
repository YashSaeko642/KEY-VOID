# KEYVOID

> **The Digital Space Where Creators Find Their Sound and Find Their Sound.**

KEYVOID is a decentralized, user-centric social platform designed to bridge the gap between independent creators and authentic audiences. Unlike mainstream social media, KEYVOID focuses on **quality, discovery, and community**, providing a seamless ecosystem where creators can share their art (music, video, voice) and connect with engaged followers.

---

## 🎯 Mission & Vision

### **Mission**
To empower independent creators by providing a platform where authentic connection, high-quality content, and fair exposure drive engagement. We aim to reduce the noise of traditional social networks by focusing on genuine interactions and content merit.

### **Vision**
To become the primary digital hub for creator discovery, where artists, musicians, and influencers can build lasting relationships with their audience through meaningful content and seamless social features.

---

## 🚀 Key Features

### **1. Creator Profile System**
*   **Identity & Portfolio**: Dedicated profiles showcasing username, verified badges, bio, and social links.
*   **Customization**: Users can display personalized avatars, cover photos, and profile banners.
*   **Verification**: Badge system to distinguish verified creators from regular users.
*   **Networking**: Follow, unfollow, and connect with other users to build an audience.

### **2. Content Sharing & Discovery**
*   **Rich Media Posts**: Create and share text, images, and audio clips.
*   **Search & Explore**: Advanced search functionality to find creators by username or browse by interest.
*   **Feed Integration**: Real-time updates visible to followers and search results.
*   **Media Types**: Support for static images and audio posts with embedded players.

### **3. Social Interaction**
*   **Engagement**: Like, comment, and share on content.
*   **Real-time Updates**: Optimistic UI updates for likes and interactions.
*   **Notifications**: Keep creators informed about their activity and audience engagement.

### **4. Authentication & Security**
*   **Secure Login**: Support for both local accounts and OAuth providers (e.g., Google).
*   **Token Management**: Automatic refresh token rotation for seamless, secure sessions.
*   **Role-Based Access**: Admin privileges for moderation and user management.
*   **Audit Logs**: Comprehensive logging of security-sensitive actions.

### **5. User Experience**
*   **Modern UI**: Dark-themed, responsive design optimized for mobile and desktop.
*   **Smooth Animations**: Interactive elements using Framer Motion for a polished feel.
*   **SEO Optimization**: Structured metadata and clean URLs for search engine visibility.

---

## 🛠️ Technical Architecture

KEYVOID is built with a modern, component-based architecture using React and Node.js, ensuring scalability and maintainability.

### **Frontend (React + Vite)**
*   **Core Framework**: React 19 (Latest) with Vite for high-performance bundling.
*   **State Management**: React Hooks (`useState`, `useEffect`, `useRef`) for local and global state.
*   **Styling**: Tailwind CSS for utility-first, responsive styling.
*   **Animations**: Framer Motion for smooth transitions and micro-interactions.
*   **Icons**: Lucide React for consistent, lightweight iconography.
*   **Routing**: React Router for client-side navigation.

### **Backend (Node.js + Express)**
*   **Runtime**: Node.js environment.
*   **HTTP Framework**: Express.js for routing and request handling.
*   **Database**: MongoDB (via `mongoose`) for flexible schema and high scalability.
*   **Authentication**: JWT (JSON Web Tokens) with access token refresh logic.
*   **Validation**: Built-in validation for request bodies.

### **Key Technologies Stack**
| Category | Technology | Purpose |
| :--- | :--- | :--- |
| **Frontend** | React, Vite | UI & State Management |
| **Styling** | Tailwind CSS | Utility Styling |
| **Animation** | Framer Motion | UI Transitions |
| **Backend** | Node.js, Express | API & Business Logic |
| **Database** | MongoDB, Mongoose | Data Storage |
| **Security** | JWT, bcrypt | Auth & Password Hashing |
| **Deployment** | Vercel, Railway | Hosting & CI/CD |

---

## 📊 Current Status & Roadmap

### **✅ Production-Ready (Core)**
The system is currently live and stable for:
*   User Authentication (Login/Logout/Refresh).
*   Profile Creation & Management.
*   Content Posting (Text, Images, Audio).
*   Search & Discovery Features.
*   Basic Social Features (Follow, Like, Comment).

### **🚧 Upcoming Enhancements**
1.  **Creator Analytics**: View posts, engagement metrics, and follower growth.
2.  **Advanced Filtering**: Search by tags, media type, or date.
3.  **Audio Player**: Enhanced audio waveform visualizations and equalizer.
4.  **Playlist Management**: Curate and share custom playlists.
5.  **Messaging System**: Direct message functionality between users.

---

## 🤝 Contributing

We welcome contributions from the community! Whether you're interested in backend logic, frontend UI, or documentation, your input is valued.

1.  **Fork** the repository.
2.  **Create** a feature branch (`git checkout -b feature/AmazingFeature`).
3.  **Commit** your changes (`git commit -m 'Add some AmazingFeature'`).
4.  **Push** to the branch (`git push origin feature/AmazingFeature`).
5.  **Open** a Pull Request.

### **Development Setup**

#### **Prerequisites**
*   Node.js (v18+)
*   MongoDB (Local or Cloud Atlas)
*   Git

#### **Installation**

**Frontend (`KEYVOID-FRONTEND`)**
```bash
cd KEYVOID-FRONTEND
npm install
npm run dev
# or
npm run build
```

**Backend**
```bash
cd KEYVOID/BACKEND
npm install
npm start
```

#### **Environment Variables**
Ensure `.env` files are configured:

**Frontend (`.env`)**
```env
NEXT_PUBLIC_API_URL=http://localhost:5000/api
NEXT_PUBLIC_APP_URL=http://localhost:5173
```

**Backend (`.env`)**
```env
NODE_ENV=development
PORT=5000
MONGODB_URI=mongodb://localhost:27017/keyvoid
JWT_SECRET=your_super_secret_jwt_key
ACCESS_TOKEN_TTL=15m
REFRESH_TOKEN_TTL=7d
CLIENT_URL=http://localhost:5173
```



---

## 👨‍💻 Authors

*   **KEYVOID Team** - Built with passion for creators.
*   **Maintained by** - Yash Kanwar

---

## 📝 Contributing to Documentation

If you notice any issues with this README or need updates to reflect new features, please open an issue or submit a PR.

<div style="display: flex; gap: 10px;">
  <a href="https://github.com/YashSaeko642/KEY-VOID" target="_blank" style="display: inline-block; padding: 5px 10px; border: 1px solid #ccc; background: #f5f5f5; border-radius: 4px; text-decoration: none; color: #333;">GitHub</a>
  <a href="#" style="display: inline-block; padding: 5px 10px; border: 1px solid #ccc; background: #f5f5f5; border-radius: 4px; text-decoration: none; color: #333;">Documentation</a>
</div>