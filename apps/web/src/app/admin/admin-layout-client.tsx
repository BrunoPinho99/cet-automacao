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

  const navItems = [
    {
      name: 'Clientes e Leads',
      href: '/admin',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      ),
    },
    {
      name: 'Atendimento WhatsApp',
      href: '/admin/atendimento',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
      ),
    },
    {
      name: 'Conexão do WhatsApp',
      href: '/admin/whatsapp',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
        </svg>
      ),
    },
    {
      name: 'Painéis e Resultados',
      href: '/admin/paineis',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      ),
    },
    {
      name: 'Saúde do Sistema',
      href: '/admin/saude',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
        </svg>
      ),
    },
    {
      name: 'Fila de Erros',
      href: '/admin/eventos/mortos',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      ),
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col lg:flex-row antialiased overflow-x-hidden">
      {/* BARRA SUPERIOR MOBILE (Branca e Azul) */}
      <header className="lg:hidden sticky top-0 z-30 flex items-center justify-between h-16 px-4 bg-white border-b border-slate-200 shadow-xs">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setMobileMenuOpen(true)}
            className="p-2 -ml-1 text-slate-600 hover:text-blue-700 rounded-lg hover:bg-slate-100 transition"
            aria-label="Abrir menu de navegação"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <div className="flex items-center gap-2">
            <span className="font-bold text-blue-700 text-lg">CET</span>
            <span className="text-xs font-semibold px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full">
              Segurança & Medicina
            </span>
          </div>
        </div>

        {session && (
          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-600 font-medium hidden sm:inline max-w-[130px] truncate">
              {session.email}
            </span>
            <span className="text-[11px] px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 font-semibold border border-blue-200">
              {session.role}
            </span>
          </div>
        )}
      </header>

      {/* MENU MOBILE (GAVETA) */}
      {mobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div
            className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs transition-opacity"
            onClick={() => setMobileMenuOpen(false)}
          />

          <div className="relative flex flex-col w-72 max-w-[85vw] bg-white h-full shadow-2xl z-10">
            <div className="flex items-center justify-between h-16 px-5 border-b border-slate-200 bg-white">
              <div className="flex items-center gap-2">
                <span className="font-bold text-blue-700 text-lg">CET Atendimento</span>
              </div>
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                className="text-slate-400 hover:text-slate-700 text-xl p-1"
                aria-label="Fechar menu"
              >
                ✕
              </button>
            </div>

            {session && (
              <div className="px-5 py-3 bg-slate-50 text-slate-700 text-xs border-b border-slate-200 flex items-center justify-between">
                <span className="truncate max-w-[150px] font-medium">{session.email}</span>
                <span className="px-2 py-0.5 rounded-full text-[11px] bg-blue-50 text-blue-700 font-semibold border border-blue-200">
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
                        ? 'bg-blue-50 text-blue-700 font-semibold border border-blue-200'
                        : 'text-slate-700 hover:bg-slate-100 hover:text-blue-700'
                    }`}
                  >
                    <span className={isActive ? 'text-blue-700' : 'text-slate-500'}>{item.icon}</span>
                    <span>{item.name}</span>
                  </Link>
                );
              })}
            </nav>

            <div className="p-4 border-t border-slate-200 bg-slate-50 space-y-2">
              <Link
                href="/"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-2 text-sm text-slate-600 hover:text-blue-700 py-1 font-medium"
              >
                <span>←</span> Início do Site
              </Link>
              <button
                type="button"
                onClick={handleLogout}
                disabled={loggingOut}
                className="w-full text-left flex items-center gap-2 text-sm text-red-600 hover:text-red-700 pt-2 border-t border-slate-200 cursor-pointer font-medium"
              >
                <svg className="w-4 h-4 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                <span>{loggingOut ? 'Saindo...' : 'Sair da Conta'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SIDEBAR DESKTOP (Branca com Azul e Verde CET) */}
      <aside className="hidden lg:flex lg:flex-col lg:w-64 lg:shrink-0 bg-white border-r border-slate-200 min-h-screen shadow-xs">
        <div className="h-full flex flex-col justify-between">
          <div>
            {/* Logo da CET */}
            <div className="flex h-16 shrink-0 items-center justify-between border-b border-slate-200 px-6 bg-white">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold text-sm shadow-xs">
                  CET
                </div>
                <div>
                  <div className="text-sm font-bold text-slate-900 leading-tight">CET Clínica</div>
                  <div className="text-[11px] text-emerald-600 font-medium leading-tight">Segurança do Trabalho</div>
                </div>
              </div>
            </div>

            {/* Dados do Usuário */}
            {session && (
              <div className="px-5 py-3 bg-slate-50/80 text-slate-600 text-xs flex items-center justify-between border-b border-slate-200">
                <span className="truncate max-w-[130px] font-medium text-slate-700">{session.email}</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] bg-blue-50 text-blue-700 font-semibold border border-blue-200">
                  {session.role}
                </span>
              </div>
            )}

            {/* Menu de Navegação */}
            <nav className="px-3 py-4">
              <ul className="space-y-1.5">
                {navItems.map((item) => {
                  const isActive = pathname === item.href;
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        className={`group flex items-center gap-x-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition ${
                          isActive
                            ? 'bg-blue-50 text-blue-700 font-semibold border border-blue-200 shadow-xs'
                            : 'text-slate-600 hover:text-blue-700 hover:bg-slate-50'
                        }`}
                      >
                        <span className={`shrink-0 ${isActive ? 'text-blue-700' : 'text-slate-400 group-hover:text-blue-600'}`}>
                          {item.icon}
                        </span>
                        <span>{item.name}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </nav>
          </div>

          {/* Rodapé da Sidebar */}
          <div className="border-t border-slate-200 p-4 bg-slate-50/60 space-y-2">
            <Link
              href="/"
              className="text-xs font-semibold text-slate-600 hover:text-blue-700 flex items-center gap-2 py-1 transition"
            >
              <span>←</span> Início do Site
            </Link>
            <button
              type="button"
              onClick={handleLogout}
              disabled={loggingOut}
              className="w-full text-left text-xs font-semibold text-red-600 hover:text-red-700 flex items-center gap-2 pt-2 border-t border-slate-200 cursor-pointer transition"
            >
              <svg className="w-4 h-4 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              <span>{loggingOut ? 'Saindo...' : 'Sair da Conta'}</span>
            </button>
          </div>
        </div>
      </aside>

      {/* ÁREA DE CONTEÚDO PRINCIPAL */}
      <main className="flex-1 min-w-0 w-full overflow-y-auto">
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {children}
        </div>
      </main>
    </div>
  );
}
