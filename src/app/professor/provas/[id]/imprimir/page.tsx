'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'
import QRCode from 'qrcode'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

interface Alternativa {
  letra: string
  texto: string
  correta: boolean
}

interface Questao {
  enunciado: string
  nivel_dificuldade: string
  alternativas: Alternativa[]
}

interface ProvaData {
  prova: {
    id: string
    titulo: string
    instrucoes?: string
    tempo_minutos?: number
    disciplina?: string
    professor?: string
  }
  questoes: Questao[]
}

interface Aluno {
  id: string
  nome: string
  turma: string
  serie: string
}

export default function ImprimirProva() {
  const params = useParams<{ id: string }>()

  const [data, setData] = useState<ProvaData | null>(null)
  const [alunos, setAlunos] = useState<Aluno[]>([])
  const [turmaSelecionada, setTurmaSelecionada] = useState('')
  const [turmas, setTurmas] = useState<string[]>([])
  const [qrCodes, setQrCodes] = useState<Record<string, string>>({})
  const [mostrarGabarito, setMostrarGabarito] = useState(false)
  const [modoImpressao, setModoImpressao] = useState<'turma' | 'individual'>('individual')
  const [carregando, setCarregando] = useState(true)

  useEffect(() => {
    async function carregarProva() {
      try {
        const response = await fetch(`/api/provas/${params.id}/pdf`)

        if (!response.ok) {
          throw new Error('Erro ao carregar prova')
        }

        const resultado = (await response.json()) as ProvaData
        setData(resultado)
      } catch (error) {
        console.error(error)
      } finally {
        setCarregando(false)
      }
    }

    carregarProva()
  }, [params.id])

  // Ajustado: Busca de alunos migrada do SDK Supabase direto para a chamada da API interna
  useEffect(() => {
    async function carregarAlunos() {
      try {
        const res = await fetch('/api/alunos')
        const lista = await res.json()
        
        if (!Array.isArray(lista)) return
        
        setAlunos(lista)
        
        const turmasUnicas = [
          ...new Set(lista.map((a: Aluno) => a.turma))
        ].sort() as string[]
        
        setTurmas(turmasUnicas)
        
        if (turmasUnicas.length > 0) {
          setTurmaSelecionada(turmasUnicas[0])
        }
      } catch (error) {
        console.error(error)
      }
    }
    
    carregarAlunos()
  }, [])

  useEffect(() => {
    async function gerarQRCodes() {
      if (!data?.prova?.id || alunos.length === 0) {
        return
      }

      const qrs: Record<string, string> = {}

      for (const aluno of alunos) {
        try {
          qrs[aluno.id] = await QRCode.toDataURL(
            `PROVA:${data.prova.id}|ALUNO:${aluno.id}`,
            {
              width: 100,
              margin: 1
            }
          )
        } catch (error) {
          console.error('Erro ao gerar QRCode:', error)
        }
      }

      setQrCodes(qrs)
    }

    gerarQRCodes()
  }, [data, alunos])

  if (carregando) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">Preparando prova...</p>
      </div>
    )
  }

  if (!data || !data.prova) {
    return (
      <div className="p-8">
        <p className="text-red-500 font-medium">Prova não encontrada.</p>
      </div>
    )
  }

  const prova = data.prova
  const questoes: Questao[] = data.questoes ?? []

  const gabarito = questoes.map(
    (q) => q.alternativas?.find((a) => a.correta)?.letra ?? '?'
  )

  const alunosFiltrados = turmaSelecionada
    ? alunos.filter((a) => a.turma === turmaSelecionada)
    : alunos

  const FolhaAluno = ({ aluno, qr }: { aluno: Aluno | null; qr?: string }) => (
    <div className="max-w-3xl mx-auto px-8 py-10 print:px-6 print:py-4 print:break-after-page">
      <div className="border-b-2 border-gray-800 pb-4 mb-6">
        <div className="flex justify-between items-start gap-4">
          <div className="flex-1">
            <h1 className="text-xl font-bold text-gray-900">{prova.titulo}</h1>
            <p className="text-sm text-gray-600 mt-1">
              {prova.disciplina} - Prof. {prova.professor}
            </p>
          </div>

          <div className="flex items-start gap-4">
            <div className="text-right text-sm text-gray-500">
              <p>Data: ____/____/______</p>
              {prova.tempo_minutos && (
                <p className="mt-1">Tempo: {prova.tempo_minutos} min</p>
              )}
            </div>

            {qr && (
              <div className="flex flex-col items-center">
                <img src={qr} alt="QR" className="w-20 h-20" />
                <p className="text-xs text-gray-400 mt-1">Não rasure</p>
              </div>
            )}
          </div>
        </div>

        {aluno ? (
          <div className="mt-4 bg-gray-50 border border-gray-200 rounded p-3">
            <div className="flex gap-6">
              <div className="flex-1">
                <p className="text-xs text-gray-500 mb-1">Nome</p>
                <p className="font-semibold text-gray-900">{aluno.nome}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">Turma</p>
                <p className="font-semibold text-gray-900">{aluno.turma}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">Série</p>
                <p className="font-semibold text-gray-900">{aluno.serie}</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="mt-4 flex gap-6">
            <div className="flex-1">
              <p className="text-sm text-gray-600">
                Nome:
                <span className="inline-block border-b border-gray-400 w-72 ml-2" />
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">
                Turma:
                <span className="inline-block border-b border-gray-400 w-20 ml-2" />
              </p>
            </div>
          </div>
        )}

        {prova.instrucoes && (
          <div className="mt-3 bg-gray-50 border border-gray-200 rounded p-3">
            <p className="text-xs font-semibold text-gray-700 mb-1">INSTRUÇÕES</p>
            <p className="text-xs text-gray-600">{prova.instrucoes}</p>
          </div>
        )}
      </div>

      <div className="space-y-6">
        {questoes.map((q, i) => (
          <div key={i} className="break-inside-avoid">
            <div className="flex gap-3">
              <span className="font-bold text-gray-900 flex-shrink-0">{i + 1}.</span>
              <div className="flex-1">
                <p className="text-gray-900 text-sm leading-relaxed mb-3">
                  {q.enunciado}
                </p>

                <div className="space-y-2">
                  {(q.alternativas ?? [])
                    .sort((a, b) => a.letra.localeCompare(b.letra))
                    .map((alt) => (
                      <div key={alt.letra} className="flex gap-2 items-start">
                        <div className="w-5 h-5 border border-gray-400 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                          <span className="text-xs font-medium text-gray-700">
                            {alt.letra}
                          </span>
                        </div>
                        <p className="text-sm text-gray-700 leading-relaxed">
                          {alt.texto}
                        </p>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-8 border-t-2 border-gray-800 pt-4">
        <h3 className="font-bold text-gray-800 text-sm mb-2 text-center">
          FOLHA DE RESPOSTAS
        </h3>

        <p className="text-xs text-gray-500 text-center mb-4">
          {aluno
            ? `${aluno.nome} - Turma ${aluno.turma}`
            : 'Preencha o círculo da alternativa escolhida'}
        </p>

        <div className="grid grid-cols-5 gap-2">
          {questoes.map((_, i) => (
            <div key={i} className="flex items-center gap-1">
              <span className="text-xs font-bold text-gray-700 w-4">{i + 1}</span>
              {['A', 'B', 'C', 'D', 'E'].map((letra) => (
                <div
                  key={letra}
                  className="w-5 h-5 border border-gray-500 rounded-full flex items-center justify-center"
                >
                  <span className="text-xs text-gray-500">{letra}</span>
                </div>
              ))}
            </div>
          ))}
        </div>

        <div className="mt-4 flex items-center justify-between">
          <p className="text-xs text-gray-400">
            ID: {prova.id.slice(0, 8).toUpperCase()}
            {aluno && ` | ${aluno.id.slice(0, 6).toUpperCase()}`}
          </p>
          {qr && <img src={qr} alt="QR" className="w-12 h-12" />}
        </div>
      </div>
    </div>
  )

  return (
    <>
      <div className="print:hidden bg-gray-900 text-white px-6 py-3 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <a href="/professor/provas" className="text-gray-400 hover:text-white text-sm">
            Voltar
          </a>
          <span className="text-gray-600">|</span>
          <span className="font-medium">{prova.titulo}</span>
        </div>

        <div className="flex gap-3 items-center">
          <button
            onClick={() => setMostrarGabarito(!mostrarGabarito)}
            className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 rounded text-sm"
          >
            {mostrarGabarito ? 'Ocultar' : 'Ver'} gabarito
          </button>

          <select
            value={modoImpressao}
            onChange={(e) => setModoImpressao(e.target.value as 'turma' | 'individual')}
            className="px-3 py-1.5 bg-gray-700 rounded text-sm text-white"
          >
            <option value="individual">Folha em branco</option>
            <option value="turma">Por turma (QR Code)</option>
          </select>

          {modoImpressao === 'turma' && turmas.length > 0 && (
            <select
              value={turmaSelecionada}
              onChange={(e) => setTurmaSelecionada(e.target.value)}
              className="px-3 py-1.5 bg-gray-700 rounded text-sm text-white"
            >
              {turmas.map((t) => (
                <option key={t} value={t}>
                  Turma {t} ({alunos.filter((a) => a.turma === t).length} alunos)
                </option>
              ))}
            </select>
          )}

          <button
            onClick={() => window.print()}
            className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 rounded text-sm font-medium"
          >
            Imprimir
            {modoImpressao === 'turma' && ` (${alunosFiltrados.length} folhas)`}
          </button>
        </div>
      </div>

      {mostrarGabarito && (
        <div className="print:hidden bg-green-50 border-b border-green-200 px-6 py-3 flex gap-4 flex-wrap items-center">
          <span className="font-semibold text-green-800 text-sm">GABARITO:</span>
          {gabarito.map((resp, i) => (
            <div key={i} className="flex items-center gap-1">
              <span className="text-xs text-gray-500">{i + 1}.</span>
              <span className="w-7 h-7 bg-green-600 text-white rounded-full flex items-center justify-center text-xs font-bold">
                {resp}
              </span>
            </div>
          ))}
        </div>
      )}

      {modoImpressao === 'turma' && alunos.length === 0 && (
        <div className="print:hidden max-w-3xl mx-auto mt-8 p-6 bg-yellow-50 border border-yellow-200 rounded-2xl text-center">
          <p className="font-semibold text-yellow-800">Nenhum aluno cadastrado</p>
          <p className="text-yellow-600 text-sm mt-1">
            Acesse Professor - Alunos para importar a planilha
          </p>
          <a
            href="/professor/alunos"
            className="inline-block mt-3 px-4 py-2 bg-yellow-600 text-white rounded-xl text-sm"
          >
            Ir para Alunos
          </a>
        </div>
      )}

      {modoImpressao === 'turma' && alunosFiltrados.length > 0 ? (
        alunosFiltrados.map((aluno) => (
          <FolhaAluno
            key={aluno.id}
            aluno={aluno}
            qr={qrCodes[aluno.id]}
          />
        ))
      ) : (
        <FolhaAluno aluno={null} />
      )}

      <style jsx global>{`
        @media print {
          body {
            font-size: 12px;
          }
          .print\\:hidden {
            display: none !important;
          }
          @page {
            margin: 1.5cm;
            size: A4;
          }
        }
      `}</style>
    </>
  )
}