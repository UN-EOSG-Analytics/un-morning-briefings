"use client";

import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import React, { ReactNode } from 'react';
import { useUnsavedChanges } from '@/lib/unsaved-changes-context';

interface NavButtonProps {
  href: string;
  children: ReactNode;
  className?: string;
  onClick?: () => void;
}

export default function NavButton({ href, children, className = '', onClick }: NavButtonProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { confirmNavigation } = useUnsavedChanges();

  const handleClick = async (e: React.MouseEvent<HTMLAnchorElement>) => {
    // Don't prevent if already on the target page
    if (pathname === href) {
      return;
    }

    e.preventDefault();
    
    const confirmed = await confirmNavigation();
    if (confirmed) {
      if (onClick) {
        onClick();
      }
      router.push(href);
    }
  };

  return (
    <Link href={href} onClick={handleClick} className={`inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition ${className}`}>
      {children}
    </Link>
  );
}
