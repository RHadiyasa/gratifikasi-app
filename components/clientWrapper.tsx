"use client";
import { useAuthStore } from "@/store/authStore";
import { useEffect } from "react";

const ClientWrapper = ({ children }: { children: React.ReactNode }) => {
  const { checkAuth } = useAuthStore();

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  return <>{children}</>;
};

export default ClientWrapper;
