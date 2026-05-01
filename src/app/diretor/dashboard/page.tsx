'use client'

import { useState, useEffect } from 'react'

interface Stats {
  totais: { provas: number; questoes: number; professores: number }
  provasPorStatus: { rascunho: number; aguardando: number; aprovada: number; aplicada: number }
  provasRecentes: { id: string; status: string; criado_em: string; disciplinas?: { nome: string } }[]
  professores: { id: string; nome: string; email: string }[]
  disciplinas: { id: string; nome: string; cor_hex: string }[]
}

const STATUS_LABEL: Record<string, { label: string; cor: string }> = {
  rascunho: { label: 'Rascunho', cor: 'bg-gray-100 text-gray-600' },
  aguardando_aprovacao: { label: 'Aguardando', cor: 'bg-yellow-100 text-yellow-700' },
  aprovada: { label: 'Aprovada', cor: 'bg-green-100 text-green-700' },
  aplicada: { label: 'Aplicada', cor: 'bg-blue-100 text-blue-700' },
}

export default function DiretorDashboard() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [carregando, setCarregando] = useState(true)

  useEffect(() => {
    fetch('/api/diretor/stats')
      .then(r => r.json())
      .then(data => { setStats(data); setCarregando(false) })
  }, [])

  if (carregando) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"/>
          <p className="text-gray-500 text-sm">Carregando painel...</p>
        </div>
      </div>
    )
  }

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
        <div className="flex items-center gap-4">
          <span className="text-xs text-gray-400">Escola Piloto</span>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">Visão Geral da Escola</h1>
        <p className="text-gray-500 text-sm mb-8">Acompanhe o desempenho institucional em tempo real.</p>

        {/* Cards principais */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <p className="text-3xl font-bold text-blue-700">{stats?.totais.provas ?? 0}</p>
            <p className="text-sm text-gray-500 mt-1">Total de provas</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <p className="text-3xl font-bold text-amber-600">{stats?.totais.questoes ?? 0}</p>
            <p className="text-sm text-gray-500 mt-1">Questões no banco</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <p className="text-3xl font-bold text-green-600">{stats?.totais.professores ?? 0}</p>
            <p className="text-sm text-gray-500 mt-1">Professores ativos</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <p className="text-3xl font-bold text-purple-600">{stats?.disciplinas.length ?? 0}</p>
            <p className="text-sm text-gray-500 mt-1">Disciplinas</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          {/* Status das provas */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="font-semibold text-gray-900 mb-4">Status das Provas</h2>
            <div className="space-y-3">
              {[
                { label: 'Rascunho', valor: stats?.provasPorStatus.rascunho ?? 0, cor: 'bg-gray-200', texto: 'text-gray-600' },
                { label: 'Aguardando aprovação', valor: stats?.provasPorStatus.aguardando ?? 0, cor: 'bg-yellow-400', texto: 'text-yellow-700' },
                { label: 'Aprovadas', valor: stats?.provasPorStatus.aprovada ?? 0, cor: 'bg-green-500', texto: 'text-green-700' },
                { label: 'Aplicadas', valor: stats?.provasPorStatus.aplicada ?? 0, cor: 'bg-blue-500', texto: 'text-blue-700' },
              ].map(item => (
                <div key={item.label}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className={item.texto}>{item.label}</span>
                    <span className="font-medium text-gray-700">{item.valor}</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2">
                    <div
                      className={`${item.cor} h-2 rounded-full transition-all`}
                      style={{ width: `${stats?.totais.provas ? (item.valor / stats.totais.provas) * 100 : 0}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Disciplinas */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="font-semibold text-gray-900 mb-4">Disciplinas Ativas</h2>
            <div className="space-y-3">
              {stats?.disciplinas.map(d => (
                <div key={d.id} className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: d.cor_hex }}/>
                  <span className="text-sm text-gray-700">{d.nome}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Professores */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="font-semibold text-gray-900 mb-4">Professores Cadastrados</h2>
            <div className="space-y-3">
              {stats?.professores.length === 0 ? (
                <p className="text-sm text-gray-400">Nenhum professor cadastrado.</p>
              ) : (
                stats?.professores.map(p => (
                  <div key={p.id} className="flex items-center gap-3">
                    <div className="w-7 h-7 bg-indigo-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-indigo-700 text-xs font-bold">{p.nome[0]}</span>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-800">{p.nome}</p>
                      <p className="text-xs text-gray-400">{p.email}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Provas recentes */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="font-semibold text-gray-900 mb-4">Provas Recentes</h2>
          {stats?.provasRecentes.length === 0 ? (
            <p className="text-sm text-gray-400">Nenhuma prova criada ainda.</p>
          ) : (
            <div className="space-y-3">
              {stats?.provasRecentes.map(p => (
                <div key={p.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                  <div className="flex items-center gap-3">
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${STATUS_LABEL[p.status]?.cor}`}>
                      {STATUS_LABEL[p.status]?.label}
                    </span>
                    {p.disciplinas && (
                      <span className="text-xs px-2 py-1 bg-indigo-50 text-indigo-700 rounded-full">
                        {p.disciplinas.nome}
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-gray-400">
                    {new Date(p.criado_em).toLocaleDateString('pt-BR')}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Ações rápidas */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          <a href="/coordenador/dashboard"
            className="bg-purple-600 hover:bg-purple-700 text-white rounded-xl p-4 text-center transition-colors block">
            <p className="text-2xl mb-1">📋</p>
            <p className="font-medium text-sm">Painel do Coordenador</p>
          </a>
          <div className="bg-white border border-gray-200 rounded-xl p-4 text-center opacity-60">
            <p className="text-2xl mb-1">📊</p>
            <p className="font-medium text-sm text-gray-600">Relatórios</p>
            <p className="text-xs text-gray-400 mt-1">Em breve</p>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl p-4 text-center opacity-60">
            <p className="text-2xl mb-1">⚙️</p>
            <p className="font-medium text-sm text-gray-600">Configurações</p>
            <p className="text-xs text-gray-400 mt-1">Em breve</p>
          </div>
        </div>
      </main>
    </div>
  )
}