"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { User, authApi, getAuthToken, setAuthToken, removeAuthToken } from "@/lib/api";

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name?: string) => Promise<void>;
  loginWithGoogle: (credential: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const savedToken = getAuthToken();
    if (savedToken) {
      setToken(savedToken);
      authApi
        .getMe()
        .then((userData) => {
          setUser(userData);
        })
        .catch(() => {
          removeAuthToken();
          setToken(null);
          setUser(null);
        })
        .finally(() => {
          setIsLoading(false);
        });
    } else {
      setIsLoading(false);
    }
  }, []);

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const data = await authApi.login({ email, password });
      setAuthToken(data.access_token);
      setToken(data.access_token);
      setUser(data.user);
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (email: string, password: string, name?: string) => {
    setIsLoading(true);
    try {
      const data = await authApi.register({ email, password, name });
      setAuthToken(data.access_token);
      setToken(data.access_token);
      setUser(data.user);
    } finally {
      setIsLoading(false);
    }
  };

  const loginWithGoogle = async (credential: string) => {
    setIsLoading(true);
    try {
      const data = await authApi.google(credential);
      setAuthToken(data.access_token);
      setToken(data.access_token);
      setUser(data.user);
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    removeAuthToken();
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{ user, token, isLoading, login, register, loginWithGoogle, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
