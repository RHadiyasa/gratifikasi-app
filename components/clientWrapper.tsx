"use client";
import { useAuthStore } from "@/store/authStore";
import { useEffect } from "react";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { NavigationProgress } from "./NavigationProgress";
import { RouteTitle } from "./route-title";

const ClientWrapper = ({ children }: { children: React.ReactNode }) => {
  const { checkAuth } = useAuthStore();

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  return (
    <>
      <RouteTitle />
      <NavigationProgress />
      <ToastContainer />
      {children}
    </>
  );
};

export default ClientWrapper;
