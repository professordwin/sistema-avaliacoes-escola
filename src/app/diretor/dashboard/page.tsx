'use client'

import { useState, useEffect } from 'react'

interface Stats {
  totais: { provas: number; questoes: number; professores: number }
  provasPorStatus: { rascunho: number; aguardando: number; aprovada: number; aplicada: number }
  provasRecentes: { id: string; status: string; criado_em: string; disciplinas?: { nome: string } }[]
  professores: { id: string; nome: string; email: string }[]
  disciplinas: { id: string; nome: string; cor_hex: string }[]
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
    id: string; nota: number; acertos: number; erros: number
    aluno: { nome: string; turma: string; serie: string } | null
  }[]
}

const STATUS_LABEL: Record<string, { label: string; cor: string }> = {
  rascunho: { label: 'Rascunho', cor: 'bg-gray-100 text-gray-600' },
  aguardando_aprovacao: { label: 'Aguardando', cor: 'bg-yellow-100 text-yellow-700' },
  aprovada: { label: 'Aprovada', cor: 'bg-green-100 text-green-700' },
  aplicada: { label: 'Aplicada', cor: 'bg-blue-100 text-blue-700' },
}

export default function DiretorDashboard() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [resultados, setResultados] = useState<ResultadoProva[]>([])
  const [carregando, setCarregando] = useState(true)
  const [aba, setAba] = useState<'visao' | 'resultados'>('visao')
  const [provaAberta, setProvaAberta] = useState<string | null>(null)

  useEffect(() => {
    Promise.all([
      fetch('/api/diretor/stats').then(r => r.json()),
      fetch('/api/coordenador/resultados').then(r => r.json()),
    ]).then(([statsData, resultadosData]) => {
      setStats(statsData)
      setResultados(Array.isArray(resultadosData) ? resultadosData : [])
      setCarregando(false)
    })
  }, [])

  if (carregando) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"/>
        <p className="text-gray-500 text-sm">Carregando painel...</p>
      </div>
    </div>
  )

  const totalCorrigidos = resultados.reduce((a, r) => a + r.total_corrigidos, 0)
  const totalAprovados = resultados.reduce((a, r) => a + r.aprovados, 0)
  const mediaGeral = resultados.filter(r => r.media !== null).length > 0
    ? parseFloat((resultados.filter(r => r.media !== null).reduce((a, r) => a + (r.media ?? 0), 0) / resultados.filter(r => r.media !== null).length).toFixed(1))
    : null

  const corNota = (nota: number) => nota >= 7 ? 'text-green-600' : nota >= 5 ? 'text-yellow-600' : 'text-red-600'
  const bgNota = (nota: number) => nota >= 7 ? 'bg-green-50 border-green-200' : nota >= 5 ? 'bg-yellow-50 border-yellow-200' : 'bg-red-50 border-red-200'

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-700 rounded-lg flex items-center justify-center">
            <span className="text-white text-sm font-bold">A</span>
          </div>
          <span className="font-semibold text-gray-900">AvaliaEscola</span>
          <span className="text-gray-400">›</span>
          <span className="text-gray-600 text-sm">Painel do Diretor</span>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">Visão Geral da Escola</h1>
        <p className="text-gray-500 text-sm mb-6">Acompanhe o desempenho institucional em tempo real.</p>

        {/* Cards principais */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-xl border p-5">
            <p className="text-3xl font-bold text-blue-700">{stats?.totais.provas ?? 0}</p>
            <p className="text-sm text-gray-500 mt-1">Total de provas</p>
          </div>
          <div className="bg-white rounded-xl border p-5">
            <p className="text-3xl font-bold text-amber-600">{stats?.totais.questoes ?? 0}</p>
            <p className="text-sm text-gray-500 mt-1">Questões no banco</p>
          </div>
          <div className="bg-white rounded-xl border p-5">
            <p className="text-3xl font-bold text-green-600">{totalCorrigidos}</p>
            <p className="text-sm text-gray-500 mt-1">Folhas corrigidas</p>
          </div>
          <div className="bg-white rounded-xl border p-5">
            <p className={`text-3xl font-bold ${mediaGeral !== null ? corNota(mediaGeral) : 'text-gray-300'}`}>
              {mediaGeral ?? '—'}
            </p>
            <p className="text-sm text-gray-500 mt-1">Média geral</p>
          </div>
        </div>

        {/* Abas */}
        <div className="flex gap-2 mb-6">
          <button onClick={() => setAba('visao')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${aba === 'visao' ? 'bg-blue-700 text-white' : 'bg-white border text-gray-600 hover:bg-gray-50'}`}>
            🏫 Visão Geral
          </button>
          <button onClick={() => setAba('resultados')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${aba === 'resultados' ? 'bg-blue-700 text-white' : 'bg-white border text-gray-600 hover:bg-gray-50'}`}>
            📊 Resultados por Prova
          </button>
        </div>

        {/* ABA VISÃO GERAL */}
        {aba === 'visao' && (
          <>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
              <div className="bg-white rounded-xl border p-6">
                <h2 className="font-semibold text-gray-900 mb-4">Status das Provas</h2>
                <div className="space-y-3">
                  {[
                    { label: 'Rascunho', valor: stats?.provasPorStatus.rascunho ?? 0, cor: 'bg-gray-200', texto: 'text-gray-600' },
                    { label: 'Aguardando', valor: stats?.provasPorStatus.aguardando ?? 0, cor: 'bg-yellow-400', texto: 'text-yellow-700' },
                    { label: 'Aprovadas', valor: stats?.provasPorStatus.aprovada ?? 0, cor: 'bg-green-500', texto: 'text-green-700' },
                    { label: 'Aplicadas', valor: stats?.provasPorStatus.aplicada ?? 0, cor: 'bg-blue-500', texto: 'text-blue-700' },
                  ].map(item => (
                    <div key={item.label}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className={item.texto}>{item.label}</span>
                        <span className="font-medium text-gray-700">{item.valor}</span>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-2">
                        <div className={`${item.cor} h-2 rounded-full`}
                          style={{ width: `${stats?.totais.provas ? (item.valor / stats.totais.provas) * 100 : 0}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-white rounded-xl border p-6">
                <h2 className="font-semibold text-gray-900 mb-4">Disciplinas Ativas</h2>
                <div className="space-y-3">
                  {stats?.disciplinas.map(d => (
                    <div key={d.id} className="flex items-center gap-3">
                      <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: d.cor_hex }} />
                      <span className="text-sm text-gray-700">{d.nome}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-white rounded-xl border p-6">
                <h2 className="font-semibold text-gray-900 mb-4">Professores</h2>
                <div className="space-y-3">
                  {stats?.professores.map(p => (
                    <div key={p.id} className="flex items-center gap-3">
                      <div className="w-7 h-7 bg-indigo-100 rounded-full flex items-center justify-center flex-shrink-0">
                        <span className="text-indigo-700 text-xs font-bold">{p.nome[0]}</span>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-800">{p.nome}</p>
                        <p className="text-xs text-gray-400">{p.email}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl border p-6 mb-6">
              <h2 className="font-semibold text-gray-900 mb-4">Provas Recentes</h2>
              <div className="space-y-3">
                {stats?.provasRecentes.map(p => (
                  <div key={p.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                    <div className="flex items-center gap-3">
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${STATUS_LABEL[p.status]?.cor}`}>
                        {STATUS_LABEL[p.status]?.label}
                      </span>
                      {p.disciplinas && <span className="text-xs px-2 py-1 bg-indigo-50 text-indigo-700 rounded-full">{p.disciplinas.nome}</span>}
                    </div>
                    <span className="text-xs text-gray-400">{new Date(p.criado_em).toLocaleDateString('pt-BR')}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <a href="/coordenador/dashboard" className="bg-purple-600 hover:bg-purple-700 text-white rounded-xl p-4 text-center transition block">
                <p className="text-2xl mb-1">📋</p>
                <p className="font-medium text-sm">Painel do Coordenador</p>
              </a>
              <button onClick={() => setAba('resultados')} className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl p-4 text-center transition">
                <p className="text-2xl mb-1">📊</p>
                <p className="font-medium text-sm">Ver Resultados por Prova</p>
              </button>
            </div>
          </>
        )}

        {/* ABA RESULTADOS */}
        {aba === 'resultados' && (
          <div className="space-y-4">
            {/* Resumo geral */}
            <div className="grid grid-cols-3 gap-4 mb-2">
              <div className="bg-white rounded-xl border p-4 text-center">
                <p className="text-2xl font-bold text-blue-600">{totalCorrigidos}</p>
                <p className="text-xs text-gray-500 mt-1">Total corrigido</p>
              </div>
              <div className="bg-white rounded-xl border p-4 text-center">
                <p className="text-2xl font-bold text-green-600">{totalAprovados}</p>
                <p className="text-xs text-gray-500 mt-1">Aprovados</p>
              </div>
              <div className="bg-white rounded-xl border p-4 text-center">
                <p className={`text-2xl font-bold ${mediaGeral !== null ? corNota(mediaGeral) : 'text-gray-300'}`}>
                  {mediaGeral ?? '—'}
                </p>
                <p className="text-xs text-gray-500 mt-1">Média geral</p>
              </div>
            </div>

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
                        <p className="text-xs text-gray-400 mt-1">{prova.total_corrigidos} folha(s)</p>
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
      </main>
    </div>
  )
}