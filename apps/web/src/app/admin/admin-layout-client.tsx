'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface AdminLayoutClientProps {
  session: {
    userId: string;
    role: string;
    email: string;
  } | null;
  children: React.ReactNode;
}

export function AdminLayoutClient({ session, children }: AdminLayoutClientProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const pathname = usePathname();

  const navItems = [
    { name: 'Leads e Clientes', href: '/admin', icon: '📋' },
    { name: 'Atendimento Comercial', href: '/admin/atendimento', icon: '💬' },
    { name: 'Painéis e Indicadores', href: '/admin/paineis', icon: '📊' },
    { name: 'Saúde do Sistema', href: '/painel', icon: '💓' },
    { name: 'Fila Morta (Erros)', href: '/admin/eventos/mortos', icon: '⚠️' },
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col lg:flex-row antialiased overflow-x-hidden">
      {/* MOBILE TOPBAR */}
      <header className="lg:hidden sticky top-0 z-30 flex items-center justify-between h-16 px-4 bg-slate-900 text-white shadow-md">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setMobileMenuOpen(true)}
            className="p-2 -ml-1 text-slate-300 hover:text-white rounded-lg hover:bg-slate-800 transition"
            aria-label="Abrir menu de navegação"
          >
            <span className="text-xl leading-none">☰</span>
          </button>
          <span className="font-bold tracking-tight text-lg">Painel CET</span>
          <span className="text-[10px] font-bold px-1.5 py-0.5 bg-blue-600 rounded text-white">SST</span>
        </div>

        {session && (
          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-400 font-mono hidden sm:inline max-w-[130px] truncate">
              {session.email}
            </span>
            <span className="uppercase text-[10px] px-2 py-0.5 rounded bg-slate-800 text-blue-300 font-semibold border border-slate-700">
              {session.role}
            </span>
          </div>
        )}
      </header>

      {/* MOBILE DRAWER BACKDROP & MENU */}
      {mobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
            onClick={() => setMobileMenuOpen(false)}
          />

          {/* Drawer content */}
          <div className="relative flex flex-col w-72 max-w-[85vw] bg-white h-full shadow-2xl z-10">
            <div className="flex items-center justify-between h-16 px-5 bg-slate-900 text-white border-b border-slate-800">
              <div className="flex items-center gap-2">
                <span className="font-bold text-lg">CET Automação</span>
                <span className="text-[10px] font-bold px-1.5 py-0.5 bg-blue-600 rounded text-white">SST</span>
              </div>
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                className="text-slate-400 hover:text-white text-xl p-1"
                aria-label="Fechar menu"
              >
                ✕
              </button>
            </div>

            {session && (
              <div className="px-5 py-3 bg-slate-800 text-slate-300 text-xs border-b border-slate-700 flex items-center justify-between">
                <span className="truncate max-w-[150px] font-mono">{session.email}</span>
                <span className="uppercase px-1.5 py-0.5 rounded text-[10px] bg-slate-700 text-blue-300 font-semibold">
                  {session.role}
                </span>
              </div>
            )}

            <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
              {navItems.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                      isActive
                        ? 'bg-blue-50 text-blue-700 font-semibold shadow-xs'
                        : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                    }`}
                  >
                    <span className="text-lg">{item.icon}</span>
                    <span>{item.name}</span>
                  </Link>
                );
              })}
            </nav>

            <div className="p-4 border-t border-slate-100 bg-slate-50 space-y-2">
              <Link
                href="/"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900 py-1"
              >
                <span>←</span> Início do Sistema
              </Link>
              <Link
                href="/api/auth/logout"
                className="flex items-center gap-2 text-sm text-red-600 hover:text-red-700 pt-2 border-t border-slate-200"
              >
                <span>🚪</span> Sair da Conta
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* DESKTOP SIDEBAR */}
      <aside className="hidden lg:flex lg:flex-col lg:w-64 lg:shrink-0 bg-white border-r border-slate-200 min-h-screen">
        <div className="h-full flex flex-col justify-between">
          <div>
            <div className="flex h-16 shrink-0 items-center justify-between border-b border-slate-800 px-6 bg-slate-900 text-white">
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold tracking-wide">Painel CET</span>
                <span className="text-[10px] font-semibold px-2 py-0.5 bg-blue-600 rounded text-white">SST</span>
              </div>
            </div>

            {session && (
              <div className="px-5 py-3 bg-slate-800 text-slate-300 text-xs flex items-center justify-between border-b border-slate-700">
                <span className="truncate max-w-[130px] font-mono">{session.email}</span>
                <span className="uppercase px-1.5 py-0.5 rounded text-[10px] bg-slate-700 text-blue-300 font-semibold">
                  {session.role}
                </span>
              </div>
            )}

            <nav className="px-3 py-4">
              <ul className="space-y-1">
                {navItems.map((item) => {
                  const isActive = pathname === item.href;
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        className={`group flex items-center gap-x-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                          isActive
                            ? 'bg-blue-50 text-blue-700 font-semibold shadow-xs'
                            : 'text-slate-700 hover:text-blue-600 hover:bg-slate-50'
                        }`}
                      >
                        <span className="text-base">{item.icon}</span>
                        <span>{item.name}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </nav>
          </div>

          <div className="border-t border-slate-200 p-4 bg-slate-50 space-y-2">
            <Link
              href="/"
              className="text-sm font-medium text-slate-500 hover:text-slate-900 flex items-center gap-2"
            >
              <span>←</span> Início do Sistema
            </Link>
            <Link
              href="/api/auth/logout"
              className="text-sm font-medium text-red-600 hover:text-red-800 flex items-center gap-2 pt-2 border-t border-slate-200"
            >
              <span>🚪</span> Sair da Conta
            </Link>
          </div>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 min-w-0 w-full overflow-y-auto">
        <div className="w-full max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-5 sm:py-8">
          {children}
        </div>
      </main>
    </div>
  );
}
