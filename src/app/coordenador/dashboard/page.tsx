'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import Link from 'next/link'

interface Prova {
  id: string
  titulo: string
  status: string
  instrucoes?: string
  tempo_minutos?: number
  criado_em: string
  disciplinas?: {
    nome: string
    cor_hex: string
    area_conhecimento: string
  }
  usuarios?: {
    nome: string
    email: string
  }
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

type Filtro = 'todas' | 'aguardando' | 'aprovada'
type Aba = 'provas' | 'resultados'

const STATUS_LABEL: Record<string, { label: string; cor: string }> = {
  aguardando_aprovacao: { label: 'Aguardando', cor: 'bg-yellow-100 text-yellow-700' },
  aprovada: { label: 'Aprovada', cor: 'bg-green-100 text-green-700' },
  aplicada: { label: 'Aplicada', cor: 'bg-blue-100 text-blue-700' },
  rascunho: { label: 'Devolvida', cor: 'bg-red-100 text-red-600' },
}

function ResumoCard({ titulo, valor, cor }: { titulo: string; valor: number; cor: string }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
      <p className={`text-3xl font-bold ${cor}`}>{valor}</p>
      <p className="text-sm text-gray-500 mt-1">{titulo}</p>
    </div>
  )
}

export default function CoordenadorDashboard() {
  const [provas, setProvas] = useState<Prova[]>([])
  const [resultados, setResultados] = useState<ResultadoProva[]>([])
  const [provaSelecionada, setProvaSelecionada] = useState<Prova | null>(null)
  const [provaParaExcluir, setProvaParaExcluir] = useState<Prova | null>(null)
  const [comentario, setComentario] = useState('')
  const [carregando, setCarregando] = useState(false)
  const [excluindo, setExcluindo] = useState(false)
  const [erro, setErro] = useState('')
  const [sucesso, setSucesso] = useState('')
  const [filtro, setFiltro] = useState<Filtro>('aguardando')
  const [aba, setAba] = useState<Aba>('provas')
  const [provaAberta, setProvaAberta] = useState<string | null>(null)

  const carregar = useCallback(async () => {
    try {
      setErro('')
      const [provasRes, resultadosRes] = await Promise.all([
        fetch('/api/coordenador/provas'),
        fetch('/api/coordenador/resultados'),
      ])
      if (!provasRes.ok || !resultadosRes.ok) throw new Error('Erro ao carregar dados do dashboard.')
      setProvas(Array.isArray(await provasRes.json()) ? await provasRes.clone().json() : [])
      setResultados(Array.isArray(await resultadosRes.json()) ? await resultadosRes.clone().json() : [])
    } catch (err) {
      console.error(err)
      setErro('Não foi possível carregar os dados.')
    }
  }, [])

  // Versão correta do carregar sem clone
  const carregarDados = useCallback(async () => {
    try {
      setErro('')
      const [provasRes, resultadosRes] = await Promise.all([
        fetch('/api/coordenador/provas'),
        fetch('/api/coordenador/resultados'),
      ])
      if (!provasRes.ok || !resultadosRes.ok) throw new Error('Erro ao carregar dados do dashboard.')
      const provasData = await provasRes.json()
      const resultadosData = await resultadosRes.json()
      setProvas(Array.isArray(provasData) ? provasData : [])
      setResultados(Array.isArray(resultadosData) ? resultadosData : [])
    } catch (err) {
      console.error(err)
      setErro('Não foi possível carregar os dados.')
    }
  }, [])

  useEffect(() => { carregarDados() }, [carregarDados])

  async function agir(id: string, acao: 'aprovar' | 'reprovar') {
    try {
      setCarregando(true)
      setErro('')
      setSucesso('')
      const response = await fetch(`/api/coordenador/provas/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ acao, comentario }),
      })
      if (!response.ok) throw new Error('Falha ao atualizar prova.')
      setSucesso(acao === 'aprovar' ? 'Prova aprovada com sucesso.' : 'Prova devolvida ao professor.')
      setComentario('')
      setProvaSelecionada(null)
      await carregarDados()
      setTimeout(() => setSucesso(''), 3000)
    } catch (err) {
      console.error(err)
      setErro('Não foi possível concluir a ação.')
    } finally {
      setCarregando(false)
    }
  }

  async function excluirProva(id: string) {
    try {
      setExcluindo(true)
      setErro('')
      const response = await fetch(`/api/coordenador/provas/${id}`, { method: 'DELETE' })
      if (!response.ok) throw new Error('Falha ao excluir prova.')
      setSucesso('Prova excluída com sucesso.')
      setProvaParaExcluir(null)
      await carregarDados()
      setTimeout(() => setSucesso(''), 3000)
    } catch (err) {
      console.error(err)
      setErro('Não foi possível excluir a prova.')
    } finally {
      setExcluindo(false)
    }
  }

  const provasFiltradas = useMemo(() => {
    return provas.filter((p) => {
      if (filtro === 'aguardando') return p.status === 'aguardando_aprovacao'
      if (filtro === 'aprovada') return p.status === 'aprovada' || p.status === 'aplicada'
      return true
    })
  }, [provas, filtro])

  const pendentes = useMemo(() => provas.filter(p => p.status === 'aguardando_aprovacao').length, [provas])
  const aprovadas = useMemo(() => provas.filter(p => p.status === 'aprovada').length, [provas])
  const totalCorrigidos = useMemo(() => resultados.reduce((acc, r) => acc + r.total_corrigidos, 0), [resultados])
  const totalAprovados = useMemo(() => resultados.reduce((acc, r) => acc + r.aprovados, 0), [resultados])

  function corNota(nota: number) {
    if (nota >= 7) return 'text-green-600'
    if (nota >= 5) return 'text-yellow-600'
    return 'text-red-600'
  }

  function bgNota(nota: number) {
    if (nota >= 7) return 'bg-green-50 border-green-200'
    if (nota >= 5) return 'bg-yellow-50 border-yellow-200'
    return 'bg-red-50 border-red-200'
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* HEADER */}
      <header className="sticky top-0 z-20 bg-white/95 backdrop-blur border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-600 rounded-xl flex items-center justify-center shadow-sm">
              <span className="text-white font-bold">A</span>
            </div>
            <div>
              <h1 className="font-bold text-gray-900 leading-none">AvaliaEscola</h1>
              <p className="text-xs text-gray-500">Painel do Coordenador</p>
            </div>
          </div>
          <form action="/api/auth/signout" method="post">
            <button className="text-sm text-gray-500 hover:text-gray-700 transition">Sair</button>
          </form>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* TÍTULO */}
        <section className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">Dashboard de Coordenação</h2>
          <p className="text-gray-500">Gerencie aprovações, acompanhe desempenho acadêmico e supervise avaliações.</p>
        </section>

        {/* RESUMO */}
        <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
          <ResumoCard titulo="Aguardando aprovação" valor={pendentes} cor="text-yellow-600" />
          <ResumoCard titulo="Provas aprovadas" valor={aprovadas} cor="text-green-600" />
          <ResumoCard titulo="Folhas corrigidas" valor={totalCorrigidos} cor="text-blue-600" />
          <ResumoCard titulo="Alunos aprovados" valor={totalAprovados} cor="text-indigo-600" />
        </section>

        {/* ALERTAS */}
        {erro && <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">{erro}</div>}
        {sucesso && <div className="mb-4 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-xl text-sm">{sucesso}</div>}

        {/* ABAS */}
        <section className="flex flex-wrap gap-3 mb-8">
          <button onClick={() => setAba('provas')}
            className={`px-5 py-2.5 rounded-xl text-sm font-medium transition ${aba === 'provas' ? 'bg-purple-600 text-white shadow-sm' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
            📋 Provas
            {pendentes > 0 && <span className="ml-2 bg-yellow-400 text-yellow-900 text-xs px-2 py-0.5 rounded-full">{pendentes}</span>}
          </button>
          <button onClick={() => setAba('resultados')}
            className={`px-5 py-2.5 rounded-xl text-sm font-medium transition ${aba === 'resultados' ? 'bg-purple-600 text-white shadow-sm' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
            📊 Resultados
          </button>
          <Link href="/coordenador/avaliacoes"
            className="px-5 py-2.5 rounded-xl text-sm font-medium transition bg-white border border-gray-200 text-gray-600 hover:bg-gray-50">
            📝 Avaliações Multidisciplinares
          </Link>
        </section>

        {/* ABA PROVAS */}
        {aba === 'provas' && (
          <>
            <section className="flex flex-wrap gap-2 mb-6">
              {[
                { id: 'aguardando', label: `⏳ Pendentes (${pendentes})` },
                { id: 'aprovada', label: '✅ Aprovadas' },
                { id: 'todas', label: '📋 Todas' },
              ].map(f => (
                <button key={f.id} onClick={() => setFiltro(f.id as Filtro)}
                  className={`px-4 py-2 rounded-xl text-sm font-medium transition ${filtro === f.id ? 'bg-purple-600 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                  {f.label}
                </button>
              ))}
            </section>

            {provasFiltradas.length === 0 ? (
              <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
                <p className="text-5xl mb-3">✅</p>
                <p className="text-gray-500">Nenhuma prova encontrada.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {provasFiltradas.map(p => (
                  <div key={p.id} className="bg-white rounded-2xl border border-gray-200 p-5 hover:shadow-sm transition">
                    <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                      <div className="flex-1">
                        <h3 className="font-semibold text-lg text-gray-900 mb-2">{p.titulo}</h3>
                        <div className="flex flex-wrap gap-2 mb-3">
                          <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${STATUS_LABEL[p.status]?.cor}`}>
                            {STATUS_LABEL[p.status]?.label}
                          </span>
                          {p.disciplinas && (
                            <span className="text-xs px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-700 font-medium">
                              {p.disciplinas.nome}
                            </span>
                          )}
                          <span className="text-xs px-2.5 py-1 rounded-full bg-gray-100 text-gray-600 font-medium">
                            {p.prova_questoes?.length} questões
                          </span>
                        </div>
                        <div className="space-y-1 text-sm text-gray-500">
                          {p.usuarios && <p>Professor: <span className="text-gray-700 font-medium">{p.usuarios.nome}</span></p>}
                          <p>Criada em: <span className="text-gray-700">{new Date(p.criado_em).toLocaleDateString('pt-BR')}</span></p>
                          {p.tempo_minutos && <p>Tempo: <span className="text-gray-700">{p.tempo_minutos} minutos</span></p>}
                        </div>
                      </div>

                      {/* AÇÕES */}
                      <div className="flex gap-2 flex-wrap items-start">
                        {p.status === 'aguardando_aprovacao' && (
                          <button onClick={() => { setProvaSelecionada(p); setComentario('') }}
                            className="px-5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white text-sm rounded-xl font-medium transition">
                            Revisar
                          </button>
                        )}
                        <button onClick={() => setProvaParaExcluir(p)}
                          className="px-4 py-2.5 bg-red-50 hover:bg-red-100 text-red-600 text-sm rounded-xl font-medium transition border border-red-200">
                          🗑️ Excluir
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* ABA RESULTADOS */}
        {aba === 'resultados' && (
          <section className="space-y-5">
            {resultados.length === 0 ? (
              <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
                <p className="text-5xl mb-3">📭</p>
                <p className="text-gray-500">Nenhum resultado disponível.</p>
              </div>
            ) : (
              resultados.map(prova => (
                <div key={prova.id} className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                  <button type="button" onClick={() => setProvaAberta(provaAberta === prova.id ? null : prova.id)}
                    className="w-full text-left p-5 hover:bg-gray-50 transition">
                    <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-5">
                      <div>
                        {prova.disciplina && (
                          <span className="text-xs px-2 py-1 rounded-full bg-indigo-50 text-indigo-700 font-medium inline-block mb-2">
                            {prova.disciplina.nome}
                          </span>
                        )}
                        <h2 className="font-semibold text-lg text-gray-900">{prova.titulo}</h2>
                        <p className="text-sm text-gray-400 mt-1">{prova.total_corrigidos} folha(s) corrigida(s)</p>
                      </div>
                      <div className="flex items-center gap-6">
                        <div className="text-center">
                          <p className="text-xs text-gray-400 mb-1">Média</p>
                          <p className={`text-2xl font-bold ${prova.media !== null ? corNota(prova.media) : 'text-gray-300'}`}>
                            {prova.media ?? '—'}
                          </p>
                        </div>
                        <div className="text-center">
                          <p className="text-xs text-gray-400 mb-1">Aprovados</p>
                          <p className="font-semibold text-gray-700">{prova.aprovados}/{prova.total_corrigidos}</p>
                        </div>
                        <span className="text-gray-400 text-sm">{provaAberta === prova.id ? '▲' : '▼'}</span>
                      </div>
                    </div>
                    {prova.total_corrigidos > 0 && (
                      <div className="mt-4">
                        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div className="h-full bg-green-500 rounded-full transition-all"
                            style={{ width: `${(prova.aprovados / prova.total_corrigidos) * 100}%` }} />
                        </div>
                        <div className="flex justify-between text-xs text-gray-400 mt-1">
                          <span>{prova.aprovados} aprovados</span>
                          <span>{prova.reprovados} reprovados</span>
                        </div>
                      </div>
                    )}
                  </button>

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
                                {r.aluno ? <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded-full text-xs font-medium">{r.aluno.turma}</span> : '—'}
                              </td>
                              <td className="px-5 py-3 text-center font-medium text-green-600">{r.acertos}</td>
                              <td className="px-5 py-3 text-center">
                                <span className={`inline-block px-3 py-1 rounded-full border text-sm font-bold ${bgNota(r.nota)} ${corNota(r.nota)}`}>
                                  {r.nota}
                                </span>
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
          </section>
        )}

        {/* MODAL REVISAR */}
        {provaSelecionada && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-xl p-6">
              <h3 className="font-bold text-xl text-gray-900 mb-1">Revisar Prova</h3>
              <p className="text-gray-500 text-sm mb-5">{provaSelecionada.titulo}</p>
              <div className="bg-gray-50 rounded-2xl p-4 space-y-2 text-sm mb-5">
                <p><span className="text-gray-500">Disciplina:</span> <span className="font-medium text-gray-800">{provaSelecionada.disciplinas?.nome}</span></p>
                <p><span className="text-gray-500">Professor:</span> <span className="font-medium text-gray-800">{provaSelecionada.usuarios?.nome}</span></p>
                <p><span className="text-gray-500">Questões:</span> <span className="font-medium text-gray-800">{provaSelecionada.prova_questoes?.length}</span></p>
              </div>
              <div className="mb-5">
                <label className="block text-sm font-medium text-gray-700 mb-2">Comentário</label>
                <textarea value={comentario} onChange={e => setComentario(e.target.value)} rows={4}
                  placeholder="Adicione observações para o professor..."
                  className="w-full px-4 py-3 border border-gray-300 rounded-2xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-purple-500" />
              </div>
              <div className="flex gap-3">
                <button onClick={() => agir(provaSelecionada.id, 'reprovar')} disabled={carregando}
                  className="flex-1 py-3 rounded-2xl border-2 border-red-300 text-red-600 hover:bg-red-50 font-semibold transition disabled:opacity-50">
                  ✕ Devolver
                </button>
                <button onClick={() => agir(provaSelecionada.id, 'aprovar')} disabled={carregando}
                  className="flex-1 py-3 rounded-2xl bg-green-600 hover:bg-green-700 text-white font-semibold transition disabled:opacity-50">
                  ✓ Aprovar
                </button>
              </div>
              <button onClick={() => setProvaSelecionada(null)}
                className="w-full mt-4 py-2 text-sm text-gray-500 hover:text-gray-700 transition">
                Cancelar
              </button>
            </div>
          </div>
        )}

        {/* MODAL EXCLUIR */}
        {provaParaExcluir && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-6">
              <div className="text-center mb-5">
                <p className="text-4xl mb-3">🗑️</p>
                <h3 className="font-bold text-xl text-gray-900 mb-1">Excluir Prova</h3>
                <p className="text-gray-500 text-sm">
                  Tem certeza que deseja excluir <strong>"{provaParaExcluir.titulo}"</strong>?
                  Esta ação não pode ser desfeita.
                </p>
              </div>
              <div className="flex gap-3">
                <button onClick={() => setProvaParaExcluir(null)} disabled={excluindo}
                  className="flex-1 py-3 rounded-2xl border border-gray-300 text-gray-600 hover:bg-gray-50 font-semibold transition disabled:opacity-50">
                  Cancelar
                </button>
                <button onClick={() => excluirProva(provaParaExcluir.id)} disabled={excluindo}
                  className="flex-1 py-3 rounded-2xl bg-red-600 hover:bg-red-700 text-white font-semibold transition disabled:opacity-50">
                  {excluindo ? 'Excluindo...' : '🗑️ Excluir'}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}