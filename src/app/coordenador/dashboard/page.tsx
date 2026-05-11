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

interface ResultadoProva {
  id: string
  titulo: string
  disciplina: { nome: string; cor_hex: string } | null
  total_corrigidos: number
  media: number | null
  maior_nota: number | null
  menor_nota: number | null
  aprovados: number
  reprovados: number
  resultados: {
    id: string
    nota: number
    acertos: number
    erros: number
    aluno: { nome: string; turma: string; serie: string } | null
  }[]
}

const STATUS_LABEL: Record<string, { label: string; cor: string }> = {
  aguardando_aprovacao: { label: 'Aguardando', cor: 'bg-yellow-100 text-yellow-700' },
  aprovada: { label: 'Aprovada', cor: 'bg-green-100 text-green-700' },
  aplicada: { label: 'Aplicada', cor: 'bg-blue-100 text-blue-700' },
  rascunho: { label: 'Devolvida', cor: 'bg-red-100 text-red-600' },
}

export default function CoordenadorDashboard() {
  const [provas, setProvas] = useState<Prova[]>([])
  const [resultados, setResultados] = useState<ResultadoProva[]>([])
  const [provaSelecionada, setProvaSelecionada] = useState<Prova | null>(null)
  const [comentario, setComentario] = useState('')
  const [carregando, setCarregando] = useState(false)
  const [sucesso, setSucesso] = useState('')
  const [filtro, setFiltro] = useState<'todas' | 'aguardando' | 'aprovada'>('aguardando')
  const [aba, setAba] = useState<'provas' | 'resultados'>('provas')
  const [provaAberta, setProvaAberta] = useState<string | null>(null)

  const carregar = useCallback(async () => {
    const [provasRes, resultadosRes] = await Promise.all([
      fetch('/api/coordenador/provas'),
      fetch('/api/coordenador/resultados'),
    ])
    const provasData = await provasRes.json()
    const resultadosData = await resultadosRes.json()
    setProvas(Array.isArray(provasData) ? provasData : [])
    setResultados(Array.isArray(resultadosData) ? resultadosData : [])
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
    setSucesso(acao === 'aprovar' ? 'Prova aprovada!' : 'Prova devolvida ao professor.')
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
  const totalCorrigidos = resultados.reduce((a, r) => a + r.total_corrigidos, 0)
  const totalAprovados = resultados.reduce((a, r) => a + r.aprovados, 0)

  const corNota = (nota: number) => nota >= 7 ? 'text-green-600' : nota >= 5 ? 'text-yellow-600' : 'text-red-600'
  const bgNota = (nota: number) => nota >= 7 ? 'bg-green-50 border-green-200' : nota >= 5 ? 'bg-yellow-50 border-yellow-200' : 'bg-red-50 border-red-200'

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
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-xl border p-5">
            <p className="text-2xl font-bold text-yellow-600">{pendentes}</p>
            <p className="text-sm text-gray-500 mt-1">Aguardando aprovação</p>
          </div>
          <div className="bg-white rounded-xl border p-5">
            <p className="text-2xl font-bold text-green-600">{provas.filter(p => p.status === 'aprovada').length}</p>
            <p className="text-sm text-gray-500 mt-1">Aprovadas</p>
          </div>
          <div className="bg-white rounded-xl border p-5">
            <p className="text-2xl font-bold text-blue-600">{totalCorrigidos}</p>
            <p className="text-sm text-gray-500 mt-1">Folhas corrigidas</p>
          </div>
          <div className="bg-white rounded-xl border p-5">
            <p className="text-2xl font-bold text-indigo-600">{totalAprovados}</p>
            <p className="text-sm text-gray-500 mt-1">Alunos aprovados</p>
          </div>
        </div>

        {sucesso && (
          <div className="mb-4 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm">{sucesso}</div>
        )}

        {/* Abas */}
        <div className="flex gap-2 mb-6">
          <button onClick={() => setAba('provas')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${aba === 'provas' ? 'bg-purple-600 text-white' : 'bg-white border text-gray-600 hover:bg-gray-50'}`}>
            📋 Provas {pendentes > 0 && <span className="ml-1 bg-yellow-400 text-yellow-900 text-xs px-1.5 rounded-full">{pendentes}</span>}
          </button>
          <button onClick={() => setAba('resultados')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${aba === 'resultados' ? 'bg-purple-600 text-white' : 'bg-white border text-gray-600 hover:bg-gray-50'}`}>
            📊 Resultados Consolidados
          </button>
        </div>

        {/* ABA PROVAS */}
        {aba === 'provas' && (
          <>
            <div className="flex gap-2 mb-4">
              {[
                { id: 'aguardando', label: `⏳ Pendentes (${pendentes})` },
                { id: 'aprovada', label: '✅ Aprovadas' },
                { id: 'todas', label: '📋 Todas' },
              ].map(f => (
                <button key={f.id} onClick={() => setFiltro(f.id as typeof filtro)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition ${filtro === f.id ? 'bg-purple-600 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                  {f.label}
                </button>
              ))}
            </div>

            {provasFiltradas.length === 0 ? (
              <div className="bg-white rounded-xl border p-12 text-center">
                <p className="text-4xl mb-3">✅</p>
                <p className="text-gray-500">Nenhuma prova nesta categoria.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {provasFiltradas.map(p => (
                  <div key={p.id} className="bg-white rounded-xl border p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900 mb-1">{p.titulo}</h3>
                        <div className="flex gap-2 flex-wrap">
                          <span className={`text-xs px-2 py-1 rounded-full font-medium ${STATUS_LABEL[p.status]?.cor}`}>
                            {STATUS_LABEL[p.status]?.label}
                          </span>
                          {p.disciplinas && (
                            <span className="text-xs px-2 py-1 rounded-full bg-indigo-50 text-indigo-700 font-medium">{p.disciplinas.nome}</span>
                          )}
                          <span className="text-xs text-gray-500 self-center">{p.prova_questoes?.length ?? 0} questão(ões)</span>
                        </div>
                        {p.usuarios && <p className="text-xs text-gray-400 mt-2">Professor: <span className="text-gray-600">{p.usuarios.nome}</span></p>}
                      </div>
                      {p.status === 'aguardando_aprovacao' && (
                        <button onClick={() => { setProvaSelecionada(p); setComentario('') }}
                          className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm rounded-lg font-medium flex-shrink-0">
                          Revisar
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* ABA RESULTADOS */}
        {aba === 'resultados' && (
          <div className="space-y-4">
            {resultados.length === 0 ? (
              <div className="bg-white rounded-xl border p-12 text-center">
                <p className="text-4xl mb-3">📭</p>
                <p className="text-gray-500">Nenhum resultado ainda.</p>
              </div>
            ) : (
              resultados.map(prova => (
                <div key={prova.id} className="bg-white rounded-2xl border overflow-hidden">
                  <div className="p-5 cursor-pointer hover:bg-gray-50 transition"
                    onClick={() => setProvaAberta(provaAberta === prova.id ? null : prova.id)}>
                    <div className="flex items-start justify-between">
                      <div>
                        {prova.disciplina && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 font-medium mb-1 inline-block">
                            {prova.disciplina.nome}
                          </span>
                        )}
                        <h2 className="font-semibold text-gray-900 text-lg">{prova.titulo}</h2>
                        <p className="text-xs text-gray-400 mt-1">{prova.total_corrigidos} folha(s) corrigida(s)</p>
                      </div>
                      <div className="flex items-center gap-6 text-center">
                        <div>
                          <p className="text-xs text-gray-400 mb-1">Média</p>
                          <p className={`text-2xl font-bold ${prova.media !== null ? corNota(prova.media) : 'text-gray-300'}`}>
                            {prova.media ?? '—'}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-400 mb-1">Aprovados</p>
                          <p className="text-lg font-semibold text-gray-700">{prova.aprovados}/{prova.total_corrigidos}</p>
                        </div>
                        <span className="text-gray-400">{provaAberta === prova.id ? '▲' : '▼'}</span>
                      </div>
                    </div>

                    {prova.total_corrigidos > 0 && (
                      <div className="mt-3">
                        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div className="h-full bg-green-500 rounded-full"
                            style={{ width: `${(prova.aprovados / prova.total_corrigidos) * 100}%` }} />
                        </div>
                        <div className="flex justify-between text-xs text-gray-400 mt-1">
                          <span>{prova.aprovados} aprovados</span>
                          <span>{prova.reprovados} reprovados</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {provaAberta === prova.id && prova.resultados.length > 0 && (
                    <div className="border-t overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="bg-gray-50 border-b">
                            <th className="text-left px-5 py-3 font-semibold text-gray-600">Aluno</th>
                            <th className="text-left px-5 py-3 font-semibold text-gray-600">Turma</th>
                            <th className="text-center px-5 py-3 font-semibold text-gray-600">Acertos</th>
                            <th className="text-center px-5 py-3 font-semibold text-gray-600">Nota</th>
                            <th className="text-center px-5 py-3 font-semibold text-gray-600">Situação</th>
                          </tr>
                        </thead>
                        <tbody>
                          {prova.resultados.sort((a, b) => b.nota - a.nota).map((r, i) => (
                            <tr key={r.id} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                              <td className="px-5 py-3 font-medium text-gray-800">{r.aluno?.nome ?? '—'}</td>
                              <td className="px-5 py-3">
                                {r.aluno ? <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full text-xs font-medium">{r.aluno.turma}</span> : '—'}
                              </td>
                              <td className="px-5 py-3 text-center text-green-600 font-medium">{r.acertos}</td>
                              <td className="px-5 py-3 text-center">
                                <span className={`inline-block px-3 py-1 rounded-full font-bold border text-sm ${bgNota(r.nota)} ${corNota(r.nota)}`}>{r.nota}</span>
                              </td>
                              <td className="px-5 py-3 text-center">
                                {r.nota >= 6
                                  ? <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full font-medium">Aprovado</span>
                                  : <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded-full font-medium">Reprovado</span>}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {/* Modal */}
        {provaSelecionada && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6">
              <h3 className="font-semibold text-gray-900 text-lg mb-1">Revisar Prova</h3>
              <p className="text-gray-500 text-sm mb-4">{provaSelecionada.titulo}</p>
              <div className="bg-gray-50 rounded-lg p-3 mb-4 text-sm space-y-1">
                <p><span className="text-gray-500">Disciplina:</span> <span className="font-medium">{provaSelecionada.disciplinas?.nome}</span></p>
                <p><span className="text-gray-500">Professor:</span> <span className="font-medium">{provaSelecionada.usuarios?.nome}</span></p>
                <p><span className="text-gray-500">Questões:</span> <span className="font-medium">{provaSelecionada.prova_questoes?.length}</span></p>
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Comentário (opcional)</label>
                <textarea value={comentario} onChange={e => setComentario(e.target.value)} rows={3}
                  placeholder="Ex: Revisar questão 3..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500" />
              </div>
              <div className="flex gap-3">
                <button onClick={() => agir(provaSelecionada.id, 'reprovar')} disabled={carregando}
                  className="flex-1 py-3 border-2 border-red-300 text-red-600 hover:bg-red-50 font-semibold rounded-lg text-sm">
                  ✕ Devolver
                </button>
                <button onClick={() => agir(provaSelecionada.id, 'aprovar')} disabled={carregando}
                  className="flex-1 py-3 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg text-sm">
                  ✓ Aprovar
                </button>
              </div>
              <button onClick={() => setProvaSelecionada(null)} className="w-full mt-3 py-2 text-sm text-gray-500 hover:text-gray-700">
                Cancelar
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}