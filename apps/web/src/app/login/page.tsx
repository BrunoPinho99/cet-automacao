'use client';

import { useState } from 'react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, senha }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Erro ao realizar login. Verifique email e senha.');
        return;
      }

      // Navegação completa para garantir sincronização de cookies
      window.location.href = data.redirect || '/admin';
    } catch {
      setError('Erro de conexão ao servidor. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleFillAdmin = () => {
    setEmail('admin@cet.com.br');
    setSenha('Cet@2026!Dev');
    setError('');
  };

  const handleFillComercial = () => {
    setEmail('vendas@cet.com.br');
    setSenha('Cet@2026!Dev');
    setError('');
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-900 px-4 py-12">
      <div className="w-full max-w-md space-y-8 rounded-2xl bg-white p-8 sm:p-10 shadow-2xl border border-slate-100">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-blue-600 text-white font-black text-2xl shadow-lg shadow-blue-500/30 mb-3">
            CET
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">CET Automação</h2>
          <p className="mt-1 text-sm text-slate-500">Painel de Gestão e Triagem SST</p>
        </div>

        <form className="mt-6 space-y-5" onSubmit={handleLogin}>
          <div className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                E-mail de Acesso
              </label>
              <input
                id="email"
                name="email"
                type="text"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="block w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-slate-900 placeholder-slate-400 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/20 text-sm transition"
                placeholder="admin@cet.com.br"
              />
            </div>

            <div>
              <label htmlFor="senha" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Senha
              </label>
              <div className="relative">
                <input
                  id="senha"
                  name="senha"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  className="block w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-slate-900 placeholder-slate-400 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/20 text-sm transition pr-10"
                  placeholder="••••••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-sm font-medium"
                >
                  {showPassword ? 'Ocultar' : 'Ver'}
                </button>
              </div>
            </div>
          </div>

          {error && (
            <div className="text-sm text-red-700 bg-red-50 p-3 rounded-lg border border-red-200 text-center font-medium">
              {error}
            </div>
          )}

          <div>
            <button
              type="submit"
              disabled={loading}
              className="flex w-full justify-center items-center gap-2 rounded-lg bg-blue-600 px-4 py-3 text-sm font-semibold text-white shadow-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 disabled:opacity-60 transition"
            >
              {loading ? (
                <>
                  <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
                  </svg>
                  <span>Autenticando...</span>
                </>
              ) : (
                'Entrar no Painel'
              )}
            </button>
          </div>

          <div className="pt-3 border-t border-slate-200">
            <p className="text-xs text-slate-500 text-center mb-2 font-medium">
              Preenchimento rápido para demonstração:
            </p>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={handleFillAdmin}
                className="text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 py-1.5 px-2 rounded-md transition text-center"
              >
                👤 Admin
              </button>
              <button
                type="button"
                onClick={handleFillComercial}
                className="text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 py-1.5 px-2 rounded-md transition text-center"
              >
                💼 Comercial
              </button>
            </div>
            <p className="text-[11px] text-slate-400 text-center mt-2">
              Senha aceita: <code className="font-mono text-slate-600">Bruno080299!</code> ou <code className="font-mono text-slate-600">Cet@2026!Dev</code>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}
