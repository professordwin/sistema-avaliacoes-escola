'use client'

import { useState, useEffect, useCallback } from 'react'

interface Prova {
  id: string
  titulo: string
  status: string
  instrucoes?: string
  tempo_minutos?: number
  criado_em: string
  disciplinas?: { nome: string; cor_hex: string; area_conhecimento: string }
  usuarios?: { nome: string; email: string }
  prova_questoes?: { id: string }[]
}

const STATUS_LABEL: Record<string, { label: string; cor: string }> = {
  aguardando_aprovacao: { label: 'Aguardando', cor: 'bg-yellow-100 text-yellow-700' },
  aprovada: { label: 'Aprovada', cor: 'bg-green-100 text-green-700' },
  aplicada: { label: 'Aplicada', cor: 'bg-blue-100 text-blue-700' },
  rascunho: { label: 'Devolvida', cor: 'bg-red-100 text-red-600' },
}

export default function CoordenadorDashboard() {
  const [provas, setProvas] = useState<Prova[]>([])
  const [provaSelecionada, setProvaSelecionada] = useState<Prova | null>(null)
  const [comentario, setComentario] = useState('')
  const [carregando, setCarregando] = useState(false)
  const [sucesso, setSucesso] = useState('')
  const [filtro, setFiltro] = useState<'todas' | 'aguardando' | 'aprovada'>('aguardando')

  const carregar = useCallback(async () => {
    const res = await fetch('/api/coordenador/provas')
    const data = await res.json()
    setProvas(Array.isArray(data) ? data : [])
  }, [])

  useEffect(() => { carregar() }, [carregar])

  async function agir(id: string, acao: 'aprovar' | 'reprovar') {
    setCarregando(true)
    setSucesso('')
    await fetch(`/api/coordenador/provas/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ acao, comentario })
    })
    setSucesso(acao === 'aprovar' ? 'Prova aprovada com sucesso!' : 'Prova devolvida ao professor.')
    setProvaSelecionada(null)
    setComentario('')
    carregar()
    setCarregando(false)
    setTimeout(() => setSucesso(''), 3000)
  }

  const provasFiltradas = provas.filter(p => {
    if (filtro === 'aguardando') return p.status === 'aguardando_aprovacao'
    if (filtro === 'aprovada') return p.status === 'aprovada' || p.status === 'aplicada'
    return true
  })

  const pendentes = provas.filter(p => p.status === 'aguardando_aprovacao').length

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-purple-600 rounded-lg flex items-center justify-center">
            <span className="text-white text-sm font-bold">A</span>
          </div>
          <span className="font-semibold text-gray-900">AvaliaEscola</span>
          <span className="text-gray-400">›</span>
          <span className="text-gray-600 text-sm">Painel do Coordenador</span>
        </div>
        <form action="/api/auth/signout" method="post">
          <button className="text-sm text-gray-500 hover:text-gray-700">Sair</button>
        </form>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8">
        {/* Cards de resumo */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <p className="text-2xl font-bold text-yellow-600">{pendentes}</p>
            <p className="text-sm text-gray-500 mt-1">Aguardando aprovação</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <p className="text-2xl font-bold text-green-600">
              {provas.filter(p => p.status === 'aprovada').length}
            </p>
            <p className="text-sm text-gray-500 mt-1">Aprovadas</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <p className="text-2xl font-bold text-blue-600">
              {provas.filter(p => p.status === 'aplicada').length}
            </p>
            <p className="text-sm text-gray-500 mt-1">Aplicadas</p>
          </div>
        </div>

        {sucesso && (
          <div className="mb-4 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm">
            {sucesso}
          </div>
        )}

        {/* Filtros */}
        <div className="flex gap-2 mb-4">
          {[
            { id: 'aguardando', label: `⏳ Pendentes (${pendentes})` },
            { id: 'aprovada', label: '✅ Aprovadas' },
            { id: 'todas', label: '📋 Todas' },
          ].map(f => (
            <button key={f.id} onClick={() => setFiltro(f.id as typeof filtro)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${filtro === f.id ? 'bg-purple-600 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
              {f.label}
            </button>
          ))}
        </div>

        {/* Lista de provas */}
        {provasFiltradas.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
            <p className="text-4xl mb-3">✅</p>
            <p className="text-gray-500">Nenhuma prova pendente de aprovação.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {provasFiltradas.map(p => (
              <div key={p.id} className="bg-white rounded-xl border border-gray-200 p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900 mb-1">{p.titulo}</h3>
                    <div className="flex gap-2 flex-wrap">
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${STATUS_LABEL[p.status]?.cor}`}>
                        {STATUS_LABEL[p.status]?.label}
                      </span>
                      {p.disciplinas && (
                        <span className="text-xs px-2 py-1 rounded-full bg-indigo-50 text-indigo-700 font-medium">
                          {p.disciplinas.nome}
                        </span>
                      )}
                      <span className="text-xs text-gray-500 self-center">
                        {p.prova_questoes?.length ?? 0} questão(ões)
                      </span>
                      {p.tempo_minutos && (
                        <span className="text-xs text-gray-500 self-center">
                          · {p.tempo_minutos} min
                        </span>
                      )}
                    </div>
                    {p.usuarios && (
                      <p className="text-xs text-gray-400 mt-2">
                        Professor: <span className="text-gray-600">{p.usuarios.nome}</span>
                      </p>
                    )}
                  </div>

                  {p.status === 'aguardando_aprovacao' && (
                    <button onClick={() => { setProvaSelecionada(p); setComentario('') }}
                      className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm rounded-lg font-medium transition-colors flex-shrink-0">
                      Revisar
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Modal de revisão */}
        {provaSelecionada && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6">
              <h3 className="font-semibold text-gray-900 text-lg mb-1">Revisar Prova</h3>
              <p className="text-gray-500 text-sm mb-4">{provaSelecionada.titulo}</p>

              <div className="bg-gray-50 rounded-lg p-3 mb-4 text-sm space-y-1">
                <p><span className="text-gray-500">Disciplina:</span> <span className="font-medium">{provaSelecionada.disciplinas?.nome}</span></p>
                <p><span className="text-gray-500">Professor:</span> <span className="font-medium">{provaSelecionada.usuarios?.nome}</span></p>
                <p><span className="text-gray-500">Questões:</span> <span className="font-medium">{provaSelecionada.prova_questoes?.length}</span></p>
                {provaSelecionada.instrucoes && (
                  <p><span className="text-gray-500">Instruções:</span> <span className="font-medium">{provaSelecionada.instrucoes}</span></p>
                )}
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Comentário para o professor (opcional)
                </label>
                <textarea value={comentario} onChange={e => setComentario(e.target.value)}
                  rows={3} placeholder="Ex: Revisar questão 3, enunciado confuso..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"/>
              </div>

              <div className="flex gap-3">
                <button onClick={() => agir(provaSelecionada.id, 'reprovar')}
                  disabled={carregando}
                  className="flex-1 py-3 border-2 border-red-300 text-red-600 hover:bg-red-50 font-semibold rounded-lg transition-colors text-sm">
                  ✕ Devolver
                </button>
                <button onClick={() => agir(provaSelecionada.id, 'aprovar')}
                  disabled={carregando}
                  className="flex-1 py-3 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg transition-colors text-sm">
                  ✓ Aprovar
                </button>
              </div>

              <button onClick={() => setProvaSelecionada(null)}
                className="w-full mt-3 py-2 text-sm text-gray-500 hover:text-gray-700">
                Cancelar
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}