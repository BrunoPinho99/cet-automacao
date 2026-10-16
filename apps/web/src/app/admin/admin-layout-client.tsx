'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { OnboardingModal } from './onboarding-modal';

interface AdminLayoutClientProps {
  session: {
    userId: string;
    role: string;
    email: string;
  } | null;
  children: React.ReactNode;
}

const ICON_PROPS = {
  className: 'w-5 h-5 shrink-0',
  fill: 'none',
  viewBox: '0 0 24 24',
  stroke: 'currentColor',
  strokeWidth: 1.7,
} as const;

const navSections = [
  {
    group: 'Atendimento',
    items: [
      {
        name: 'Clientes',
        href: '/admin',
        icon: (
          <svg {...ICON_PROPS}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        ),
      },
      {
        name: 'Conversas',
        href: '/admin/atendimento',
        icon: (
          <svg {...ICON_PROPS}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h8M8 14h5m-9 6l1.4-3.7A8 8 0 1112 20a8.9 8.9 0 01-4-.9L4 20z" />
          </svg>
        ),
      },
      {
        name: 'Conectar WhatsApp',
        href: '/admin/whatsapp',
        icon: (
          <svg {...ICON_PROPS}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
          </svg>
        ),
      },
    ],
  },
  {
    group: 'Gestão',
    items: [
      {
        name: 'Relatórios',
        href: '/admin/paineis',
        icon: (
          <svg {...ICON_PROPS}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 20V10m6 10V4m6 16v-7m4 7H2" />
          </svg>
        ),
      },
      {
        name: 'Status do sistema',
        href: '/admin/saude',
        icon: (
          <svg {...ICON_PROPS}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        ),
      },
      {
        name: 'Envios com falha',
        href: '/admin/eventos/mortos',
        icon: (
          <svg {...ICON_PROPS}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01M10.3 3.9L2.4 18a2 2 0 001.7 3h15.8a2 2 0 001.7-3L13.7 3.9a2 2 0 00-3.4 0z" />
          </svg>
        ),
      },
    ],
  },
];

function NavList({ pathname, onNavigate }: { pathname: string; onNavigate?: () => void }) {
  return (
    <nav className="space-y-6">
      {navSections.map((sec) => (
        <div key={sec.group}>
          <div className="px-3 mb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            {sec.group}
          </div>
          <ul className="space-y-0.5">
            {sec.items.map((item) => {
              const isActive = pathname === item.href;
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={onNavigate}
                    className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors ${
                      isActive
                        ? 'bg-soft-lavender text-royal font-semibold'
                        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                    }`}
                  >
                    <span className={isActive ? 'text-royal' : 'text-slate-400'}>{item.icon}</span>
                    <span>{item.name}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}

export function AdminLayoutClient({ session, children }: AdminLayoutClientProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [tutorialOpen, setTutorialOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const pathname = usePathname();

  const handleLogout = async () => {
    if (loggingOut) return;
    setLoggingOut(true);
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } finally {
      window.location.href = '/login';
    }
  };

  const initials = session?.email
    ? session.email.slice(0, 2).toUpperCase()
    : 'AD';

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col">
      <OnboardingModal forceOpen={tutorialOpen} onClose={() => setTutorialOpen(false)} />

      {/* CABEÇALHO CORPORATIVO */}
      <header className="sticky top-0 z-30 h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 sm:px-6">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setMobileMenuOpen(true)}
            className="lg:hidden p-2 -ml-2 text-slate-600 hover:bg-slate-100 rounded-md"
            aria-label="Abrir menu"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>

          <Link href="/admin" className="flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo-cet.png" alt="CET" className="w-9 h-9 rounded-md object-contain" />
            <div className="leading-tight">
              <span className="block text-sm font-semibold text-slate-900">CET</span>
              <span className="block text-xs text-slate-500">Segurança e Medicina do Trabalho</span>
            </div>
          </Link>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setTutorialOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 transition shadow-2xs"
            title="Abrir guia rápido de uso do sistema"
          >
            <svg className="w-4 h-4 text-sky-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>Como usar</span>
          </button>

          {session && (
            <div className="flex items-center gap-2.5 sm:gap-3">
              <div className="relative">
                <div
                  className="w-8 h-8 rounded-full bg-soft-lavender border border-blue-200 text-royal text-xs font-semibold flex items-center justify-center select-none"
                  title={`${session.email} (${session.role})`}
                >
                  {initials}
                </div>
                <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-white" />
              </div>
              <button
                type="button"
                onClick={handleLogout}
                disabled={loggingOut}
                className="border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors disabled:opacity-50"
              >
                {loggingOut ? 'Saindo...' : 'Sair'}
              </button>
            </div>
          )}
        </div>
      </header>

      <div className="flex flex-1 min-h-0">
        {/* MENU LATERAL (DESKTOP) */}
        <aside className="hidden lg:block w-64 xl:w-72 shrink-0 bg-white border-r border-slate-200">
          <div className="sticky top-16 p-4">
            <NavList pathname={pathname} />
          </div>
        </aside>

        {/* MENU LATERAL (CELULAR) */}
        {mobileMenuOpen && (
          <div className="lg:hidden fixed inset-0 z-50 flex">
            <div className="fixed inset-0 bg-slate-900/40" onClick={() => setMobileMenuOpen(false)} />
            <div className="relative w-72 max-w-[85vw] h-full bg-white border-r border-slate-200 flex flex-col">
              <div className="h-16 px-4 flex items-center justify-between border-b border-slate-200">
                <span className="text-sm font-semibold text-slate-900">Menu</span>
                <button
                  type="button"
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-2 text-slate-500 hover:bg-slate-100 rounded-md"
                  aria-label="Fechar menu"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-4">
                <NavList pathname={pathname} onNavigate={() => setMobileMenuOpen(false)} />
              </div>
            </div>
          </div>
        )}

        {/* CONTEÚDO PRINCIPAL COM FUNDO SLATE-50 */}
        <main className="flex-1 min-w-0 bg-slate-50">
          <div className="w-full max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-6">{children}</div>
        </main>
      </div>
    </div>
  );
}
