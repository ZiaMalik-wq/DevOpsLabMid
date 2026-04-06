import React, { createContext, useState, useEffect, useCallback } from "react";
import api from "../services/api";

export const AuthContext = createContext();

// eslint-disable-next-line react-refresh/only-export-components
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [profileImageUrl, setProfileImageUrl] = useState(
    () => localStorage.getItem("profileImageUrl") || null
  );

  // Auth bootstrap loading (NOT form loading)
  const [loading, setLoading] = useState(true);

  // Update profile image and cache it
  const updateProfileImage = useCallback((url) => {
    setProfileImageUrl(url);
    if (url) {
      localStorage.setItem("profileImageUrl", url);
    } else {
      localStorage.removeItem("profileImageUrl");
    }
  }, []);

  const fetchCurrentUser = useCallback(
    async (token) => {
      try {
        const response = await api.get("/auth/me", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        setUser(response.data);

        // Set profile image from /auth/me response immediately
        if (response.data.profile_image_url) {
          updateProfileImage(response.data.profile_image_url);
        }

        return response.data;
      } catch (error) {
        console.error("Token invalid or expired", error);
        localStorage.removeItem("token");
        localStorage.removeItem("profileImageUrl");
        setUser(null);
        setProfileImageUrl(null);
        throw error;
      } finally {
        setLoading(false);
      }
    },
    [updateProfileImage]
  );

  // Fetch profile image for user
  const fetchProfileImage = useCallback(
    async (userData) => {
      if (!userData || userData.role?.toUpperCase() === "ADMIN") return;

      try {
        const isCompany = userData.role?.toLowerCase() === "company";
        const endpoint = isCompany ? "/companies/profile" : "/students/profile";
        const res = await api.get(endpoint);
        updateProfileImage(res.data.profile_image_url || null);
      } catch (err) {
        console.error("Failed to fetch profile image:", err);
      }
    },
    [updateProfileImage]
  );

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      fetchCurrentUser(token)
        .then((userData) => {
          // Fetch fresh profile image in background
          fetchProfileImage(userData);
        })
        .catch(() => {});
    } else {
      setLoading(false);
      localStorage.removeItem("profileImageUrl");
      setProfileImageUrl(null);
    }
  }, [fetchCurrentUser, fetchProfileImage]);

  const login = async (email, password) => {
    try {
      const formData = new URLSearchParams();
      formData.append("username", email);
      formData.append("password", password);

      const response = await api.post("/auth/token", formData, {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
      });

      const { access_token, refresh_token } = response.data;
      localStorage.setItem("token", access_token);
      if (refresh_token) {
        localStorage.setItem("refreshToken", refresh_token);
      }

      const userData = await fetchCurrentUser(access_token);

      return userData; //explicit success signal
    } catch (error) {
      console.error("Login failed", error);
      throw error; // UI can reliably catch
    }
  };

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("refreshToken");
    localStorage.removeItem("profileImageUrl");
    setUser(null);
    setProfileImageUrl(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        login,
        logout,
        loading,
        profileImageUrl,
        updateProfileImage,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
