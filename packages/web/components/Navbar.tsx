'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAnalysis } from '@/lib/context';

const links = [
  { href: '/dashboard', label: 'Overview' },
  { href: '/dashboard/duplicates', label: 'Duplicates' },
  { href: '/dashboard/rankings', label: 'Rankings' },
  { href: '/dashboard/vision', label: 'Vision' },
];

export function Navbar() {
  const pathname = usePathname();
  const { data } = useAnalysis();

  return (
    <nav className="bg-gray-900 border-b border-gray-800 px-6 py-3 flex items-center gap-6 flex-wrap">
      <Link href="/" className="text-lg font-bold text-white mr-2">🚀 PR Pilot</Link>
      {data && (
        <span className="text-xs text-gray-500 mr-4">
          {data.repo} · {new Date(data.analyzedAt).toLocaleString()}
        </span>
      )}
      <div className="flex gap-4">
        {links.map(l => (
          <Link
            key={l.href}
            href={l.href}
            className={`text-sm ${pathname === l.href ? 'text-white font-semibold' : 'text-gray-400 hover:text-gray-200'}`}
          >
            {l.label}
          </Link>
        ))}
      </div>
    </nav>
  );
}
