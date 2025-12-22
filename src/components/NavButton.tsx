"use client";

import Link from 'next/link';
import React, { ReactNode } from 'react';

interface NavButtonProps {
  href: string;
  children: ReactNode;
  className?: string;
  onClick?: () => void;
}

export default function NavButton({ href, children, className = '', onClick }: NavButtonProps) {
  return (
    <Link href={href} onClick={onClick} className={`inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition ${className}`}>
      {children}
    </Link>
  );
}
