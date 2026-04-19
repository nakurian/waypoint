import Link from 'next/link';
import { Compass } from 'lucide-react';

export function SiteHeader() {
  return (
    <header className="dark bg-waypoint-navy text-primary-foreground">
      <div className="container flex h-14 items-center justify-between">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <Compass className="h-5 w-5 text-waypoint-cyan" aria-hidden />
          <span>Waypoint</span>
        </Link>
        <nav className="flex items-center gap-6 text-sm">
          <Link href="/phase/00" className="hover:text-waypoint-cyan">Docs</Link>
          <Link href="/packs/compare" className="hover:text-waypoint-cyan">Packs</Link>
          <Link href="/install" className="hover:text-waypoint-cyan">Install</Link>
          <Link href="/about" className="hover:text-waypoint-cyan">About</Link>
        </nav>
      </div>
    </header>
  );
}
