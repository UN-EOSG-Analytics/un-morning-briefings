"use client";

import { useState, useRef, useEffect } from "react";
import { useSession, signOut } from "next-auth/react";
import {
  Settings,
  Trash2,
  AlertTriangle,
  Check,
  X,
  Download,
  Upload,
  Mail,
  Plus,
  UserPlus,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { usePopup } from "@/lib/popup-context";
import labels from "@/lib/labels.json";

interface SettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SettingsDialog({ open, onOpenChange }: SettingsDialogProps) {
  const { data: session, update: updateSession } = useSession();
  const { success: showSuccess, warning: showWarning } = usePopup();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState("");
  const [isEditingName, setIsEditingName] = useState(false);
  const [firstName, setFirstName] = useState(session?.user?.firstName || "");
  const [lastName, setLastName] = useState(session?.user?.lastName || "");
  const [isSavingName, setIsSavingName] = useState(false);
  const [isCreatingBackup, setIsCreatingBackup] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Email workflow settings
  const [emailTime, setEmailTime] = useState("09:00");
  const [emailAddress, setEmailAddress] = useState("");

  // Whitelist settings
  const [whitelistEmails, setWhitelistEmails] = useState<
    Array<{
      id: number;
      email: string;
      userId: number | null;
      userName: string | null;
      addedBy: string;
      createdAt: string;
    }>
  >([]);
  const [newWhitelistEmail, setNewWhitelistEmail] = useState("");
  const [isLoadingWhitelist, setIsLoadingWhitelist] = useState(false);
  const [isAddingWhitelist, setIsAddingWhitelist] = useState(false);

  // Load whitelist when dialog opens
  const loadWhitelist = async () => {
    setIsLoadingWhitelist(true);
    try {
      const response = await fetch("/api/whitelist");
      if (response.ok) {
        const data = await response.json();
        setWhitelistEmails(data);
      }
    } catch (err) {
      console.error("Failed to load whitelist:", err);
    } finally {
      setIsLoadingWhitelist(false);
    }
  };

  const handleAddWhitelistEmail = async () => {
    if (!newWhitelistEmail.trim()) return;

    setIsAddingWhitelist(true);
    setError("");

    try {
      const response = await fetch("/api/whitelist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: newWhitelistEmail.trim() }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to add email");
      }

      showSuccess(labels.settings.whitelist.addSuccess, `${newWhitelistEmail} has been whitelisted`);
      setNewWhitelistEmail("");
      await loadWhitelist();
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Failed to add email";
      setError(errorMsg);
      showWarning(labels.settings.whitelist.addFailed, errorMsg);
    } finally {
      setIsAddingWhitelist(false);
    }
  };

  const handleRemoveWhitelistEmail = async (email: string) => {
    try {
      const response = await fetch(`/api/whitelist?email=${encodeURIComponent(email)}`, {
        method: "DELETE",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to remove email");
      }

      showSuccess(labels.settings.whitelist.removeSuccess, `${email} has been removed from whitelist`);
      await loadWhitelist();
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Failed to remove email";
      showWarning(labels.settings.whitelist.removeFailed, errorMsg);
    }
  };

  const handleDeleteAccount = async () => {
    if (!session?.user?.email) return;

    setIsDeleting(true);
    setError("");

    try {
      const response = await fetch("/api/user/delete", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to delete account");
      }

      // Account deleted successfully - sign out and redirect
      await signOut({ callbackUrl: "/login?deleted=true" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
      setIsDeleting(false);
    }
  };

  const handleSaveName = async () => {
    if (!firstName.trim() || !lastName.trim()) {
      setError(labels.settings.account.nameRequired);
      return;
    }

    setIsSavingName(true);
    setError("");

    try {
      const response = await fetch("/api/user/update-name", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          firstName: firstName.trim(),
          lastName: lastName.trim(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to update name");
      }

      // Update the session with new name
      await updateSession({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
      });

      setIsEditingName(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsSavingName(false);
    }
  };

  const handleCreateBackup = async () => {
    setIsCreatingBackup(true);
    setError("");

    try {
      const response = await fetch("/api/entries");

      if (!response.ok) {
        throw new Error("Failed to fetch entries");
      }

      const data = await response.json();

      // Create backup object with metadata
      const backup = {
        version: "1.0",
        timestamp: new Date().toISOString(),
        user: session?.user?.email,
        entries: Array.isArray(data) ? data : [],
      };

      // Convert to JSON string
      const jsonString = JSON.stringify(backup, null, 2);

      // Create blob and download
      const blob = new Blob([jsonString], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `un-briefings-backup-${new Date().toISOString().split("T")[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create backup");
    } finally {
      setIsCreatingBackup(false);
    }
  };

  const handleImportBackup = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    setError("");

    try {
      // Read the file
      const fileContent = await file.text();
      const backup = JSON.parse(fileContent);

      // Validate backup structure
      if (!backup.entries || !Array.isArray(backup.entries)) {
        throw new Error(labels.settings.data.invalidFormat);
      }

      // Send to API for import
      const response = await fetch("/api/entries/import", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ entries: backup.entries }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to import entries");
      }

      // Show success message
      showSuccess(
        labels.settings.data.importSuccess,
        labels.settings.data.importSuccessMessage.replace("{count}", String(result.imported)).replace("{skipped}", String(result.skipped)),
      );

      // Close dialog after successful import
      setTimeout(() => {
        onOpenChange(false);
      }, 1000);
    } catch (err) {
      const errorMsg =
        err instanceof Error ? err.message : "Failed to import backup";
      setError(errorMsg);
      showWarning(labels.settings.data.importFailed, errorMsg);
    } finally {
      setIsImporting(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  // Load whitelist when dialog opens
  useEffect(() => {
    if (open) {
      loadWhitelist();
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex flex-col sm:max-w-[600px] sm:max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Settings
          </DialogTitle>
          <DialogDescription>
            {labels.settings.subtitle}
          </DialogDescription>
        </DialogHeader>

        <Tabs
          defaultValue="account"
          className="flex min-h-0 w-full flex-1 flex-col"
        >
          <TabsList className="grid w-full flex-shrink-0 grid-cols-4">
            <TabsTrigger value="account">{labels.settings.tabs.account}</TabsTrigger>
            <TabsTrigger value="data">{labels.settings.tabs.dataManagement}</TabsTrigger>
            <TabsTrigger value="whitelist">{labels.settings.tabs.whitelist}</TabsTrigger>
            <TabsTrigger value="email">{labels.settings.tabs.emailWorkflow}</TabsTrigger>
          </TabsList>

          {/* Account Tab */}
          <TabsContent
            value="account"
            className="mt-4 flex-1 space-y-4 overflow-y-auto"
          >
            {/* Account Information */}
            <div className="space-y-3 rounded-lg bg-slate-50 p-4">
              <div>
                <p className="text-xs text-slate-600">{labels.settings.account.email}</p>
                <p className="text-sm font-medium">{session?.user?.email}</p>
              </div>

              {/* Name Section - Edit Mode */}
              {isEditingName ? (
                <div className="space-y-2 rounded border border-slate-200 bg-white p-3">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-xs text-slate-600">
                        {labels.settings.account.firstName}
                      </label>
                      <input
                        type="text"
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        placeholder={labels.settings.account.firstNamePlaceholder}
                        className="mt-1 w-full rounded border border-slate-300 px-2 py-1 text-sm focus:border-un-blue focus:ring-2 focus:ring-un-blue/20 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-slate-600">
                        {labels.settings.account.lastName}
                      </label>
                      <input
                        type="text"
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        placeholder={labels.settings.account.lastNamePlaceholder}
                        className="mt-1 w-full rounded border border-slate-300 px-2 py-1 text-sm focus:border-un-blue focus:ring-2 focus:ring-un-blue/20 focus:outline-none"
                      />
                    </div>
                  </div>
                  {error && (
                    <p className="text-xs font-medium text-red-600">{error}</p>
                  )}
                  <div className="flex gap-2 pt-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setIsEditingName(false);
                        setFirstName(session?.user?.firstName || "");
                        setLastName(session?.user?.lastName || "");
                        setError("");
                      }}
                      disabled={isSavingName}
                      className="flex-1"
                    >
                      <X className="mr-1 h-4 w-4" />
                      {labels.common.cancel}
                    </Button>
                    <Button
                      size="sm"
                      onClick={handleSaveName}
                      disabled={isSavingName}
                      className="flex-1 bg-un-blue hover:bg-un-blue/90"
                    >
                      <Check className="mr-1 h-4 w-4" />
                      {isSavingName ? labels.settings.account.saving : labels.common.save}
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-slate-600">Name</p>
                    <p className="text-sm font-medium">
                      {session?.user?.firstName} {session?.user?.lastName}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setIsEditingName(true)}
                  >
                    {labels.settings.account.edit}
                  </Button>
                </div>
              )}

              <div>
                <p className="text-xs text-slate-600">Team</p>
                <p className="text-sm font-medium">{session?.user?.team}</p>
              </div>
            </div>

            {/* Delete Account Section */}
            {!showDeleteConfirm ? (
              <Button
                variant="outline"
                className="w-full border-red-200 text-red-600 hover:bg-red-50"
                onClick={() => setShowDeleteConfirm(true)}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                {labels.settings.account.deleteAccount}
              </Button>
            ) : (
              <div className="space-y-3 rounded-lg border border-red-200 bg-red-50 p-4">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0 text-red-600" />
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-red-900">
                      {labels.settings.account.deleteConfirmTitle}
                    </p>
                    <p className="text-xs text-red-700">
                      {labels.settings.account.deleteConfirmMessage}
                    </p>
                  </div>
                </div>

                {error && (
                  <p className="text-xs font-medium text-red-600">{error}</p>
                )}

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setShowDeleteConfirm(false);
                      setError("");
                    }}
                    disabled={isDeleting}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={handleDeleteAccount}
                    disabled={isDeleting}
                    className="flex-1 bg-red-600 hover:bg-red-700"
                  >
                    {isDeleting ? labels.settings.account.deleting : labels.settings.account.deleteButton}
                  </Button>
                </div>
              </div>
            )}
          </TabsContent>

          {/* Data Management Tab */}
          <TabsContent
            value="data"
            className="mt-4 flex-1 space-y-4 overflow-y-auto"
          >
            <div className="space-y-4 rounded-lg bg-slate-50 p-4">
              <div>
                <h3 className="mb-3 text-sm font-semibold text-slate-900">
                  {labels.settings.data.title}
                </h3>
                <div className="mb-2 grid grid-cols-1 gap-2">
                  <Button
                    variant="outline"
                    onClick={handleCreateBackup}
                    disabled={isCreatingBackup}
                  >
                    <Download className="mr-2 h-4 w-4" />
                    {isCreatingBackup ? labels.settings.data.downloading : labels.settings.data.download}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isImporting}
                  >
                    <Upload className="mr-2 h-4 w-4" />
                    {isImporting ? labels.settings.data.importing : labels.settings.data.import}
                  </Button>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="application/json,.json"
                  onChange={handleImportBackup}
                  className="hidden"
                />
                <p className="text-xs text-slate-600">
                  {labels.settings.data.description}
                </p>
              </div>
            </div>
          </TabsContent>

          {/* Whitelist Tab */}
          <TabsContent
            value="whitelist"
            className="mt-4 flex-1 space-y-4 overflow-y-auto"
          >
            <div className="space-y-4 rounded-lg bg-slate-50 p-4">
              <div>
                <h3 className="mb-2 text-sm font-semibold text-slate-900">
                  {labels.settings.whitelist.title}
                </h3>
                <p className="mb-3 text-xs text-slate-600">
                  {labels.settings.whitelist.description}
                </p>

                {/* Add Email Form */}
                <div className="mb-4 space-y-2">
                  <div className="flex gap-2">
                    <input
                      type="email"
                      value={newWhitelistEmail}
                      onChange={(e) => setNewWhitelistEmail(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !isAddingWhitelist) {
                          handleAddWhitelistEmail();
                        }
                      }}
                      placeholder={labels.settings.whitelist.placeholder}
                      className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-un-blue focus:ring-2 focus:ring-un-blue/20 focus:outline-none"
                      disabled={isAddingWhitelist}
                    />
                    <Button
                      size="sm"
                      onClick={handleAddWhitelistEmail}
                      disabled={isAddingWhitelist || !newWhitelistEmail.trim()}
                      className="bg-un-blue hover:bg-un-blue/90"
                    >
                      <Plus className="mr-1 h-4 w-4" />
                      {labels.settings.whitelist.addButton}
                    </Button>
                  </div>
                  {error && (
                    <p className="text-xs font-medium text-red-600">{error}</p>
                  )}
                </div>

                {/* Whitelist Table */}
                <div className="max-h-64 overflow-y-auto rounded border border-slate-200 bg-white">
                  {isLoadingWhitelist ? (
                    <div className="p-4 text-center text-sm text-slate-600">
                      {labels.settings.whitelist.loading}
                    </div>
                  ) : whitelistEmails.length === 0 ? (
                    <div className="p-4 text-center text-sm text-slate-600">
                      {labels.settings.whitelist.empty}
                    </div>
                  ) : (
                    <table className="w-full text-sm">
                      <thead className="bg-slate-50 text-xs uppercase text-slate-600">
                        <tr>
                          <th className="px-3 py-2 text-left font-medium">{labels.settings.whitelist.columns.email}</th>
                          <th className="px-3 py-2 text-left font-medium">{labels.settings.whitelist.columns.status}</th>
                          <th className="px-3 py-2 text-left font-medium">{labels.settings.whitelist.columns.addedBy}</th>
                          <th className="px-3 py-2 text-right font-medium">{labels.settings.whitelist.columns.actions}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {whitelistEmails.map((item) => (
                          <tr key={item.id} className="hover:bg-slate-50">
                            <td className="px-3 py-2">
                              <div className="flex items-center gap-2">
                                <Mail className="h-4 w-4 text-slate-400" />
                                <span className="font-medium text-slate-900">
                                  {item.email}
                                </span>
                              </div>
                            </td>
                            <td className="px-3 py-2">
                              {item.userId ? (
                                <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800">
                                  <Check className="h-3 w-3" />
                                  {labels.settings.whitelist.status.registered}
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                                  <UserPlus className="h-3 w-3" />
                                  {labels.settings.whitelist.status.pending}
                                </span>
                              )}
                            </td>
                            <td className="px-3 py-2 text-slate-600">
                              {item.addedBy}
                            </td>
                            <td className="px-3 py-2 text-right">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleRemoveWhitelistEmail(item.email)}
                                className="h-7 px-2 text-red-600 hover:bg-red-50 hover:text-red-700"
                                title={labels.settings.whitelist.removeTooltip}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>

                <p className="mt-3 text-xs text-slate-500">
                  {labels.settings.whitelist.protectedNote}
                </p>
              </div>
            </div>
          </TabsContent>

          {/* E-Mail Workflow Tab */}
          <TabsContent
            value="email"
            className="mt-4 flex-1 space-y-4 overflow-y-auto"
          >
            <div className="space-y-4 rounded-lg bg-slate-50 p-4">
              <div>
                <h3 className="mb-3 text-sm font-semibold text-slate-900">
                  {labels.settings.email.title}
                </h3>
                <p className="mb-3 text-xs text-slate-600">
                  {labels.settings.email.description}
                </p>

                <div className="space-y-3">
                  <div>
                    <label className="mb-1 block text-xs text-slate-600">
                      {labels.settings.email.sendTime}
                    </label>
                    <input
                      type="time"
                      value={emailTime}
                      onChange={(e) => setEmailTime(e.target.value)}
                      className="w-full rounded border border-slate-300 px-3 py-2 text-sm focus:border-un-blue focus:ring-2 focus:ring-un-blue/20 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-xs text-slate-600">
                      {labels.settings.email.recipient}
                    </label>
                    <input
                      type="email"
                      value={emailAddress}
                      onChange={(e) => setEmailAddress(e.target.value)}
                      placeholder={labels.settings.email.recipientPlaceholder}
                      className="w-full rounded border border-slate-300 px-3 py-2 text-sm focus:border-un-blue focus:ring-2 focus:ring-un-blue/20 focus:outline-none"
                    />
                  </div>

                  <Button variant="outline" className="w-full" disabled>
                    {labels.settings.email.save}
                  </Button>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
