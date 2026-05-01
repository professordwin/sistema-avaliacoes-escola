'use client'

import { useState, useEffect, useCallback } from 'react'

interface Questao {
  id: string
  enunciado: string
  nivel_dificuldade: string
  disciplinas?: { nome: string; cor_hex: string }
  alternativas?: { letra: string; texto: string; correta: boolean }[]
}

interface Prova {
  id: string
  titulo: string
  status: string
  disciplinas?: { nome: string; cor_hex: string }
  prova_questoes?: { questoes: { enunciado: string } }[]
}

interface Disciplina {
  id: string
  nome: string
  cor_hex: string
}

const STATUS_LABEL: Record<string, { label: string; cor: string }> = {
  rascunho: { label: 'Rascunho', cor: 'bg-gray-100 text-gray-600' },
  aguardando_aprovacao: { label: 'Aguardando', cor: 'bg-yellow-100 text-yellow-700' },
  aprovada: { label: 'Aprovada', cor: 'bg-green-100 text-green-700' },
  aplicada: { label: 'Aplicada', cor: 'bg-blue-100 text-blue-700' },
}

export default function MinhasProvas() {
  const [provas, setProvas] = useState<Prova[]>([])
  const [questoes, setQuestoes] = useState<Questao[]>([])
  const [disciplinas, setDisciplinas] = useState<Disciplina[]>([])
  const [aba, setAba] = useState<'listar' | 'criar'>('listar')
  const [carregando, setCarregando] = useState(false)
  const [sucesso, setSucesso] = useState('')
  const [erro, setErro] = useState('')

  const [form, setForm] = useState({
    titulo: '',
    disciplina_id: '',
    instrucoes: '',
    tempo_minutos: 60,
  })
  const [questoesSelecionadas, setQuestoesSelecionadas] = useState<string[]>([])
  const [filtroDisciplina, setFiltroDisciplina] = useState('')

  const carregar = useCallback(async () => {
    const [pRes, qRes, dRes] = await Promise.all([
      fetch('/api/provas'),
      fetch('/api/questoes'),
      fetch('/api/disciplinas'),
    ])
    setProvas(await pRes.json())
    setQuestoes(await qRes.json())
    setDisciplinas(await dRes.json())
  }, [])

  useEffect(() => { carregar() }, [carregar])

  function toggleQuestao(id: string) {
    setQuestoesSelecionadas(prev =>
      prev.includes(id) ? prev.filter(q => q !== id) : [...prev, id]
    )
  }

  async function criarProva() {
    if (!form.titulo || !form.disciplina_id || questoesSelecionadas.length === 0) {
      setErro('Preencha título, disciplina e selecione ao menos uma questão.')
      return
    }
    setCarregando(true)
    setErro('')
    const res = await fetch('/api/provas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, questao_ids: questoesSelecionadas })
    })
    if (res.ok) {
      setSucesso('Prova criada com sucesso!')
      setForm({ titulo: '', disciplina_id: '', instrucoes: '', tempo_minutos: 60 })
      setQuestoesSelecionadas([])
      carregar()
      setAba('listar')
      setTimeout(() => setSucesso(''), 3000)
    } else {
      setErro('Erro ao criar prova.')
    }
    setCarregando(false)
  }

  async function submeterAprovacao(id: string) {
    await fetch(`/api/provas/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'aguardando_aprovacao' })
    })
    carregar()
  }

  const questoesFiltradas = filtroDisciplina
    ? questoes.filter(q => q.disciplinas?.nome === disciplinas.find(d => d.id === filtroDisciplina)?.nome)
    : questoes

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
            <span className="text-white text-sm font-bold">A</span>
          </div>
          <span className="font-semibold text-gray-900">AvaliaEscola</span>
          <span className="text-gray-400">›</span>
          <span className="text-gray-600 text-sm">Minhas Provas</span>
        </div>
        <a href="/professor/dashboard" className="text-sm text-indigo-600 hover:underline">← Painel</a>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8">
        <div className="flex gap-2 mb-6">
          {[
            { id: 'listar', label: '📋 Minhas Provas' },
            { id: 'criar', label: '➕ Nova Prova' },
          ].map(a => (
            <button key={a.id} onClick={() => { setAba(a.id as typeof aba); setErro('') }}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${aba === a.id ? 'bg-indigo-600 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
              {a.label}
            </button>
          ))}
        </div>

        {sucesso && <div className="mb-4 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm">{sucesso}</div>}
        {erro && <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">{erro}</div>}

        {/* ABA: LISTAR */}
        {aba === 'listar' && (
          <div>
            {provas.length === 0 ? (
              <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
                <p className="text-4xl mb-3">📋</p>
                <p className="text-gray-500">Nenhuma prova criada ainda.</p>
                <button onClick={() => setAba('criar')}
                  className="mt-4 px-4 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700">
                  Criar primeira prova
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {provas.map(p => (
                  <div key={p.id} className="bg-white rounded-xl border border-gray-200 p-5">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-semibold text-gray-900">{p.titulo}</h3>
                        <div className="flex gap-2 mt-2">
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
                        </div>
                      </div>
                      {p.status === 'rascunho' && (
                        <button onClick={() => submeterAprovacao(p.id)}
                          className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white text-sm rounded-lg font-medium transition-colors">
                          Enviar para aprovação
                        </button>
                      )}
                      {p.status === 'aprovada' && (
                        <a href={`/professor/provas/${p.id}/imprimir`}
                          className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm rounded-lg font-medium transition-colors">
                          🖨️ Imprimir PDF
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ABA: CRIAR */}
        {aba === 'criar' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Formulário */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h2 className="font-semibold text-gray-900 mb-4">Dados da Prova</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Título</label>
                  <input value={form.titulo} onChange={e => setForm({...form, titulo: e.target.value})}
                    placeholder="Ex: Avaliação 1 - Leis de Newton"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"/>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Disciplina</label>
                  <select value={form.disciplina_id} onChange={e => setForm({...form, disciplina_id: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">
                    <option value="">Selecione...</option>
                    {disciplinas.map(d => <option key={d.id} value={d.id}>{d.nome}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Instruções</label>
                  <textarea value={form.instrucoes} onChange={e => setForm({...form, instrucoes: e.target.value})}
                    rows={3} placeholder="Instruções para os alunos..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"/>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tempo (minutos)</label>
                  <input type="number" value={form.tempo_minutos}
                    onChange={e => setForm({...form, tempo_minutos: Number(e.target.value)})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"/>
                </div>
                <div className="bg-indigo-50 rounded-lg p-3 text-sm text-indigo-700">
                  {questoesSelecionadas.length === 0
                    ? 'Selecione questões na lista ao lado'
                    : `${questoesSelecionadas.length} questão(ões) selecionada(s)`}
                </div>
                <button onClick={criarProva} disabled={carregando}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white font-semibold py-3 rounded-lg transition-colors text-sm">
                  {carregando ? 'Criando...' : 'Criar Prova'}
                </button>
              </div>
            </div>

            {/* Seleção de questões */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h2 className="font-semibold text-gray-900 mb-3">Selecionar Questões</h2>
              <select value={filtroDisciplina} onChange={e => setFiltroDisciplina(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm mb-3">
                <option value="">Todas as disciplinas</option>
                {disciplinas.map(d => <option key={d.id} value={d.id}>{d.nome}</option>)}
              </select>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {questoesFiltradas.map(q => (
                  <div key={q.id}
                    onClick={() => toggleQuestao(q.id)}
                    className={`p-3 rounded-lg border cursor-pointer transition-colors ${questoesSelecionadas.includes(q.id) ? 'border-indigo-500 bg-indigo-50' : 'border-gray-200 hover:bg-gray-50'}`}>
                    <div className="flex items-start gap-2">
                      <div className={`w-4 h-4 rounded border-2 flex-shrink-0 mt-0.5 flex items-center justify-center ${questoesSelecionadas.includes(q.id) ? 'border-indigo-600 bg-indigo-600' : 'border-gray-300'}`}>
                        {questoesSelecionadas.includes(q.id) && <span className="text-white text-xs">✓</span>}
                      </div>
                      <p className="text-sm text-gray-700 leading-relaxed line-clamp-2">{q.enunciado}</p>
                    </div>
                    <div className="flex gap-1 mt-1 ml-6">
                      <span className="text-xs text-gray-500">{q.nivel_dificuldade}</span>
                      {q.disciplinas && <span className="text-xs text-indigo-600">· {q.disciplinas.nome}</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}