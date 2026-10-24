import React from 'react';

export const metadata = {
  title: 'Política de Privacidade | CET Segurança e Medicina do Trabalho',
  description: 'Política de Privacidade e Proteção de Dados (LGPD) da CET.',
};

export default function PoliticaPrivacidadePage() {
  return (
    <main className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto bg-white p-8 rounded-2xl shadow-sm border border-slate-200">
        <h1 className="text-2xl font-bold text-slate-900 mb-6">Política de Privacidade e Proteção de Dados</h1>
        <p className="text-sm text-slate-500 mb-6">Última atualização: 24 de outubro de 2026</p>

        <section className="space-y-4 text-slate-700 text-sm leading-relaxed">
          <p>
            A <strong>CET – Segurança e Medicina do Trabalho</strong> está comprometida com a privacidade e proteção dos dados pessoais de seus clientes e usuários, em total conformidade com a Lei Geral de Proteção de Dados Pessoais (LGPD - Lei nº 13.709/2018).
          </p>

          <h2 className="text-base font-semibold text-slate-900 mt-6">1. Coleta e Finalidade dos Dados</h2>
          <p>
            Coletamos informações cadastrais básicas fornecidas diretamente por você (como nome, telefone comercial, e-mail e CNPJ) estritamente para fins de:
          </p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Identificação e atendimento comercial via WhatsApp, Instagram e portal web;</li>
            <li>Emissão de diagnósticos de conformidade com as Normas Regulamentadoras (NRs);</li>
            <li>Elaboração de propostas de serviços de Engenharia e Medicina Ocupacional.</li>
          </ul>

          <h2 className="text-base font-semibold text-slate-900 mt-6">2. Não Coleta de Dados Médicos Sensíveis no Chat</h2>
          <p>
            Por diretriz rígida de privacidade e segurança, nosso sistema de atendimento automatizado via chat (WhatsApp e Instagram) <strong>NUNCA</strong> solicita ou armazena prontuários médicos individuais, resultados clínicos ou dados de saúde sensíveis de trabalhadores.
          </p>

          <h2 className="text-base font-semibold text-slate-900 mt-6">3. Compartilhamento e Segurança</h2>
          <p>
            Não comercializamos seus dados com terceiros. As informações coletadas são protegidas por protocolos de criptografia em trânsito e em repouso e são acessadas apenas por profissionais autorizados da CET.
          </p>

          <h2 className="text-base font-semibold text-slate-900 mt-6">4. Direitos do Titular</h2>
          <p>
            Você pode solicitar a qualquer momento a confirmação, atualização ou exclusão de seus dados de nossa base de triagem entrando em contato com nosso Encarregado de Dados (DPO) pelo e-mail: <strong>contato@cet.com.br</strong>.
          </p>
        </section>
      </div>
    </main>
  );
}
