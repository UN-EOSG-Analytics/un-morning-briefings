'use client';

import { useState, useRef } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { Settings, Trash2, AlertTriangle, Check, X, Download, Upload } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { usePopup } from '@/lib/popup-context';

interface SettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SettingsDialog({ open, onOpenChange }: SettingsDialogProps) {
  const { data: session, update: updateSession } = useSession();
  const { success: showSuccess, warning: showWarning } = usePopup();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState('');
  const [isEditingName, setIsEditingName] = useState(false);
  const [firstName, setFirstName] = useState(session?.user?.firstName || '');
  const [lastName, setLastName] = useState(session?.user?.lastName || '');
  const [isSavingName, setIsSavingName] = useState(false);
  const [isCreatingBackup, setIsCreatingBackup] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);


  const handleDeleteAccount = async () => {
    if (!session?.user?.email) return;

    setIsDeleting(true);
    setError('');

    try {
      const response = await fetch('/api/user/delete', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete account');
      }

      // Account deleted successfully - sign out and redirect
      await signOut({ callbackUrl: '/login?deleted=true' });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      setIsDeleting(false);
    }
  };

  const handleSaveName = async () => {
    if (!firstName.trim() || !lastName.trim()) {
      setError('First and last name are required');
      return;
    }

    setIsSavingName(true);
    setError('');

    try {
      const response = await fetch('/api/user/update-name', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          firstName: firstName.trim(),
          lastName: lastName.trim(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update name');
      }

      // Update the session with new name
      await updateSession({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
      });

      setIsEditingName(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsSavingName(false);
    }
  };

  const handleCreateBackup = async () => {
    setIsCreatingBackup(true);
    setError('');

    try {
      const response = await fetch('/api/entries');

      if (!response.ok) {
        throw new Error('Failed to fetch entries');
      }

      const data = await response.json();

      // Create backup object with metadata
      const backup = {
        version: '1.0',
        timestamp: new Date().toISOString(),
        user: session?.user?.email,
        entries: Array.isArray(data) ? data : [],
      };

      // Convert to JSON string
      const jsonString = JSON.stringify(backup, null, 2);
      
      // Create blob and download
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `un-briefings-backup-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create backup');
    } finally {
      setIsCreatingBackup(false);
    }
  };

  const handleImportBackup = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    setError('');

    try {
      // Read the file
      const fileContent = await file.text();
      const backup = JSON.parse(fileContent);

      // Validate backup structure
      if (!backup.entries || !Array.isArray(backup.entries)) {
        throw new Error('Invalid backup file format');
      }

      // Send to API for import
      const response = await fetch('/api/entries/import', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ entries: backup.entries }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to import entries');
      }

      // Show success message
      showSuccess(
        'Import Successful',
        `Imported ${result.imported} entries. ${result.skipped} duplicates were skipped.`
      );
      
      // Close dialog after successful import
      setTimeout(() => {
        onOpenChange(false);
      }, 1000);
      
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to import backup';
      setError(errorMsg);
      showWarning('Import Failed', errorMsg);
    } finally {
      setIsImporting(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Account Settings
          </DialogTitle>
          <DialogDescription>
            Manage your account preferences and settings
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Account Information */}
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-slate-900">Account Information</h3>
            <div className="bg-slate-50 rounded-lg p-4 space-y-3">
              <div>
                <p className="text-xs text-slate-600">Email</p>
                <p className="text-sm font-medium">{session?.user?.email}</p>
              </div>

              {/* Name Section - Edit Mode */}
              {isEditingName ? (
                <div className="space-y-2 bg-white border border-slate-200 rounded p-3">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-xs text-slate-600">First Name</label>
                      <input
                        type="text"
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        placeholder="First name"
                        className="mt-1 w-full rounded border border-slate-300 px-2 py-1 text-sm focus:border-un-blue focus:outline-none focus:ring-2 focus:ring-un-blue/20"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-slate-600">Last Name</label>
                      <input
                        type="text"
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        placeholder="Last name"
                        className="mt-1 w-full rounded border border-slate-300 px-2 py-1 text-sm focus:border-un-blue focus:outline-none focus:ring-2 focus:ring-un-blue/20"
                      />
                    </div>
                  </div>
                  {error && (
                    <p className="text-xs text-red-600 font-medium">{error}</p>
                  )}
                  <div className="flex gap-2 pt-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setIsEditingName(false);
                        setFirstName(session?.user?.firstName || '');
                        setLastName(session?.user?.lastName || '');
                        setError('');
                      }}
                      disabled={isSavingName}
                      className="flex-1"
                    >
                      <X className="h-4 w-4 mr-1" />
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      onClick={handleSaveName}
                      disabled={isSavingName}
                      className="flex-1 bg-un-blue hover:bg-un-blue/90"
                    >
                      <Check className="h-4 w-4 mr-1" />
                      {isSavingName ? 'Saving...' : 'Save'}
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
                    Edit
                  </Button>
                </div>
              )}

              <div>
                <p className="text-xs text-slate-600">Team</p>
                <p className="text-sm font-medium">{session?.user?.team}</p>
              </div>
            </div>
          </div>

          {/* Backup Section */}
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-slate-900">Data Management</h3>
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="outline"
                onClick={handleCreateBackup}
                disabled={isCreatingBackup}
              >
                <Download className="h-4 w-4 mr-2" />
                {isCreatingBackup ? 'Creating...' : 'Backup'}
              </Button>
              <Button
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                disabled={isImporting}
              >
                <Upload className="h-4 w-4 mr-2" />
                {isImporting ? 'Importing...' : 'Import'}
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
              Download all entries as JSON backup or import a backup file to restore entries.
            </p>
          </div>

          {/* Delete Account Section */}
          <div className="space-y-2">            
            {!showDeleteConfirm ? (
              <Button
                variant="outline"
                className="w-full text-red-600 border-red-200 hover:bg-red-50"
                onClick={() => setShowDeleteConfirm(true)}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Account
              </Button>
            ) : (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 space-y-3">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-red-900">
                      Are you absolutely sure?
                    </p>
                    <p className="text-xs text-red-700">
                      This action cannot be undone. This will delete your account for the UN Morning Briefing Tool and remove all of your drafts from our servers.
                    </p>
                  </div>
                </div>
                
                {error && (
                  <p className="text-xs text-red-600 font-medium">{error}</p>
                )}

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setShowDeleteConfirm(false);
                      setError('');
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
                    {isDeleting ? 'Deleting...' : 'Yes, delete my account'}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
