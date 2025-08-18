import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import App from './App';

describe('App', () => {
  it('navigates to upload page', async () => {
    render(<App />);
    expect(screen.getByText(/Sistema de Asistentes BVG/)).toBeInTheDocument();
    const nav = screen.getByRole('link', { name: /Upload/i });
    fireEvent.click(nav);
    expect(await screen.findByText(/Cargar Padrón de Accionistas/i)).toBeInTheDocument();
  });
});
