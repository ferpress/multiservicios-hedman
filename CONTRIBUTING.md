# Contribuciones

## Antes de cambiar

1. Crear o actualizar una spec en `specs/`.
2. Describir casos normales y casos límite.
3. Planificar archivos y pruebas.
4. Evitar cambios masivos no solicitados.

## Desarrollo

```bash
npm install
python -m http.server 8080
npm test
npm run lint
npm run format:check
npm run validate:links
```

## Pull requests

- Explicar el problema y la solución.
- Referenciar la especificación relacionada.
- Incluir capturas si cambia la interfaz.
- Confirmar que las páginas fueron revisadas en móvil.
- No incluir secretos, credenciales o códigos de recuperación.
