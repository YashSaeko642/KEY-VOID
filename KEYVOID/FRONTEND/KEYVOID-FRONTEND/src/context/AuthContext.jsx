import { useEffect, useMemo, useState } from "react";
import API from "../../services/api";
import { AuthContext } from "./authContextInstance";

let refreshPromise = null;

async function requestRefresh() {
  if (!refreshPromise) {
    refreshPromise = API.post("/auth/refresh")
      .then((response) => response.data)
      .finally(() => {
        refreshPromise = null;
      });
  }

  return refreshPromise;
}

export function AuthProvider({ children }) {
  const [token, setToken] = useState("");
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [isBootstrapping, setIsBootstrapping] = useState(true);

  useEffect(() => {
    if (token) {
      API.defaults.headers.common.Authorization = `Bearer ${token}`;
    } else {
      delete API.defaults.headers.common.Authorization;
    }
  }, [token]);

  useEffect(() => {
    const interceptor = API.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config;
        const status = error.response?.status;

        if (
          status !== 401 ||
          !originalRequest ||
          originalRequest._retry ||
          originalRequest.url?.includes("/auth/google") ||
          originalRequest.url?.includes("/auth/refresh") ||
          originalRequest.url?.includes("/auth/logout")
        ) {
          return Promise.reject(error);
        }

        originalRequest._retry = true;

        try {
          const data = await requestRefresh();
          setToken(data.token);
          setUser(data.user);
          originalRequest.headers.Authorization = `Bearer ${data.token}`;
          return API(originalRequest);
        } catch (refreshError) {
          setToken("");
          setUser(null);
          return Promise.reject(refreshError);
        }
      }
    );

    return () => {
      API.interceptors.response.eject(interceptor);
    };
  }, []);

  useEffect(() => {
    let ignore = false;

    async function bootstrapAuth() {
      try {
        const data = await requestRefresh();

        if (!ignore) {
          setToken(data.token);
          setUser(data.user);
        }
      } catch {
        if (!ignore) {
          setToken("");
          setUser(null);
        }
      } finally {
        if (!ignore) {
          setIsBootstrapping(false);
        }
      }
    }

    bootstrapAuth();

    return () => {
      ignore = true;
    };
  }, []);

  async function googleAuth({ credential, role = "user", username }) {
    setLoading(true);

    try {
      const { data } = await API.post("/auth/google", { credential, role, username });

      if (data.profileRequired) {
        return {
          success: false,
          profileRequired: true,
          googleProfile: data.googleProfile
        };
      }

      setToken(data.token);
      setUser(data.user);
      return { success: true };
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.msg || "Google sign-in failed"
      };
    } finally {
      setLoading(false);
    }
  }

  async function logout() {
    setLoading(true);

    try {
      await API.post("/auth/logout");
    } catch {
      // Clear local auth state even if the revoke call fails.
    } finally {
      setToken("");
      setUser(null);
      setLoading(false);
    }
  }

  function updateUser(nextUser) {
    setUser(nextUser);
  }

  const value = useMemo(
    () => ({
      token,
      user,
      isAuthenticated: Boolean(token && user),
      role: user?.role || "user",
      isCreator: user?.role === "creator",
      isUser: user?.role === "user",
      isAdmin: user?.role === "admin",
      loading,
      isBootstrapping,
      hasRole(roles) {
        if (!user?.role) {
          return false;
        }

        const allowedRoles = Array.isArray(roles) ? roles : [roles];
        return allowedRoles.includes(user.role);
      },
      googleAuth,
      updateUser,
      logout
    }),
    [token, user, loading, isBootstrapping]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
