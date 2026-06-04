'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

interface Aluno {
  id: string
  nome: string
  turma: string
  serie: string
  observacoes: string | null
}

interface Mensagem {
  tipo: 'sucesso' | 'erro'
  texto: string
}

export default function AlunosPage() {
  const [alunos, setAlunos] = useState<Aluno[]>([])
  const [carregando, setCarregando] = useState(true)
  const [importando, setImportando] = useState(false)
  const [mensagem, setMensagem] = useState<Mensagem | null>(null)
  const [filtroTurma, setFiltroTurma] = useState('')

  const fileRef = useRef<HTMLInputElement>(null)

  // Trecho ajustado para carregar os alunos através da API interna
  const carregarAlunos = async () => {
    try {
      setCarregando(true)
      const res = await fetch('/api/alunos')
      const data = await res.json()
      setAlunos(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error(error)
      setMensagem({ tipo: 'erro', texto: 'Erro ao carregar alunos' })
    } finally {
      setCarregando(false)
    }
  }

  useEffect(() => {
    carregarAlunos()
  }, [])

  const handleImportar = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setImportando(true)
    setMensagem(null)

    try {
      const {
        data: { user }
      } = await supabase.auth.getUser()

      // Converte arquivo para base64
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()

        reader.onload = () => {
          try {
            const resultado = reader.result as string
            const base64String = resultado.split(',')[1]
            resolve(base64String)
          } catch (error) {
            reject(error)
          }
        }

        reader.onerror = reject
        reader.readAsDataURL(file)
      })

      const response = await fetch('/api/alunos/importar', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          arquivoBase64: base64,
          nomeArquivo: file.name,
          professorId: user?.id ?? ''
        })
      })

      const resultado = await response.json()

      if (!response.ok) {
        throw new Error(resultado.erro ?? 'Erro ao importar')
      }

      setMensagem({
        tipo: 'sucesso',
        texto: `${resultado.importados} alunos importados com sucesso!`
      })

      await carregarAlunos()
    } catch (err: unknown) {
      console.error(err)

      setMensagem({
        tipo: 'erro',
        texto: err instanceof Error ? err.message : 'Erro ao importar planilha'
      })
    } finally {
      setImportando(false)

      if (fileRef.current) {
        fileRef.current.value = ''
      }
    }
  }

  const turmas = [...new Set(alunos.map((a) => a.turma))].sort()

  const alunosFiltrados = filtroTurma
    ? alunos.filter((a) => a.turma === filtroTurma)
    : alunos

  return (
    <div className="max-w-5xl mx-auto p-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Gerenciar Alunos</h1>
          <p className="text-gray-500 text-sm mt-1">
            {alunos.length} alunos cadastrados
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => window.open('/planilha_modelo_alunos.xlsx')}
            className="px-4 py-2 rounded-xl border border-blue-300 text-blue-600 text-sm font-medium hover:bg-blue-50 transition"
          >
            Baixar Modelo Excel
          </button>

          <button
            onClick={() => fileRef.current?.click()}
            disabled={importando}
            className="px-4 py-2 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition disabled:opacity-50"
          >
            {importando ? 'Importando...' : 'Importar Planilha'}
          </button>

          <input
            ref={fileRef}
            type="file"
            accept=".xlsx,.xls"
            onChange={handleImportar}
            className="hidden"
          />
        </div>
      </div>

      {mensagem && (
        <div
          className={`mb-4 p-4 rounded-xl text-sm font-medium ${
            mensagem.tipo === 'sucesso'
              ? 'bg-green-50 text-green-700 border border-green-200'
              : 'bg-red-50 text-red-700 border border-red-200'
          }`}
        >
          {mensagem.texto}
        </div>
      )}

      <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800">
        <p className="font-semibold mb-1">Formato da planilha</p>
        <p>Colunas obrigatórias:</p>
        <div className="mt-2 font-mono text-xs bg-white border border-amber-200 rounded p-2">
          nome_aluno | turma | serie | observacoes
        </div>
        <p className="mt-3">
          Baixe o modelo acima para garantir o formato correto.
        </p>
      </div>

      {turmas.length > 0 && (
        <div className="mb-6 flex gap-2 flex-wrap">
          <button
            onClick={() => setFiltroTurma('')}
            className={`px-3 py-1 rounded-full text-sm font-medium transition ${
              !filtroTurma
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Todas
          </button>

          {turmas.map((t) => (
            <button
              key={t}
              onClick={() => setFiltroTurma(t)}
              className={`px-3 py-1 rounded-full text-sm font-medium transition ${
                filtroTurma === t
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Turma {t}
            </button>
          ))}
        </div>
      )}

      {carregando ? (
        <div className="text-center py-12 text-gray-400">
          Carregando alunos...
        </div>
      ) : alunosFiltrados.length === 0 ? (
        <div className="text-center py-12 border-2 border-dashed border-gray-200 rounded-2xl">
          <p className="text-gray-500 font-medium">
            Nenhum aluno cadastrado ainda
          </p>
          <p className="text-gray-400 text-sm mt-1">
            Importe uma planilha para começar
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b">
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">
                    Nome
                  </th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">
                    Turma
                  </th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">
                    Série
                  </th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">
                    Observações
                  </th>
                </tr>
              </thead>
              <tbody>
                {alunosFiltrados.map((aluno, i) => (
                  <tr
                    key={aluno.id}
                    className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}
                  >
                    <td className="px-4 py-3 font-medium text-gray-800">
                      {aluno.nome}
                    </td>
                    <td className="px-4 py-3">
                      <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">
                        {aluno.turma}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{aluno.serie}</td>
                    <td className="px-4 py-3 text-gray-400 text-xs">
                      {aluno.observacoes ?? '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}