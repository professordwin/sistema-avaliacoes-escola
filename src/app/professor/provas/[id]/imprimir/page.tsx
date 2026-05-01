'use client'

import { useEffect, useState, useRef } from 'react'
import { useParams } from 'next/navigation'

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

export default function ImprimirProva() {
  const params = useParams()
  const [data, setData] = useState<ProvaData | null>(null)
  const [carregando, setCarregando] = useState(true)
  const [mostrarGabarito, setMostrarGabarito] = useState(false)
  const printRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetch(`/api/provas/${params.id}/pdf`)
      .then(r => r.json())
      .then(d => { setData(d); setCarregando(false) })
  }, [params.id])

  function imprimir() {
    window.print()
  }

  if (carregando) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">Preparando prova para impressão...</p>
      </div>
    )
  }

  if (!data) return <p>Prova não encontrada.</p>

  const { prova, questoes } = data
  const gabarito = questoes.map(q =>
    q.alternativas.find(a => a.correta)?.letra ?? '?'
  )

  return (
    <>
      {/* Barra de controle — não aparece na impressão */}
      <div className="print:hidden bg-gray-900 text-white px-6 py-3 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <a href={`/professor/provas`} className="text-gray-400 hover:text-white text-sm">← Voltar</a>
          <span className="text-gray-600">|</span>
          <span className="font-medium">{prova.titulo}</span>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setMostrarGabarito(!mostrarGabarito)}
            className="px-4 py-1.5 bg-gray-700 hover:bg-gray-600 rounded text-sm"
          >
            {mostrarGabarito ? 'Ocultar' : 'Ver'} gabarito
          </button>
          <button
            onClick={imprimir}
            className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 rounded text-sm font-medium"
          >
            🖨️ Imprimir
          </button>
        </div>
      </div>

      {/* PROVA — aparece na impressão */}
      <div ref={printRef} className="max-w-3xl mx-auto px-8 py-10 print:px-6 print:py-6">

        {/* Cabeçalho */}
        <div className="border-b-2 border-gray-800 pb-4 mb-6">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-xl font-bold text-gray-900">{prova.titulo}</h1>
              <p className="text-sm text-gray-600 mt-1">
                {prova.disciplina} · Prof. {prova.professor}
              </p>
            </div>
            <div className="text-right text-sm text-gray-500">
              <p>Data: ____/____/______</p>
              {prova.tempo_minutos && <p className="mt-1">Tempo: {prova.tempo_minutos} min</p>}
            </div>
          </div>

          {/* Campo nome do aluno */}
          <div className="mt-4 flex gap-6">
            <div className="flex-1">
              <p className="text-sm text-gray-600">Nome: <span className="inline-block border-b border-gray-400 w-72 ml-1"/></p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Turma: <span className="inline-block border-b border-gray-400 w-20 ml-1"/></p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Nº: <span className="inline-block border-b border-gray-400 w-12 ml-1"/></p>
            </div>
          </div>

          {prova.instrucoes && (
            <div className="mt-3 bg-gray-50 border border-gray-200 rounded p-3">
              <p className="text-xs font-medium text-gray-700 mb-1">INSTRUÇÕES:</p>
              <p className="text-xs text-gray-600">{prova.instrucoes}</p>
            </div>
          )}
        </div>

        {/* Questões */}
        <div className="space-y-6">
          {questoes.map((q, i) => (
            <div key={i} className="break-inside-avoid">
              <div className="flex gap-3">
                <span className="font-bold text-gray-900 flex-shrink-0">{i + 1}.</span>
                <div className="flex-1">
                  <p className="text-gray-900 text-sm leading-relaxed mb-3">{q.enunciado}</p>
                  <div className="space-y-1.5">
                    {q.alternativas
                      .sort((a, b) => a.letra.localeCompare(b.letra))
                      .map(alt => (
                        <div key={alt.letra} className="flex gap-2 items-start">
                          <div className="w-5 h-5 border border-gray-400 rounded-full flex-shrink-0 mt-0.5 flex items-center justify-center">
                            <span className="text-xs font-medium text-gray-700">{alt.letra}</span>
                          </div>
                          <p className="text-sm text-gray-700 leading-relaxed">{alt.texto}</p>
                        </div>
                      ))}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Gabarito (só aparece quando ativado ou na impressão do professor) */}
        {mostrarGabarito && (
          <div className="mt-10 border-t-2 border-dashed border-gray-400 pt-6 print:hidden">
            <h3 className="font-bold text-gray-700 mb-3 text-sm">GABARITO</h3>
            <div className="flex flex-wrap gap-3">
              {gabarito.map((resp, i) => (
                <div key={i} className="flex items-center gap-1">
                  <span className="text-xs text-gray-500">{i + 1}.</span>
                  <span className="w-7 h-7 bg-green-600 text-white rounded-full flex items-center justify-center text-xs font-bold">
                    {resp}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Folha de respostas para impressão */}
        <div className="mt-10 border-t-2 border-gray-800 pt-6 print:mt-8">
          <h3 className="font-bold text-gray-800 text-sm mb-4 text-center">
            FOLHA DE RESPOSTAS
          </h3>
          <p className="text-xs text-gray-500 text-center mb-4">
            Preencha completamente o círculo da alternativa escolhida
          </p>
          <div className="grid grid-cols-5 gap-3">
            {questoes.map((_, i) => (
              <div key={i} className="flex items-center gap-1">
                <span className="text-xs font-bold text-gray-700 w-4">{i + 1}</span>
                {['A','B','C','D','E'].map(letra => (
                  <div key={letra}
                    className="w-5 h-5 border border-gray-500 rounded-full flex items-center justify-center">
                    <span className="text-xs text-gray-500">{letra}</span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>

        {/* ID da prova para rastreamento */}
        <div className="mt-6 text-center">
          <p className="text-xs text-gray-400">ID: {prova.id.slice(0, 8).toUpperCase()}</p>
        </div>
      </div>

      {/* CSS de impressão */}
      <style jsx global>{`
        @media print {
          body { font-size: 12px; }
          .print\\:hidden { display: none !important; }
          @page { margin: 1.5cm; size: A4; }
        }
      `}</style>
    </>
  )
}