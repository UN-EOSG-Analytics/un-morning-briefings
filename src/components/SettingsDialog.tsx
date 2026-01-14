'use client';

import { useState } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { Settings, Trash2, AlertTriangle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';

interface SettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SettingsDialog({ open, onOpenChange }: SettingsDialogProps) {
  const { data: session } = useSession();
  const router = useRouter();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState('');

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
            <div className="bg-slate-50 rounded-lg p-4 space-y-2">
              <div>
                <p className="text-xs text-slate-600">Email</p>
                <p className="text-sm font-medium">{session?.user?.email}</p>
              </div>
              <div>
                <p className="text-xs text-slate-600">Name</p>
                <p className="text-sm font-medium">
                  {session?.user?.firstName} {session?.user?.lastName}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-600">Team</p>
                <p className="text-sm font-medium">{session?.user?.team}</p>
              </div>
            </div>
          </div>

          {/* Delete Account Section */}
          <div className="space-y-3 pt-4 border-t border-slate-200">
            <h3 className="text-sm font-semibold text-slate-900">Danger Zone</h3>
            
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
                      This action cannot be undone. This will permanently delete your account
                      and remove all of your data from our servers.
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
