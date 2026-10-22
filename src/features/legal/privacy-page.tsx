import { ArrowLeft } from 'lucide-react';
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Brand } from '@/components/layout/brand';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/auth';

/**
 * Política de Privacidade pública (sem login). Os trechos [preencher: …] dependem
 * de dados da empresa responsável pelo RotaGest e devem ser completados antes de publicar.
 */

function Placeholder({ children }: { children: ReactNode }) {
  return <mark className="rounded bg-amber-200 px-1 text-amber-950">[preencher: {children}]</mark>;
}

function H2({ id, children }: { id: string; children: ReactNode }) {
  return (
    <h2 id={id} className="scroll-mt-6 pt-4 text-lg font-semibold tracking-tight">
      {children}
    </h2>
  );
}

const SECTIONS = [
  ['quem-somos', '1. Quem somos'],
  ['papeis', '2. Controlador e operador'],
  ['dados', '3. Dados que tratamos'],
  ['finalidades', '4. Para que usamos e com qual base legal'],
  ['compartilhamento', '5. Com quem compartilhamos'],
  ['retencao', '6. Por quanto tempo guardamos'],
  ['direitos', '7. Seus direitos'],
  ['seguranca', '8. Segurança'],
  ['suporte', '9. Acesso do suporte'],
  ['cookies', '10. Cookies'],
  ['alteracoes', '11. Alterações desta política'],
  ['contato', '12. Contato e encarregado'],
] as const;

