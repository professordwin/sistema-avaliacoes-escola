import { createServerSupabaseClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

interface Usuario {
  id: string
  nome: string | null
  papel: string
  disciplinas?: string[] | null
}

interface DashboardCardProps {
  href: string
  title: string
  description: string
  icon: string
  iconBg: string
}

function DashboardCard({
  href,
  title,
  description,
  icon,
  iconBg,
}: DashboardCardProps) {
  return (
    <Link
      href={href}
      className="
        group bg-white rounded-2xl border border-gray-200 p-6
        hover:shadow-lg hover:border-indigo-200
        transition-all duration-200 block
      "
    >
      <div
        className={`
          w-14 h-14 rounded-2xl flex items-center justify-center mb-4
          ${iconBg}
        `}
      >
        <span className="text-2xl">{icon}</span>
      </div>

      <h3 className="font-semibold text-lg text-gray-900 mb-2 group-hover:text-indigo-600 transition-colors">
        {title}
      </h3>

      <p className="text-sm text-gray-500 leading-relaxed">
        {description}
      </p>
    </Link>
  )
}

export default async function ProfessorDashboard() {
  const supabase = await createServerSupabaseClient()

  // 🔐 Verificar autenticação
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    redirect('/login')
  }

  // 👤 Buscar dados do professor
  const { data: usuario, error: usuarioError } = await supabase
    .from('usuarios')
    .select('id, nome, papel, disciplinas')
    .eq('id', user.id)
    .single<Usuario>()

  // 🚫 Bloqueio de acesso
  if (usuarioError || !usuario || usuario.papel !== 'professor') {
    redirect('/login')
  }

  const disciplinas = usuario.disciplinas ?? []

  const cards = [
    {
      href: '/professor/questoes',
      title: 'Banco de Questões',
      description: 'Crie e organize questões por disciplina.',
      icon: '📝',
      iconBg: 'bg-amber-100',
    },
    {
      href: '/professor/provas',
      title: 'Minhas Provas',
      description: 'Monte avaliações e envie para aprovação.',
      icon: '📋',
      iconBg: 'bg-blue-100',
    },
    {
      href: '/professor/resultados',
      title: 'Resultados',
      description: 'Acompanhe o desempenho das turmas.',
      icon: '📊',
      iconBg: 'bg-green-100',
    },
    {
      href: '/professor/avaliacoes',
      title: 'Avaliações Multidisciplinares',
      description: 'Adicione questões nas avaliações compartilhadas.',
      icon: '🧠',
      iconBg: 'bg-purple-100',
    },
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      {/* HEADER */}
      <header className="sticky top-0 z-10 bg-white/90 backdrop-blur border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-sm">
              <span className="text-white font-bold">A</span>
            </div>

            <div>
              <h1 className="font-bold text-gray-900 leading-none">
                AvaliaEscola
              </h1>

              <span className="text-xs text-gray-500">
                Painel do Professor
              </span>
            </div>
          </div>

          {/* Usuário */}
          <div className="text-right">
            <p className="text-sm text-gray-500">Bem-vindo</p>

            <p className="font-semibold text-gray-900">
              {usuario.nome ?? 'Professor'}
            </p>
          </div>
        </div>
      </header>

      {/* CONTEÚDO */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Hero */}
        <section className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-3">
            Dashboard do Professor
          </h2>

          <p className="text-gray-600 max-w-3xl leading-relaxed">
            Gerencie avaliações, acompanhe resultados e organize suas questões
            em um único ambiente.
          </p>
        </section>

        {/* Informações rápidas */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-white border border-gray-200 rounded-2xl p-5">
            <p className="text-sm text-gray-500 mb-1">Perfil</p>

            <h3 className="font-semibold text-gray-900 capitalize">
              {usuario.papel}
            </h3>
          </div>

          <div className="bg-white border border-gray-200 rounded-2xl p-5">
            <p className="text-sm text-gray-500 mb-1">
              Disciplinas vinculadas
            </p>

            <h3 className="font-semibold text-gray-900">
              {disciplinas.length}
            </h3>
          </div>

          <div className="bg-white border border-gray-200 rounded-2xl p-5">
            <p className="text-sm text-gray-500 mb-1">Status do sistema</p>

            <h3 className="font-semibold text-emerald-600">
              Operacional
            </h3>
          </div>
        </section>

        {/* Lista de disciplinas */}
        {disciplinas.length > 0 && (
          <section className="mb-8">
            <div className="bg-white border border-gray-200 rounded-2xl p-6">
              <h3 className="font-semibold text-gray-900 mb-4">
                Suas disciplinas
              </h3>

              <div className="flex flex-wrap gap-2">
                {disciplinas.map((disciplina) => (
                  <span
                    key={disciplina}
                    className="
                      px-3 py-1.5 rounded-full text-sm
                      bg-indigo-100 text-indigo-700
                      font-medium
                    "
                  >
                    {disciplina}
                  </span>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Cards principais */}
        <section>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
            {cards.map((card) => (
              <DashboardCard
                key={card.href}
                href={card.href}
                title={card.title}
                description={card.description}
                icon={card.icon}
                iconBg={card.iconBg}
              />
            ))}
          </div>
        </section>

        {/* Aviso */}
        <section className="mt-10">
          <div className="bg-indigo-50 border border-indigo-200 rounded-2xl p-5 flex items-start gap-3">
            <div className="text-indigo-600 text-lg">ℹ️</div>

            <div>
              <h4 className="font-semibold text-indigo-900 mb-1">
                Sistema em implantação
              </h4>

              <p className="text-sm text-indigo-700 leading-relaxed">
                Novas funcionalidades serão liberadas progressivamente,
                incluindo correção automática, relatórios avançados e geração
                inteligente de avaliações.
              </p>
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}