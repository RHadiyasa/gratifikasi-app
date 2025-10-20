"use client";
import { useAuthStore } from "@/store/authStore";
import { useEffect } from "react";

const ClientWrapper = ({ children }: { children: React.ReactNode }) => {
  const { checkToken } = useAuthStore();
  useEffect(() => {
    checkToken();
  }, [checkToken]);
  return <>{children}</>;
};

export default ClientWrapper;
