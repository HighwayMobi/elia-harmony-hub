import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

export type AppLanguage = "es" | "en";

const STORAGE_KEY = "elia-language";

const ES_TO_EN: Record<string, string> = {
  "A partir del": "From",
  "el plan cambia a": "the plan changes to",
  "del plan actual se cobrará el": "for the current plan will be charged on",
  "Tu cuenta tiene varias líneas asociadas. Elige con cuál continuar.": "Your account has several lines. Choose which one to continue with.",
  "Para continuar, crea una contraseña segura para tu cuenta.": "To continue, create a secure password for your account.",
  "Elige cómo quieres recibir las instrucciones para restablecer tu contraseña.": "Choose how you want to receive password reset instructions.",
  "Te enviaremos un enlace al correo para restablecer la contraseña.": "We will email you a link to reset your password.",
  "Te enviaremos un código por SMS para acceder y cambiar tu contraseña.": "We will send you an SMS code to sign in and change your password.",
  "Tu tarjeta se guardará de forma segura para renovaciones automáticas": "Your card will be stored securely for automatic renewals",
  "El pago se está procesando. Recibirás una confirmación en breve.": "Your payment is being processed. You will receive confirmation shortly.",
  "El importe se descontará de tu saldo y el paquete se activará al instante.": "The amount will be deducted from your balance and the package will activate immediately.",
  "¿Estás seguro de que quieres cancelar el cambio de plan programado?": "Are you sure you want to cancel the scheduled plan change?",
  "No se pudo cambiar la tarifa. Inténtalo más tarde o contacta con soporte.": "The plan could not be changed. Try again later or contact support.",
  "No se pudo iniciar el pago. Inténtalo más tarde": "The payment could not be started. Try again later",
  "No se pudo procesar el pago. Inténtalo de nuevo.": "The payment could not be processed. Try again.",
  "Tu saldo se actualizará en unos instantes.": "Your balance will update shortly.",
  "Saldo insuficiente. Te redirigiremos a recargar.": "Insufficient balance. We will redirect you to top up.",
  "No hay tarifas disponibles para este tipo de línea.": "There are no plans available for this line type.",
  "No hay paquetes de datos disponibles.": "There are no data packages available.",
  "Teléfono no válido. Introduce entre 7 y 15 dígitos.": "Invalid phone number. Enter between 7 and 15 digits.",
  "Número no válido. Introduce entre 7 y 15 dígitos.": "Invalid number. Enter between 7 and 15 digits.",
  "La contraseña debe tener al menos 8 caracteres": "The password must be at least 8 characters",
  "La contraseña debe tener al menos 6 caracteres": "The password must be at least 6 characters",
  "Móvil no válido (9 dígitos, empieza por 6 o 7)": "Invalid mobile number (9 digits, starting with 6 or 7)",
  "Por favor ingresa un correo válido": "Please enter a valid email address",
  "Usuario o contraseña incorrectos": "Incorrect username or password",
  "Ocurrió un error. Intenta de nuevo.": "An error occurred. Please try again.",
  "Teléfono o email incorrecto": "Incorrect phone number or email",
  "No se pudo enviar el código. Intenta de nuevo.": "The code could not be sent. Please try again.",
  "Te enviamos un código a tu correo": "We sent a code to your email",
  "Te enviamos un código por SMS": "We sent a code by SMS",
  "Sesión no válida. Inicia sesión de nuevo.": "Invalid session. Sign in again.",
  "Contraseña establecida. ¡Bienvenido!": "Password set. Welcome!",
  "Esta cuenta ya está registrada": "This account is already registered",
  "¡Cuenta creada exitosamente!": "Account created successfully!",
  "Selecciona una línea válida": "Choose a valid line",
  "No se pudieron cargar las transacciones": "Transactions could not be loaded",
  "No se pudieron cargar los paquetes de datos": "Data packages could not be loaded",
  "No se pudieron cargar los tarifas": "Plans could not be loaded",
  "No se pudo descargar la factura": "The invoice could not be downloaded",
  "Factura no disponible para este mes": "Invoice unavailable for this month",
  "Archivo demasiado grande": "File too large",
  "Archivo no válido": "Invalid file",
  "Inicia sesión de nuevo.": "Sign in again.",
  "Avatar actualizado": "Avatar updated",
  "No se pudo subir el avatar": "The avatar could not be uploaded",
  "Cambio de plan cancelado": "Plan change cancelled",
  "No se pudo cancelar el cambio": "The plan change could not be cancelled",
  "Ya se ha solicitado un cambio de tarifa": "A plan change has already been requested",
  "Guardar tarjeta para pagos automáticos": "Save card for automatic payments",
  "Cargando métodos de pago…": "Loading payment methods…",
  "Preparando pago seguro…": "Preparing secure payment…",
  "No se pudo procesar el pago": "The payment could not be processed",
  "Pago no completado": "Payment not completed",
  "¡Pago realizado!": "Payment completed!",
  "Procesando pago…": "Processing payment…",
  "Actualizando saldo…": "Updating balance…",
  "Confirmar cambio de tarifa": "Confirm plan change",
  "¿Cuándo aplicar la nueva tarifa?": "When should the new plan apply?",
  "Al final del periodo pagado": "At the end of the paid period",
  "La nueva tarifa entrará en vigor al finalizar el periodo pagado:": "The new plan will take effect at the end of the paid period:",
  "La nueva tarifa entrará en vigor el": "The new plan will take effect on",
  "Elige una nueva tarifa para tu línea": "Choose a new plan for your line",
  "Elige un paquete de datos para tu línea": "Choose a data package for your line",
  "Confirmar compra": "Confirm purchase",
  "Sincronización de pasos con Android": "Step syncing with Android",
  "Sincronización de pasos con iPhone": "Step syncing with iPhone",
  "Google Fit conectado": "Google Fit connected",
  "Google Fit desconectado": "Google Fit disconnected",
  "Apple Health conectado": "Apple Health connected",
  "Apple Health desconectado": "Apple Health disconnected",
  "No se pudo cargar el perfil": "The profile could not be loaded",
  "Error al cargar el perfil": "Error loading profile",
  "Perfil actualizado": "Profile updated",
  "No se pudo guardar": "Could not save",
  "Error al guardar": "Error saving",
  "Error al cerrar sesión": "Error signing out",
  "Registro de sueño guardado": "Sleep record saved",
  "Actividad registrada": "Activity recorded",
  "Registro eliminado": "Record deleted",
  "Error al eliminar": "Error deleting",
  "No hay registros de sueño": "No sleep records",
  "No hay registros de actividad": "No activity records",
  "Detalles de la actividad": "Activity details",
  "¿Cómo dormiste?": "How did you sleep?",
  "Hora de despertar": "Wake-up time",
  "Hora de dormir": "Bedtime",
  "Tipo de actividad": "Activity type",
  "Fecha y hora": "Date and time",
  "Duración (min)": "Duration (min)",
  "Calorías (opcional)": "Calories (optional)",
  "Notas (opcional)": "Notes (optional)",
  "No tienes notificaciones": "You have no notifications",
  "Sin movimientos este mes": "No transactions this month",
  "Descargar factura (PDF)": "Download invoice (PDF)",
  "Cancelar cambio de plan": "Cancel plan change",
  "ESTABLECER NUEVA CONTRASEÑA": "SET NEW PASSWORD",
  "Establece una contraseña": "Set a password",
  "Confirmar contraseña": "Confirm password",
  "Nueva contraseña": "New password",
  "Recuperar contraseña": "Reset password",
  "¿Olvidaste tu contraseña?": "Forgot your password?",
  "¿No tienes cuenta?": "Don't have an account?",
  "¿Ya tienes cuenta?": "Already have an account?",
  "Iniciar sesión": "Sign in",
  "Inicia sesión": "Sign in",
  "Registrarse": "Sign up",
  "Regístrate": "Sign up",
  "Correo electrónico": "Email address",
  "Contraseña": "Password",
  "Mi móvil": "My mobile",
  "Enviar código": "Send code",
  "Selecciona una línea": "Choose a line",
  "CONTINUAR": "CONTINUE",
  "¡Bienvenido!": "Welcome!",
  "Cambiar avatar": "Change avatar",
  "Seleccionar suscripción": "Choose subscription",
  "Actualizar": "Refresh",
  "Cuota mensual": "Monthly fee",
  "Cambiar tarifa": "Change plan",
  "Cambiar": "Change",
  "Recargar saldo": "Top up balance",
  "Recargar": "Top up",
  "Gb disponibles": "Available GB",
  "Minutos disponibles": "Available minutes",
  "Datos ilimitados": "Unlimited data",
  "Llamadas ilimitadas": "Unlimited calls",
  "SMS ilimitados": "Unlimited SMS",
  "Ilimitados": "Unlimited",
  "Comprar Gb": "Buy GB",
  "Finanzas": "Finances",
  "Cargando perfil...": "Loading profile...",
  "Cargando...": "Loading...",
  "Descargando...": "Downloading...",
  "Gastado": "Spent",
  "Recargado": "Topped up",
  "Cuenta recarga": "Account top-up",
  "Movimiento": "Transaction",
  "Cargo": "Charge",
  "Saldo actual": "Current balance",
  "Saldo": "Balance",
  "Nueva tarifa": "New plan",
  "Datos": "Data",
  "Actual": "Current",
  "Seleccionar": "Select",
  "Pronto": "Soon",
  "para la línea": "for the line",
  "Configuración": "Settings",
  "Perfil": "Profile",
  "Idioma": "Language",
  "Guardar cambios": "Save changes",
  "Guardando...": "Saving...",
  "Conteo de pasos": "Step count",
  "Cerrar sesión": "Sign out",
  "Seguimiento": "Tracking",
  "Sueño": "Sleep",
  "Actividad": "Activity",
  "Registrar sueño": "Log sleep",
  "Registrar actividad": "Log activity",
  "Nuevo registro": "New record",
  "Nueva actividad": "New activity",
  "Calidad (1-5)": "Quality (1-5)",
  "Caminar": "Walking",
  "Correr": "Running",
  "Ciclismo": "Cycling",
  "Natación": "Swimming",
  "Gimnasio": "Gym",
  "Otro": "Other",
  "Pasos": "Steps",
  "Cancelar": "Cancel",
  "Guardar": "Save",
  "Notificaciones": "Notifications",
  "Notificación": "Notification",
  "Anterior": "Previous",
  "Siguiente": "Next",
  "Página": "Page",
  "de": "of",
  "Atrás": "Back",
  "Volver ahora": "Return now",
  "Volver": "Back",
  "Total a pagar": "Total to pay",
  "Número de teléfono": "Phone number",
  "Importe": "Amount",
  "Otro importe (min. €3)": "Other amount (min. €3)",
  "Email para el recibo": "Receipt email",
  "Email no válido": "Invalid email",
  "Tarjeta guardada": "Saved card",
  "Caduca": "Expires",
  "Eliminar": "Remove",
  "Importe a recargar": "Top-up amount",
  "Comisión": "Fee",
  "Gratis": "Free",
  "Total": "Total",
  "Procesando…": "Processing…",
  "Pagar con tarjeta": "Pay by card",
  "Pagar con": "Pay with",
  "Pagar": "Pay",
  "Pago seguro": "Secure payment",
  "Paquete": "Package",
  "Precio": "Price",
  "Confirmar": "Confirm",
  "días": "days",
  "mes": "month",
  "Enero": "January", "Febrero": "February", "Marzo": "March", "Abril": "April",
  "Mayo": "May", "Junio": "June", "Julio": "July", "Agosto": "August",
  "Septiembre": "September", "Octubre": "October", "Noviembre": "November", "Diciembre": "December",
  "ene": "Jan", "feb": "Feb", "mar": "Mar", "abr": "Apr", "may": "May", "jun": "Jun",
  "jul": "Jul", "ago": "Aug", "sept": "Sep", "oct": "Oct", "nov": "Nov", "dic": "Dec",
  "Oops! Page not found": "Oops! Page not found",
  "Return to Home": "Return to Home"
};

