import axios from "axios";

const API = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "/api",
  withCredentials: true
});

API.interceptors.request.use((config) => {
  if (typeof window === "undefined") return config;

  let viewerId = localStorage.getItem("keyvoid_viewer_id");
  if (!viewerId) {
    viewerId = crypto.randomUUID();
    localStorage.setItem("keyvoid_viewer_id", viewerId);
  }

  config.headers = config.headers || {};
  config.headers["x-keyvoid-viewer"] = viewerId;
  return config;
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

export const getAudioLibrary = ({ page = 1, limit = 10, search = "" } = {}) =>
  API.get("/audio/library", { params: { page, limit, search } });
export const streamAudioTrack = (trackId) => API.get(`/audio/stream/${trackId}`, { responseType: "blob" });
export const addAudioTag = (trackId, tag) => API.post(`/audio/${trackId}/tags`, { tag });
export const removeAudioTag = (trackId, tag) => API.delete(`/audio/${trackId}/tags`, { data: { tag } });
export const uploadCreatorSongs = (formData) =>
  API.post("/audio/upload", formData, { headers: { "Content-Type": "multipart/form-data" } });
export const getMyAudioUploads = (page = 1, limit = 20) =>
  API.get("/audio/my-uploads", { params: { page, limit } });
export const getUserAudioUploads = (userId, page = 1, limit = 10) =>
  API.get(`/audio/user/${userId}`, { params: { page, limit } });
export const getUserPosts = (userId, page = 1, limit = 10, contentType = "") =>
  API.get(`/posts/user/${userId}`, { params: { page, limit, contentType } });
export const getCreatorInsights = () => API.get("/posts/creator/insights");
export const trackPostView = (postId) => API.post(`/posts/${postId}/view`);
export const reportPost = (postId, payload) => API.post(`/posts/${postId}/report`, payload);
export const updateAudioTrack = (trackId, payload) => API.patch(`/audio/${trackId}`, payload);
export const deleteAudioTrack = (trackId) => API.delete(`/audio/${trackId}`);
export const getPlaylists = () => API.get("/playlists");
export const getPlaylist = (playlistId) => API.get(`/playlists/${playlistId}`);
export const createPlaylist = (formData) =>
  API.post("/playlists/create", formData, { headers: { "Content-Type": "multipart/form-data" } });
export const addTrackToPlaylist = (playlistId, trackId) => API.post("/playlists/add-track", { playlistId, trackId });
export const removeTrackFromPlaylist = (playlistId, trackId) => API.post("/playlists/remove-track", { playlistId, trackId });
export const toggleLikedTrack = (trackId) => API.post("/playlists/like", { trackId });

export default API;
