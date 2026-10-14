'use client';

import React, { useState, useEffect } from 'react';

interface OnboardingModalProps {
  forceOpen?: boolean;
  onClose?: () => void;
}

const STORAGE_KEY = 'cet_onboarding_dismissed_v1';

export function OnboardingModal({ forceOpen, onClose }: OnboardingModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [naoExibirNovamente, setNaoExibirNovamente] = useState(false);

  useEffect(() => {
    if (forceOpen) {
      setIsOpen(true);
      setCurrentStep(0);
      return;
    }

    try {
      const dismissed = localStorage.getItem(STORAGE_KEY);
      if (!dismissed) {
        // Abre automaticamente se for a primeira vez do usuário
        setIsOpen(true);
      }
    } catch {
      // Ignora erro de acesso a localStorage
    }
  }, [forceOpen]);

  const handleClose = () => {
    try {
      if (naoExibirNovamente) {
        localStorage.setItem(STORAGE_KEY, 'true');
      }
    } catch {
      // Ignora erro de acesso a localStorage
    }
    setIsOpen(false);
    if (onClose) onClose();
  };

  const handleFinish = () => {
    try {
      // Ao concluir os 4 passos, salva como concluído
      localStorage.setItem(STORAGE_KEY, 'true');
    } catch {
      // Ignora erro de acesso a localStorage
    }
    setIsOpen(false);
    if (onClose) onClose();
  };

  if (!isOpen) return null;

  const steps = [
    {
      badge: 'Passo 1 de 4',
      title: 'Bem-vindo(a) ao Sistema CET',
      subtitle: 'Segurança e Medicina do Trabalho simples e organizada.',
      description:
        'Este sistema foi pensado para facilitar a rotina da sua equipe. Aqui você centraliza todos os contatos de clientes, acompanha atendimentos do WhatsApp e visualiza diagnósticos de forma rápida e intuitiva, sem complicações técnicas.',
      icon: (
        <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 border border-blue-200/80 flex items-center justify-center mx-auto shadow-xs">
          <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
        </div>
      ),
      highlight: 'Tudo pronto para usar no computador ou no celular.',
    },
    {
      badge: 'Passo 2 de 4',
      title: 'Clientes e Porte da Empresa',
      subtitle: 'Identificação imediata de quem precisa de atendimento prioritário.',
      description:
        'Na tela inicial de Clientes, as empresas são organizadas de acordo com o número de funcionários:',
      bullets: [
        { label: 'Grande porte (100+ func.):', desc: 'Atendimento prioritário em até 10 minutos.' },
        { label: 'Médio porte (20 a 99 func.):', desc: 'Atendimento consultivo em até 2 horas.' },
        { label: 'Pequeno porte (até 19 func.):', desc: 'Processo guiado diretamente pelo portal.' },
      ],
      icon: (
        <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-200/80 flex items-center justify-center mx-auto shadow-xs">
          <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </div>
      ),
      highlight: 'Use o campo de busca no topo para encontrar qualquer empresa por Razão Social ou CNPJ.',
    },
    {
      badge: 'Passo 3 de 4',
      title: 'Conversas e Atendimento Direto',
      subtitle: 'Acompanhe as mensagens e converse sem sobreposição.',
      description:
        'No menu lateral em Conversas, você acompanha todas as mensagens recebidas no WhatsApp oficial da clínica:',
      bullets: [
        { label: 'Histórico em tempo real:', desc: 'Veja o que o cliente informou e as opções escolhidas.' },
        { label: 'Assumir Atendimento:', desc: 'Clique no botão azul para conversar diretamente. Ao assumir, as mensagens automáticas pausam para não atrapalhar.' },
        { label: 'Liberar:', desc: 'Quando terminar, você pode devolver o atendimento para o modo automático com um clique.' },
      ],
      icon: (
        <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 border border-blue-200/80 flex items-center justify-center mx-auto shadow-xs">
          <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
        </div>
      ),
      highlight: 'A comunicação com o cliente é clara, profissional e acolhedora.',
    },
    {
      badge: 'Passo 4 de 4',
      title: 'Relatório Executivo SST em 1 Clique',
      subtitle: 'Diagnóstico rápido das Normas Regulamentadoras e conformidade.',
      description:
        'Ao clicar em qualquer cliente da lista ou abrir seus detalhes, você encontra o botão Visualizar Relatório SST:',
      bullets: [
        { label: 'Pontuação SST:', desc: 'Cálculo de conformidade da empresa de 0 a 100 pontos.' },
        { label: 'Documentação Ocupacional:', desc: 'Avaliação de necessidade para PGR, PCMSO, LTCAT e eSocial.' },
        { label: 'Imprimir ou Salvar:', desc: 'Gere uma folha timbrada da CET para entregar ao cliente em PDF.' },
      ],
      icon: (
        <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-200/80 flex items-center justify-center mx-auto shadow-xs">
          <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
      ),
      highlight: 'Pronto! Você já conhece o essencial para operar o sistema com segurança.',
    },
  ];

  const current = steps[currentStep];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-fade-in">
      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden flex flex-col">
        {/* Barra superior de progresso e botão fechar */}
        <div className="px-6 pt-5 pb-3 flex items-center justify-between border-b border-slate-100">
          <div className="flex items-center gap-2">
            {steps.map((_, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setCurrentStep(idx)}
                className={`h-2 rounded-full transition-all ${
                  idx === currentStep
                    ? 'w-7 bg-blue-600'
                    : idx < currentStep
                    ? 'w-2 bg-blue-300'
                    : 'w-2 bg-slate-200'
                }`}
                aria-label={`Ir para o passo ${idx + 1}`}
              />
            ))}
          </div>

          <button
            type="button"
            onClick={handleClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition"
            title="Fechar tutorial"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Conteúdo do Passo */}
        <div className="p-6 sm:p-7 flex-1 space-y-5">
          <div className="text-center space-y-3">
            {current.icon}
            <div>
              <span className="inline-block px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200/60 uppercase tracking-wider mb-1.5">
                {current.badge}
              </span>
              <h2 className="text-xl font-bold text-slate-900 tracking-tight">
                {current.title}
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 mt-1">
                {current.subtitle}
              </p>
            </div>
          </div>

          <div className="bg-slate-50/80 rounded-xl p-4 border border-slate-100 text-xs sm:text-sm text-slate-700 space-y-3 leading-relaxed">
            <p>{current.description}</p>

            {current.bullets && (
              <ul className="space-y-2 pt-1">
                {current.bullets.map((b, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-600 shrink-0 mt-1.5" />
                    <span>
                      <strong className="text-slate-900 font-semibold">{b.label}</strong> {b.desc}
                    </span>
                  </li>
                ))}
              </ul>
            )}

            {current.highlight && (
              <div className="pt-2 border-t border-slate-200/60 text-xs font-medium text-blue-700 flex items-center gap-1.5">
                <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>{current.highlight}</span>
              </div>
            )}
          </div>
        </div>

        {/* Rodapé com Navegação e Checkbox de 'Não exibir mais' */}
        <div className="p-5 bg-white border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
          <label className="flex items-center gap-2 text-xs text-slate-600 select-none cursor-pointer self-start sm:self-center">
            <input
              type="checkbox"
              checked={naoExibirNovamente}
              onChange={(e) => setNaoExibirNovamente(e.target.checked)}
              className="w-4 h-4 rounded text-blue-600 border-slate-300 focus:ring-blue-500 cursor-pointer"
            />
            <span>Não exibir este guia novamente</span>
          </label>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            {currentStep > 0 && (
              <button
                type="button"
                onClick={() => setCurrentStep((prev) => prev - 1)}
                className="px-3.5 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 border border-slate-200 hover:bg-slate-50 rounded-xl transition"
              >
                Voltar
              </button>
            )}

            {currentStep < steps.length - 1 ? (
              <button
                type="button"
                onClick={() => setCurrentStep((prev) => prev + 1)}
                className="flex-1 sm:flex-initial px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl transition shadow-xs flex items-center justify-center gap-1.5"
              >
                <span>Próximo</span>
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </button>
            ) : (
              <button
                type="button"
                onClick={handleFinish}
                className="flex-1 sm:flex-initial px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl transition shadow-xs flex items-center justify-center gap-1.5"
              >
                <span>Começar a usar</span>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
