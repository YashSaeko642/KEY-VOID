import axios from "axios";

const API = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "/api",
  withCredentials: true
});

// ==================== SEARCH ENDPOINTS ====================
export const searchProfiles = async (query, limit = 20, page = 1) => {
  const response = await API.get("/profiles/search", {
    params: { query, limit, page }
  });
  return response.data;
};

// ==================== FOLLOW ENDPOINTS ====================
export const followUser = async (userId) => {
  const response = await API.post(`/profiles/${userId}/follow`);
  return response.data;
};

export const unfollowUser = async (userId) => {
  const response = await API.delete(`/profiles/${userId}/follow`);
  return response.data;
};

// ==================== FOLLOWERS/FOLLOWING ENDPOINTS ====================
export const getFollowers = async (userId, limit = 20, page = 1) => {
  const response = await API.get(`/profiles/${userId}/followers`, {
    params: { limit, page }
  });
  return response.data;
};

export const getFollowing = async (userId, limit = 20, page = 1) => {
  const response = await API.get(`/profiles/${userId}/following`, {
    params: { limit, page }
  });
  return response.data;
};

export default API;
