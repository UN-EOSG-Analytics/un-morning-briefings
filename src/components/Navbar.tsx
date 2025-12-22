'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Menu, X, Home, PlusCircle, List } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import NavButton from './NavButton';

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
        <div className="hidden items-center gap-4 md:flex">
          <NavButton href="/" className="text-foreground hover:text-un-blue hover:bg-slate-50">
            <Home className="h-4 w-4 text-slate-600" />
            <span>Home</span>
          </NavButton>

          <NavButton href="/list" className="text-foreground hover:text-un-blue hover:bg-slate-50">
            <List className="h-4 w-4 text-slate-600" />
            <span>View Entries</span>
          </NavButton>

          <NavButton href="/form" className="bg-un-blue text-white hover:bg-un-blue/95">
            <PlusCircle className="h-4 w-4 text-white" />
            <span>New Entry</span>
          </NavButton>

          
        </div>

      </div>

 
    </nav>
  );
}
