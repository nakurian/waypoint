import Link from 'next/link';
import { Compass } from 'lucide-react';

export function SiteHeader() {
  return (
    <header className="dark bg-waypoint-navy text-primary-foreground border-b border-white/10">
      <div className="container flex h-14 items-center justify-between">
        <Link
          href="/"
          className="flex items-center gap-2 font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-waypoint-cyan rounded-sm"
        >
          <Compass className="h-5 w-5 text-waypoint-cyan" aria-hidden />
          <span>Waypoint</span>
        </Link>
        <nav className="flex items-center gap-6 text-base font-medium">
          <Link
            href="/phase/00"
            className="font-semibold hover:text-waypoint-cyan focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-waypoint-cyan rounded-sm"
          >
            Docs
          </Link>
          <Link
            href="/packs/compare"
            className="hover:text-waypoint-cyan focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-waypoint-cyan rounded-sm"
          >
            Packs
          </Link>
          <Link
            href="/install"
            className="hover:text-waypoint-cyan focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-waypoint-cyan rounded-sm"
          >
            Install
          </Link>
          <Link
            href="/about"
            className="hover:text-waypoint-cyan focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-waypoint-cyan rounded-sm"
          >
            About
          </Link>
        </nav>
      </div>
    </header>
  );
}
