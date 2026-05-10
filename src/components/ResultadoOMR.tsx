// components/ResultadoOMR.tsx
'use client'

import { ResultadoCorrecao } from '@/lib/omr-processor'

interface Props {
  resultado: ResultadoCorrecao
  nomeAluno?: string
  onNovo: () => void
}

export default function ResultadoOMR({ resultado, nomeAluno, onNovo }: Props) {
  const { acertos, erros, naoRespondidas, nota, totalQuestoes, detalhe } = resultado
  const percentual = Math.round((acertos / totalQuestoes) * 100)
  const cor = nota >= 7 ? 'text-green-600' : nota >= 5 ? 'text-yellow-600' : 'text-red-600'
  const bgCor = nota >= 7 ? 'bg-green-50 border-green-200' : nota >= 5 ? 'bg-yellow-50 border-yellow-200' : 'bg-red-50 border-red-200'

  return (
    <div className="space-y-6">
      {/* Card de nota */}
      <div className={`rounded-2xl border-2 p-6 text-center ${bgCor}`}>
        {nomeAluno && <p className="text-sm text-gray-500 mb-1">Resultado de</p>}
        {nomeAluno && <p className="font-semibold text-gray-800 mb-3">{nomeAluno}</p>}
        <p className={`text-6xl font-bold ${cor}`}>{nota}</p>
        <p className="text-gray-500 mt-1">de 10 pontos</p>
        <div className="flex justify-center gap-6 mt-4 text-sm">
          <span className="text-green-700">✓ {acertos} acertos</span>
          <span className="text-red-700">✗ {erros} erros</span>
          {naoRespondidas > 0 && (
            <span className="text-gray-500">— {naoRespondidas} em branco</span>
          )}
        </div>
        {/* Barra de progresso */}
        <div className="mt-4 bg-white rounded-full h-3 border overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${nota >= 7 ? 'bg-green-500' : nota >= 5 ? 'bg-yellow-500' : 'bg-red-500'}`}
            style={{ width: `${percentual}%` }}
          />
        </div>
        <p className="text-xs text-gray-400 mt-1">{percentual}% de aproveitamento</p>
      </div>

      {/* Gabarito detalhado */}
      <div>
        <h3 className="font-semibold text-gray-700 mb-3">Gabarito detalhado</h3>
        <div className="grid grid-cols-5 gap-2">
          {detalhe.map(d => (
            <div
              key={d.questao}
              className={`rounded-lg p-2 text-center text-xs border ${
                d.correto
                  ? 'bg-green-50 border-green-200'
                  : !d.respostaAluno
                  ? 'bg-gray-50 border-gray-200'
                  : 'bg-red-50 border-red-200'
              }`}
            >
              <p className="font-bold text-gray-600">{d.questao}</p>
              <p className={`text-lg font-bold ${d.correto ? 'text-green-600' : 'text-red-600'}`}>
                {d.respostaAluno ?? '—'}
              </p>
              {!d.correto && (
                <p className="text-green-600 font-medium">{d.respostaCorreta}</p>
              )}
            </div>
          ))}
        </div>
      </div>

      <button
        onClick={onNovo}
        className="w-full py-3 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-700 transition"
      >
        Corrigir outra prova
      </button>
    </div>
  )
}