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
          originalRequest.url?.includes("/auth/login") ||
          originalRequest.url?.includes("/auth/signup") ||
          originalRequest.url?.includes("/auth/refresh") ||
          originalRequest.url?.includes("/auth/forgot-password") ||
          originalRequest.url?.includes("/auth/reset-password") ||
          originalRequest.url?.includes("/auth/verify-email")
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

  async function login(credentials) {
    setLoading(true);

    try {
      const { data } = await API.post("/auth/login", credentials);
      setToken(data.token);
      setUser(data.user);
      return { success: true };
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.msg || "Login failed",
        requiresEmailVerification: Boolean(error.response?.data?.requiresEmailVerification)
      };
    } finally {
      setLoading(false);
    }
  }

  async function signup(payload) {
    setLoading(true);

    try {
      const { data } = await API.post("/auth/signup", payload);
      return {
        success: true,
        message: data.msg,
        requiresEmailVerification: Boolean(data.requiresEmailVerification),
        verificationPreviewUrl: data.verificationPreviewUrl || ""
      };
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.msg || "Signup failed"
      };
    } finally {
      setLoading(false);
    }
  }

  async function resendVerificationEmail(email) {
    setLoading(true);

    try {
      const { data } = await API.post("/auth/resend-verification", { email });
      return {
        success: true,
        message: data.msg,
        verificationPreviewUrl: data.verificationPreviewUrl || ""
      };
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.msg || "Unable to resend verification"
      };
    } finally {
      setLoading(false);
    }
  }

  async function forgotPassword(email) {
    setLoading(true);

    try {
      const { data } = await API.post("/auth/forgot-password", { email });
      return {
        success: true,
        message: data.msg,
        resetPreviewUrl: data.resetPreviewUrl || ""
      };
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.msg || "Unable to process password reset"
      };
    } finally {
      setLoading(false);
    }
  }

  async function resetPassword({ token: resetToken, password }) {
    setLoading(true);

    try {
      const { data } = await API.post("/auth/reset-password", {
        token: resetToken,
        password
      });
      return { success: true, message: data.msg };
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.msg || "Unable to reset password"
      };
    } finally {
      setLoading(false);
    }
  }

  async function verifyEmail(tokenToVerify) {
    setLoading(true);

    try {
      const { data } = await API.get("/auth/verify-email", {
        params: { token: tokenToVerify }
      });
      return { success: true, message: data.msg };
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.msg || "Unable to verify email"
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

  const value = useMemo(
    () => ({
      token,
      user,
      isAuthenticated: Boolean(token && user),
      loading,
      isBootstrapping,
      login,
      signup,
      resendVerificationEmail,
      forgotPassword,
      resetPassword,
      verifyEmail,
      logout
    }),
    [token, user, loading, isBootstrapping]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
