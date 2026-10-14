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
          <div className="px-3 mb-1.5 text-xs font-medium text-slate-400">{sec.group}</div>
          <ul className="space-y-0.5">
            {sec.items.map((item) => {
              const isActive = pathname === item.href;
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={onNavigate}
                    className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm ${
                      isActive
                        ? 'bg-blue-50 text-blue-700 font-semibold'
                        : 'text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <span className={isActive ? 'text-blue-600' : 'text-slate-400'}>{item.icon}</span>
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

  const nomeUsuario = session?.email.split('@')[0] || '';

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col">
      <OnboardingModal forceOpen={tutorialOpen} onClose={() => setTutorialOpen(false)} />

      {/* CABEÇALHO ÚNICO COM A LOGO */}
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

        <div className="flex items-center gap-2 sm:gap-3">
          <button
            type="button"
            onClick={() => setTutorialOpen(true)}
            className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200/80 rounded-md px-2.5 sm:px-3 py-1.5 transition"
            title="Abrir guia rápido de uso do sistema"
          >
            <svg className="w-4 h-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>Como usar</span>
          </button>

          {session && (
            <>
              <div className="hidden sm:block text-right leading-tight">
                <span className="block text-sm font-medium text-slate-800">{nomeUsuario}</span>
                <span className="block text-xs text-slate-500 capitalize">{session.role}</span>
              </div>
              <button
                type="button"
                onClick={handleLogout}
                disabled={loggingOut}
                className="text-sm text-slate-600 hover:text-slate-900 border border-slate-300 hover:bg-slate-50 rounded-md px-3 py-1.5"
              >
                {loggingOut ? 'Saindo...' : 'Sair'}
              </button>
            </>
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

        {/* CONTEÚDO */}
        <main className="flex-1 min-w-0">
          <div className="w-full max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-6">{children}</div>
        </main>
      </div>
    </div>
  );
}