export function PrivacyPage() {
  const { status } = useAuth();
  const back = status === 'authenticated' ? '/app' : '/login';

  return (
    <div className="mx-auto min-h-dvh max-w-3xl px-4 py-8 md:py-12">
      <div className="mb-8 flex items-center justify-between gap-3">
        <Link to="/" aria-label="Início">
          <Brand />
        </Link>
        <Button asChild variant="ghost">
          <Link to={back}>
            <ArrowLeft /> Voltar
          </Link>
        </Button>
      </div>

      <article className="space-y-4 text-[15px] leading-relaxed [&_li]:ml-5 [&_li]:list-disc [&_ul]:space-y-1">
        <header className="space-y-2">
          <h1 className="text-3xl font-semibold tracking-tight">Política de Privacidade</h1>
          <p className="text-sm text-muted-foreground">
            Vigente a partir de <Placeholder>data de vigência</Placeholder>.
          </p>
          <p>
            Esta política explica, de forma direta, quais dados pessoais o RotaGest trata, por quê, com quem eles são compartilhados e como você exerce seus
            direitos pela Lei Geral de Proteção de Dados (Lei nº 13.709/2018 — LGPD).
          </p>
        </header>

        <nav aria-label="Seções" className="rounded-xl border bg-card p-4 text-sm">
          <p className="mb-2 font-medium">Nesta página</p>
          <ol className="grid gap-1 sm:grid-cols-2">
            {SECTIONS.map(([id, label]) => (
              <li key={id} className="!ml-0 !list-none">
                <a href={`#${id}`} className="text-primary hover:underline">
                  {label}
                </a>
              </li>
            ))}
          </ol>
        </nav>

        <H2 id="quem-somos">1. Quem somos</H2>
        <p>
          O RotaGest é um sistema on-line de gestão financeira e operacional para empresas de transporte, mantido por <Placeholder>razão social</Placeholder>,
          inscrita no CNPJ sob o nº <Placeholder>CNPJ</Placeholder>, com sede em <Placeholder>endereço</Placeholder> (“RotaGest”, “nós”).
        </p>

        <H2 id="papeis">2. Controlador e operador</H2>
        <p>A LGPD distingue quem decide sobre os dados (controlador) de quem os trata em nome de outro (operador). No RotaGest:</p>
        <ul>
          <li>
            <strong>Cada empresa de transporte cliente é a controladora</strong> dos dados que cadastra no sistema: motoristas, contratantes, contratos, veículos,
            lançamentos financeiros e demais registros da sua operação. É ela quem decide o que cadastrar e por quanto tempo manter, e é a ela que o titular
            desses dados (por exemplo, um motorista) deve se dirigir primeiro.
          </li>
          <li>
            <strong>O RotaGest é operador</strong> desses dados: armazena e processa as informações seguindo as instruções da empresa cliente, apenas para prestar
            o serviço contratado.
          </li>
          <li>
            <strong>O RotaGest é controlador dos dados da sua conta de usuário</strong> (nome, e-mail, senha e sessões de acesso) e dos registros de segurança e
            auditoria necessários para operar a plataforma.
          </li>
        </ul>

        <H2 id="dados">3. Dados que tratamos</H2>
        <ul>
          <li>
            <strong>Conta de usuário:</strong> nome, e-mail e senha. A senha nunca é guardada em texto: armazenamos apenas um hash criptográfico dela.
          </li>
          <li>
            <strong>Cadastro da empresa:</strong> razão social, nome fantasia, CPF ou CNPJ, endereço, telefone e e-mail de contato.
          </li>
          <li>
            <strong>Motoristas:</strong> nome, CPF, telefone, data de admissão e tipo de vínculo, além das escalas, quilometragem e despesas ligadas a eles.
          </li>
          <li>
            <strong>Dados operacionais e financeiros</strong> que a empresa lança: veículos, rotas, contratos, contas a pagar e a receber, comprovantes anexados.
          </li>
          <li>
            <strong>Dados técnicos de acesso:</strong> endereço IP e identificação do navegador/aparelho (user-agent) registrados nas sessões de login e nos
            registros de auditoria, com data e hora das ações.
          </li>
        </ul>
        <p>Não coletamos dados sensíveis (como saúde, religião ou biometria) e o serviço não se destina a menores de 18 anos.</p>

        <H2 id="finalidades">4. Para que usamos e com qual base legal</H2>
        <ul>
          <li>
            <strong>Criar e manter sua conta, autenticar o acesso e prestar o serviço</strong> — execução de contrato (art. 7º, V).
          </li>
          <li>
            <strong>Tratar os dados da operação das empresas clientes</strong> — como operador, conforme as instruções e a base legal definidas pela empresa
            controladora.
          </li>
          <li>
            <strong>Segurança, prevenção a fraudes e auditoria</strong> (registro de IP, aparelho e ações) — legítimo interesse (art. 7º, IX) e exercício regular de
            direitos (art. 7º, VI).
          </li>
          <li>
            <strong>Enviar e-mails do serviço</strong> (convites, redefinição de senha, avisos sobre a assinatura) — execução de contrato.
          </li>
          <li>
            <strong>Cumprir obrigações legais e fiscais</strong>, como guardar registros de cobrança — cumprimento de obrigação legal (art. 7º, II).
          </li>
        </ul>
        <p>Não usamos seus dados para publicidade nem para criar perfis de comportamento.</p>

        <H2 id="compartilhamento">5. Com quem compartilhamos</H2>
        <p>Compartilhamos dados apenas com fornecedores necessários para o serviço funcionar, sob contrato e com obrigação de confidencialidade:</p>
        <ul>
          <li>provedor de hospedagem e banco de dados;</li>
          <li>provedor de envio de e-mails;</li>
          <li>provedor de armazenamento de arquivos (comprovantes anexados);</li>
          <li>meio de pagamento, quando a empresa contrata um plano pago.</li>
        </ul>
        <p>
          Os fornecedores atuais são: <Placeholder>lista de fornecedores e países onde os dados ficam</Placeholder>. Também podemos fornecer dados a autoridades
          quando houver obrigação legal ou ordem judicial. <strong>Não vendemos nem alugamos dados pessoais.</strong>
        </p>

        <H2 id="retencao">6. Por quanto tempo guardamos</H2>
        <ul>
          <li>
            <strong>Dados da conta:</strong> enquanto a conta existir. Ao excluí-la, nome e e-mail são anonimizados.
          </li>
          <li>
            <strong>Sessões de acesso:</strong> expiram automaticamente; você pode encerrar todas em “Configurações → Sair de todos os dispositivos”.
          </li>
          <li>
            <strong>Registros financeiros e de auditoria:</strong> pelo prazo exigido em lei — por exemplo, 5 (cinco) anos para documentos de natureza fiscal — ou
            pelo tempo que a empresa controladora determinar, se maior e legítimo.
          </li>
          <li>
            <strong>Dados de motoristas:</strong> enquanto a empresa mantiver o cadastro. A empresa pode remover os dados pessoais de um motorista inativo a
            qualquer momento; o histórico operacional permanece sem identificá-lo.
          </li>
          <li>
            <strong>Cópias de segurança (backups):</strong> mantidas por <Placeholder>prazo de retenção dos backups</Placeholder> e depois descartadas.
          </li>
        </ul>

        <H2 id="direitos">7. Seus direitos</H2>
        <p>
          Pela LGPD (art. 18), você pode pedir: confirmação de que tratamos seus dados; acesso a eles; correção de dados incompletos ou desatualizados;
          anonimização, bloqueio ou eliminação de dados desnecessários; portabilidade; informação sobre com quem compartilhamos; e revisão de consentimento,
          quando for o caso. Você também pode reclamar à Autoridade Nacional de Proteção de Dados (ANPD).
        </p>
        <p>No próprio RotaGest, em “Minha conta”, você pode:</p>
        <ul>
          <li>
            <strong>Baixar meus dados</strong> — um arquivo com seu cadastro, vínculos, sessões, convites e ações registradas em seu nome;
          </li>
          <li>
            <strong>Excluir minha conta</strong> — com confirmação de senha.
          </li>
        </ul>
        <p>
          Para os demais pedidos, escreva para o e-mail de suporte informado no aplicativo ou para o encarregado (seção 12). Se o seu dado foi cadastrado por uma
          empresa cliente (por exemplo, você é motorista), encaminharemos o pedido a ela, que é a controladora, e apoiaremos a resposta.
        </p>

        <H2 id="seguranca">8. Segurança</H2>
        <ul>
          <li>toda a comunicação é criptografada em trânsito (HTTPS/TLS);</li>
          <li>senhas guardadas apenas como hash; sessões com tokens de curta duração;</li>
          <li>
            isolamento entre empresas: cada empresa só enxerga os próprios dados, com verificação na aplicação e também no banco de dados (row-level security);
          </li>
          <li>permissões por papel (proprietário, gestor, financeiro e motorista);</li>
          <li>registro de auditoria das ações relevantes;</li>
          <li>cópias de segurança periódicas.</li>
        </ul>
        <p>
          Nenhum sistema é totalmente imune a incidentes. Se ocorrer um incidente que possa causar risco ou dano relevante, comunicaremos os titulares afetados e
          a ANPD, conforme a lei.
        </p>

        <H2 id="suporte">9. Acesso do suporte</H2>
        <p>
          A equipe de suporte do RotaGest <strong>não acessa os dados de uma empresa sem autorização do proprietário</strong>. O proprietário pode liberar o
          acesso em “Configurações → Acesso do suporte”, por um prazo limitado (até 72 horas), informando o motivo. Durante esse período o acesso é somente
          leitura, cada página consultada fica registrada e o proprietário pode ver esse registro e revogar a autorização a qualquer momento.
        </p>

        <H2 id="cookies">10. Cookies</H2>
        <p>
          Usamos apenas um cookie essencial, necessário para manter você conectado com segurança (cookie de sessão/renovação de acesso, protegido contra leitura
          por scripts). Não usamos cookies de publicidade, de rastreamento ou de análise de terceiros.
        </p>

        <H2 id="alteracoes">11. Alterações desta política</H2>
        <p>
          Podemos atualizar esta política para refletir mudanças no serviço ou na lei. A data de vigência no topo sempre indica a versão atual. Mudanças
          relevantes serão avisadas no aplicativo ou por e-mail antes de entrarem em vigor.
        </p>

        <H2 id="contato">12. Contato e encarregado</H2>
        <p>
          Encarregado pelo tratamento de dados pessoais (DPO): <Placeholder>nome do encarregado</Placeholder>, e-mail <Placeholder>e-mail do encarregado</Placeholder>.
        </p>
        <p>
          Controlador dos dados de conta: <Placeholder>razão social</Placeholder>, CNPJ <Placeholder>CNPJ</Placeholder>.
        </p>
      </article>
    </div>
  );
}
