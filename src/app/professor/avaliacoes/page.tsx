'use client'

import { useState, useEffect, useCallback } from 'react'

interface Disciplina { id: string; nome: string; cor_hex: string }
interface Avaliacao { id: string; titulo: string; bimestre: number; ano: number; serie: string; turmas: string[]; data_aplicacao: string }
interface Questao { id: string; enunciado: string; alternativas?: {letra:string;texto:string}[] }
interface Parte {
  id: string; status: string; ordem: number; questoes_ids: string[]
  disciplinas: Disciplina
  avaliacoes: Avaliacao
}

const STATUS_COR: Record<string,string> = {
  pendente: 'bg-gray-100 text-gray-600',
  em_elaboracao: 'bg-blue-100 text-blue-700',
  submetido: 'bg-green-100 text-green-700',
  aprovado: 'bg-purple-100 text-purple-700',
}

export default function ProfessorAvaliacoesPage() {
  const [partes, setPartes] = useState<Parte[]>([])
  const [questoes, setQuestoes] = useState<Questao[]>([])
  const [aberta, setAberta] = useState<string|null>(null)
  const [selecionadas, setSelecionadas] = useState<Record<string,string[]>>({})
  const [salvando, setSalvando] = useState<string|null>(null)
  const [mensagem, setMensagem] = useState<{tipo:'sucesso'|'erro';texto:string}|null>(null)

  const carregar = useCallback(async () => {
    const [pRes, qRes] = await Promise.all([
      fetch('/api/professor/avaliacoes').then(r=>r.json()),
      fetch('/api/questoes').then(r=>r.json()),
    ])
    const p = Array.isArray(pRes) ? pRes : []
    setPartes(p)
    setQuestoes(Array.isArray(qRes) ? qRes : [])
    const sel: Record<string,string[]> = {}
    p.forEach((parte:Parte) => { sel[parte.id] = parte.questoes_ids ?? [] })
    setSelecionadas(sel)
  }, [])

  useEffect(() => { carregar() }, [carregar])

  const toggleQuestao = (parteId: string, questaoId: string) => {
    setSelecionadas(prev => {
      const atual = prev[parteId] ?? []
      return { ...prev, [parteId]: atual.includes(questaoId) ? atual.filter(id=>id!==questaoId) : [...atual, questaoId] }
    })
  }

  const salvar = async (parteId: string, acao: 'salvar'|'submeter') => {
    setSalvando(parteId); setMensagem(null)
    const res = await fetch('/api/professor/avaliacoes', {
      method: 'PATCH',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify({ id: parteId, questoes_ids: selecionadas[parteId]??[], acao: acao==='submeter'?'submeter':'rascunho' })
    })
    setSalvando(null)
    if (res.ok) {
      setMensagem({tipo:'sucesso', texto: acao==='submeter'?'Questoes submetidas ao coordenador!':'Rascunho salvo.'})
      carregar()
      setTimeout(()=>setMensagem(null), 3000)
    } else {
      const d = await res.json()
      setMensagem({tipo:'erro', texto: d.error??'Erro ao salvar.'})
    }
  }

  const questoesDaDisciplina = (parteId: string) => {
    const parte = partes.find(p=>p.id===parteId)
    if (!parte) return questoes
    return questoes.filter(q => {
      const disciplinaId = parte.disciplinas?.id
      return !disciplinaId || (q as any).disciplina_id === disciplinaId
    })
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
            <span className="text-white text-sm font-bold">A</span>
          </div>
          <span className="font-semibold text-gray-900">AvaliaEscola</span>
          <span className="text-gray-400">›</span>
          <span className="text-gray-600 text-sm">Minhas Avaliações</span>
        </div>
        <a href="/professor/dashboard" className="text-sm text-indigo-600 hover:underline">← Painel</a>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8">
        {mensagem && (
          <div className={`mb-4 p-4 rounded-xl text-sm font-medium ${mensagem.tipo==='sucesso'?'bg-green-50 text-green-700 border border-green-200':'bg-red-50 text-red-700 border border-red-200'}`}>
            {mensagem.texto}
          </div>
        )}

        {partes.length === 0 ? (
          <div className="bg-white rounded-2xl border p-12 text-center">
            <p className="text-4xl mb-3">📋</p>
            <p className="font-semibold text-gray-700">Nenhuma avaliação atribuída</p>
            <p className="text-gray-400 text-sm mt-1">O coordenador ainda não criou avaliações para você</p>
          </div>
        ) : (
          <div className="space-y-4">
            {partes.map(parte => {
              const sel = selecionadas[parte.id] ?? []
              const qs = questoesDaDisciplina(parte.id)
              const podeSalvar = parte.status !== 'submetido' && parte.status !== 'aprovado'

              return (
                <div key={parte.id} className="bg-white rounded-2xl border overflow-hidden">
                  <div className="p-5 cursor-pointer hover:bg-gray-50"
                    onClick={() => setAberta(aberta===parte.id?null:parte.id)}>
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <div className="w-3 h-3 rounded-full" style={{backgroundColor:parte.disciplinas?.cor_hex??'#888'}}/>
                          <span className="font-semibold text-gray-900">{parte.disciplinas?.nome}</span>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COR[parte.status]}`}>
                            {parte.status==='pendente'?'Pendente':parte.status==='em_elaboracao'?'Em elaboração':parte.status==='submetido'?'Submetido':'Aprovado'}
                          </span>
                        </div>
                        <p className="text-gray-700 font-medium">{parte.avaliacoes?.titulo}</p>
                        <p className="text-xs text-gray-400 mt-1">
                          {parte.avaliacoes?.bimestre}º Bimestre {parte.avaliacoes?.ano} · {parte.avaliacoes?.serie} · Turmas {parte.avaliacoes?.turmas?.join(', ')}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-sm text-gray-500">{sel.length} questão(ões)</span>
                        <span className="text-gray-400">{aberta===parte.id?'▲':'▼'}</span>
                      </div>
                    </div>
                  </div>

                  {aberta===parte.id && (
                    <div className="border-t">
                      <div className="p-4 bg-gray-50">
                        <p className="text-sm font-medium text-gray-700 mb-3">
                          Selecione as questões de {parte.disciplinas?.nome} ({sel.length} selecionadas)
                        </p>

                        {qs.length === 0 ? (
                          <div className="text-center py-6 text-gray-400 text-sm">
                            Nenhuma questão encontrada para esta disciplina.
                            <a href="/professor/questoes" className="block mt-2 text-indigo-600 hover:underline">Criar questões</a>
                          </div>
                        ) : (
                          <div className="space-y-2 max-h-96 overflow-y-auto">
                            {qs.map(q => (
                              <div key={q.id}
                                onClick={() => podeSalvar && toggleQuestao(parte.id, q.id)}
                                className={`p-3 rounded-xl border cursor-pointer transition ${sel.includes(q.id)?'border-indigo-400 bg-indigo-50':'bg-white hover:border-gray-300'} ${!podeSalvar?'opacity-60 cursor-not-allowed':''}`}>
                                <div className="flex items-start gap-3">
                                  <div className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 mt-0.5 ${sel.includes(q.id)?'bg-indigo-600 border-indigo-600':'border-gray-300'}`}>
                                    {sel.includes(q.id) && <span className="text-white text-xs">✓</span>}
                                  </div>
                                  <p className="text-sm text-gray-700 line-clamp-2">{q.enunciado}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {podeSalvar && (
                        <div className="px-4 pb-4 flex gap-3">
                          <button
                            onClick={() => salvar(parte.id, 'salvar')}
                            disabled={salvando===parte.id}
                            className="flex-1 py-2.5 border-2 border-indigo-300 text-indigo-600 hover:bg-indigo-50 text-sm font-medium rounded-xl transition disabled:opacity-50">
                            {salvando===parte.id?'Salvando...':'💾 Salvar Rascunho'}
                          </button>
                          <button
                            onClick={() => salvar(parte.id, 'submeter')}
                            disabled={salvando===parte.id||sel.length===0}
                            className="flex-1 py-2.5 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold rounded-xl transition disabled:opacity-50">
                            {salvando===parte.id?'Enviando...':'📬 Submeter ao Coordenador'}
                          </button>
                        </div>
                      )}

                      {!podeSalvar && (
                        <div className="px-4 pb-4">
                          <div className="p-3 bg-green-50 border border-green-200 rounded-xl text-sm text-green-700">
                            ✅ Questões submetidas ao coordenador. Aguardando aprovação.
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}