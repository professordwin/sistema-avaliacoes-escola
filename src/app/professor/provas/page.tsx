'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'

interface Questao {
  id: string
  enunciado: string
  nivel_dificuldade: string
  ano_escolar?: number
  disciplinas?: {
    nome: string
    cor_hex: string
  }
  alternativas?: {
    letra: string
    texto: string
    correta: boolean
  }[]
}

interface Prova {
  id: string
  titulo: string
  status: string
  instrucoes?: string
  tempo_minutos?: number
  disciplinas?: {
    nome: string
    cor_hex: string
  }
  prova_questoes?: {
    questoes: {
      enunciado: string
    }
  }[]
}

interface Disciplina {
  id: string
  nome: string
  cor_hex: string
  bloco: number
}

const STATUS_LABEL: Record<string, { label: string; cor: string }> = {
  rascunho: { label: 'Rascunho', cor: 'bg-gray-100 text-gray-600' },
  aguardando_aprovacao: { label: 'Aguardando', cor: 'bg-yellow-100 text-yellow-700' },
  aprovada: { label: 'Aprovada', cor: 'bg-green-100 text-green-700' },
  aplicada: { label: 'Aplicada', cor: 'bg-blue-100 text-blue-700' },
}

export default function MinhasProvas() {
  const router = useRouter()

  const [provas, setProvas] = useState<Prova[]>([])
  const [questoes, setQuestoes] = useState<Questao[]>([])
  const [disciplinas, setDisciplinas] = useState<Disciplina[]>([])
  const [aba, setAba] = useState<'listar' | 'criar'>('listar')
  const [carregando, setCarregando] = useState(false)
  const [sucesso, setSucesso] = useState('')
  const [erro, setErro] = useState('')
  const [editandoId, setEditandoId] = useState<string | null>(null)

  const [form, setForm] = useState({
    titulo: '',
    disciplina_id: '',
    instrucoes: '',
  })

  const [questoesSelecionadas, setQuestoesSelecionadas] = useState<string[]>([])
  const [filtroAno, setFiltroAno] = useState('')

  const carregar = useCallback(async () => {
    try {
      setCarregando(true)
      const [pRes, dRes] = await Promise.all([
        fetch('/api/provas'),
        fetch('/api/disciplinas'),
      ])
      if (!pRes.ok || !dRes.ok) throw new Error('Erro ao carregar dados')
      setProvas(await pRes.json() ?? [])
      setDisciplinas(await dRes.json() ?? [])
    } catch (error) {
      console.error(error)
      setErro('Erro ao carregar informações.')
    } finally {
      setCarregando(false)
    }
  }, [])

  useEffect(() => { carregar() }, [carregar])

  // Carrega questões quando disciplina ou ano muda
  useEffect(() => {
    if (!form.disciplina_id) {
      setQuestoes([])
      return
    }
    const params = new URLSearchParams({ disciplina_id: form.disciplina_id })
    if (filtroAno) params.set('ano_escolar', filtroAno)
    fetch(`/api/questoes?${params}`)
      .then(r => r.json())
      .then(data => setQuestoes(Array.isArray(data) ? data : []))
  }, [form.disciplina_id, filtroAno])

  function toggleQuestao(id: string) {
    setQuestoesSelecionadas(prev =>
      prev.includes(id) ? prev.filter(q => q !== id) : [...prev, id]
    )
  }

  function iniciarEdicao(prova: Prova) {
    setEditandoId(prova.id)
    setForm({
      titulo: prova.titulo,
      disciplina_id: disciplinas.find(d => d.nome === prova.disciplinas?.nome)?.id ?? '',
      instrucoes: prova.instrucoes ?? '',
    })
    setQuestoesSelecionadas(
      prova.prova_questoes?.map((pq: any) => pq.questao_id ?? pq.id).filter(Boolean) ?? []
    )
    setFiltroAno('')
    setAba('criar')
  }

  function cancelarEdicao() {
    setEditandoId(null)
    setForm({ titulo: '', disciplina_id: '', instrucoes: '' })
    setQuestoesSelecionadas([])
    setFiltroAno('')
    setAba('listar')
  }

  async function salvarProva() {
    if (!form.titulo.trim() || !form.disciplina_id || questoesSelecionadas.length === 0) {
      setErro('Preencha título, disciplina e selecione ao menos uma questão.')
      return
    }
    try {
      setCarregando(true)
      setErro('')

      const url = editandoId ? `/api/provas/${editandoId}` : '/api/provas'
      const method = editandoId ? 'PUT' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          titulo: form.titulo.trim(),
          questao_ids: questoesSelecionadas,
        }),
      })

      if (!res.ok) throw new Error('Erro ao salvar prova')

      setSucesso(editandoId ? '✅ Prova atualizada!' : '✅ Prova criada com sucesso!')
      setForm({ titulo: '', disciplina_id: '', instrucoes: '' })
      setQuestoesSelecionadas([])
      setEditandoId(null)
      setFiltroAno('')
      await carregar()
      setAba('listar')
      setTimeout(() => setSucesso(''), 3000)
    } catch (error) {
      console.error(error)
      setErro('Erro ao salvar prova.')
    } finally {
      setCarregando(false)
    }
  }

  async function submeterAprovacao(id: string) {
    try {
      const res = await fetch(`/api/provas/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'aguardando_aprovacao' }),
      })
      if (!res.ok) throw new Error('Erro ao enviar prova')
      await carregar()
    } catch (error) {
      console.error(error)
      setErro('Erro ao enviar prova para aprovação.')
    }
  }

  // Disciplinas agrupadas por bloco para o select
  const disciplinasPorBloco = (bloco: number) => disciplinas.filter(d => d.bloco === bloco)

  return (
    <div className="min-h-screen bg-gray-50">
      {/* HEADER */}
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
              <span className="text-white text-sm font-bold">A</span>
            </div>
            <span className="font-semibold text-gray-900">AvaliaEscola</span>
            <span className="text-gray-400">›</span>
            <span className="text-gray-600 text-sm">Minhas Provas</span>
          </div>
          <a href="/professor/dashboard" className="text-sm text-indigo-600 hover:underline">← Painel</a>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8">
        {/* ABAS */}
        <div className="flex gap-2 mb-6">
          {[
            { id: 'listar', label: '📋 Minhas Provas' },
            { id: 'criar', label: editandoId ? '✏️ Editar Prova' : '➕ Nova Prova' },
          ].map(a => (
            <button key={a.id}
              onClick={() => {
                if (a.id === 'listar') cancelarEdicao()
                else { setAba('criar'); setErro('') }
              }}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition ${aba === a.id ? 'bg-indigo-600 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
              {a.label}
            </button>
          ))}
        </div>

        {/* ALERTAS */}
        {sucesso && <div className="mb-4 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-xl text-sm">{sucesso}</div>}
        {erro && <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">{erro}</div>}

        {/* LISTAGEM */}
        {aba === 'listar' && (
          <div className="space-y-4">
            {carregando && (
              <div className="bg-white border rounded-2xl p-10 text-center">
                <p className="text-gray-500">Carregando provas...</p>
              </div>
            )}

            {!carregando && provas.length === 0 && (
              <div className="bg-white border rounded-2xl p-10 text-center">
                <p className="text-gray-500 font-medium">Nenhuma prova criada</p>
                <p className="text-gray-400 text-sm mt-1">Clique em "Nova Prova" para começar</p>
              </div>
            )}

            {provas.map(p => (
              <div key={p.id} className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm hover:shadow-md transition">
                <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg text-gray-900">{p.titulo}</h3>
                    <div className="flex flex-wrap gap-2 mt-3">
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${STATUS_LABEL[p.status]?.cor}`}>
                        {STATUS_LABEL[p.status]?.label}
                      </span>
                      {p.disciplinas && (
                        <span className="text-xs px-2 py-1 bg-indigo-50 text-indigo-700 rounded-full font-medium">
                          {p.disciplinas.nome}
                        </span>
                      )}
                      <span className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded-full">
                        {p.prova_questoes?.length ?? 0} questão(ões)
                      </span>
                    </div>
                    {p.instrucoes && (
                      <div className="mt-4 p-3 bg-gray-50 rounded-xl border border-gray-100">
                        <p className="text-xs font-semibold text-gray-500 mb-1">INSTRUÇÕES</p>
                        <p className="text-sm text-gray-700 line-clamp-2">{p.instrucoes}</p>
                      </div>
                    )}
                  </div>

                  {/* AÇÕES */}
                  <div className="flex flex-wrap gap-2">
                    {p.status === 'rascunho' && (
                      <>
                        <button onClick={() => iniciarEdicao(p)}
                          className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm rounded-lg font-medium transition">
                          ✏️ Editar
                        </button>
                        <button onClick={() => submeterAprovacao(p.id)}
                          className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white text-sm rounded-lg font-medium transition">
                          📤 Enviar
                        </button>
                      </>
                    )}

                    {p.status === 'aprovada' && (
                      <div className="flex gap-2 flex-wrap">
                        <button onClick={() => router.push(`/professor/provas/${p.id}/gabarito`)}
                          className="px-4 py-2 bg-indigo-100 hover:bg-indigo-200 text-indigo-700 text-sm rounded-lg font-medium transition">
                          📝 Gabarito
                        </button>
                        <button onClick={() => router.push(`/professor/corrigir/${p.id}`)}
                          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg font-medium transition">
                          📷 Corrigir
                        </button>
                        <button onClick={() => router.push(`/professor/resultados`)}
                          className="px-4 py-2 bg-purple-100 hover:bg-purple-200 text-purple-700 text-sm rounded-lg font-medium transition">
                          📊 Resultados
                        </button>
                        <button onClick={() => router.push(`/professor/provas/${p.id}/imprimir`)}
                          className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm rounded-lg font-medium transition">
                          🖨️ Imprimir
                        </button>
                      </div>
                    )}

                    {p.status === 'aplicada' && (
                      <button onClick={() => router.push(`/professor/provas/${p.id}/resultados`)}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg font-medium transition">
                        📊 Resultados
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* CRIAR / EDITAR */}
        {aba === 'criar' && (
          <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900 mb-6">
              {editandoId ? 'Editar Prova' : 'Nova Prova'}
            </h2>

            <div className="space-y-5">
              {/* TITULO */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Título da prova</label>
                <input type="text" value={form.titulo}
                  onChange={e => setForm({ ...form, titulo: e.target.value })}
                  className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Ex: Avaliação Bimestral" />
              </div>

              {/* DISCIPLINA */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Disciplina</label>
                <select value={form.disciplina_id}
                  onChange={e => {
                    setForm({ ...form, disciplina_id: e.target.value })
                    setQuestoesSelecionadas([])
                    setFiltroAno('')
                  }}
                  className="w-full border border-gray-300 rounded-xl px-4 py-3">
                  <option value="">Selecione a disciplina</option>
                  {[1, 2].map(bloco => (
                    <optgroup key={bloco} label={`── Bloco ${bloco}`}>
                      {disciplinasPorBloco(bloco).map(d => (
                        <option key={d.id} value={d.id}>{d.nome}</option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </div>

              {/* INSTRUÇÕES */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Instruções</label>
                <textarea rows={3} value={form.instrucoes}
                  onChange={e => setForm({ ...form, instrucoes: e.target.value })}
                  className="w-full border border-gray-300 rounded-xl px-4 py-3"
                  placeholder="Digite instruções para os alunos..." />
              </div>

              {/* QUESTÕES */}
              <div className="border-t pt-5">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
                  <h3 className="font-semibold text-gray-800">
                    Questões selecionadas: {questoesSelecionadas.length}
                  </h3>

                  {/* Filtro de ano — só aparece se disciplina selecionada */}
                  {form.disciplina_id && (
                    <select value={filtroAno} onChange={e => setFiltroAno(e.target.value)}
                      className="border border-gray-300 rounded-lg px-3 py-2 text-sm">
                      <option value="">Todos os anos</option>
                      <option value="1">1º ano</option>
                      <option value="2">2º ano</option>
                      <option value="3">3º ano</option>
                    </select>
                  )}
                </div>

                {!form.disciplina_id ? (
                  <div className="text-center py-10 text-gray-400 text-sm border-2 border-dashed border-gray-200 rounded-xl">
                    Selecione uma disciplina para ver as questões disponíveis
                  </div>
                ) : questoes.length === 0 ? (
                  <div className="text-center py-10 text-gray-400 text-sm border-2 border-dashed border-gray-200 rounded-xl">
                    Nenhuma questão encontrada para esta disciplina
                    {filtroAno ? ` no ${filtroAno}º ano` : ''}
                  </div>
                ) : (
                  <div className="space-y-3 max-h-[450px] overflow-y-auto pr-1">
                    {questoes.map(q => (
                      <button key={q.id} type="button" onClick={() => toggleQuestao(q.id)}
                        className={`w-full text-left border rounded-xl p-4 transition ${
                          questoesSelecionadas.includes(q.id)
                            ? 'border-indigo-500 bg-indigo-50'
                            : 'border-gray-200 hover:border-gray-300 bg-white'
                        }`}>
                        <div className="flex justify-between gap-4">
                          <div className="flex-1">
                            <p className="text-sm font-medium text-gray-800 line-clamp-2">{q.enunciado}</p>
                            <div className="flex gap-2 mt-2 flex-wrap">
                              {q.ano_escolar && (
                                <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">
                                  {q.ano_escolar}º ano
                                </span>
                              )}
                              <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">
                                {q.nivel_dificuldade}
                              </span>
                            </div>
                          </div>
                          <div className="text-indigo-600 font-bold text-lg flex-shrink-0">
                            {questoesSelecionadas.includes(q.id) ? '✓' : '+'}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* BOTÕES */}
              <div className="pt-4 flex justify-end gap-3">
                {editandoId && (
                  <button onClick={cancelarEdicao}
                    className="px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-medium transition">
                    Cancelar
                  </button>
                )}
                <button onClick={salvarProva} disabled={carregando}
                  className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl font-medium transition">
                  {carregando ? 'Salvando...' : editandoId ? 'Salvar Alterações' : 'Criar Prova'}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}