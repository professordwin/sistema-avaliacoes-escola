'use client'

import { useState, useEffect, useCallback } from 'react'

interface Alternativa {
  letra: string
  texto: string
  correta: boolean
}

interface Questao {
  id: string
  enunciado: string
  nivel_dificuldade: string
  fonte?: string
  aprovada: boolean
  ano_escolar?: number
  disciplinas?: { nome: string; cor_hex: string }
  alternativas?: Alternativa[]
}

interface Disciplina {
  id: string
  nome: string
  cor_hex: string
  bloco: number
}

const NIVEIS = ['facil', 'medio', 'dificil']
const FONTES = ['Professor', 'ENEM', 'FUVEST', 'ITA', 'UNICAMP', 'UNB']
const ANOS = [1, 2, 3]

const BLOCO_LABELS: Record<number, string> = {
  1: 'Bloco 1 — Linguagens, Humanas e Matemática',
  2: 'Bloco 2 — Ciências da Natureza e Linguagens',
}

export default function BancoQuestoes() {
  const [questoes, setQuestoes] = useState<Questao[]>([])
  const [disciplinas, setDisciplinas] = useState<Disciplina[]>([])
  const [disciplinaFiltro, setDisciplinaFiltro] = useState('')
  const [blocoFiltro, setBlocoFiltro] = useState('')
  const [anoFiltro, setAnoFiltro] = useState('')
  const [aba, setAba] = useState<'listar' | 'criar' | 'gerar'>('listar')
  const [carregando, setCarregando] = useState(false)
  const [sucesso, setSucesso] = useState('')
  const [erro, setErro] = useState('')

  // Estado do formulário de criação
  const [form, setForm] = useState({
    enunciado: '',
    disciplina_id: '',
    nivel_dificuldade: 'medio',
    fonte: 'Professor',
    ano_escolar: '' as '' | number,
    alternativas: [
      { letra: 'A', texto: '', correta: false },
      { letra: 'B', texto: '', correta: false },
      { letra: 'C', texto: '', correta: false },
      { letra: 'D', texto: '', correta: false },
      { letra: 'E', texto: '', correta: false },
    ]
  })

  // Estado da geração por IA
  const [gerador, setGerador] = useState({
    tema: '',
    disciplina_id: '',
    nivel: 'medio',
    quantidade: 3,
    ano_escolar: '' as '' | number,
  })
  const [questoesGeradas, setQuestoesGeradas] = useState<Questao[]>([])
  const [gerando, setGerando] = useState(false)

  // Disciplinas filtradas por bloco selecionado no filtro
  const disciplinasFiltradas = blocoFiltro
    ? disciplinas.filter(d => d.bloco === Number(blocoFiltro))
    : disciplinas

  // Disciplinas agrupadas por bloco para os selects de criar/gerar
  const disciplinasPorBloco = (bloco: number) =>
    disciplinas.filter(d => d.bloco === bloco)

  const carregarDados = useCallback(async () => {
    const params = new URLSearchParams()
    if (disciplinaFiltro) params.set('disciplina_id', disciplinaFiltro)
    if (anoFiltro) params.set('ano_escolar', anoFiltro)

    const [qRes, dRes] = await Promise.all([
      fetch(`/api/questoes${params.toString() ? `?${params}` : ''}`),
      fetch('/api/disciplinas')
    ])
    setQuestoes(await qRes.json())
    setDisciplinas(await dRes.json())
  }, [disciplinaFiltro, anoFiltro])

  useEffect(() => { carregarDados() }, [carregarDados])

  // Quando muda o bloco do filtro, limpa a disciplina selecionada
  function handleBlocoFiltro(bloco: string) {
    setBlocoFiltro(bloco)
    setDisciplinaFiltro('')
  }

  async function salvarQuestao(q?: Questao) {
    setCarregando(true)
    setErro('')
    const payload = q ?? { ...form }
    const res = await fetch('/api/questoes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...payload,
        disciplina_id: q ? gerador.disciplina_id : form.disciplina_id,
        ano_escolar: q ? (gerador.ano_escolar || null) : (form.ano_escolar || null),
      })
    })
    if (res.ok) {
      setSucesso('Questão salva com sucesso!')
      setForm({
        enunciado: '', disciplina_id: '', nivel_dificuldade: 'medio',
        fonte: 'Professor', ano_escolar: '',
        alternativas: ['A','B','C','D','E'].map(l => ({ letra: l, texto: '', correta: false }))
      })
      carregarDados()
      setTimeout(() => setSucesso(''), 3000)
    } else {
      setErro('Erro ao salvar questão.')
    }
    setCarregando(false)
  }

  async function gerarQuestoes() {
    if (!gerador.tema || !gerador.disciplina_id) {
      setErro('Preencha o tema e selecione a disciplina.')
      return
    }
    setGerando(true)
    setErro('')
    setQuestoesGeradas([])
    const discNome = disciplinas.find(d => d.id === gerador.disciplina_id)?.nome ?? ''
    const res = await fetch('/api/questoes/gerar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...gerador, disciplina: discNome })
    })
    const data = await res.json()
    if (Array.isArray(data)) {
      setQuestoesGeradas(data)
    } else {
      setErro('Erro ao gerar questões. Tente novamente.')
    }
    setGerando(false)
  }

  const corNivel: Record<string, string> = {
    facil: 'bg-green-100 text-green-700',
    medio: 'bg-yellow-100 text-yellow-700',
    dificil: 'bg-red-100 text-red-700',
  }

  // Select agrupado por bloco (para criar/gerar)
  function SelectDisciplinaAgrupado({
    value, onChange
  }: { value: string; onChange: (v: string) => void }) {
    return (
      <select value={value} onChange={e => onChange(e.target.value)}
        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">
        <option value="">Selecione...</option>
        {[1, 2].map(bloco => (
          <optgroup key={bloco} label={`── Bloco ${bloco}`}>
            {disciplinasPorBloco(bloco).map(d => (
              <option key={d.id} value={d.id}>{d.nome}</option>
            ))}
          </optgroup>
        ))}
      </select>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
            <span className="text-white text-sm font-bold">A</span>
          </div>
          <span className="font-semibold text-gray-900">AvaliaEscola</span>
          <span className="text-gray-400">›</span>
          <span className="text-gray-600 text-sm">Banco de Questões</span>
        </div>
        <a href="/professor/dashboard" className="text-sm text-indigo-600 hover:underline">← Painel</a>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8">
        {/* Abas */}
        <div className="flex gap-2 mb-6">
          {[
            { id: 'listar', label: '📋 Minhas Questões' },
            { id: 'criar', label: '✏️ Criar Questão' },
            { id: 'gerar', label: '🤖 Gerar com IA' },
          ].map(a => (
            <button key={a.id} onClick={() => { setAba(a.id as typeof aba); setErro(''); setSucesso('') }}
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
            {/* Filtros */}
            <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Filtros</p>
              <div className="flex flex-wrap gap-3">
                {/* Filtro Bloco */}
                <select value={blocoFiltro} onChange={e => handleBlocoFiltro(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm min-w-[140px]">
                  <option value="">Todos os blocos</option>
                  <option value="1">Bloco 1</option>
                  <option value="2">Bloco 2</option>
                </select>

                {/* Filtro Disciplina (dependente do bloco) */}
                <select value={disciplinaFiltro} onChange={e => setDisciplinaFiltro(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm min-w-[180px]">
                  <option value="">Todas as disciplinas</option>
                  {blocoFiltro ? (
                    disciplinasFiltradas.map(d => <option key={d.id} value={d.id}>{d.nome}</option>)
                  ) : (
                    [1, 2].map(bloco => (
                      <optgroup key={bloco} label={`── Bloco ${bloco}`}>
                        {disciplinasPorBloco(bloco).map(d => (
                          <option key={d.id} value={d.id}>{d.nome}</option>
                        ))}
                      </optgroup>
                    ))
                  )}
                </select>

                {/* Filtro Ano */}
                <select value={anoFiltro} onChange={e => setAnoFiltro(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm min-w-[130px]">
                  <option value="">Todos os anos</option>
                  <option value="1">1º ano</option>
                  <option value="2">2º ano</option>
                  <option value="3">3º ano</option>
                </select>

                <span className="text-sm text-gray-500 self-center ml-auto">{questoes.length} questão(ões)</span>
              </div>

              {/* Tags de blocos ativos */}
              {blocoFiltro && (
                <div className="mt-2 flex gap-2">
                  <span className="inline-flex items-center gap-1 text-xs bg-indigo-50 text-indigo-700 px-2 py-1 rounded-full">
                    {BLOCO_LABELS[Number(blocoFiltro)]}
                    <button onClick={() => handleBlocoFiltro('')} className="ml-1 hover:text-indigo-900">×</button>
                  </span>
                </div>
              )}
            </div>

            {questoes.length === 0 ? (
              <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
                <p className="text-4xl mb-3">📝</p>
                <p className="text-gray-500">Nenhuma questão encontrada.</p>
                <p className="text-sm text-gray-400 mt-1">Use "Criar Questão" ou "Gerar com IA" para começar.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {questoes.map(q => (
                  <div key={q.id} className="bg-white rounded-xl border border-gray-200 p-5">
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <p className="text-gray-900 text-sm leading-relaxed flex-1">{q.enunciado}</p>
                      <div className="flex gap-2 flex-shrink-0 flex-wrap justify-end">
                        {q.ano_escolar && (
                          <span className="text-xs px-2 py-1 rounded-full font-medium bg-gray-100 text-gray-600">
                            {q.ano_escolar}º ano
                          </span>
                        )}
                        <span className={`text-xs px-2 py-1 rounded-full font-medium ${corNivel[q.nivel_dificuldade]}`}>
                          {q.nivel_dificuldade}
                        </span>
                        {q.disciplinas && (
                          <span className="text-xs px-2 py-1 rounded-full font-medium bg-indigo-50 text-indigo-700">
                            {q.disciplinas.nome}
                          </span>
                        )}
                      </div>
                    </div>
                    {q.alternativas && (
                      <div className="space-y-1 mt-3 pt-3 border-t border-gray-100">
                        {q.alternativas.map(alt => (
                          <div key={alt.letra} className={`flex gap-2 text-sm ${alt.correta ? 'text-green-700 font-medium' : 'text-gray-600'}`}>
                            <span className="font-bold w-4">{alt.letra})</span>
                            <span>{alt.texto}</span>
                            {alt.correta && <span className="text-green-600 text-xs">✓ correta</span>}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ABA: CRIAR */}
        {aba === 'criar' && (
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="font-semibold text-gray-900 mb-4">Nova Questão</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Enunciado</label>
                <textarea value={form.enunciado} onChange={e => setForm({...form, enunciado: e.target.value})}
                  rows={4} placeholder="Digite o enunciado da questão..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"/>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Disciplina</label>
                  <SelectDisciplinaAgrupado
                    value={form.disciplina_id}
                    onChange={v => setForm({...form, disciplina_id: v})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Ano escolar</label>
                  <select value={form.ano_escolar} onChange={e => setForm({...form, ano_escolar: e.target.value ? Number(e.target.value) : ''})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">
                    <option value="">Não especificado</option>
                    {ANOS.map(a => <option key={a} value={a}>{a}º ano</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Dificuldade</label>
                  <select value={form.nivel_dificuldade} onChange={e => setForm({...form, nivel_dificuldade: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">
                    {NIVEIS.map(n => <option key={n} value={n}>{n}</option>)}
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Fonte</label>
                  <select value={form.fonte} onChange={e => setForm({...form, fonte: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">
                    {FONTES.map(f => <option key={f} value={f}>{f}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Alternativas</label>
                <div className="space-y-2">
                  {form.alternativas.map((alt, i) => (
                    <div key={alt.letra} className="flex gap-2 items-center">
                      <span className="font-bold text-sm w-5 text-gray-600">{alt.letra}</span>
                      <input value={alt.texto}
                        onChange={e => {
                          const novas = [...form.alternativas]
                          novas[i].texto = e.target.value
                          setForm({...form, alternativas: novas})
                        }}
                        placeholder={`Alternativa ${alt.letra}`}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"/>
                      <button onClick={() => {
                          const novas = form.alternativas.map((a, j) => ({...a, correta: i === j}))
                          setForm({...form, alternativas: novas})
                        }}
                        className={`px-3 py-2 rounded-lg text-xs font-medium transition-colors ${alt.correta ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>
                        {alt.correta ? '✓ Correta' : 'Correta?'}
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <button onClick={() => salvarQuestao()} disabled={carregando || !form.enunciado || !form.disciplina_id}
                className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white font-semibold py-3 rounded-lg transition-colors text-sm">
                {carregando ? 'Salvando...' : 'Salvar Questão'}
              </button>
            </div>
          </div>
        )}

        {/* ABA: GERAR COM IA */}
        {aba === 'gerar' && (
          <div>
            <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
              <h2 className="font-semibold text-gray-900 mb-1">Gerar Questões com IA</h2>
              <p className="text-sm text-gray-500 mb-4">A IA vai criar questões no estilo ENEM/vestibular automaticamente.</p>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tema ou assunto</label>
                  <input value={gerador.tema} onChange={e => setGerador({...gerador, tema: e.target.value})}
                    placeholder="Ex: Leis de Newton, Funções do 2º grau, Figuras de linguagem..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"/>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Disciplina</label>
                    <SelectDisciplinaAgrupado
                      value={gerador.disciplina_id}
                      onChange={v => setGerador({...gerador, disciplina_id: v})}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Ano escolar</label>
                    <select value={gerador.ano_escolar} onChange={e => setGerador({...gerador, ano_escolar: e.target.value ? Number(e.target.value) : ''})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">
                      <option value="">Não especificado</option>
                      {ANOS.map(a => <option key={a} value={a}>{a}º ano</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Dificuldade</label>
                    <select value={gerador.nivel} onChange={e => setGerador({...gerador, nivel: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">
                      {NIVEIS.map(n => <option key={n} value={n}>{n}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Quantidade</label>
                    <select value={gerador.quantidade} onChange={e => setGerador({...gerador, quantidade: Number(e.target.value)})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">
                      {[1,2,3,5].map(n => <option key={n} value={n}>{n} questão(ões)</option>)}
                    </select>
                  </div>
                </div>

                <button onClick={gerarQuestoes} disabled={gerando}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white font-semibold py-3 rounded-lg transition-colors text-sm">
                  {gerando ? '⏳ Gerando com IA...' : '🤖 Gerar Questões'}
                </button>
              </div>
            </div>

            {questoesGeradas.length > 0 && (
              <div className="space-y-4">
                <p className="text-sm font-medium text-gray-700">{questoesGeradas.length} questão(ões) gerada(s) — revise e salve as que desejar:</p>
                {questoesGeradas.map((q, i) => (
                  <div key={i} className="bg-white rounded-xl border border-indigo-200 p-5">
                    <p className="text-gray-900 text-sm leading-relaxed mb-3">{q.enunciado}</p>
                    <div className="space-y-1 mb-4">
                      {q.alternativas?.map(alt => (
                        <div key={alt.letra} className={`flex gap-2 text-sm ${alt.correta ? 'text-green-700 font-medium' : 'text-gray-600'}`}>
                          <span className="font-bold w-4">{alt.letra})</span>
                          <span>{alt.texto}</span>
                          {alt.correta && <span className="text-green-600 text-xs">✓</span>}
                        </div>
                      ))}
                    </div>
                    <button onClick={() => salvarQuestao(q)}
                      className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm rounded-lg font-medium transition-colors">
                      ✓ Salvar esta questão
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  )
}