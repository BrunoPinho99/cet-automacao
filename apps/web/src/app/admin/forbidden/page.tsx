import Link from 'next/link';

export default function ForbiddenPage() {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center text-center px-4">
      <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center text-red-600 mb-4 text-2xl font-bold">
        ✕
      </div>
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Acesso Não Autorizado</h1>
      <p className="text-gray-600 max-w-md mb-6">
        Seu perfil de usuário não tem permissão para acessar esta seção do painel da CET.
      </p>
      <Link
        href="/admin"
        className="px-4 py-2 bg-slate-900 text-white rounded-lg text-sm font-medium hover:bg-slate-800 transition-colors"
      >
        Voltar para o Início do Painel
      </Link>
    </div>
  );
}
