import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import React from 'react'
import App from './App'

describe('App', () => {
  it('navigates to shareholders page', () => {
    render(<App />)
    expect(screen.getByText(/Sistema de Asistentes BVG/)).toBeDefined()
    const nav = screen.getByRole('button', { name: /Accionistas/ })
    fireEvent.click(nav)
    expect(screen.getByRole('button', { name: /Cargar accionistas/ })).toBeDefined()
  })
})
