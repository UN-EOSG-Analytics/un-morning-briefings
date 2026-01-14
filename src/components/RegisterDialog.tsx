'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { AlertCircle, CheckCircle2, Mail } from 'lucide-react';
import { SelectField } from '@/components/SelectField';
import { TEAMS } from '@/lib/teams';

interface RegisterDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function RegisterDialog({ open, onOpenChange }: RegisterDialogProps) {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    firstName: '',
    lastName: '',
    team: '',
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validate fields
    if (!formData.email.endsWith('@un.org')) {
      setError('Please use a valid @un.org email address');
      return;
    }

    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters long');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (!formData.firstName || !formData.lastName || !formData.team) {
      setError('All fields are required');
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
          firstName: formData.firstName,
          lastName: formData.lastName,
          team: formData.team,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Registration failed');
        return;
      }

      setSuccess(true);
    } catch (err) {
      setError('An error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setFormData({
      email: '',
      password: '',
      confirmPassword: '',
      firstName: '',
      lastName: '',
      team: '',
    });
    setError('');
    setSuccess(false);
    onOpenChange(false);
  };

  if (success) {
    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center justify-center mb-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
                <CheckCircle2 className="h-10 w-10 text-green-600" />
              </div>
            </div>
            <DialogTitle className="text-center text-xl">Check Your Email</DialogTitle>
            <DialogDescription className="text-center">
              We've sent a verification link to <strong>{formData.email}</strong>
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="flex items-start gap-3 rounded-md bg-blue-50 p-4">
              <Mail className="h-5 w-5 text-blue-600 mt-0.5" />
              <div className="text-sm text-slate-700">
                <p className="font-medium mb-1">Please verify your email</p>
                <p className="text-slate-600">
                  Click the link in the email we sent you to activate your account. The link will expire in 24 hours.
                </p>
              </div>
            </div>
            <Button onClick={handleClose} className="w-full bg-un-blue hover:bg-un-blue/90">
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-left">Create Account</DialogTitle>
          <DialogDescription className="text-left">
            Register with your @un.org email address
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="flex items-start gap-2 rounded-md bg-red-50 p-3 text-sm text-red-800">
              <AlertCircle className="h-4 w-4 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium text-slate-700">First Name</label>
              <input
                type="text"
                required
                value={formData.firstName}
                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-un-blue focus:outline-none focus:ring-2 focus:ring-un-blue/20"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700">Last Name</label>
              <input
                type="text"
                required
                value={formData.lastName}
                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-un-blue focus:outline-none focus:ring-2 focus:ring-un-blue/20"
              />
            </div>
          </div>
            <label className="text-sm font-medium text-slate-700">Email Address</label>
            <input
              type="email"
              required
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="your.name@un.org"
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-un-blue focus:outline-none focus:ring-2 focus:ring-un-blue/20"
            />
          <div>
            <div className="mt-1">
              <SelectField
                label="Team"
                placeholder="Select a team..."
                value={formData.team}
                onValueChange={(value) => setFormData({ ...formData, team: value })}
                options={TEAMS}
                required={true}
                className="w-full block"
              />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-slate-700">Password</label>
            <input
              type="password"
              required
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              placeholder="Minimum 8 characters"
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-un-blue focus:outline-none focus:ring-2 focus:ring-un-blue/20"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-slate-700">Confirm Password</label>
            <input
              type="password"
              required
              value={formData.confirmPassword}
              onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-un-blue focus:outline-none focus:ring-2 focus:ring-un-blue/20"
            />
          </div>

          <div className="flex gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              className="flex-1"
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="flex-1 bg-un-blue hover:bg-un-blue/90"
              disabled={isLoading}
            >
              {isLoading ? 'Creating Account...' : 'Create Account'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
