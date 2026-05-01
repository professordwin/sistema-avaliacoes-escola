'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState('')
  const [sucesso, setSucesso] = useState('')
  const [carregando, setCarregando] = useState(false)
  const [modo, setModo] = useState<'senha' | 'magic'>('senha')

  async function handleLogin() {
    setCarregando(true)
    setErro('')
    setSucesso('')
    const supabase = createClient()

    if (modo === 'senha') {
      const { error } = await supabase.auth.signInWithPassword({ email, password: senha })
      if (error) {
        setErro('E-mail ou senha incorretos.')
        setCarregando(false)
        return
      }
      router.refresh()
    } else {
      const { error } = await supabase.auth.signInWithOtp({ email })
      if (error) {
        setErro('Erro ao enviar o link. Tente novamente.')
      } else {
        setSucesso('Link enviado! Verifique seu e-mail.')
      }
      setCarregando(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-8">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <span className="text-white text-2xl font-bold">A</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">AvaliaEscola</h1>
          <p className="text-gray-500 text-sm mt-1">Sistema de Avaliações com IA</p>
        </div>

        {/* Seletor de modo */}
        <div className="flex rounded-lg border border-gray-200 mb-6 overflow-hidden">
          <button
            onClick={() => setModo('senha')}
            className={`flex-1 py-2 text-sm font-medium transition-colors ${modo === 'senha' ? 'bg-indigo-600 text-white' : 'text-gray-500 hover:bg-gray-50'}`}
          >
            Senha
          </button>
          <button
            onClick={() => setModo('magic')}
            className={`flex-1 py-2 text-sm font-medium transition-colors ${modo === 'magic' ? 'bg-indigo-600 text-white' : 'text-gray-500 hover:bg-gray-50'}`}
          >
            Link por e-mail
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">E-mail</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="seu@email.com"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
            />
          </div>

          {modo === 'senha' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Senha</label>
              <input
                type="password"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
              />
            </div>
          )}

          {erro && <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">{erro}</div>}
          {sucesso && <div className="bg-green-50 border border-green-200 text-green-700 text-sm px-4 py-3 rounded-lg">{sucesso}</div>}

          <button
            onClick={handleLogin}
            disabled={carregando || !email}
            className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white font-semibold py-3 rounded-lg transition-colors text-sm"
          >
            {carregando ? 'Aguarde...' : modo === 'senha' ? 'Entrar' : 'Enviar link de acesso'}
          </button>
        </div>

        <p className="text-center text-xs text-gray-400 mt-6">
          Acesso restrito aos usuários cadastrados pela escola
        </p>
      </div>
    </div>
  )
}