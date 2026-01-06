'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Menu, X, Home, PlusCircle, List, FileEdit, LogOut, User, Zap, Info } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import NavButton from './NavButton';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';

export function Navbar() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-slate-200 bg-white">
      <div className="flex h-16 items-center justify-between px-4 sm:px-6 w-full max-w-6xl mx-auto">
        {/* Logo */}
        <div className="flex items-center gap-2">
        <Link href="/" className="flex items-center gap-3">
          <Image
            src={`${basePath}/images/UN_Logo_Stacked_Colour_English.svg`}
            alt="UN Logo"
            width={300}
            height={64}
            className="h-10 w-auto"
            priority
          />
        </Link>
        <span className="ml-2 border border-slate-300 bg-slate-100 text-slate-700 text-xs font-semibold px-2 py-1 rounded-full flex items-center gap-1.5">
          <Info className="h-3 w-3" />
          Beta
        </span>
        </div>

        {/* Desktop Menu */}
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
            <DropdownMenuTrigger asChild>
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
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel className="flex flex-col gap-1">
                <span className="font-semibold text-sm">John Doe</span>
                <span className="text-xs text-slate-600">Political Unit EOSG</span>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-red-600 cursor-pointer gap-2">
                <LogOut className="h-4 w-4" />
                <span>Logout</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

      </div>

 
    </nav>
  );
}
