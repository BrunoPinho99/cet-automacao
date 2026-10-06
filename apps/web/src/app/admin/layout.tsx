import Link from 'next/link';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const navItems = [
    { name: 'Leads e Clientes', href: '/admin', icon: '📋' },
    { name: 'Atendimento Comercial', href: '/admin/atendimento', icon: '💬' },
    { name: 'Painéis e Indicadores', href: '/admin/paineis', icon: '📊' },
    { name: 'Fila Morta (Erros)', href: '/admin/eventos/mortos', icon: '⚠️' },
  ];

  return (
    <div className="flex min-h-screen bg-gray-50">
      <aside className="w-64 bg-white border-r border-gray-200">
        <div className="h-full flex flex-col justify-between">
          <div>
            <div className="flex h-16 shrink-0 items-center border-b px-6 bg-slate-900 text-white">
              <span className="text-xl font-bold tracking-wide">Painel CET</span>
              <span className="ml-2 text-xs font-semibold px-2 py-0.5 bg-blue-600 rounded text-blue-100">SST</span>
            </div>
            <nav className="px-4 py-6">
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
          <div className="border-t p-4 bg-gray-50">
            <Link
              href="/"
              className="text-sm font-medium text-gray-500 hover:text-gray-900 flex items-center gap-2"
            >
              <span>←</span> Voltar ao Site Público
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
