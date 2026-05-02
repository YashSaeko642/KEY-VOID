import axios from "axios";

const API = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "/api",
  withCredentials: true
});

export function getApiErrorMessage(error, fallback = "Request failed") {
  return (
    error.response?.data?.message ||
    error.response?.data?.msg ||
    error.message ||
    fallback
  );
}

// Profile search
export const searchProfiles = (query, limit = 10, skip = 0) => 
  API.get("/profiles/search", { params: { q: query, limit, skip } });

// Follower operations
export const followUser = (userId) => API.post(`/followers/follow/${userId}`);
export const unfollowUser = (userId) => API.post(`/followers/unfollow/${userId}`);
export const getFollowers = (userId, limit = 10, skip = 0) => 
  API.get(`/followers/${userId}/followers`, { params: { limit, skip } });
export const getFollowing = (userId, limit = 10, skip = 0) => 
  API.get(`/followers/${userId}/following`, { params: { limit, skip } });
export const getFollowStatus = (userId) => API.get(`/followers/${userId}/status`);

export const getAudioLibrary = () => API.get("/audio/library");
export const addAudioTag = (trackId, tag) => API.post(`/audio/${trackId}/tags`, { tag });
export const removeAudioTag = (trackId, tag) => API.delete(`/audio/${trackId}/tags`, { data: { tag } });

export default API;
