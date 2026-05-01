'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'

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
  const router = useRouter()

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

  useEffect(() => {
    carregar()
  }, [carregar])

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
    ? questoes.filter(q =>
        q.disciplinas?.nome === disciplinas.find(d => d.id === filtroDisciplina)?.nome
      )
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
        <a href="/professor/dashboard" className="text-sm text-indigo-600 hover:underline">
          ← Painel
        </a>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8">
        <div className="flex gap-2 mb-6">
          {[
            { id: 'listar', label: '📋 Minhas Provas' },
            { id: 'criar', label: '➕ Nova Prova' },
          ].map(a => (
            <button
              key={a.id}
              onClick={() => { setAba(a.id as typeof aba); setErro('') }}
              className={`px-4 py-2 rounded-lg text-sm font-medium ${
                aba === a.id
                  ? 'bg-indigo-600 text-white'
                  : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              {a.label}
            </button>
          ))}
        </div>

        {sucesso && <div className="mb-4 bg-green-50 border px-4 py-3 rounded-lg text-sm">{sucesso}</div>}
        {erro && <div className="mb-4 bg-red-50 border px-4 py-3 rounded-lg text-sm">{erro}</div>}

        {aba === 'listar' && (
          <div className="space-y-4">
            {provas.map(p => (
              <div key={p.id} className="bg-white rounded-xl border p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold">{p.titulo}</h3>

                    <div className="flex gap-2 mt-2">
                      <span className={`text-xs px-2 py-1 rounded-full ${STATUS_LABEL[p.status]?.cor}`}>
                        {STATUS_LABEL[p.status]?.label}
                      </span>

                      {p.disciplinas && (
                        <span className="text-xs px-2 py-1 bg-indigo-50 text-indigo-700 rounded-full">
                          {p.disciplinas.nome}
                        </span>
                      )}

                      <span className="text-xs text-gray-500">
                        {p.prova_questoes?.length ?? 0} questão(ões)
                      </span>
                    </div>
                  </div>

                  {p.status === 'rascunho' && (
                    <button
                      onClick={() => submeterAprovacao(p.id)}
                      className="px-4 py-2 bg-amber-500 text-white text-sm rounded-lg"
                    >
                      Enviar
                    </button>
                  )}

                  {p.status === 'aprovada' && (
                    <button
                      onClick={() => router.push(`/professor/provas/${p.id}/imprimir`)}
                      className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm rounded-lg"
                    >
                      🖨️ Imprimir PDF
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}