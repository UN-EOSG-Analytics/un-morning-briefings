'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Menu, X, Home, PlusCircle, List, FileEdit, LogOut, User, Users, Settings } from 'lucide-react';
import { useState } from 'react';
import { signOut, useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import NavButton from './NavButton';
import { SettingsDialog } from './SettingsDialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const { data: session } = useSession();

  const userName = session?.user?.firstName && session?.user?.lastName
    ? `${session.user.firstName} ${session.user.lastName}`
    : session?.user?.name || 'User';
  
  const userTeam = session?.user?.team || 'Political Unit (EOSG)';
  const userEmail = session?.user?.email || '';

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-slate-200 bg-white">
      <div className="flex h-16 items-center justify-between px-4 sm:px-6 w-full max-w-6xl mx-auto">
        {/* Logo */}
        <div className="flex items-center gap-2">
        <Link href="/" className="flex items-center gap-2 sm:gap-3">
          <Image
            src="/images/UN_Logo_Stacked_Colour_English.svg"
            alt="UN Logo"
            width={300}
            height={64}
            className="h-8 w-auto sm:h-10"
            priority
          />
        </Link>
        {session && (
          <span className="hidden sm:flex ml-2 border border-slate-300 bg-slate-100 text-slate-700 text-xs font-semibold px-2 py-1 rounded-full items-center gap-1.5">
            <Users className="h-3 w-3" />
            {userTeam}
          </span>
        )}
        </div>

        {/* Desktop Menu */}
        {session && (
          <div className="hidden items-center gap-4 md:flex">
            <NavButton href="/" className="text-foreground hover:text-un-blue hover:bg-slate-50">
              <Home className="h-4 w-4 text-slate-600" />
              <span>Home</span>
            </NavButton>

            <NavButton href="/list" className="text-foreground hover:text-un-blue hover:bg-slate-50">
              <List className="h-4 w-4 text-slate-600" />
              <span>View Entries</span>
            </NavButton>

            <NavButton href="/drafts" className="text-foreground hover:text-un-blue hover:bg-slate-50">
              <FileEdit className="h-4 w-4 text-slate-600" />
              <span>My Drafts</span>
            </NavButton>

            <NavButton href="/form" className="bg-un-blue text-white hover:bg-un-blue/95">
              <PlusCircle className="h-4 w-4 text-white" />
              <span>New Entry</span>
            </NavButton>

            {/* User Account Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild suppressHydrationWarning>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-9 w-9 rounded-full p-0"
                >
                  <div className="h-8 w-8 rounded-full bg-slate-200 flex items-center justify-center">
                    <User className="h-4 w-4 text-slate-600" />
                  </div>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56" suppressHydrationWarning>
                <DropdownMenuLabel className="flex flex-col gap-1">
                  <span className="font-semibold text-sm">{userName}</span>
                  <span className="text-xs text-slate-600">{userEmail}</span>
                </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                className="cursor-pointer gap-2"
                onClick={() => setShowSettings(true)}
              >
                <Settings className="h-4 w-4" />
                <span>Settings</span>
              </DropdownMenuItem>
              <DropdownMenuItem 
                className="text-red-600 cursor-pointer gap-2"
                onClick={() => signOut({ callbackUrl: '/login' })}
              >
                <LogOut className="h-4 w-4" />
                <span>Logout</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}

        {/* Mobile Menu Button */}
        <div className="flex items-center gap-2 md:hidden">
          {/* User Account Menu - Mobile - Only show if logged in */}
          {session && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild suppressHydrationWarning>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-9 w-9 rounded-full p-0"
                >
                  <div className="h-8 w-8 rounded-full bg-slate-200 flex items-center justify-center">
                    <User className="h-4 w-4 text-slate-600" />
                  </div>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56" suppressHydrationWarning>
                <DropdownMenuLabel className="flex flex-col gap-1">
                  <span className="font-semibold text-sm">{userName}</span>
                  <span className="text-xs text-slate-600">{userEmail}</span>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  className="cursor-pointer gap-2"
                  onClick={() => setShowSettings(true)}
                >
                  <Settings className="h-4 w-4" />
                  <span>Settings</span>
                </DropdownMenuItem>
                <DropdownMenuItem 
                  className="text-red-600 cursor-pointer gap-2"
                  onClick={() => signOut({ callbackUrl: '/login' })}
                >
                  <LogOut className="h-4 w-4" />
                  <span>Logout</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          <button
            onClick={() => setIsOpen(!isOpen)}
            className="rounded p-2 hover:bg-slate-100"
            aria-label="Toggle menu"
          >
          {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {session && isOpen && (
        <div className="border-t border-slate-200 bg-white md:hidden">
          <div className="flex flex-col space-y-1 px-4 py-3">
            <Link
              href="/"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-2 rounded px-3 py-2 text-sm hover:bg-slate-50"
            >
              <Home className="h-4 w-4 text-slate-600" />
              <span>Home</span>
            </Link>
            <Link
              href="/list"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-2 rounded px-3 py-2 text-sm hover:bg-slate-50"
            >
              <List className="h-4 w-4 text-slate-600" />
              <span>View Entries</span>
            </Link>
            <Link
              href="/drafts"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-2 rounded px-3 py-2 text-sm hover:bg-slate-50"
            >
              <FileEdit className="h-4 w-4 text-slate-600" />
              <span>My Drafts</span>
            </Link>
            <Link
              href="/form"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-2 rounded bg-un-blue px-3 py-2 text-sm text-white hover:bg-un-blue/95"
            >
              <PlusCircle className="h-4 w-4" />
              <span>New Entry</span>
            </Link>
          </div>
        </div>
      )}

      {/* Settings Dialog */}
      <SettingsDialog open={showSettings} onOpenChange={setShowSettings} />
    </nav>
  );
}
