"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  ReactNode,
} from "react";
import { usePopup } from "@/lib/popup-context";

interface UnsavedChangesContextType {
  hasUnsavedChanges: boolean;
  setHasUnsavedChanges: (value: boolean) => void;
  confirmNavigation: () => Promise<boolean>;
}

const UnsavedChangesContext = createContext<
  UnsavedChangesContextType | undefined
>(undefined);

export function UnsavedChangesProvider({ children }: { children: ReactNode }) {
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [pendingConfirmation, setPendingConfirmation] = useState<Promise<boolean> | null>(null);
  const { confirm: showConfirm } = usePopup();

  const confirmNavigation = useCallback(async (): Promise<boolean> => {
    if (!hasUnsavedChanges) {
      return true;
    }

    // If a confirmation is already in progress, return the same promise
    if (pendingConfirmation) {
      return pendingConfirmation;
    }

    // Create the confirmation promise
    const confirmPromise = showConfirm(
      "Unsaved Changes",
      "You have unsaved changes. Are you sure you want to leave? Your changes will be lost.",
    );

    // Store it so subsequent calls return the same promise
    setPendingConfirmation(confirmPromise);

    // Clean up after confirmation completes
    const result = await confirmPromise;
    setPendingConfirmation(null);
    return result;
  }, [hasUnsavedChanges, pendingConfirmation, showConfirm]);

  return (
    <UnsavedChangesContext.Provider
      value={{
        hasUnsavedChanges,
        setHasUnsavedChanges,
        confirmNavigation,
      }}
    >
      {children}
    </UnsavedChangesContext.Provider>
  );
}

export function useUnsavedChanges() {
  const context = useContext(UnsavedChangesContext);
  if (!context) {
    throw new Error(
      "useUnsavedChanges must be used within UnsavedChangesProvider",
    );
  }
  return context;
}