const pairs = Object.entries(ES_TO_EN).sort((a, b) => b[0].length - a[0].length);

const replaceAll = (value: string, from: string, to: string) => value.split(from).join(to);

const translate = (value: string, language: AppLanguage) => {
  let result = value;
  if (language === "en") {
    for (const [es, en] of pairs) result = replaceAll(result, es, en);
  } else {
    for (const [es, en] of pairs) result = replaceAll(result, en, es);
  }
  return result;
};

type LanguageContextValue = {
  language: AppLanguage;
  setLanguage: (language: AppLanguage) => void;
  initializeFromProfile: (language?: string) => void;
};

const LanguageContext = createContext<LanguageContextValue | null>(null);

const translateNode = (node: Node, language: AppLanguage) => {
  if (node.nodeType === Node.TEXT_NODE) {
    const current = node.textContent || "";
    const next = translate(current, language);
    if (next !== current) node.textContent = next;
    return;
  }
  if (!(node instanceof HTMLElement)) return;
  for (const attr of ["placeholder", "title", "aria-label"]) {
    const current = node.getAttribute(attr);
    if (!current) continue;
    const next = translate(current, language);
    if (next !== current) node.setAttribute(attr, next);
  }
  node.childNodes.forEach((child) => translateNode(child, language));
};

export const LanguageProvider = ({ children }: { children: React.ReactNode }) => {
  const [language, updateLanguage] = useState<AppLanguage>(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored === "en" ? "en" : "es";
  });

  const setLanguage = useCallback((next: AppLanguage) => {
    localStorage.setItem(STORAGE_KEY, next);
    updateLanguage(next);
  }, []);

  const initializeFromProfile = useCallback((profileLanguage?: string) => {
    if (localStorage.getItem(STORAGE_KEY)) return;
    if (profileLanguage === "es" || profileLanguage === "en") updateLanguage(profileLanguage);
  }, []);

  useEffect(() => {
    document.documentElement.lang = language;
    translateNode(document.body, language);
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type === "characterData") translateNode(mutation.target, language);
        mutation.addedNodes.forEach((node) => translateNode(node, language));
      }
    });
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });
    return () => observer.disconnect();
  }, [language]);

  const value = useMemo(
    () => ({ language, setLanguage, initializeFromProfile }),
    [language, setLanguage, initializeFromProfile]
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) throw new Error("useLanguage must be used inside LanguageProvider");
  return context;
};
