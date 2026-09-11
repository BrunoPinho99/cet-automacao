import Link from 'next/link';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-gray-100">
      <aside className="w-64 bg-white border-r border-gray-200">
        <div className="h-full flex flex-col">
          <div className="flex h-16 shrink-0 items-center border-b px-6">
            <h1 className="text-xl font-bold text-gray-900">Painel CET</h1>
          </div>
          <nav className="flex-1 overflow-y-auto px-4 py-4">
            <ul className="space-y-1">
              <li>
                <Link
                  href="/admin"
                  className="bg-blue-50 text-blue-700 group flex gap-x-3 rounded-md p-2 text-sm leading-6 font-semibold"
                >
                  Leads
                </Link>
              </li>
            </ul>
          </nav>
          <div className="border-t p-4">
            <Link
              href="/"
              className="text-sm font-medium text-gray-500 hover:text-gray-700"
            >
              Voltar ao Site
            </Link>
          </div>
        </div>
      </aside>
      <main className="flex-1">
        <div className="py-10">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
