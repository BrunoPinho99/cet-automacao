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

  const navSections = [
    {
      group: 'OPERAÇÃO',
      items: [
        {
          name: 'Clientes e Leads',
          href: '/admin',
          icon: (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          ),
        },
        {
          name: 'Atendimento WhatsApp',
          href: '/admin/atendimento',
          badge: 'Ao Vivo',
          isLive: true,
          icon: (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          ),
        },
        {
          name: 'Conexão WhatsApp',
          href: '/admin/whatsapp',
          icon: (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
          ),
        },
      ],
    },
    {
      group: 'INTELIGÊNCIA & GESTÃO',
      items: [
        {
          name: 'Painéis e Resultados',
          href: '/admin/paineis',
          icon: (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          ),
        },
        {
          name: 'Saúde do Sistema',
          href: '/admin/saude',
          icon: (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          ),
        },
        {
          name: 'Fila de Erros',
          href: '/admin/eventos/mortos',
          icon: (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          ),
        },
      ],
    },
  ];

  // Identifica o título da página atual para os breadcrumbs
  const allItems = navSections.flatMap((s) => s.items);
  const currentNav = allItems.find((i) => i.href === pathname) || { name: 'Painel Geral' };

  return (
    <div className="min-h-screen bg-slate-50/70 text-slate-800 flex flex-col lg:flex-row antialiased overflow-x-hidden">
      {/* BARRA SUPERIOR MOBILE COM A LOGO OFICIAL */}
      <header className="lg:hidden sticky top-0 z-30 flex items-center justify-between h-16 px-4 sm:px-6 bg-white/95 backdrop-blur-md border-b border-slate-200/90 shadow-2xs">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setMobileMenuOpen(true)}
            className="p-2 -ml-1 text-slate-600 hover:text-blue-600 rounded-xl hover:bg-slate-100 transition"
            aria-label="Abrir menu lateral"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <div className="flex items-center gap-2.5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/logo-cet.png"
              alt="CET Clínica"
              className="w-9 h-9 rounded-xl object-contain shadow-xs border border-blue-200/60"
            />
            <div>
              <span className="font-bold text-slate-900 text-sm tracking-tight block leading-tight">CET Clínica</span>
              <span className="text-[10px] text-blue-600 font-semibold block leading-tight">Segurança & Saúde</span>
            </div>
          </div>
        </div>

        {session && (
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
              {session.role}
            </span>
          </div>
        )}
      </header>

      {/* MENU MOBILE (GAVETA RESPONSIVA) */}
      {mobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div
            className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs transition-opacity"
            onClick={() => setMobileMenuOpen(false)}
          />

          <div className="relative flex flex-col w-80 max-w-[85vw] bg-white h-full shadow-2xl z-10 border-r border-slate-200">
            <div className="flex items-center justify-between h-18 px-5 border-b border-slate-200">
              <div className="flex items-center gap-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/logo-cet.png"
                  alt="CET Clínica"
                  className="w-10 h-10 rounded-xl object-contain shadow-xs border border-blue-200/60"
                />
                <div>
                  <div className="text-base font-bold text-slate-900 leading-tight">CET Clínica</div>
                  <div className="text-xs text-blue-600 font-semibold">Segurança & Medicina SST</div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                className="text-slate-400 hover:text-slate-700 text-xl p-2 rounded-lg hover:bg-slate-100"
                aria-label="Fechar menu"
              >
                ✕
              </button>
            </div>

            <nav className="flex-1 px-4 py-5 space-y-6 overflow-y-auto">
              {navSections.map((sec) => (
                <div key={sec.group}>
                  <div className="px-3 text-xs font-bold text-slate-400 tracking-wider mb-2 uppercase">
                    {sec.group}
                  </div>
                  <div className="space-y-1.5">
                    {sec.items.map((item) => {
                      const isActive = pathname === item.href;
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          onClick={() => setMobileMenuOpen(false)}
                          className={`flex items-center justify-between rounded-xl px-3.5 py-2.5 text-sm font-medium transition ${
                            isActive
                              ? 'bg-blue-50 text-blue-700 font-semibold border border-blue-200 shadow-2xs'
                              : 'text-slate-700 hover:bg-slate-50 hover:text-blue-600'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <span className={isActive ? 'text-blue-600' : 'text-slate-400'}>{item.icon}</span>
                            <span>{item.name}</span>
                          </div>
                          {item.badge && (
                            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                              {item.badge}
                            </span>
                          )}
                        </Link>
                      );
                    })}
                  </div>
                </div>
              ))}
            </nav>

            <div className="p-4 border-t border-slate-200 bg-slate-50/80 space-y-2">
              <Link
                href="/"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-blue-600 py-1.5 transition"
              >
                <span>←</span> Início do Site
              </Link>
              <button
                type="button"
                onClick={handleLogout}
                disabled={loggingOut}
                className="w-full text-left flex items-center gap-2 text-sm font-semibold text-red-600 hover:text-red-700 pt-2 border-t border-slate-200 cursor-pointer transition"
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

      {/* SIDEBAR DESKTOP COM A LOGO OFICIAL CET */}
      <aside className="hidden lg:flex lg:flex-col lg:w-72 xl:w-80 lg:shrink-0 bg-white border-r border-slate-200/90 min-h-screen shadow-2xs">
        <div className="h-full flex flex-col justify-between">
          <div>
            {/* Header da Sidebar com a Logo Oficial da CET */}
            <div className="h-20 px-6 border-b border-slate-200/90 flex items-center justify-between">
              <div className="flex items-center gap-3.5">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/logo-cet.png"
                  alt="Logo CET Clínica"
                  className="w-11 h-11 rounded-xl object-contain shadow-xs border border-blue-200/60 ring-2 ring-blue-500/10"
                />
                <div>
                  <div className="text-base font-bold text-slate-900 tracking-tight leading-tight flex items-center gap-2">
                    CET Clínica
                    <span className="w-2 h-2 rounded-full bg-emerald-500 ring-4 ring-emerald-100" />
                  </div>
                  <div className="text-xs text-blue-600 font-semibold leading-tight mt-0.5">Segurança & Medicina SST</div>
                </div>
              </div>
            </div>

            {/* Status do WhatsApp no Topo da Sidebar */}
            <div className="px-5 pt-4 pb-2">
              <div className="flex items-center justify-between px-3.5 py-2 rounded-xl bg-blue-50/60 border border-blue-200/70 text-xs shadow-2xs">
                <div className="flex items-center gap-2 font-medium text-slate-700">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span>WhatsApp Operacional</span>
                </div>
                <span className="text-[11px] font-semibold text-blue-700 bg-white px-2 py-0.5 rounded-full border border-blue-200">
                  Ao Vivo
                </span>
              </div>
            </div>

            {/* Navegação Agrupada Ampliada */}
            <nav className="px-4 py-3 space-y-6">
              {navSections.map((sec) => (
                <div key={sec.group}>
                  <div className="px-3 text-xs font-bold text-slate-400 tracking-wider mb-2 uppercase">
                    {sec.group}
                  </div>
                  <ul className="space-y-1">
                    {sec.items.map((item) => {
                      const isActive = pathname === item.href;
                      return (
                        <li key={item.href}>
                          <Link
                            href={item.href}
                            className={`group flex items-center justify-between rounded-xl px-3.5 py-2.5 text-sm font-medium transition-all duration-150 ${
                              isActive
                                ? 'bg-blue-50 text-blue-700 font-semibold border border-blue-200 shadow-2xs'
                                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <span
                                className={`shrink-0 transition-colors ${
                                  isActive ? 'text-blue-600' : 'text-slate-400 group-hover:text-blue-600'
                                }`}
                              >
                                {item.icon}
                              </span>
                              <span>{item.name}</span>
                            </div>

                            {item.isLive && (
                              <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                                {item.badge}
                              </span>
                            )}
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))}
            </nav>
          </div>

          {/* Rodapé da Sidebar: Perfil do Usuário e Logout */}
          <div className="border-t border-slate-200/90 p-4 bg-slate-50/60 space-y-2.5">
            {session && (
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-white border border-slate-200/90 shadow-2xs">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-700 border border-blue-200 font-bold text-xs flex items-center justify-center shrink-0">
                    {session.email.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-semibold text-slate-800 truncate leading-tight">
                      {session.email.split('@')[0]}
                    </div>
                    <div className="text-[11px] text-blue-600 font-medium truncate leading-tight mt-0.5 capitalize">
                      {session.role}
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleLogout}
                  disabled={loggingOut}
                  title="Sair da conta"
                  className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition shrink-0"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                </button>
              </div>
            )}

            <div className="flex items-center justify-between px-2 pt-1 text-xs text-slate-400">
              <Link href="/" className="hover:text-blue-600 transition font-medium">
                ← Início do site
              </Link>
              <span className="font-mono text-[11px]">v2026.1</span>
            </div>
          </div>
        </div>
      </aside>

      {/* ÁREA PRINCIPAL TOTALMENTE RESPONSIVA */}
      <div className="flex-1 min-w-0 flex flex-col min-h-screen">
        {/* Top Navbar Desktop com a Logo Oficial no Header */}
        <header className="hidden lg:flex items-center justify-between h-20 px-8 xl:px-10 bg-white/95 backdrop-blur-md border-b border-slate-200/90 sticky top-0 z-20 shadow-2xs">
          <div className="flex items-center gap-3.5">
            <Link href="/admin" className="flex items-center gap-3 group">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/logo-cet.png"
                alt="Logo CET"
                className="w-10 h-10 rounded-xl object-contain shadow-xs border border-blue-200/60 group-hover:scale-105 transition"
              />
              <div className="leading-tight">
                <span className="font-bold text-slate-900 text-sm tracking-tight block">CET Clínica</span>
                <span className="text-[11px] text-blue-600 font-semibold block">Segurança & Saúde</span>
              </div>
            </Link>

            <span className="text-slate-300">/</span>
            <span className="font-semibold text-slate-800 text-sm">{currentNav.name}</span>
          </div>

          <div className="flex items-center gap-3">
            <div className="inline-flex items-center gap-2.5 px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-500 shadow-2xs">
              <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <span>Buscar dados...</span>
              <kbd className="font-mono text-[10px] bg-white border border-slate-200 rounded px-1.5 py-0.5 text-slate-400">⌘K</kbd>
            </div>

            <Link
              href="/admin/atendimento"
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 text-xs font-semibold transition shadow-2xs"
            >
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span>WhatsApp Live</span>
            </Link>
          </div>
        </header>

        {/* CONTEÚDO PRINCIPAL: RESPONSIVO SEM LIMITES ARTIFICIAIS ESTREITOS */}
        <main className="flex-1 w-full overflow-y-auto">
          <div className="w-full max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-10 py-6 sm:py-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
