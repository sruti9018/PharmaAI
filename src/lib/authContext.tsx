"use client";

import React, { createContext, useContext, useState, useEffect } from "react";

export interface PharmacistUser {
  id: string;
  name: string;
  licenseNumber: string;
  role: "Lead Pharmacist" | "Staff Pharmacist" | "Pharmacy Tech";
  shift: "Morning" | "Evening" | "Night";
}

interface AuthContextType {
  user: PharmacistUser | null;
  isAuthenticated: boolean;
  login: (username: string, pin: string) => boolean;
  logout: () => void;
  switchShift: (shift: "Morning" | "Evening" | "Night") => void;
}

const defaultUser: PharmacistUser = {
  id: "pharm_01",
  name: "Dr. Sarah Jenkins, PharmD",
  licenseNumber: "PH-89104",
  role: "Lead Pharmacist",
  shift: "Morning",
};

const AuthContext = createContext<AuthContextType>({
  user: defaultUser,
  isAuthenticated: true,
  login: () => true,
  logout: () => {},
  switchShift: () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<PharmacistUser | null>(defaultUser);

  useEffect(() => {
    const saved = localStorage.getItem("pharmalink_pharmacist_user");
    if (saved) {
      try {
        setUser(JSON.parse(saved));
      } catch {
        setUser(defaultUser);
      }
    }
  }, []);

  const login = (username: string, _pin: string) => {
    const newUser: PharmacistUser = {
      id: "pharm_" + Math.random().toString(36).substring(2, 6),
      name: username.includes("@") ? username.split("@")[0] : username,
      licenseNumber: "PH-" + Math.floor(10000 + Math.random() * 90000),
      role: "Staff Pharmacist",
      shift: "Morning",
    };
    setUser(newUser);
    localStorage.setItem("pharmalink_pharmacist_user", JSON.stringify(newUser));
    return true;
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem("pharmalink_pharmacist_user");
  };

  const switchShift = (shift: "Morning" | "Evening" | "Night") => {
    if (user) {
      const updated = { ...user, shift };
      setUser(updated);
      localStorage.setItem("pharmalink_pharmacist_user", JSON.stringify(updated));
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        login,
        logout,
        switchShift,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

