'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import QRCode from 'qrcode'

interface ProvaData {
  prova: {
    id: string
    titulo: string
    disciplina?: string
    professor?: string
  }
  questoes: { enunciado: string; alternativas: { letra: string; correta: boolean }[] }[]
}

interface Aluno {
  id: string
  nome: string
  turma: string
  serie: string
}

const LETRAS = ['A', 'B', 'C', 'D', 'E']
const ESCOLA = 'CED 06 DO GAMA'

export default function ImprimirCartaoRespostas() {
  const params = useParams<{ id: string }>()

  const [data, setData] = useState<ProvaData | null>(null)
  const [alunos, setAlunos] = useState<Aluno[]>([])
  const [turmas, setTurmas] = useState<string[]>([])
  const [turmaSelecionada, setTurmaSelecionada] = useState('')
  const [qrCodes, setQrCodes] = useState<Record<string, string>>({})
  const [totalQuestoes, setTotalQuestoes] = useState(0)
  const [carregando, setCarregando] = useState(true)

  useEffect(() => {
    async function carregar() {
      try {
        const [provaRes, alunosRes] = await Promise.all([
          fetch(`/api/provas/${params.id}/pdf`),
          fetch('/api/alunos'),
        ])
        const provaData = await provaRes.json()
        const alunosData = await alunosRes.json()

        setData(provaData)
        setTotalQuestoes(provaData.questoes?.length ?? 0)

        if (Array.isArray(alunosData)) {
          setAlunos(alunosData)
          const turmasUnicas = [...new Set(alunosData.map((a: Aluno) => a.turma))].sort() as string[]
          setTurmas(turmasUnicas)
          if (turmasUnicas.length > 0) setTurmaSelecionada(turmasUnicas[0])
        }
      } catch (err) {
        console.error(err)
      } finally {
        setCarregando(false)
      }
    }
    carregar()
  }, [params.id])

  useEffect(() => {
    async function gerarQRCodes() {
      if (!data?.prova?.id || alunos.length === 0) return
      const qrs: Record<string, string> = {}
      for (const aluno of alunos) {
        try {
          qrs[aluno.id] = await QRCode.toDataURL(
            `PROVA:${data.prova.id}|ALUNO:${aluno.id}`,
            { width: 160, margin: 1, errorCorrectionLevel: 'H' }
          )
        } catch (err) {
          console.error(err)
        }
      }
      setQrCodes(qrs)
    }
    gerarQRCodes()
  }, [data, alunos])

  const alunosFiltrados = turmaSelecionada
    ? alunos.filter(a => a.turma === turmaSelecionada)
    : alunos

  if (carregando) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">Preparando cartões...</p>
      </div>
    )
  }

  if (!data?.prova) {
    return <div className="p-8"><p className="text-red-500">Prova não encontrada.</p></div>
  }

  const prova = data.prova

  // Divide questões em duas colunas de até 25
  const col1 = Array.from({ length: Math.min(25, totalQuestoes) }, (_, i) => i + 1)
  const col2 = Array.from({ length: Math.max(0, totalQuestoes - 25) }, (_, i) => i + 26)

  const CartaoAluno = ({ aluno, qr }: { aluno: Aluno; qr?: string }) => (
    <div style={{
      width: '210mm',
      height: '297mm',
      margin: '0 auto',
      background: 'white',
      pageBreakAfter: 'always',
      fontFamily: 'Arial, sans-serif',
      display: 'flex',
      flexDirection: 'column',
      padding: '10mm 12mm',
      boxSizing: 'border-box',
    }}>

      {/* CABEÇALHO */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '4mm' }}>
        
        {/* QR CODE TOPO ESQUERDO */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          {qr ? (
            <img src={qr} alt="QR" style={{ width: '28mm', height: '28mm' }} />
          ) : (
            <div style={{ width: '28mm', height: '28mm', border: '2px dashed #ccc' }} />
          )}
          <span style={{ fontSize: '7px', color: '#999', marginTop: '1mm' }}>NÃO RASURE</span>
        </div>

        {/* INFO CENTRAL */}
        <div style={{ flex: 1, textAlign: 'center', padding: '0 4mm' }}>
          <div style={{ fontSize: '11px', fontWeight: 'bold', color: '#333', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            {ESCOLA}
          </div>
          <div style={{ fontSize: '15px', fontWeight: 'bold', color: 'black', marginTop: '1.5mm', marginBottom: '1.5mm' }}>
            {prova.titulo}
          </div>
          <div style={{ fontSize: '10px', color: '#555' }}>
            Cartão de Respostas
          </div>

          {/* ATENÇÃO */}
          <div style={{
            marginTop: '2mm',
            border: '1.5px solid black',
            borderRadius: '3px',
            padding: '1.5mm 3mm',
            display: 'inline-block',
            fontSize: '9px',
            color: '#333',
          }}>
            <strong>ATENÇÃO:</strong> Preencha completamente a bolha com caneta azul ou preta. Não rasure.
          </div>
        </div>

        {/* QR CODE TOPO DIREITO */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          {qr ? (
            <img src={qr} alt="QR" style={{ width: '28mm', height: '28mm' }} />
          ) : (
            <div style={{ width: '28mm', height: '28mm', border: '2px dashed #ccc' }} />
          )}
          <span style={{ fontSize: '7px', color: '#999', marginTop: '1mm' }}>NÃO RASURE</span>
        </div>
      </div>

      {/* DADOS DO ALUNO */}
      <div style={{
        border: '1.5px solid black',
        borderRadius: '3px',
        padding: '2.5mm 4mm',
        marginBottom: '4mm',
        display: 'flex',
        gap: '4mm',
        alignItems: 'flex-end',
      }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '8px', color: '#888', marginBottom: '1mm', textTransform: 'uppercase' }}>Estudante</div>
          <div style={{ fontSize: '13px', fontWeight: 'bold', color: 'black', borderBottom: '1px solid #333', paddingBottom: '0.5mm' }}>
            {aluno.nome}
          </div>
        </div>
        <div style={{ width: '20mm' }}>
          <div style={{ fontSize: '8px', color: '#888', marginBottom: '1mm', textTransform: 'uppercase' }}>Turma</div>
          <div style={{ fontSize: '13px', fontWeight: 'bold', color: 'black', borderBottom: '1px solid #333', paddingBottom: '0.5mm', textAlign: 'center' }}>
            {aluno.turma}
          </div>
        </div>
        <div style={{ width: '45mm' }}>
          <div style={{ fontSize: '8px', color: '#888', marginBottom: '1mm', textTransform: 'uppercase' }}>Série</div>
          <div style={{ fontSize: '12px', color: 'black', borderBottom: '1px solid #333', paddingBottom: '0.5mm' }}>
            {aluno.serie}
          </div>
        </div>
        <div style={{ width: '35mm' }}>
          <div style={{ fontSize: '8px', color: '#888', marginBottom: '1mm', textTransform: 'uppercase' }}>Assinatura</div>
          <div style={{ borderBottom: '1px solid #333', height: '5mm' }} />
        </div>
      </div>

      {/* GRID DE QUESTÕES — 2 colunas */}
      <div style={{ flex: 1, display: 'flex', gap: '6mm' }}>
        {[col1, col2].map((coluna, ci) => (
          coluna.length > 0 && (
            <div key={ci} style={{ flex: 1 }}>
              {/* Cabeçalho coluna */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: '18px repeat(5, 1fr)',
                background: '#222',
                color: 'white',
                borderRadius: '3px 3px 0 0',
                marginBottom: '0',
              }}>
                <div style={{ fontSize: '8px', fontWeight: 'bold', textAlign: 'center', padding: '2mm 0' }}>Nº</div>
                {LETRAS.map(l => (
                  <div key={l} style={{ fontSize: '9px', fontWeight: 'bold', textAlign: 'center', padding: '2mm 0' }}>{l}</div>
                ))}
              </div>

              {/* Questões */}
              <div style={{ border: '1.5px solid #333', borderTop: 'none', borderRadius: '0 0 3px 3px', overflow: 'hidden' }}>
                {coluna.map((num, idx) => (
                  <div key={num} style={{
                    display: 'grid',
                    gridTemplateColumns: '18px repeat(5, 1fr)',
                    alignItems: 'center',
                    borderBottom: idx < coluna.length - 1 ? '1px solid #e0e0e0' : 'none',
                    background: idx % 2 === 0 ? 'white' : '#fafafa',
                    minHeight: '9.2mm',
                  }}>
                    <div style={{ fontSize: '9px', fontWeight: 'bold', textAlign: 'center', color: '#333', borderRight: '1px solid #ddd' }}>
                      {num}
                    </div>
                    {LETRAS.map(l => (
                      <div key={l} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <div style={{
                          width: '8.5mm',
                          height: '8.5mm',
                          borderRadius: '50%',
                          border: '1.5px solid #444',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          background: 'white',
                        }}>
                          <span style={{ fontSize: '7.5px', color: '#555', fontWeight: 'bold' }}>{l}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          )
        ))}
      </div>

      {/* RODAPÉ */}
      <div style={{ marginTop: '2mm', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontSize: '8px', color: '#aaa' }}>
          ID: {prova.id.slice(0, 8).toUpperCase()} | {aluno.id.slice(0, 6).toUpperCase()}
        </div>
        <div style={{ fontSize: '8px', color: '#aaa' }}>
          {totalQuestoes} questões
        </div>
      </div>
    </div>
  )

  return (
    <>
      {/* BARRA DE CONTROLE */}
      <div className="print:hidden sticky top-0 z-10 bg-gray-900 text-white px-6 py-3 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <a href="/professor/provas" className="text-gray-400 hover:text-white text-sm">← Voltar</a>
          <span className="text-gray-600">|</span>
          <span className="font-medium text-sm">{prova.titulo} — Cartão de Respostas</span>
        </div>

        <div className="flex items-center gap-3">
          {turmas.length > 0 ? (
            <select
              value={turmaSelecionada}
              onChange={e => setTurmaSelecionada(e.target.value)}
              className="px-3 py-1.5 bg-gray-700 rounded text-sm text-white"
            >
              <option value="">Todas as turmas</option>
              {turmas.map(t => (
                <option key={t} value={t}>
                  Turma {t} ({alunos.filter(a => a.turma === t).length} alunos)
                </option>
              ))}
            </select>
          ) : (
            <span className="text-yellow-400 text-sm">⚠️ Nenhum aluno cadastrado</span>
          )}

          <button
            onClick={() => window.print()}
            disabled={alunosFiltrados.length === 0}
            className="px-5 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-600 rounded text-sm font-medium transition"
          >
            🖨️ Imprimir ({alunosFiltrados.length} cartões)
          </button>
        </div>
      </div>

      {/* AVISO SEM ALUNOS */}
      {alunosFiltrados.length === 0 && (
        <div className="print:hidden max-w-lg mx-auto mt-12 p-6 bg-yellow-50 border border-yellow-200 rounded-2xl text-center">
          <p className="text-2xl mb-2">⚠️</p>
          <p className="font-semibold text-yellow-800">Nenhum aluno cadastrado</p>
          <a href="/professor/alunos" className="inline-block mt-3 px-4 py-2 bg-yellow-600 text-white rounded-xl text-sm font-medium">
            Ir para Alunos
          </a>
        </div>
      )}

      {/* CARTÕES */}
      {alunosFiltrados.map(aluno => (
        <CartaoAluno
          key={aluno.id}
          aluno={aluno}
          qr={qrCodes[aluno.id]}
        />
      ))}

      <style jsx global>{`
        @media print {
          * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
          .print\\:hidden { display: none !important; }
          @page { margin: 0; size: A4; }
          body { margin: 0; background: white; }
        }
      `}</style>
    </>
  )
}

