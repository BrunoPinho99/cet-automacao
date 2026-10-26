'use client';

import React from 'react';

interface SstScoreGaugeProps {
  score: number; // 0 a 100
  empresaNome?: string;
  cnpj?: string;
  onContratarDiagnostico?: () => void;
  checkoutUrl?: string;
  pontosCriticos?: string[];
  onEditarRespostas?: () => void;
}

export function SstScoreGauge({
  score,
  empresaNome,
  cnpj,
  onContratarDiagnostico,
  checkoutUrl,
  pontosCriticos,
  onEditarRespostas,
}: SstScoreGaugeProps) {
  // Garante que o score fique entre 0 e 100
  const valorScore = Math.max(0, Math.min(100, Math.round(score)));

  // Determinar status e cor de acordo com o score
  let statusTexto = 'Crítico — Alto Risco de Autuação';
  let statusCor = 'text-red-600 bg-red-50 border-red-200';
  let badgeTexto = 'NÃO CONFORME';
  let mensagemAlerta =
    'Identificamos ausência de laudos obrigatórios (PGR/PCMSO) e pendências graves com o eSocial. Sua empresa está sujeita a multas imediatas do Ministério do Trabalho.';

  if (valorScore >= 81) {
    statusTexto = 'Excelente — Em Conformidade';
    statusCor = 'text-emerald-700 bg-emerald-50 border-emerald-200';
    badgeTexto = 'CONFORME';
    mensagemAlerta =
      'Sua empresa possui boa gestão de Segurança e Medicina do Trabalho. Mantenha os vencimentos e exames em dia para evitar penalidades.';
  } else if (valorScore >= 61) {
    statusTexto = 'Moderado — Requer Adequações';
    statusCor = 'text-amber-700 bg-amber-50 border-amber-200';
    badgeTexto = 'ATENÇÃO';
    mensagemAlerta =
      'Existem pendências parciais nos programas ocupacionais ou exames periódicos em atraso.';
  } else if (valorScore >= 31) {
    statusTexto = 'Baixo — Pendências Regulatórias';
    statusCor = 'text-orange-700 bg-orange-50 border-orange-200';
    badgeTexto = 'ALTO RISCO';
    mensagemAlerta =
      'Faltam documentos indispensáveis para atendimento às NRs e eventos de SST no eSocial. Risco iminente de autuação.';
  }

  // Cálculo da posição no arco semicircular de 180 graus (sem ponteiro tradicional)
  // Raio = 90, Centro = (120, 110)
  const anguloGraus = 180 + (valorScore / 100) * 180;
  const anguloRad = (anguloGraus * Math.PI) / 180;
  const raio = 90;
  const cx = 130;
  const cy = 115;
  const indicadorX = cx + raio * Math.cos(anguloRad);
  const indicadorY = cy + raio * Math.sin(anguloRad);

  return (
    <div className="bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden max-w-4xl w-full mx-auto animate-fade-in">
      {/* Cabeçalho do Score com Azul Clínico Noturno */}
      <div className="p-8 sm:p-10 bg-slate-900 text-white text-center relative overflow-hidden">
        <div className="absolute inset-0 bg-radial from-blue-600/20 via-transparent to-transparent pointer-events-none" />

        {empresaNome && (
          <div className="mb-4">
            <span className="text-xs sm:text-sm uppercase tracking-widest text-blue-300 font-bold bg-blue-950/80 border border-blue-800/80 px-3 py-1 rounded-full">
              Diagnóstico de Regularidade SST
            </span>
            <h3 className="text-xl sm:text-3xl font-extrabold text-white tracking-tight mt-2.5">
              {empresaNome}
            </h3>
            {cnpj && (
              <span className="text-sm text-slate-300 font-mono mt-1 block">
                CNPJ: {cnpj}
              </span>
            )}
          </div>
        )}

        {/* Velocímetro em Arco Gradiente (Sem ponteiro mecânico) */}
        <div className="relative w-64 sm:w-72 mx-auto pt-2">
          <svg viewBox="0 0 260 145" className="w-full h-auto overflow-visible">
            <defs>
              {/* Gradiente contínuo: Vermelho -> Laranja -> Amarelo -> Verde */}
              <linearGradient id="scoreGaugeGradient" x1="0%" y1="100%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#ef4444" />
                <stop offset="30%" stopColor="#f97316" />
                <stop offset="65%" stopColor="#eab308" />
                <stop offset="100%" stopColor="#22c55e" />
              </linearGradient>

              {/* Filtro de brilho sutil para o indicador */}
              <filter id="glowIndicator" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            {/* Trilho de fundo cinza escuro */}
            <path
              d="M 40 115 A 90 90 0 0 1 220 115"
              fill="none"
              stroke="#334155"
              strokeWidth="18"
              strokeLinecap="round"
            />

            {/* Arco colorido com o gradiente */}
            <path
              d="M 40 115 A 90 90 0 0 1 220 115"
              fill="none"
              stroke="url(#scoreGaugeGradient)"
              strokeWidth="18"
              strokeLinecap="round"
            />

            {/* Marcador luminoso moderno na posição exata do score (sem ponteiro) */}
            <circle
              cx={indicadorX}
              cy={indicadorY}
              r="12"
              fill="#ffffff"
              stroke={valorScore < 35 ? '#ef4444' : valorScore < 65 ? '#f97316' : '#22c55e'}
              strokeWidth="4"
              filter="url(#glowIndicator)"
            />
            <circle
              cx={indicadorX}
              cy={indicadorY}
              r="4"
              fill="#0f172a"
            />
          </svg>

          {/* Valor numérico do Score no centro do arco */}
          <div className="absolute top-[52px] left-0 right-0 text-center">
            <span className="text-4xl sm:text-5xl font-black text-white tracking-tight drop-shadow-md">
              {valorScore}
            </span>
            <span className="text-base sm:text-lg font-bold text-slate-400">
              /100
            </span>
            <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-300 mt-0.5">
              Score SST
            </div>
          </div>
        </div>

        {/* Legenda dos extremos */}
        <div className="flex justify-between items-center text-[11px] font-bold text-slate-400 px-8 mt-1">
          <span className="text-red-400 flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-red-500 inline-block" />
            0 (Crítico)
          </span>
          <span className="text-emerald-400 flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
            100 (Conforme)
          </span>
        </div>
      </div>

      {/* Barra de Gradiente Linear Complementar */}
      <div className="p-6 sm:p-10 space-y-8">
        <div>
          <div className="flex items-center justify-between mb-2.5">
            <span className="text-sm font-bold uppercase text-slate-600 tracking-wider">
              Termômetro de Conformidade Regulatória
            </span>
            <span className={`text-xs sm:text-sm font-extrabold px-3 py-1 rounded-full border ${statusCor}`}>
              {badgeTexto}
            </span>
          </div>

          {/* Barra contínua de 4 cores */}
          <div className="relative h-5 w-full rounded-full overflow-hidden shadow-inner bg-slate-200">
            <div
              className="h-full w-full"
              style={{
                background: 'linear-gradient(to right, #ef4444 0%, #f97316 35%, #eab308 70%, #22c55e 100%)',
              }}
            />
            {/* Indicador deslizante na barra */}
            <div
              className="absolute top-0 bottom-0 w-3.5 bg-white border-2 border-slate-900 rounded-full shadow-md transform -translate-x-1/2 transition-all duration-500"
              style={{ left: `${valorScore}%` }}
              title={`Score: ${valorScore}/100`}
            />
          </div>

          <div className="flex justify-between text-xs text-slate-500 mt-2 font-semibold">
            <span>Risco Alto (Não Conforme)</span>
            <span>Atenção (Incompleto)</span>
            <span>Regular (Adequação)</span>
            <span>Excelente (100% Conforme)</span>
          </div>
        </div>

        {/* Caixa de Alerta Visual - Destaca que o Score está Baixo */}
        {valorScore < 60 && (
          <div className="bg-red-50/90 border-2 border-red-200 rounded-2xl p-5 sm:p-6 flex items-start gap-4">
            <div className="w-11 h-11 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center shrink-0 mt-0.5 text-xl font-bold">
              ⚠️
            </div>
            <div className="space-y-1.5 flex-1">
              <h4 className="text-base sm:text-lg font-bold text-red-950">
                Atenção Imediata: Score em Nível de Risco Fiscal e Trabalhista
              </h4>
              <p className="text-sm text-red-800 leading-relaxed">
                {mensagemAlerta}
              </p>
              <div className="pt-2 text-xs font-bold text-red-900 flex flex-wrap gap-2">
                {(pontosCriticos && pontosCriticos.length > 0
                  ? pontosCriticos
                  : ['Ausência de PGR / PCMSO', 'eSocial SST Não Transmitido', 'Risco de Fiscalização']
                ).map((item, idx) => (
                  <span key={idx} className="bg-white px-2.5 py-1 rounded-lg border border-red-200 shadow-2xs">
                    ⚠️ {item}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* RESUMO DO DIAGNÓSTICO BASEADO NO QUESTIONÁRIO */}
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 sm:p-6 flex flex-col sm:flex-row items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-11 h-11 rounded-2xl bg-blue-100 text-blue-800 flex items-center justify-center shrink-0 mt-0.5 font-bold text-xl">
              📋
            </div>
            <div className="space-y-1.5">
              <h4 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2 flex-wrap">
                <span>Diagnóstico Apurado das Informações Declaradas</span>
                <span className="text-xs font-bold bg-blue-100 text-blue-800 px-2.5 py-0.5 rounded-full">
                  Questionário Concluído
                </span>
              </h4>
              <p className="text-sm text-slate-600 leading-relaxed">
                Este score preliminar foi apurado com base no enquadramento fiscal do CNAE da empresa e nas informações de programas (PGR, PCMSO, ASO e eSocial) declaradas.
              </p>
              <p className="text-sm text-slate-900 leading-relaxed font-semibold">
                ⚡ Próximo passo: Para receber o <strong>laudo técnico detalhado</strong> com valores de multas aplicáveis, plano de ação corretivo e protocolo de regularização com equipe médica e de engenharia, libere o relatório executivo abaixo.
              </p>
            </div>
          </div>
          {onEditarRespostas && (
            <button
              type="button"
              onClick={onEditarRespostas}
              className="shrink-0 text-sm text-blue-700 hover:text-blue-900 font-bold underline underline-offset-2 py-2 px-3.5 bg-white hover:bg-slate-50 rounded-xl border border-slate-200 transition cursor-pointer"
            >
              ✏️ Editar Respostas
            </button>
          )}
        </div>

        {/* CARD CTA: GERAR DIAGNÓSTICO POR R$ 19,90 */}
        <div className="bg-gradient-to-br from-blue-50 via-white to-blue-50/70 rounded-3xl p-6 sm:p-8 border-2 border-blue-500/40 shadow-sm relative">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-1.5 bg-blue-100 text-blue-900 px-3 py-1 rounded-full text-xs font-extrabold uppercase tracking-wider">
                <span>Relatório Executivo Oficial + Ficha Técnica</span>
              </div>
              <h4 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                Receba o Laudo Executivo Completo da sua Empresa
              </h4>
              <p className="text-sm sm:text-base text-slate-600 leading-relaxed max-w-xl">
                Seus dados cadastrais já ficam vinculados. Acesse o questionário detalhado para emissão do parecer conclusivo com plano de adequação às NRs e eSocial.
              </p>
            </div>

            <div className="text-left sm:text-right shrink-0 bg-white/80 p-4 rounded-2xl border border-blue-200">
              <div className="text-xs text-slate-400 line-through">
                De R$ 99,00
              </div>
              <div className="text-3xl sm:text-4xl font-black text-blue-700">
                R$ 19,90
              </div>
              <div className="text-xs text-slate-500 font-semibold mt-0.5">
                Taxa única no PIX ou Cartão
              </div>
            </div>
          </div>

          {/* Botão de Ação CTA */}
          <div className="mt-6">
            {checkoutUrl ? (
              <a
                href={checkoutUrl}
                target={checkoutUrl.startsWith('#') ? undefined : '_blank'}
                rel={checkoutUrl.startsWith('#') ? undefined : 'noopener noreferrer'}
                className="w-full inline-flex items-center justify-center gap-2.5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-extrabold py-4 px-8 rounded-2xl text-base sm:text-lg transition-all shadow-md hover:shadow-lg text-center"
              >
                <span>Desbloquear Diagnóstico Completo por R$ 19,90</span>
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.4}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </a>
            ) : (
              <button
                type="button"
                onClick={onContratarDiagnostico}
                className="w-full inline-flex items-center justify-center gap-2.5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-extrabold py-4 px-8 rounded-2xl text-base sm:text-lg transition-all shadow-md hover:shadow-lg text-center cursor-pointer"
              >
                <span>Gerar Diagnóstico Completo por Apenas R$ 19,90</span>
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.4}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
