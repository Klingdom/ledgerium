'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useState, useEffect, useRef } from 'react';
import { Menu, X, ArrowRight, ChevronDown } from 'lucide-react';
import { LogoFull } from '@/components/shared/LogoMark';
import { ThemeToggle } from '@/components/shared/ThemeToggle';
import { track } from '@/lib/analytics';
import {
  TOP_NAV,
  MENU_PREFIXES,
  type NavMenu,
  type NavLeaf,
  type NavMenuId,
} from '@/components/nav/navConfig';

const SIGNUP = '/signup';

/** Prefix-aware active match (guards against `/productfoo` false positives). */
function matchPrefix(pathname: string, prefix: string): boolean {
  if (prefix.endsWith('/')) return pathname.startsWith(prefix);
  return pathname === prefix || pathname.startsWith(prefix + '/');
}

export function PublicNav() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [openMenu, setOpenMenu] = useState<NavMenuId | null>(null);
  const [mobileExpanded, setMobileExpanded] = useState<Set<NavMenuId>>(new Set());

  // Hydration gate: server HTML + first client paint render the logged-out CTAs.
  // Switch to authenticated state only after mount (prevents #418). The nav LINKS
  // are not auth-gated — they render identically on server and client so the
  // mega-menu markup is crawlable and hydration-stable.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const isAuthenticated = mounted && !!session?.user;

  const headerRef = useRef<HTMLElement | null>(null);
  const triggerRefs = useRef<Partial<Record<NavMenuId, HTMLButtonElement | null>>>({});
  const panelRefs = useRef<Partial<Record<NavMenuId, HTMLDivElement | null>>>({});

  // Close everything on route change (the nav is mounted once and never remounts).
  useEffect(() => {
    setOpenMenu(null);
    setMobileOpen(false);
  }, [pathname]);

  // Outside-click closes the open desktop panel.
  useEffect(() => {
    if (!openMenu) return;
    function onPointerDown(e: MouseEvent) {
      if (headerRef.current && !headerRef.current.contains(e.target as Node)) {
        setOpenMenu(null);
      }
    }
    document.addEventListener('mousedown', onPointerDown);
    return () => document.removeEventListener('mousedown', onPointerDown);
  }, [openMenu]);

  // Escape closes and returns focus to the trigger.
  useEffect(() => {
    if (!openMenu) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        const id = openMenu;
        setOpenMenu(null);
        if (id) triggerRefs.current[id]?.focus();
      }
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [openMenu]);

  // On open, move focus to the first link in the panel (keyboard operability).
  useEffect(() => {
    if (!openMenu) return;
    panelRefs.current[openMenu]?.querySelector<HTMLAnchorElement>('a')?.focus();
  }, [openMenu]);

  // Lock body scroll while the mobile drawer is open.
  useEffect(() => {
    if (!mobileOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [mobileOpen]);

  function toggleMenu(menu: NavMenu, device: 'desktop' | 'mobile') {
    setOpenMenu((cur) => {
      const next = cur === menu.id ? null : menu.id;
      if (next) track({ event: 'nav_menu_opened', menu: menu.id, device });
      return next;
    });
  }

  function fireLink(
    leaf: NavLeaf,
    group: 'top_level' | 'solutions' | 'resources',
    column: NavLeafColumn,
    interactionPath: 'direct' | 'via_menu',
    device: 'desktop' | 'mobile',
  ) {
    track({ event: 'nav_link_clicked', item: leaf.id, href: leaf.href, group, column, interactionPath, device });
  }

  function isMenuActive(menu: NavMenu): boolean {
    return MENU_PREFIXES[menu.id].some((p) => matchPrefix(pathname, p));
  }

  return (
    <header
      ref={headerRef}
      className="sticky top-0 z-40 border-b border-[var(--border-default)] bg-[var(--surface-elevated)]/95 backdrop-blur-sm"
    >
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6">
        {/* Logo */}
        <Link href="/" className="flex items-center" aria-label="Ledgerium home">
          <LogoFull size={24} />
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-0.5" aria-label="Primary">
          {TOP_NAV.map((item) =>
            item.kind === 'link' ? (
              <Link
                key={item.id}
                href={item.href}
                aria-current={matchPrefix(pathname, item.href) ? 'page' : undefined}
                onClick={() =>
                  track({ event: 'nav_link_clicked', item: item.id, href: item.href, group: 'top_level', column: null, interactionPath: 'direct', device: 'desktop' })
                }
                className={navLinkClass(matchPrefix(pathname, item.href))}
              >
                {item.label}
              </Link>
            ) : (
              <div key={item.id} className="static">
                <button
                  type="button"
                  ref={(el) => {
                    triggerRefs.current[item.id] = el;
                  }}
                  aria-haspopup="true"
                  aria-expanded={openMenu === item.id}
                  aria-controls={`nav-panel-${item.id}`}
                  aria-current={isMenuActive(item) ? 'page' : undefined}
                  onClick={() => toggleMenu(item, 'desktop')}
                  className={`${navLinkClass(isMenuActive(item) || openMenu === item.id)} cursor-pointer`}
                >
                  {item.label}
                  <ChevronDown className={`h-3.5 w-3.5 transition-transform ${openMenu === item.id ? 'rotate-180' : ''}`} />
                </button>
                {/* Panel: always rendered (crawlable), CSS-hidden when closed. */}
                <div
                  id={`nav-panel-${item.id}`}
                  ref={(el) => {
                    panelRefs.current[item.id] = el;
                  }}
                  hidden={openMenu !== item.id}
                  aria-label={`${item.label} menu`}
                  className="absolute left-0 right-0 top-14 border-b border-[var(--border-default)] bg-[var(--surface-elevated)] shadow-xl motion-safe:transition-opacity"
                >
                  <div className="mx-auto max-w-6xl px-4 sm:px-6 py-7">
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-x-8 gap-y-6">
                      {item.columns.map((col) => (
                        <div key={col.column}>
                          <h3 className="text-[11px] font-semibold text-[var(--content-tertiary)] uppercase tracking-widest mb-3">
                            {col.heading}
                          </h3>
                          <ul className="space-y-1.5">
                            {col.items.map((leaf) => (
                              <li key={leaf.id}>
                                <PanelLink
                                  leaf={leaf}
                                  onClick={() => fireLink(leaf, item.id, col.column, 'via_menu', 'desktop')}
                                />
                              </li>
                            ))}
                            {col.viewAll && (
                              <li>
                                <Link
                                  href={col.viewAll.href}
                                  onClick={() => fireLink(col.viewAll!, item.id, col.column, 'via_menu', 'desktop')}
                                  className="inline-flex items-center gap-1 text-sm font-medium text-brand-500 hover:text-brand-400 mt-1"
                                >
                                  {col.viewAll.label}
                                  <ArrowRight className="h-3.5 w-3.5" />
                                </Link>
                              </li>
                            )}
                          </ul>
                        </div>
                      ))}
                    </div>
                    {item.footerLink && (
                      <div className="mt-6 pt-5 border-t border-[var(--border-subtle)]">
                        <Link
                          href={item.footerLink.href}
                          onClick={() => fireLink(item.footerLink!, item.id, null, 'via_menu', 'desktop')}
                          className="inline-flex items-center gap-1.5 text-sm font-medium text-[var(--content-secondary)] hover:text-[var(--content-primary)]"
                        >
                          {item.footerLink.label}
                          <ArrowRight className="h-3.5 w-3.5" />
                        </Link>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ),
          )}
        </nav>

        {/* Auth CTAs + Theme toggle */}
        <div className="hidden md:flex items-center gap-2">
          <ThemeToggle />
          {isAuthenticated ? (
            <Link href="/dashboard" className="btn-primary text-sm gap-1.5">
              Go to app
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          ) : (
            <>
              <Link
                href="/login"
                onClick={() => track({ event: 'nav_link_clicked', item: 'sign_in', href: '/login', group: 'top_level', column: null, interactionPath: 'direct', device: 'desktop' })}
                className="rounded-lg px-3 py-2 text-sm font-medium text-[var(--content-secondary)] hover:text-[var(--content-primary)] transition-colors"
              >
                Sign in
              </Link>
              <Link
                href={SIGNUP}
                onClick={() => track({ event: 'cta_clicked', location: 'nav_cta', destination: SIGNUP })}
                className="btn-primary text-sm"
              >
                Start free
              </Link>
            </>
          )}
        </div>

        {/* Mobile menu button */}
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="md:hidden rounded-lg p-2 text-[var(--content-secondary)] hover:bg-[var(--surface-secondary)]"
          aria-label="Toggle menu"
          aria-expanded={mobileOpen}
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden border-t border-[var(--border-subtle)] bg-[var(--surface-elevated)] shadow-lg flex flex-col max-h-[calc(100dvh-3.5rem)]">
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-1">
            {TOP_NAV.map((item) =>
              item.kind === 'link' ? (
                <Link
                  key={item.id}
                  href={item.href}
                  onClick={() => track({ event: 'nav_link_clicked', item: item.id, href: item.href, group: 'top_level', column: null, interactionPath: 'direct', device: 'mobile' })}
                  className={mobileRowClass(matchPrefix(pathname, item.href))}
                >
                  {item.label}
                </Link>
              ) : (
                <MobileSection
                  key={item.id}
                  menu={item}
                  expanded={mobileExpanded.has(item.id)}
                  onToggle={() => {
                    setMobileExpanded((cur) => {
                      const next = new Set(cur);
                      if (next.has(item.id)) next.delete(item.id);
                      else {
                        next.add(item.id);
                        track({ event: 'nav_menu_opened', menu: item.id, device: 'mobile' });
                      }
                      return next;
                    });
                  }}
                  onLink={(leaf, column) => fireLink(leaf, item.id, column, 'via_menu', 'mobile')}
                />
              ),
            )}
          </div>
          {/* Pinned CTA */}
          <div className="border-t border-[var(--border-subtle)] p-4 space-y-2 bg-[var(--surface-elevated)]">
            {isAuthenticated ? (
              <Link href="/dashboard" className="block btn-primary text-sm text-center">Go to app</Link>
            ) : (
              <>
                <Link
                  href={SIGNUP}
                  onClick={() => track({ event: 'cta_clicked', location: 'nav_cta', destination: SIGNUP })}
                  className="block btn-primary text-sm text-center"
                >
                  Start free
                </Link>
                <Link
                  href="/login"
                  onClick={() => track({ event: 'nav_link_clicked', item: 'sign_in', href: '/login', group: 'top_level', column: null, interactionPath: 'direct', device: 'mobile' })}
                  className="block rounded-lg px-3 py-2.5 text-sm font-medium text-center text-[var(--content-secondary)]"
                >
                  Sign in
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}

type NavLeafColumn =
  | 'popular' | 'by_role' | 'by_department' | 'by_industry'
  | 'templates_guides' | 'software' | 'learn' | 'company'
  | null;

function navLinkClass(active: boolean): string {
  return `rounded-lg px-3 py-2 text-sm font-medium transition-colors inline-flex items-center gap-1 ${
    active
      ? 'text-brand-400 bg-brand-900/30'
      : 'text-[var(--content-secondary)] hover:text-[var(--content-primary)] hover:bg-[var(--surface-secondary)]'
  } focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500`;
}

function mobileRowClass(active: boolean): string {
  return `rounded-lg px-3 py-2.5 text-sm font-medium flex items-center gap-2 ${
    active ? 'text-brand-400 bg-brand-900/30' : 'text-[var(--content-secondary)] hover:bg-[var(--surface-secondary)]'
  }`;
}

function PanelLink({ leaf, onClick }: { leaf: NavLeaf; onClick: () => void }) {
  return (
    <Link
      href={leaf.href}
      onClick={onClick}
      className="group inline-flex items-center gap-2 text-sm text-[var(--content-secondary)] hover:text-[var(--content-primary)] rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500"
    >
      {leaf.label}
      {leaf.badge && (
        <span className="text-[10px] font-semibold uppercase tracking-wide text-brand-500 bg-brand-900/30 border border-brand-700/30 rounded px-1.5 py-0.5">
          {leaf.badge}
        </span>
      )}
    </Link>
  );
}

/** Mobile accordion section. Solutions is curated to hub links to avoid a wall. */
function MobileSection({
  menu,
  expanded,
  onToggle,
  onLink,
}: {
  menu: NavMenu;
  expanded: boolean;
  onToggle: () => void;
  onLink: (leaf: NavLeaf, column: NavLeafColumn) => void;
}) {
  // On mobile, Solutions shows only the 3 Popular items + the 3 dimensional
  // hub "View all" links (6 total), not every leaf (spec §8).
  const groups =
    menu.id === 'solutions'
      ? [
          { heading: 'Popular use cases', column: 'popular' as const, items: menu.columns[0]?.items ?? [] },
          {
            heading: 'Browse',
            column: null,
            items: menu.columns.slice(1).map((c) => c.viewAll!).filter(Boolean),
          },
        ]
      : menu.columns.map((c) => ({
          heading: c.heading,
          column: c.column,
          items: [...c.items, ...(c.viewAll ? [c.viewAll] : [])],
        }));

  return (
    <div>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={expanded}
        className="w-full rounded-lg px-3 py-2.5 text-sm font-medium flex items-center justify-between text-[var(--content-secondary)] hover:bg-[var(--surface-secondary)]"
      >
        {menu.label}
        <ChevronDown className={`h-4 w-4 transition-transform ${expanded ? 'rotate-180' : ''}`} />
      </button>
      {expanded && (
        <div className="pl-3 pb-2 space-y-3">
          {groups.map((g, i) => (
            <div key={g.heading + i}>
              <p className="text-[11px] font-semibold text-[var(--content-tertiary)] uppercase tracking-widest px-3 mb-1.5">
                {g.heading}
              </p>
              <ul>
                {g.items.map((leaf) => (
                  <li key={leaf.id}>
                    <Link
                      href={leaf.href}
                      onClick={() => onLink(leaf, (g.column as NavLeafColumn) ?? null)}
                      className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-[var(--content-secondary)] hover:bg-[var(--surface-secondary)]"
                    >
                      {leaf.label}
                      {leaf.badge && (
                        <span className="text-[10px] font-semibold uppercase text-brand-500">{leaf.badge}</span>
                      )}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
