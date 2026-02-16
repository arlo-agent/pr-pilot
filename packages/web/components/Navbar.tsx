'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const links = [
  { href: '/dashboard', label: 'Overview' },
  { href: '/dashboard/duplicates', label: 'Duplicates' },
  { href: '/dashboard/rankings', label: 'Rankings' },
  { href: '/dashboard/vision', label: 'Vision' },
];

export function Navbar() {
  const pathname = usePathname();
  return (
    <nav className="bg-gray-900 border-b border-gray-800 px-6 py-3 flex items-center gap-6">
      <Link href="/" className="text-lg font-bold text-white mr-4">🚀 PR Pilot</Link>
      {links.map(l => (
        <Link
          key={l.href}
          href={l.href}
          className={`text-sm ${pathname === l.href ? 'text-white font-semibold' : 'text-gray-400 hover:text-gray-200'}`}
        >
          {l.label}
        </Link>
      ))}
    </nav>
  );
}
