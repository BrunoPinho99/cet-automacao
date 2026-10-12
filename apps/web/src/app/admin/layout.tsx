import Link from 'next/link';
import { getSession } from '@/lib/auth';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();

  const navItems = [
    { name: 'Leads e Clientes', href: '/admin', icon: '📋' },
    { name: 'Atendimento Comercial', href: '/admin/atendimento', icon: '💬' },
    { name: 'Painéis e Indicadores', href: '/admin/paineis', icon: '📊' },
    { name: 'Saúde do Sistema', href: '/painel', icon: '💓' },
    { name: 'Fila Morta (Erros)', href: '/admin/eventos/mortos', icon: '⚠️' },
  ];

  return (
    <div className="flex min-h-screen bg-gray-50">
      <aside className="w-64 bg-white border-r border-gray-200">
        <div className="h-full flex flex-col justify-between">
          <div>
            <div className="flex h-16 shrink-0 items-center justify-between border-b px-6 bg-slate-900 text-white">
              <div className="flex items-center">
                <span className="text-xl font-bold tracking-wide">Painel CET</span>
                <span className="ml-2 text-xs font-semibold px-2 py-0.5 bg-blue-600 rounded text-blue-100">SST</span>
              </div>
            </div>
            {session && (
              <div className="px-6 py-3 bg-slate-800 text-slate-300 text-xs flex items-center justify-between border-b border-slate-700">
                <span className="truncate max-w-[140px] font-mono">{session.email}</span>
                <span className="uppercase px-1.5 py-0.5 rounded text-[10px] bg-slate-700 text-blue-300 font-semibold">
                  {session.role}
                </span>
              </div>
            )}
            <nav className="px-4 py-4">
              <ul className="space-y-1.5">
                {navItems.map((item) => (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className="text-gray-700 hover:text-blue-600 hover:bg-blue-50 group flex items-center gap-x-3 rounded-lg p-2.5 text-sm leading-6 font-medium transition-colors"
                    >
                      <span className="text-base">{item.icon}</span>
                      {item.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          </div>
          <div className="border-t p-4 bg-gray-50 space-y-2">
            <Link
              href="/"
              className="text-sm font-medium text-gray-500 hover:text-gray-900 flex items-center gap-2"
            >
              <span>←</span> Início do Sistema
            </Link>
            <Link
              href="/api/auth/logout"
              className="text-sm font-medium text-red-600 hover:text-red-800 flex items-center gap-2 pt-1 border-t border-gray-200"
            >
              <span>🚪</span> Sair da Conta
            </Link>
          </div>
        </div>
      </aside>
      <main className="flex-1">
        <div className="py-8">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
