'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Menu, X } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';

const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';

export function Navbar() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-slate-200 bg-white">
      <div className="flex h-16 items-center justify-between px-4 sm:px-6 w-full max-w-5xl mx-auto">
        {/* Logo */}
        <div className="flex items-center">
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
        
        </div>

        {/* Desktop Menu */}
        <div className="hidden items-center gap-6 md:flex">
          <Link
            href="/"
            className="text-sm font-medium text-foreground hover:text-un-blue transition-colors"
          >
            Home
          </Link>
          <Link
            href="/form"
            className="text-sm font-medium text-foreground hover:text-un-blue transition-colors"
          >
            New Entry
          </Link>
          <Link
            href="/list"
            className="text-sm font-medium text-foreground hover:text-un-blue transition-colors"
          >
            View Entries
          </Link>
        </div>

        {/* Mobile Menu Button */}
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="md:hidden h-8 w-8 p-0"
          onClick={() => setIsOpen(!isOpen)}
        >
          {isOpen ? (
            <X className="h-5 w-5" />
          ) : (
            <Menu className="h-5 w-5" />
          )}
        </Button>
      </div>

      {/* Mobile Menu */}
      {isOpen && (
        <div className="border-t border-slate-200 bg-white md:hidden">
          <div className="space-y-1 px-4 py-2 sm:px-6">
            <Link
              href="/"
              onClick={() => setIsOpen(false)}
              className="block px-3 py-2 text-sm font-medium text-foreground hover:text-un-blue hover:bg-slate-50 rounded transition-colors"
            >
              Home
            </Link>
            <Link
              href="/form"
              onClick={() => setIsOpen(false)}
              className="block px-3 py-2 text-sm font-medium text-foreground hover:text-un-blue hover:bg-slate-50 rounded transition-colors"
            >
              New Entry
            </Link>
            <Link
              href="/list"
              onClick={() => setIsOpen(false)}
              className="block px-3 py-2 text-sm font-medium text-foreground hover:text-un-blue hover:bg-slate-50 rounded transition-colors"
            >
              View Entries
            </Link>
          </div>
        </div>
      )}
    </nav>
  );
}
