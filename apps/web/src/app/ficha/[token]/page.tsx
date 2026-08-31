'use client';

import { useState, useEffect, useCallback } from 'react';
import type { BlocoFicha } from '@/lib/blocos-ficha';

interface FichaState {
  ficha_id: string | null;
  token: string | null;
  status: string;
  bloco_atual: number;
  total_blocos: number;
  bloco: BlocoFicha | null;
  respostas: Record<string, unknown>;
  protocolo: string;
  contato: string;
  carregando: boolean;
  erro: string | null;
  concluida: boolean;
  precisa_consentimento: boolean;
  contato_id: string;
}

export default function FichaPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const [resolvedParams, setResolvedParams] = useState<{ token: string } | null>(null);
  const [state, setState] = useState<FichaState>({
    ficha_id: null,
    token: null,
    status: '',
    bloco_atual: 1,
    total_blocos: 5,
    bloco: null,
    respostas: {},
    protocolo: '',
    contato: '',
    carregando: true,
    erro: null,
    concluida: false,
    precisa_consentimento: false,
    contato_id: '',
  });

  const [respostasBloco, setRespostasBloco] = useState<Record<string, unknown>>({});
  const [salvando, setSalvando] = useState(false);

  // Resolver params (Next.js 15+ async params)
  useEffect(() => {
    params.then(setResolvedParams);
  }, [params]);

  // Carregar ficha pelo token
  const carregarFicha = useCallback(async (token: string) => {
    try {
      setState(prev => ({ ...prev, carregando: true, erro: null }));
      const res = await fetch(`/api/ficha?token=${token}`);
      const data = await res.json();

      if (!res.ok) {
        setState(prev => ({
          ...prev,
          carregando: false,
          erro: data.erro || 'Ficha não encontrada.',
        }));
        return;
      }

      setState(prev => ({
        ...prev,
        ficha_id: data.ficha_id,
        token,
        status: data.status,
        bloco_atual: data.bloco_atual,
        total_blocos: data.total_blocos,
        bloco: data.bloco,
        respostas: data.respostas || {},
        protocolo: data.lead?.protocolo || '',
        contato: data.lead?.contato || '',
        carregando: false,
        concluida: data.status === 'concluida',
        precisa_consentimento: data.precisa_consentimento || false,
        contato_id: data.lead?.contato_id || '',
      }));

      // Pré-carregar respostas salvas do bloco atual
      const respostasSalvas = data.respostas?.[`bloco_${data.bloco_atual}`] || {};
      setRespostasBloco(respostasSalvas);
    } catch {
      setState(prev => ({
        ...prev,
        carregando: false,
        erro: 'Erro ao conectar com o servidor.',
      }));
    }
  }, []);

  useEffect(() => {
    if (resolvedParams?.token) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      carregarFicha(resolvedParams.token);
    }
  }, [resolvedParams, carregarFicha]);

  // Salvar bloco e avançar
  const salvarBloco = async () => {
    if (!state.token || !state.bloco) return;

    // Validar campos obrigatórios
    const camposObrigatorios = state.bloco.campos.filter(c => c.obrigatorio);
    const faltando = camposObrigatorios.filter(c => {
      const valor = respostasBloco[c.id];
      if (valor === undefined || valor === null || valor === '') return true;
      if (c.tipo === 'booleano' && valor !== true && valor !== false) return true;
      return false;
    });

    if (faltando.length > 0) {
      setState(prev => ({
        ...prev,
        erro: `Preencha os campos obrigatórios: ${faltando.map(c => c.rotulo).join(', ')}`,
      }));
      return;
    }

    try {
      setSalvando(true);
      setState(prev => ({ ...prev, erro: null }));

      const res = await fetch('/api/ficha', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: state.token,
          bloco: state.bloco_atual,
          respostas: respostasBloco,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setState(prev => ({ ...prev, erro: data.erro }));
        return;
      }

      if (data.concluida) {
        setState(prev => ({ ...prev, concluida: true, status: 'concluida' }));
      } else {
        setState(prev => ({
          ...prev,
          bloco_atual: data.bloco_atual,
          bloco: data.bloco,
          status: data.status,
        }));
        setRespostasBloco({});
      }
    } catch {
      setState(prev => ({ ...prev, erro: 'Erro ao salvar. Tente novamente.' }));
    } finally {
      setSalvando(false);
    }
  };

  // --- Tela de carregamento ---
  if (state.carregando) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto mb-4" />
          <p className="text-slate-600">Carregando sua ficha...</p>
        </div>
      </div>
    );
  }

  // --- Erro fatal (token inválido) ---
  if (state.erro && !state.bloco) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md text-center">
          <div className="text-4xl mb-4">⚠️</div>
          <h1 className="text-xl font-bold text-slate-800 mb-2">Link inválido</h1>
          <p className="text-slate-600">{state.erro}</p>
          <p className="text-sm text-slate-400 mt-4">
            Se você recebeu este link por WhatsApp, entre em contato conosco.
          </p>
        </div>
      </div>
    );
  }

  // --- Ficha concluída ---
  if (state.concluida) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 to-teal-50 p-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md text-center">
          <div className="text-5xl mb-4">✅</div>
          <h1 className="text-2xl font-bold text-emerald-800 mb-2">
            Diagnóstico recebido!
          </h1>
          <p className="text-slate-600 mb-4">
            Seus dados foram recebidos com sucesso. Nossa equipe está processando
            o diagnóstico SST da sua empresa.
          </p>
          <div className="bg-emerald-50 rounded-xl p-4 mb-4">
            <p className="text-sm text-emerald-700">
              <strong>Protocolo:</strong> {state.protocolo}
            </p>
          </div>
          <p className="text-sm text-slate-500">
            Você receberá o resultado pelo WhatsApp em breve.
          </p>
        </div>
      </div>
    );
  }

  // --- Tela de Consentimento LGPD ---
  if (state.precisa_consentimento) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md text-center">
          <div className="text-4xl mb-4">🔒</div>
          <h1 className="text-xl font-bold text-slate-800 mb-2">Privacidade e Dados</h1>
          <p className="text-slate-600 mb-6 text-sm">
            Para seguirmos com o seu diagnóstico SST, precisamos tratar alguns dados da sua empresa. Você concorda com nossa Política de Privacidade?
          </p>
          <div className="flex flex-col gap-3">
            <button
              onClick={async () => {
                try {
                  setSalvando(true);
                  const res = await fetch('/api/consentimento', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ contato_id: state.contato_id })
                  });
                  if (res.ok) {
                    setState(prev => ({ ...prev, precisa_consentimento: false }));
                  } else {
                    const data = await res.json();
                    setState(prev => ({ ...prev, erro: data.erro }));
                  }
                } catch {
                  setState(prev => ({ ...prev, erro: 'Erro ao registrar consentimento.' }));
                } finally {
                  setSalvando(false);
                }
              }}
              disabled={salvando}
              className="w-full bg-emerald-600 text-white font-semibold py-3 px-4 rounded-xl hover:bg-emerald-700 active:bg-emerald-800 transition disabled:opacity-50"
            >
              {salvando ? 'Processando...' : 'Concordo e quero continuar'}
            </button>
          </div>
          {state.erro && (
            <p className="text-sm text-red-600 mt-4">{state.erro}</p>
          )}
        </div>
      </div>
    );
  }

  // --- Formulário do bloco ---
  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header fixo */}
      <header className="sticky top-0 z-10 bg-white border-b border-slate-200 px-4 py-3">
        <div className="max-w-lg mx-auto">
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-lg font-bold text-emerald-800">CET Diagnóstico</h1>
            <span className="text-xs text-slate-400">{state.protocolo}</span>
          </div>
          {/* Barra de progresso */}
          <div className="flex gap-1">
            {Array.from({ length: state.total_blocos }, (_, i) => (
              <div
                key={i}
                className={`h-1.5 rounded-full flex-1 transition-colors ${
                  i + 1 < state.bloco_atual
                    ? 'bg-emerald-500'
                    : i + 1 === state.bloco_atual
                    ? 'bg-emerald-400'
                    : 'bg-slate-200'
                }`}
              />
            ))}
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Passo {state.bloco_atual} de {state.total_blocos}
          </p>
        </div>
      </header>

      {/* Corpo */}
      <main className="max-w-lg mx-auto p-4 pb-32">
        {state.bloco && (
          <>
            <div className="mb-6">
              <h2 className="text-xl font-bold text-slate-800 mb-1">
                {state.bloco.titulo}
              </h2>
              <p className="text-sm text-slate-500">{state.bloco.descricao}</p>
            </div>

            {/* Erro de validação */}
            {state.erro && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-3 mb-4">
                <p className="text-sm text-red-700">{state.erro}</p>
              </div>
            )}

            {/* Campos do bloco */}
            <div className="space-y-4">
              {state.bloco.campos.map(campo => (
                <div key={campo.id}>
                  <label
                    htmlFor={campo.id}
                    className="block text-sm font-medium text-slate-700 mb-1"
                  >
                    {campo.rotulo}
                    {campo.obrigatorio && (
                      <span className="text-red-500 ml-1">*</span>
                    )}
                  </label>

                  {campo.dica && (
                    <p className="text-xs text-slate-400 mb-1">{campo.dica}</p>
                  )}

                  {/* Texto */}
                  {campo.tipo === 'texto' && (
                    <input
                      id={campo.id}
                      type="text"
                      placeholder={campo.placeholder}
                      value={(respostasBloco[campo.id] as string) || ''}
                      onChange={e =>
                        setRespostasBloco(prev => ({
                          ...prev,
                          [campo.id]: e.target.value,
                        }))
                      }
                      className="w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-800 placeholder:text-slate-400 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition"
                    />
                  )}

                  {/* Número */}
                  {campo.tipo === 'numero' && (
                    <input
                      id={campo.id}
                      type="number"
                      min="0"
                      placeholder={campo.placeholder}
                      value={(respostasBloco[campo.id] as string) || ''}
                      onChange={e =>
                        setRespostasBloco(prev => ({
                          ...prev,
                          [campo.id]: e.target.value,
                        }))
                      }
                      className="w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-800 placeholder:text-slate-400 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition"
                    />
                  )}

                  {/* Select */}
                  {campo.tipo === 'select' && (
                    <select
                      id={campo.id}
                      value={(respostasBloco[campo.id] as string) || ''}
                      onChange={e =>
                        setRespostasBloco(prev => ({
                          ...prev,
                          [campo.id]: e.target.value,
                        }))
                      }
                      className="w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-800 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition bg-white"
                    >
                      <option value="">Selecione...</option>
                      {campo.opcoes?.map(opcao => (
                        <option key={opcao} value={opcao}>
                          {opcao}
                        </option>
                      ))}
                    </select>
                  )}

                  {/* Multi-select (checkboxes) */}
                  {campo.tipo === 'multi_select' && (
                    <div className="flex flex-wrap gap-2">
                      {campo.opcoes?.map(opcao => {
                        const selecionados = (respostasBloco[campo.id] as string[]) || [];
                        const ativo = selecionados.includes(opcao);
                        return (
                          <button
                            key={opcao}
                            type="button"
                            onClick={() => {
                              setRespostasBloco(prev => {
                                const atual = (prev[campo.id] as string[]) || [];
                                return {
                                  ...prev,
                                  [campo.id]: ativo
                                    ? atual.filter(s => s !== opcao)
                                    : [...atual, opcao],
                                };
                              });
                            }}
                            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                              ativo
                                ? 'bg-emerald-100 text-emerald-800 ring-2 ring-emerald-500'
                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                            }`}
                          >
                            {opcao}
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {/* Booleano (toggle) */}
                  {campo.tipo === 'booleano' && (
                    <div className="flex gap-3">
                      {[
                        { label: 'Sim', value: true },
                        { label: 'Não', value: false },
                      ].map(opt => (
                        <button
                          key={String(opt.value)}
                          type="button"
                          onClick={() =>
                            setRespostasBloco(prev => ({
                              ...prev,
                              [campo.id]: opt.value,
                            }))
                          }
                          className={`flex-1 py-3 rounded-xl font-medium text-sm transition ${
                            respostasBloco[campo.id] === opt.value
                              ? opt.value
                                ? 'bg-emerald-100 text-emerald-800 ring-2 ring-emerald-500'
                                : 'bg-red-100 text-red-800 ring-2 ring-red-500'
                              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </>
        )}
      </main>

      {/* Footer fixo com botão */}
      <footer className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 p-4">
        <div className="max-w-lg mx-auto">
          <button
            onClick={salvarBloco}
            disabled={salvando}
            className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white font-semibold py-4 rounded-xl transition shadow-lg shadow-emerald-200 active:scale-[0.98]"
          >
            {salvando
              ? 'Salvando...'
              : state.bloco_atual >= state.total_blocos
              ? 'Concluir diagnóstico'
              : 'Próximo passo →'}
          </button>
        </div>
      </footer>
    </div>
  );
}
