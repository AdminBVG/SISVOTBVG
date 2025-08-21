# Checklist de QA

Esta guía ayuda a verificar accesibilidad, foco y rendimiento tras aplicar el tema BVG.

## Contraste
- [ ] Verificar con herramientas como Lighthouse o DevTools que el contraste de textos y acciones cumple **WCAG 2.1 AA**.
- [ ] Validar contraste en modos claro y oscuro.

## Foco y navegación
- [ ] Todas las interacciones muestran un foco visible en Azul claro BVG.
- [ ] Probar navegación completa solo con teclado.

## Movimiento y animaciones
- [ ] Revisar que las transiciones se desactivan con `prefers-reduced-motion`.
- [ ] Asegurarse de que las animaciones son suaves (200ms) y no bloquean la interacción.

## Rendimiento
- [ ] Ejecutar `npm run build` y verificar el tamaño de los bundles.
- [ ] Ejecutar auditoría de rendimiento con Lighthouse.

## Compatibilidad
- [ ] Probar en navegadores sin soporte de `backdrop-filter` (ver fallback).
- [ ] Verificar que el sistema funciona en dispositivos táctiles y lectores de pantalla.

