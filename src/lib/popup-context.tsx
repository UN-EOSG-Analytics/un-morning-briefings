"use client";

import React, { createContext, useContext, useCallback, useState } from "react";
import { Popup, PopupAction } from "@/types/popup";

interface PopupContextType {
  popups: Popup[];
  showPopup: (config: Omit<Popup, "id">) => string;
  closePopup: (id: string) => void;
  confirm: (title: string, message: string) => Promise<boolean>;
  success: (title: string, message: string, duration?: number) => void;
  error: (title: string, message: string, duration?: number) => void;
  warning: (title: string, message: string, duration?: number) => void;
  info: (title: string, message: string, duration?: number) => void;
}

const PopupContext = createContext<PopupContextType | undefined>(undefined);

export function PopupProvider({ children }: { children: React.ReactNode }) {
  const [popups, setPopups] = useState<Popup[]>([]);

  const generateId = useCallback(() => {
    return `popup-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }, []);

  const closePopup = useCallback((id: string) => {
    setPopups((prev) => {
      const popup = prev.find((p) => p.id === id);
      if (popup?.onClose) {
        popup.onClose();
      }
      return prev.filter((p) => p.id !== id);
    });
  }, []);

  const showPopup = useCallback(
    (config: Omit<Popup, "id">) => {
      const id = generateId();
      const popup: Popup = {
        ...config,
        id,
        autoClose:
          config.autoClose !== undefined
            ? config.autoClose
            : config.type !== "confirm",
        duration: config.duration || 5000,
      };

      setPopups((prev) => [...prev, popup]);

      // Auto-close if enabled
      if (popup.autoClose) {
        setTimeout(() => {
          closePopup(id);
        }, popup.duration);
      }

      return id;
    },
    [generateId, closePopup],
  );

  const confirm = useCallback(
    (title: string, message: string): Promise<boolean> => {
      return new Promise((resolve) => {
        // eslint-disable-next-line prefer-const
        let id: string;

        const handleConfirm: PopupAction = {
          label: "Confirm",
          onClick: () => {
            closePopup(id);
            resolve(true);
          },
          variant: "destructive",
        };

        const handleCancel: PopupAction = {
          label: "Cancel",
          onClick: () => {
            closePopup(id);
            resolve(false);
          },
        };

        id = showPopup({
          type: "confirm",
          title,
          message,
          actions: [handleCancel, handleConfirm],
          autoClose: false,
        });
      });
    },
    [showPopup, closePopup],
  );

  const success = useCallback(
    (title: string, message: string, duration?: number) => {
      showPopup({
        type: "success",
        title,
        message,
        duration,
      });
    },
    [showPopup],
  );

  const error = useCallback(
    (title: string, message: string, duration?: number) => {
      showPopup({
        type: "error",
        title,
        message,
        duration,
      });
    },
    [showPopup],
  );

  const warning = useCallback(
    (title: string, message: string, duration?: number) => {
      showPopup({
        type: "warning",
        title,
        message,
        duration,
      });
    },
    [showPopup],
  );

  const info = useCallback(
    (title: string, message: string, duration?: number) => {
      showPopup({
        type: "info",
        title,
        message,
        duration,
      });
    },
    [showPopup],
  );

  return (
    <PopupContext.Provider
      value={{
        popups,
        showPopup,
        closePopup,
        confirm,
        success,
        error,
        warning,
        info,
      }}
    >
      {children}
    </PopupContext.Provider>
  );
}

export function usePopup(): PopupContextType {
  const context = useContext(PopupContext);
  if (!context) {
    throw new Error("usePopup must be used within PopupProvider");
  }
  return context;
}
