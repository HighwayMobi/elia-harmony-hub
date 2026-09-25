# Español e inglés en toda la aplicación

## Objetivo
Añadir un selector ES/EN que cambie inmediatamente todo el texto visible y recuerde la elección.

## Cambios
- Crear una capa central de traducciones español–inglés para títulos, botones, formularios, avisos, errores, notificaciones, pagos, tarifas, recargas, perfil y seguimiento.
- Convertir el selector del encabezado en un control funcional con Español e English.
- Añadir el mismo selector al acceso para que el idioma pueda elegirse antes de iniciar sesión.
- Sincronizar el idioma de la interfaz con el idioma guardado en el perfil y conservarlo localmente entre páginas y recargas.
- Aplicar el idioma seleccionado a fechas y a la pantalla segura de Stripe.
- Revisar las rutas principales y secundarias para comprobar que no queden textos españoles al usar English.

## Alcance técnico
- Contexto global de idioma compartido por todas las rutas.
- Diccionario ES/EN y traducción de textos dinámicos con variables.
- Sin cambios en la lógica de tarifas, pagos, líneas ni datos del usuario.
