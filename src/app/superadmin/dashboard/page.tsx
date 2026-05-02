'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function SuperAdminDashboard() {
  const router = useRouter()
  const [usuarios, setUsuarios] = useState<any[]>([])
  const [stats, setStats] = useState({ total: 0, professores: 0, coordenadores: 0, diretores: 0 })
  const [carregando, setCarregando] = useState(true)

  useEffect(() => {
    async function carregar() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const { data: me } = await supabase.from('usuarios').select('papel').eq('id', user.id).single()
      if (me?.papel !== 'superadmin') { router.push('/login'); return }

      const { data: lista } = await supabase.from('usuarios').select('*').order('criado_em', { ascending: false })
      if (lista) {
        setUsuarios(lista)
        setStats({
          total: lista.length,
          professores: lista.filter(u => u.papel === 'professor').length,
          coordenadores: lista.filter(u => u.papel === 'coordenador').length,
          diretores: lista.filter(u => u.papel === 'diretor').length,
        })
      }
      setCarregando(false)
    }
    carregar()
  }, [router])

  async function alterarPapel(id: string, novoPapel: string) {
    const supabase = createClient()
    await supabase.from('usuarios').update({ papel: novoPapel }).eq('id', id)
    setUsuarios(prev => prev.map(u => u.id === id ? { ...u, papel: novoPapel } : u))
  }

  if (carregando) return <div className="min-h-screen flex items-center justify-center text-gray-500">Carregando...</div>

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Header */}
      <div className="bg-gray-900 border-b border-gray-800 px-8 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-violet-600 rounded-lg flex items-center justify-center text-sm font-bold">S</div>
          <div>
            <span className="font-bold text-white">AvaliaEscola</span>
            <span className="text-gray-400 text-sm ml-2">› Super Admin</span>
          </div>
        </div>
        <div className="flex gap-3">
          <a href="/coordenador/dashboard" className="text-sm text-gray-400 hover:text-white px-3 py-1.5 rounded-lg hover:bg-gray-800 transition-colors">
            Ver como Coordenador
          </a>
          <button
            onClick={async () => { const s = createClient(); await s.auth.signOut(); router.push('/login') }}
            className="text-sm text-gray-400 hover:text-red-400 px-3 py-1.5 rounded-lg hover:bg-gray-800 transition-colors"
          >
            Sair
          </button>
        </div>
      </div>

      <div className="px-8 py-8 max-w-7xl mx-auto">
        {/* Título */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-white">Painel de Desenvolvimento</h1>
          <p className="text-gray-400 text-sm mt-1">Acesso supremo — visibilidade total do sistema</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Total de usuários', valor: stats.total, cor: 'text-violet-400' },
            { label: 'Professores', valor: stats.professores, cor: 'text-blue-400' },
            { label: 'Coordenadores', valor: stats.coordenadores, cor: 'text-green-400' },
            { label: 'Diretores', valor: stats.diretores, cor: 'text-amber-400' },
          ].map(s => (
            <div key={s.label} className="bg-gray-900 border border-gray-800 rounded-xl p-5">
              <div className={`text-3xl font-bold ${s.cor}`}>{s.valor}</div>
              <div className="text-gray-400 text-sm mt-1">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Tabela de usuários */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-800">
            <h2 className="font-semibold text-white">Todos os usuários</h2>
          </div>
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-800">
                <th className="text-left px-6 py-3 text-xs text-gray-400 font-medium uppercase">Nome</th>
                <th className="text-left px-6 py-3 text-xs text-gray-400 font-medium uppercase">E-mail</th>
                <th className="text-left px-6 py-3 text-xs text-gray-400 font-medium uppercase">Papel</th>
                <th className="text-left px-6 py-3 text-xs text-gray-400 font-medium uppercase">Alterar papel</th>
              </tr>
            </thead>
            <tbody>
              {usuarios.map(u => (
                <tr key={u.id} className="border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors">
                  <td className="px-6 py-4 text-sm text-white">{u.nome || '—'}</td>
                  <td className="px-6 py-4 text-sm text-gray-300">{u.email}</td>
                  <td className="px-6 py-4">
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                      u.papel === 'superadmin' ? 'bg-violet-900 text-violet-300' :
                      u.papel === 'diretor' ? 'bg-amber-900 text-amber-300' :
                      u.papel === 'coordenador' ? 'bg-green-900 text-green-300' :
                      'bg-blue-900 text-blue-300'
                    }`}>
                      {u.papel}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    {u.papel !== 'superadmin' && (
                      <select
                        defaultValue={u.papel}
                        onChange={(e) => alterarPapel(u.id, e.target.value)}
                        className="bg-gray-800 border border-gray-700 text-gray-300 text-xs rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-violet-500"
                      >
                        <option value="professor">professor</option>
                        <option value="coordenador">coordenador</option>
                        <option value="diretor">diretor</option>
                      </select>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}