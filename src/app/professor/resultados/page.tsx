'use client'

import { useState, useEffect } from 'react'

interface ResultadoAluno {
  id: string
  nota: number
  acertos: number
  erros: number
  nao_respondidas: number
  corrigido_em: string
  aluno: { nome: string; turma: string; serie: string } | null
}

interface ProvaResultado {
  id: string
  titulo: string
  criado_em: string
  disciplina: { nome: string; cor_hex: string } | null
  total_corrigidos: number
  media: number | null
  maior_nota: number | null
  menor_nota: number | null
  aprovados: number
  reprovados: number
  resultados: ResultadoAluno[]
}

export default function ResultadosPage() {
  const [provas, setProvas] = useState<ProvaResultado[]>([])
  const [carregando, setCarregando] = useState(true)
  const [provaAberta, setProvaAberta] = useState<string | null>(null)
  const [filtroTurma, setFiltroTurma] = useState('')

  useEffect(() => {
    fetch('/api/professor/resultados')
      .then(r => r.json())
      .then(d => { setProvas(Array.isArray(d) ? d : []); setCarregando(false) })
      .catch(() => setCarregando(false))
  }, [])

  const corNota = (nota: number) => {
    if (nota >= 7) return 'text-green-600'
    if (nota >= 5) return 'text-yellow-600'
    return 'text-red-600'
  }

  const bgNota = (nota: number) => {
    if (nota >= 7) return 'bg-green-50 border-green-200'
    if (nota >= 5) return 'bg-yellow-50 border-yellow-200'
    return 'bg-red-50 border-red-200'
  }

  if (carregando) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <p className="text-gray-500">Carregando resultados...</p>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">📊 Resultados</h1>
          <p className="text-sm text-gray-500 mt-0.5">Desempenho das turmas por prova</p>
        </div>
        <a href="/professor/dashboard" className="text-sm text-indigo-600 hover:underline">← Painel</a>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8 space-y-6">

        {provas.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-2xl border">
            <p className="text-4xl mb-3">📭</p>
            <p className="font-semibold text-gray-700">Nenhum resultado ainda</p>
            <p className="text-gray-400 text-sm mt-1">Corrija folhas de resposta para ver os resultados aqui</p>
            <a href="/professor/provas" className="inline-block mt-4 px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm">
              Ir para Provas
            </a>
          </div>
        ) : (
          provas.map(prova => (
            <div key={prova.id} className="bg-white rounded-2xl border overflow-hidden">

              {/* Cabeçalho da prova */}
              <div
                className="p-5 cursor-pointer hover:bg-gray-50 transition"
                onClick={() => setProvaAberta(provaAberta === prova.id ? null : prova.id)}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      {prova.disciplina && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 font-medium">
                          {prova.disciplina.nome}
                        </span>
                      )}
                    </div>
                    <h2 className="font-semibold text-gray-900 text-lg">{prova.titulo}</h2>
                    <p className="text-xs text-gray-400 mt-1">
                      {prova.total_corrigidos} folha(s) corrigida(s)
                    </p>
                  </div>

                  <div className="flex items-center gap-6 text-center">
                    {/* Média */}
                    <div>
                      <p className="text-xs text-gray-400 mb-1">Média</p>
                      <p className={`text-2xl font-bold ${prova.media !== null ? corNota(prova.media) : 'text-gray-300'}`}>
                        {prova.media ?? '—'}
                      </p>
                    </div>

                    {/* Maior */}
                    <div>
                      <p className="text-xs text-gray-400 mb-1">Maior</p>
                      <p className="text-lg font-semibold text-green-600">{prova.maior_nota ?? '—'}</p>
                    </div>

                    {/* Menor */}
                    <div>
                      <p className="text-xs text-gray-400 mb-1">Menor</p>
                      <p className="text-lg font-semibold text-red-500">{prova.menor_nota ?? '—'}</p>
                    </div>

                    {/* Aprovados */}
                    <div>
                      <p className="text-xs text-gray-400 mb-1">Aprovados</p>
                      <p className="text-lg font-semibold text-gray-700">
                        {prova.aprovados}/{prova.total_corrigidos}
                      </p>
                    </div>

                    <span className="text-gray-400 text-lg ml-2">
                      {provaAberta === prova.id ? '▲' : '▼'}
                    </span>
                  </div>
                </div>

                {/* Barra de aprovação */}
                {prova.total_corrigidos > 0 && (
                  <div className="mt-4">
                    <div className="flex justify-between text-xs text-gray-400 mb-1">
                      <span>{prova.aprovados} aprovados</span>
                      <span>{prova.reprovados} reprovados</span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-green-500 rounded-full transition-all"
                        style={{ width: `${(prova.aprovados / prova.total_corrigidos) * 100}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Tabela de alunos */}
              {provaAberta === prova.id && (
                <div className="border-t">
                  {/* Filtro de turma */}
                  {prova.resultados.length > 0 && (
                    <div className="px-5 py-3 bg-gray-50 border-b flex gap-2 flex-wrap">
                      <button
                        onClick={() => setFiltroTurma('')}
                        className={`px-3 py-1 rounded-full text-xs font-medium transition ${!filtroTurma ? 'bg-indigo-600 text-white' : 'bg-white border text-gray-600'}`}
                      >
                        Todas as turmas
                      </button>
                      {[...new Set(prova.resultados.map(r => r.aluno?.turma).filter(Boolean))].map(turma => (
                        <button
                          key={turma}
                          onClick={() => setFiltroTurma(turma!)}
                          className={`px-3 py-1 rounded-full text-xs font-medium transition ${filtroTurma === turma ? 'bg-indigo-600 text-white' : 'bg-white border text-gray-600'}`}
                        >
                          Turma {turma}
                        </button>
                      ))}
                    </div>
                  )}

                  {prova.resultados.length === 0 ? (
                    <div className="p-8 text-center text-gray-400 text-sm">
                      Nenhuma folha corrigida para esta prova ainda.
                    </div>
                  ) : (
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-gray-50 border-b">
                          <th className="text-left px-5 py-3 font-semibold text-gray-600">Aluno</th>
                          <th className="text-left px-5 py-3 font-semibold text-gray-600">Turma</th>
                          <th className="text-center px-5 py-3 font-semibold text-gray-600">Acertos</th>
                          <th className="text-center px-5 py-3 font-semibold text-gray-600">Erros</th>
                          <th className="text-center px-5 py-3 font-semibold text-gray-600">Branco</th>
                          <th className="text-center px-5 py-3 font-semibold text-gray-600">Nota</th>
                          <th className="text-center px-5 py-3 font-semibold text-gray-600">Situação</th>
                        </tr>
                      </thead>
                      <tbody>
                        {prova.resultados
                          .filter(r => !filtroTurma || r.aluno?.turma === filtroTurma)
                          .sort((a, b) => b.nota - a.nota)
                          .map((r, i) => (
                            <tr key={r.id} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                              <td className="px-5 py-3 font-medium text-gray-800">
                                {r.aluno?.nome ?? '—'}
                              </td>
                              <td className="px-5 py-3">
                                {r.aluno ? (
                                  <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full text-xs font-medium">
                                    {r.aluno.turma}
                                  </span>
                                ) : '—'}
                              </td>
                              <td className="px-5 py-3 text-center text-green-600 font-medium">{r.acertos}</td>
                              <td className="px-5 py-3 text-center text-red-500 font-medium">{r.erros}</td>
                              <td className="px-5 py-3 text-center text-gray-400">{r.nao_respondidas}</td>
                              <td className="px-5 py-3 text-center">
                                <span className={`inline-block px-3 py-1 rounded-full font-bold border text-sm ${bgNota(r.nota)} ${corNota(r.nota)}`}>
                                  {r.nota}
                                </span>
                              </td>
                              <td className="px-5 py-3 text-center">
                                {r.nota >= 6 ? (
                                  <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full font-medium">Aprovado</span>
                                ) : (
                                  <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded-full font-medium">Reprovado</span>
                                )}
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </main>
    </div>
  )
}