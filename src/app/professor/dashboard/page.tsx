import { createServerSupabaseClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export default async function ProfessorDashboard() {
  const supabase = await createServerSupabaseClient()

  // 🔐 Verificar usuário autenticado
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    redirect('/login')
  }

  // 📊 Buscar dados do usuário
  const { data: usuario, error: usuarioError } = await supabase
    .from('usuarios')
    .select('nome, papel, disciplinas')
    .eq('id', user.id)
    .single()

  // 🚫 Se erro ou não for professor → bloqueia
  if (usuarioError || !usuario || usuario.papel !== 'professor') {
    redirect('/login')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
            <span className="text-white text-sm font-bold">A</span>
          </div>
          <span className="font-semibold text-gray-900">AvaliaEscola</span>
        </div>

        <div className="text-sm text-gray-500">
          Olá,{' '}
          <span className="font-medium text-gray-900">
            {usuario.nome ?? 'Professor'}
          </span>
        </div>
      </header>

      {/* Conteúdo */}
      <main className="max-w-6xl mx-auto px-6 py-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Painel do Professor
        </h1>

        <p className="text-gray-500 mb-8">
          Bem-vindo ao sistema de avaliações. Use o menu abaixo para navegar.
        </p>

        {/* Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

          {/* Banco de Questões */}
          <Link
            href="/professor/questoes"
            className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-md transition-shadow block"
          >
            <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center mb-4">
              <span className="text-2xl">📝</span>
            </div>
            <h3 className="font-semibold text-gray-900 mb-1">
              Banco de Questões
            </h3>
            <p className="text-sm text-gray-500">
              Crie e gerencie questões por disciplina
            </p>
          </Link>

          {/* Minhas Provas */}
          <Link
            href="/professor/provas"
            className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-md transition-shadow block"
          >
            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mb-4">
              <span className="text-2xl">📋</span>
            </div>
            <h3 className="font-semibold text-gray-900 mb-1">
              Minhas Provas
            </h3>
            <p className="text-sm text-gray-500">
              Monte e envie provas para aprovação
            </p>
          </Link>

          {/* Resultados */}
          <Link
            href="/professor/resultados"
            className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-md transition-shadow block"
          >
            <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center mb-4">
              <span className="text-2xl">📊</span>
            </div>
            <h3 className="font-semibold text-gray-900 mb-1">
              Resultados
            </h3>
            <p className="text-sm text-gray-500">
              Acompanhe o desempenho das suas turmas
            </p>
          </Link>

        </div>

        {/* Status */}
        <div className="mt-8 bg-indigo-50 border border-indigo-200 rounded-xl p-4 flex items-center gap-3">
          <span className="text-indigo-600">ℹ️</span>
          <p className="text-sm text-indigo-700">
            Sistema em implantação. As funcionalidades serão ativadas progressivamente.
          </p>
        </div>
      </main>
    </div>
  )
}