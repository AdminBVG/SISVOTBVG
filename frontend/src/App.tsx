import React, { useState } from 'react'

interface Shareholder {
  id: number
  code: string
  name: string
}

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'
const ELECTION_ID = 1

type View = 'home' | 'shareholders' | 'attendance' | 'voting'

const App: React.FC = () => {
  const [view, setView] = useState<View>('home')
  const [shareholders, setShareholders] = useState<Shareholder[]>([])
  const [code, setCode] = useState('')
  const [mode, setMode] = useState('PRESENCIAL')
  const [vote, setVote] = useState('')
  const [message, setMessage] = useState('')

  const loadShareholders = async () => {
    try {
      const res = await fetch(`${API_URL}/elections/${ELECTION_ID}/shareholders`)
      if (!res.ok) throw new Error('error')
      const data = await res.json()
      setShareholders(data)
    } catch {
      setMessage('No se pudieron cargar los accionistas')
    }
  }

  const markAttendance = async (e: React.FormEvent) => {
    e.preventDefault()
    setMessage('')
    try {
      const res = await fetch(
        `${API_URL}/elections/${ELECTION_ID}/attendance/${code}/mark`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ mode }),
        },
      )
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.detail || 'error')
      }
      setMessage('Asistencia marcada')
      setCode('')
    } catch (err: any) {
      setMessage(err.message)
    }
  }

  const submitVote = (e: React.FormEvent) => {
    e.preventDefault()
    if (!vote) {
      setMessage('Seleccione una opción de voto')
      return
    }
    // Simulación, ya que el backend de votación no está implementado
    setMessage(`Voto registrado: ${vote}`)
    setVote('')
  }

  return (
    <div style={{ padding: '1rem' }}>
      <h1>Sistema de Asistentes BVG</h1>
      <nav>
        <button onClick={() => setView('home')}>Inicio</button>
        <button onClick={() => setView('shareholders')}>Accionistas</button>
        <button onClick={() => setView('attendance')}>Asistencia</button>
        <button onClick={() => setView('voting')}>Votación</button>
      </nav>
      {view === 'home' && (
        <section>
          <h2>Bienvenido</h2>
          <p>Selecciona una opción del menú para comenzar.</p>
        </section>
      )}
      {view === 'shareholders' && (
        <section>
          <h2>Accionistas</h2>
          <button onClick={loadShareholders}>Cargar accionistas</button>
          <ul>
            {shareholders.map((sh) => (
              <li key={sh.id}>
                {sh.code} - {sh.name}
              </li>
            ))}
          </ul>
        </section>
      )}
      {view === 'attendance' && (
        <section>
          <h2>Marcar asistencia</h2>
          <form onSubmit={markAttendance}>
            <input
              placeholder="código"
              value={code}
              onChange={(e) => setCode(e.target.value)}
            />
            <select value={mode} onChange={(e) => setMode(e.target.value)}>
              <option value="PRESENCIAL">Presencial</option>
              <option value="VIRTUAL">Virtual</option>
              <option value="AUSENTE">Ausente</option>
            </select>
            <button type="submit">Marcar</button>
          </form>
        </section>
      )}
      {view === 'voting' && (
        <section>
          <h2>Votación</h2>
          <form onSubmit={submitVote}>
            <select value={vote} onChange={(e) => setVote(e.target.value)}>
              <option value="">Seleccione</option>
              <option value="SI">Sí</option>
              <option value="NO">No</option>
            </select>
            <button type="submit">Enviar voto</button>
          </form>
        </section>
      )}
      {message && <p>{message}</p>}
    </div>
  )
}

export default App
