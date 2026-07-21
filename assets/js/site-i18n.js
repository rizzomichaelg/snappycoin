/**
 * Human-authored US English / US Spanish copy for Snappy Coin Laundry.
 *
 * This module deliberately does not call a browser or third-party translation
 * service. English is the source catalog and every Spanish entry is reviewed
 * copy kept in this repository. Keep the two catalogs in key parity.
 */

import { PUD_CONFIG } from "./pud-config.js";

export const SUPPORTED_LOCALES = Object.freeze(["en-US", "es-US"]);
export const CENTRAL_TIME_ZONE = "America/Chicago";
export const DISPLAY_CURRENCY = "USD";
export const LOCALE_STORAGE_KEY = "snappyLocaleV1";

const ES = Object.freeze({
  // Shared navigation and controls.
  "Language": "Idioma",
  "English": "English",
  "Spanish": "Español",
  "Menu": "Menú",
  "Main site": "Sitio principal",
  "Back": "Atrás",
  "Cancel": "Cancelar",
  "Confirm": "Confirmar",
  "Go back": "Volver",
  "Edit": "Editar",
  "Refresh": "Actualizar",
  "Privacy": "Privacidad",
  "Terms": "Términos",
  "Cookies": "Cookies",
  "Cookie choices": "Preferencias de cookies",
  "Cookie consent": "Consentimiento de cookies",
  "Cookie details": "Detalles sobre las cookies",
  "Decline": "Rechazar",
  "Accept": "Aceptar",
  "Optional analytics help us measure visits and promo claims. Essential tools work either way.": "Los análisis opcionales nos ayudan a medir las visitas y las solicitudes de promociones. Las herramientas esenciales funcionan de cualquier manera.",
  "The service could not be reached. Check the connection and try again.": "No se pudo conectar con el servicio. Verifica la conexión e inténtalo de nuevo.",
  "Open the private status link from your confirmation message.": "Abre el enlace privado de estado que aparece en tu mensaje de confirmación.",
  "Phone": "Teléfono",
  "Email": "Correo electrónico",
  "Address": "Dirección",
  "Details": "Detalles",
  "Card": "Tarjeta",
  "Review": "Revisar",
  "Payment": "Pago",
  "Pickup": "Recogida",
  "Delivery": "Entrega",
  "Bags": "Bolsas",
  "Total": "Total",
  "Other": "Otro",
  "None": "Ninguno",
  "Standard": "Estándar",
  "Optional": "Opcional",
  "Call the store": "Llamar a la lavandería",
  "Call (314) 628-1001": "Llamar al (314) 628-1001",
  "Main navigation": "Navegación principal",
  "Primary actions": "Acciones principales",
  "Quick actions": "Acciones rápidas",
  "Service links": "Enlaces de servicios",
  "Legal links": "Enlaces legales",

  // Main site.
  "Snappy Coin Laundry | Self-Service & Pickup in Maryland Heights": "Snappy Coin Laundry | Autoservicio y recogida en Maryland Heights",
  "Snappy Coin Laundry | Maryland Heights": "Snappy Coin Laundry | Maryland Heights",
  "Fast self-service laundry, wash-dry-fold pickup and delivery, and live machine availability in Maryland Heights, Missouri.": "Lavandería rápida de autoservicio, recogida con lavado, secado, doblado y entrega, y disponibilidad de máquinas en vivo en Maryland Heights, Misuri.",
  "Big-load washers, live machine availability, and laundry pickup and delivery—open daily in Maryland Heights.": "Lavadoras para cargas grandes, disponibilidad de máquinas en vivo y recogida y entrega de ropa; abierto todos los días en Maryland Heights.",
  "Snappy Coin Laundry home": "Inicio de Snappy Coin Laundry",
  "Visit essentials": "Información esencial para tu visita",
  "Store hours and status": "Horario y estado de la lavandería",
  "Offer details": "Detalles de la oferta",
  "Claim form": "Formulario de solicitud",
  "Claim a free weekday wash offer at Snappy Coin Laundry.": "Solicita una oferta de lavado gratis entre semana en Snappy Coin Laundry.",
  "Free Weekday Wash | Snappy Coin Laundry": "Lavado gratis entre semana | Snappy Coin Laundry",
  "Free Weekday Wash": "Lavado gratis entre semana",
  "The Snappy Coin Laundry promo form is now part of the main website.": "El formulario de promociones de Snappy Coin Laundry ahora forma parte del sitio principal.",
  "Continue to the claim form": "Continuar al formulario de solicitud",
  "Map showing Snappy Coin Laundry at 2303 McKelvey Road": "Mapa de Snappy Coin Laundry en 2303 McKelvey Road",
  "Bright blue wall and a row of large Dexter dryers inside Snappy Coin Laundry": "Pared azul brillante y una fila de secadoras Dexter grandes dentro de Snappy Coin Laundry",
  "Skip to main content": "Saltar al contenido principal",
  "Machines": "Máquinas",
  "Services": "Servicios",
  "Pickup & delivery": "Recogida y entrega",
  "Free wash": "Lavado gratis",
  "FAQs": "Preguntas frecuentes",
  "Visit us": "Visítanos",
  "Maryland Heights · Open every day": "Maryland Heights · Abierto todos los días",
  "Big loads.": "Cargas grandes.",
  "Less waiting.": "Menos espera.",
  "Bring the comforters, the tournament uniforms, or the whole week’s laundry. Our high-capacity Dexter machines get it done fast—or we’ll pick it up and do it for you.": "Trae los edredones, los uniformes del torneo o la ropa de toda la semana. Nuestras máquinas Dexter de gran capacidad terminan rápido; o la recogemos y la lavamos por ti.",
  "Claim free weekday wash": "Solicitar lavado gratis entre semana",
  "Book pickup & delivery": "Programar recogida y entrega",
  "Check machines": "Ver máquinas",
  "See what’s open now": "Ver qué está disponible ahora",
  "Get directions": "Cómo llegar",
  "Call the store": "Llamar a la lavandería",
  "capacity for your biggest loads": "de capacidad para tus cargas más grandes",
  "Checking hours…": "Consultando el horario…",
  "6:00 AM–1:30 AM · 365 days a year": "6:00 a. m.–1:30 a. m. · los 365 días del año",
  "Plan a visit": "Planear una visita",
  "Before you leave home": "Antes de salir de casa",
  "Know what’s ready.": "Sepa qué está disponible.",
  "Live availability comes directly from the laundry floor and refreshes automatically.": "La disponibilidad en vivo viene directamente de la lavandería y se actualiza automáticamente.",
  "Machines available now": "Máquinas disponibles ahora",
  "Checking…": "Consultando…",
  "Washers": "Lavadoras",
  "Dryers": "Secadoras",
  "in use": "en uso",
  "Updated —": "Actualizado —",
  "Updates automatically": "Se actualiza automáticamente",
  "<1 minute ago": "hace menos de 1 minuto",
  "Available now": "Disponible ahora",
  "Opening in <1 minute": "Abre en menos de 1 minuto",
  "Paused": "En pausa",
  "Updates paused (inactive)": "Actualizaciones en pausa (inactividad)",
  "Updates paused while page is stale.": "Las actualizaciones están en pausa por inactividad en la página.",
  "Busy right now": "Muy concurrido ahora",
  "Plenty available": "Muchas disponibles",
  "Some available": "Algunas disponibles",
  "Live updates delayed": "Actualizaciones en vivo demoradas",
  "Live updates are delayed right now.": "Las actualizaciones en vivo están demoradas en este momento.",
  "Checking": "Consultando",
  "Unavailable": "No disponible",
  "Live availability temporarily unavailable.": "La disponibilidad en vivo no está disponible temporalmente.",
  "Need a monster machine?": "¿Necesitas una máquina enorme?",
  "Our 80-pound washers handle king-size comforters, family-size loads, and the laundry you’ve been avoiding.": "Nuestras lavadoras de 80 libras aceptan edredones king size, cargas familiares y toda esa ropa que has estado posponiendo.",
  "See self-service details": "Ver detalles de autoservicio",
  "Three ways to get it done": "Tres maneras de lavar",
  "Laundry on your terms.": "Lava a tu manera.",
  "We come to you": "Vamos hasta ti",
  "Choose a route, tell us how you like your laundry, save a card securely, and follow the order from pickup through delivery.": "Elige una ruta, dinos cómo prefieres tu ropa, guarda una tarjeta de forma segura y sigue el pedido desde la recogida hasta la entrega.",
  "Address and route checked before checkout": "Dirección y ruta verificadas antes del pago",
  "Final price calculated after weighing": "Precio final calculado después del pesaje",
  "Private order tracking and text updates": "Seguimiento privado y avisos por mensaje de texto",
  "Check my address": "Verificar mi dirección",
  "Track an order": "Seguir un pedido",
  "YOU BAG IT": "TÚ LA EMBOLSAS",
  "WE HANDLE IT": "NOSOTROS LA LAVAMOS",
  "BACK HOME, FOLDED": "REGRESA DOBLADA A CASA",
  "Do it here": "Hazlo aquí",
  "Self-service": "Autoservicio",
  "Clean, attended, high-capacity Dexter washers and dryers with coins or DexterPay.": "Lavadoras y secadoras Dexter limpias, atendidas y de gran capacidad, con monedas o DexterPay.",
  "Largest washer": "Lavadora más grande",
  "DexterPay location": "Ubicación en DexterPay",
  "Open": "Abierto",
  "365 days": "365 días",
  "Set up DexterPay": "Configurar DexterPay",
  "Fix it while you’re here": "Repáralo mientras estás aquí",
  "Mending & simple alterations": "Remiendos y arreglos sencillos",
  "Ask our team about hems, buttons, seam repairs, and straightforward clothing adjustments.": "Pregunta a nuestro equipo por dobladillos, botones, reparación de costuras y arreglos sencillos de ropa.",
  "Availability varies. Call or ask an attendant in store.": "La disponibilidad varía. Llama o pregunta a un empleado en la lavandería.",
  "Ask about a repair": "Preguntar por un arreglo",
  "A laundromat that works like one": "Una lavandería que funciona como debe",
  "The useful stuff is not an upgrade.": "Lo útil viene incluido.",
  "Attendants on site": "Personal en el local",
  "Real help choosing cycles, handling bulky items, or finding supplies.": "Ayuda de verdad para elegir ciclos, lavar artículos voluminosos o encontrar productos.",
  "Made-in-USA Dexter machines": "Máquinas Dexter fabricadas en EE. UU.",
  "Modern, high-capacity equipment for fewer loads and less waiting.": "Equipo moderno de gran capacidad para hacer menos cargas y esperar menos.",
  "Spanish-friendly service": "Atención en español",
  "Everything you forgot": "Todo lo que olvidaste",
  "Detergent, softener, dryer sheets, snacks, drinks, Wi-Fi, ATM, and changers.": "Detergente, suavizante, toallitas para secadora, bocadillos, bebidas, Wi-Fi, cajero automático y máquinas de cambio.",
  "Weekday offer · July 2026": "Oferta entre semana · julio de 2026",
  "One load.": "Una carga.",
  "On the house.": "Invita la casa.",
  "One free 20- or 30-pound washer load": "Una carga gratis en lavadora de 20 o 30 libras",
  "When": "Cuándo",
  "July 6-30, 2026; Monday-Thursday": "Del 6 al 30 de julio de 2026; de lunes a jueves",
  "Hours": "Horario",
  "Redeem between 9 AM and 6 PM": "Canje entre 9 a. m. y 6 p. m.",
  "Where": "Dónde",
  "In person at Snappy": "En persona en Snappy",
  "Limit": "Límite",
  "One claim per customer": "Una solicitud por cliente",
  "FREE WASH / 2026": "LAVADO GRATIS / 2026",
  "Get your code": "Obtén tu código",
  "Verify your mobile number and we’ll email the coupon.": "Verifica tu número móvil y te enviaremos el cupón por correo electrónico.",
  "First name": "Nombre",
  "Last name": "Apellido",
  "Mobile phone": "Teléfono móvil",
  "ZIP code": "Código postal",
  "I agree to receive a one-time SMS verification code for this offer.": "Acepto recibir por SMS un código de verificación de un solo uso para esta oferta.",
  "Send me future Snappy Coin Laundry deals and updates by email.": "Envíenme por correo electrónico futuras ofertas y novedades de Snappy Coin Laundry.",
  "Send verification code": "Enviar código de verificación",
  "Enter the SMS code": "Ingresa el código del SMS",
  "Verification code": "Código de verificación",
  "Verify and email coupon": "Verificar y enviar cupón por correo",
  "You can resend in 60 seconds.": "Puedes reenviarlo en 60 segundos.",
  "Resend code in 60s": "Reenviar código en 60 s",
  "Coupon emailed": "Cupón enviado",
  "Your coupon code was emailed.": "Enviamos tu código de cupón por correo electrónico.",
  "Promotions": "Promociones",
  "Nothing to claim today.": "No hay ofertas para solicitar hoy.",
  "Check live machines, book pickup and delivery, or stop in anytime between 6:00 AM and 1:30 AM.": "Consulta las máquinas en vivo, programa recogida y entrega, o visítanos entre las 6:00 a. m. y la 1:30 a. m.",
  "Pay from your phone": "Paga desde tu teléfono",
  "DexterPay, minus the parking-lot setup.": "DexterPay, sin configurarlo en el estacionamiento.",
  "Download the app before you arrive, create an account, and enter Snappy’s location number": "Descarga la aplicación antes de llegar, crea una cuenta e ingresa el número de ubicación de Snappy",
  ". Then choose a machine, pay, and follow the cycle from your phone.": ". Después elige una máquina, paga y sigue el ciclo desde tu teléfono.",
  "Get DexterPay": "Obtener DexterPay",
  "Need help in store?": "¿Necesitas ayuda en la lavandería?",
  "Straight answers": "Respuestas claras",
  "Before you load the car.": "Antes de cargar el auto.",
  "Still unsure? Call": "¿Aún tienes dudas? Llama al",
  "and an attendant can help.": "y un empleado podrá ayudarte.",
  "What payments do the machines accept?": "¿Qué formas de pago aceptan las máquinas?",
  "Use coins, the on-site changers, or DexterPay. Snappy’s DexterPay location number is 12105.": "Usa monedas, las máquinas de cambio del local o DexterPay. El número de ubicación de Snappy en DexterPay es 12105.",
  "Can I wash a king-size comforter?": "¿Puedo lavar un edredón king size?",
  "Yes. Our largest washers hold up to 80 pounds and are built for comforters, bedding, and other bulky loads.": "Sí. Nuestras lavadoras más grandes admiten hasta 80 libras y están diseñadas para edredones, ropa de cama y otras cargas voluminosas.",
  "Do you sell detergent and laundry supplies?": "¿Venden detergente y productos de lavandería?",
  "Yes. Vending machines carry detergent, fabric softener, dryer sheets, drinks, and snacks.": "Sí. Las máquinas expendedoras ofrecen detergente, suavizante, toallitas para secadora, bebidas y bocadillos.",
  "How does pickup and delivery work?": "¿Cómo funciona la recogida y entrega?",
  "Start by checking your address. If a route is available, choose a pickup window and preferences, verify your phone, save a card securely, and submit the request. You are charged after the laundry is weighed.": "Primero verifica tu dirección. Si hay una ruta disponible, elige un horario y tus preferencias, verifica tu teléfono, guarda una tarjeta de forma segura y envía la solicitud. El cobro se hace después de pesar la ropa.",
  "Can I leave while my clothes wash?": "¿Puedo irme mientras se lava mi ropa?",
  "We recommend staying with your items. Snappy is not responsible for laundry left unattended.": "Recomendamos permanecer con tus artículos. Snappy no se responsabiliza por la ropa que se deje sin supervisión.",
  "Come get it done.": "Ven a lavar.",
  "Daily · 6:00 AM–1:30 AM": "Todos los días · 6:00 a. m.–1:30 a. m.",
  "Landmark": "Referencia",
  "Across from the Community Center & Aquaport": "Frente al Community Center y Aquaport",
  "Open directions": "Abrir indicaciones",
  "Occasional emails, useful deals": "Correos ocasionales, ofertas útiles",
  "Keep laundry day cheaper.": "Ahorra en el día de lavado.",
  "Get promotions, service news, and local updates. No mystery frequency; unsubscribe anytime.": "Recibe promociones, noticias del servicio y novedades locales. Sin frecuencia incierta; cancela la suscripción cuando quieras.",
  "(optional)": "(opcional)",
  "Email address": "Correo electrónico",
  "Join the list": "Unirme a la lista",
  "By joining, you agree to receive marketing email from Snappy Coin Laundry.": "Al unirte, aceptas recibir correos de mercadeo de Snappy Coin Laundry.",
  "Live status": "Estado en vivo",
  "Book online": "Programar en línea",
  "Directions": "Indicaciones",
  "Open maps": "Abrir mapas",
  "Open daily · 6:00 AM–1:30 AM": "Abierto todos los días · 6:00 a. m.–1:30 a. m.",
  "Live machines": "Máquinas en vivo",
  "© 2026 Snappy Coin Laundry. Family owned in Maryland Heights.": "© 2026 Snappy Coin Laundry. Negocio familiar de Maryland Heights.",

  // Pickup booking.
  "Pickup & Delivery | Snappy Coin Laundry": "Recogida y entrega | Snappy Coin Laundry",
  "Schedule secure wash-dry-fold pickup and delivery with Snappy Coin Laundry.": "Programa con Snappy Coin Laundry un servicio seguro de recogida, lavado, secado, doblado y entrega.",
  "Skip to booking": "Saltar a la reservación",
  "Check an order": "Consultar un pedido",
  "Pickup · Wash · Dry · Fold": "Recogida · Lavado · Secado · Doblado",
  "Your laundry, picked up and brought home.": "Recogemos tu ropa y te la llevamos a casa.",
  "Start with your address. We’ll show only pickup windows with room, then weigh, wash, fold, and return everything to you.": "Empieza con tu dirección. Solo mostraremos horarios de recogida con cupo; luego pesamos, lavamos, doblamos y te devolvemos todo.",
  "Free pickup and delivery within our service area.": "Recogida y entrega gratis dentro de nuestra zona de servicio.",
  "Price": "Precio",
  "$1.99/lb · $35 minimum": "$1.99/lb · mínimo de $35",
  "Charged once, after weighing": "Un solo cobro, después del pesaje",
  "Updates": "Avisos",
  "Private order updates and receipt": "Avisos privados del pedido y recibo",
  "Check your address and choose a route.": "Verifica tu dirección y elige una ruta.",
  "Tell us how you want your laundry handled.": "Dinos cómo deseas que tratemos tu ropa.",
  "Follow the private link for updates and your receipt.": "Usa el enlace privado para ver avisos y tu recibo.",
  "Step 1 of 5": "Paso 1 de 5",
  "Where should we pick up?": "¿Dónde debemos recoger?",
  "We check service area and route availability before asking for personal or payment details.": "Verificamos el área de servicio y las rutas disponibles antes de pedir datos personales o de pago.",
  "Street address": "Dirección",
  "Apartment or unit": "Apartamento o unidad",
  "City": "Ciudad",
  "State": "Estado",
  "ZIP": "Código postal",
  "Step 2 of 5": "Paso 2 de 5",
  "Pickup and laundry details": "Detalles de recogida y lavado",
  "Estimated bags": "Bolsas estimadas",
  "Pickup window": "Horario de recogida",
  "Route availability accounts for the estimated bag count.": "La disponibilidad de la ruta toma en cuenta la cantidad estimada de bolsas.",
  "Address validation provided by": "Validación de dirección proporcionada por",
  "Google Maps": "Google Maps",
  "See self-service hours and directions": "Ver horarios y direcciones de autoservicio",
  "Used for verification and operational order updates.": "Se usa para verificarte y enviarte avisos operativos del pedido.",
  "How did you hear about us?": "¿Cómo te enteraste de nosotros?",
  "Prefer not to say": "Prefiero no decirlo",
  "Facebook or Instagram": "Facebook o Instagram",
  "Friend or family": "Amistad o familiar",
  "Saw the store": "Vi la lavandería",
  "Detergent": "Detergente",
  "Free & clear": "Sin fragancias ni colorantes",
  "I’ll provide mine": "Yo proporcionaré el mío",
  "Softener": "Suavizante",
  "Special instructions": "Instrucciones especiales",
  "Include detergent sensitivities here. Do not include card information.": "Incluye aquí las sensibilidades al detergente. No incluyas datos de tarjeta.",
  "Pickup access notes": "Notas de acceso para la recogida",
  "Pickup handoff": "Entrega para la recogida",
  "I authorize unattended pickup at the agreed location.": "Autorizo la recogida sin supervisión en el lugar acordado.",
  "Required permissions": "Autorizaciones obligatorias",
  "I accept the": "Acepto los",
  "service terms": "términos del servicio",
  "I acknowledge the": "Confirmo que leí el",
  "privacy notice": "aviso de privacidad",
  "I agree to transactional texts about this order. Consent is not marketing consent.": "Acepto recibir mensajes de texto operativos sobre este pedido. Este consentimiento no autoriza mercadeo.",
  "I authorize securely saving this card and charging the final price after weighing.": "Autorizo que esta tarjeta se guarde de forma segura y que se cobre el precio final después del pesaje.",
  "Optional marketing": "Mercadeo opcional",
  "Email me offers. I can unsubscribe anytime.": "Envíenme ofertas por correo electrónico. Puedo cancelar la suscripción cuando quiera.",
  "Text me a code": "Enviarme un código por SMS",
  "Step 3 of 5": "Paso 3 de 5",
  "Verify your phone": "Verifica tu teléfono",
  "Enter the one-time code sent to the number ending in": "Ingresa el código de un solo uso enviado al número que termina en",
  ". We never use this code for marketing consent.": ". Nunca usamos este código como consentimiento de mercadeo.",
  "Verify phone": "Verificar teléfono",
  "Didn’t get the code?": "¿No recibiste el código?",
  "Complete this short anti-bot check only if you need another code.": "Completa esta breve comprobación contra bots solo si necesitas otro código.",
  "Send a new code": "Enviar un código nuevo",
  "Step 4 of 5": "Paso 4 de 5",
  "Securely save a card": "Guarda una tarjeta de forma segura",
  "No charge is made now. After pickup, staff enters the weight and the backend calculates one final charge. Snappy never stores card numbers.": "No se cobra nada ahora. Después de la recogida, el personal ingresa el peso y el sistema calcula un solo cobro final. Snappy nunca guarda números de tarjeta.",
  "Save card securely": "Guardar tarjeta de forma segura",
  "Step 5 of 5": "Paso 5 de 5",
  "Review and request pickup": "Revisa y solicita la recogida",
  "Customer": "Cliente",
  "Laundry": "Ropa",
  "Promotion code": "Código promocional",
  "Referral code": "Código de referido",
  "Submitting reserves route capacity. Your card is charged only after weighing, using the price and minimum shown above plus any configured tax or disclosed fee.": "Al enviar la solicitud se reserva cupo en la ruta. La tarjeta se cobra solo después del pesaje, con el precio y mínimo indicados arriba, más cualquier impuesto configurado o cargo informado.",
  "Submit pickup request": "Enviar solicitud de recogida",
  "Pickup requested": "Recogida solicitada",
  "Your order number is": "Tu número de pedido es",
  ". Your private link opens updates, payment status, and the final receipt. Treat it like a password.": ". Tu enlace privado muestra avisos, el estado del pago y el recibo final. Protégelo como una contraseña.",
  "View order status": "Ver estado del pedido",
  "Add pickup to calendar": "Agregar recogida al calendario",
  "Your browser could not create the calendar file. Keep the pickup window from your private order page handy.": "Tu navegador no pudo crear el archivo de calendario. Conserva a mano el horario de recogida que aparece en tu página privada del pedido.",
  "Copy private link": "Copiar enlace privado",
  "Copy order number": "Copiar número de pedido",
  "Print or save": "Imprimir o guardar",
  "Route update": "Novedad de ruta",
  "Join the service waitlist": "Unirme a la lista de espera del servicio",
  "Waitlist updates are not marketing.": "Los avisos de la lista de espera no son mercadeo.",
  "We’ll use the contact details above to respond about service availability for this request.": "Usaremos los datos de contacto anteriores para responder sobre la disponibilidad de servicio para esta solicitud.",
  "Email me occasional Snappy offers. I can unsubscribe anytime.": "Envíenme ofertas ocasionales de Snappy. Puedo cancelar la suscripción cuando quiera.",
  "Join waitlist": "Unirme a la lista de espera",
  "Check another address": "Verificar otra dirección",
  "Booking connection": "Conexión de reservaciones",
  "Online booking isn’t available right now.": "Las reservaciones en línea no están disponibles en este momento.",
  "If you already scheduled a pickup, try your private order page. You can also call the store or return to the main site while booking reconnects.": "Si ya programaste una recogida, prueba tu página privada del pedido. También puedes llamar a la lavandería o volver al sitio principal mientras se restablece la conexión.",
  "Try online booking again": "Volver a intentar la reservación",
  "Already scheduled?": "¿Ya la programaste?",
  "Open your private order page": "Abrir la página privada del pedido",
  "Need another option?": "¿Necesitas otra opción?",
  "See store hours, machines, and directions": "Ver horario, máquinas e indicaciones",
  "2303 McKelvey Rd · Maryland Heights, MO 63043": "2303 McKelvey Rd · Maryland Heights, MO 63043",
  "2303 McKelvey Rd": "2303 McKelvey Rd",
  "80 lb": "80 lb",
  "McKelvey & Ameling": "McKelvey y Ameling",
  "Maryland Heights, MO 63043": "Maryland Heights, MO 63043",
  "snappycoinlaundry@gmail.com": "snappycoinlaundry@gmail.com",
  "Se habla español. Nuestro equipo está aquí para ayudar.": "Se habla español. Nuestro equipo está aquí para ayudar.",
  "Pickup and delivery": "Recogida y entrega",
  "How pickup and delivery works": "Cómo funciona la recogida y entrega",
  "Book pickup and delivery": "Programar recogida y entrega",
  "Booking progress": "Progreso de la reservación",
  "Secure card details": "Datos seguros de la tarjeta",
  "Pickup and delivery policies": "Políticas de recogida y entrega",

  // Private status, claims and post-booking tools.
  "Private Order Status | Snappy Coin Laundry": "Estado privado del pedido | Snappy Coin Laundry",
  "Skip to order status": "Saltar al estado del pedido",
  "Book a pickup": "Programar una recogida",
  "Your private order page": "Tu página privada del pedido",
  "Laundry, without the guesswork.": "Tu ropa, sin incertidumbre.",
  "See where your order is now, what happens next, and anything that needs your attention.": "Consulta dónde está tu pedido, qué sigue y si hay algo que requiera tu atención.",
  "Open an order with a private token": "Abrir un pedido con un token privado",
  "Private order token": "Token privado del pedido",
  "Open order": "Abrir pedido",
  "Order number": "Número de pedido",
  "Order page shortcuts": "Accesos directos de la página del pedido",
  "Available order actions": "Acciones disponibles para el pedido",
  "Mobile number": "Número móvil",
  "Snappy Rewards": "Snappy Rewards",
  "Current stage": "Etapa actual",
  "Order journey": "Recorrido del pedido",
  "Updates come directly from our laundry and delivery team.": "Los avisos vienen directamente de nuestro equipo de lavandería y entrega.",
  "Received": "Recibido",
  "Order sent": "Pedido enviado",
  "Scheduled": "Programado",
  "Pickup reserved": "Recogida reservada",
  "Picked up": "Recogido",
  "Bags collected": "Bolsas recogidas",
  "In the wash": "En lavado",
  "Weighed & processing": "Pesado y en proceso",
  "Clean & packed": "Limpio y empacado",
  "Ready to return": "Listo para devolver",
  "On the way": "En camino",
  "With our driver": "Con nuestro conductor",
  "Delivered": "Entregado",
  "Back with you": "De vuelta contigo",
  "Action needed": "Se requiere una acción",
  "Let’s fix the payment": "Corrijamos el pago",
  "Your laundry order is still here. Securely confirm a replacement card and we will retry the original payment—never create a second order.": "Tu pedido sigue aquí. Confirma de forma segura otra tarjeta y volveremos a intentar el pago original; nunca crearemos un segundo pedido.",
  "Update card and retry": "Actualizar tarjeta y reintentar",
  "Secure replacement card details": "Datos seguros de la tarjeta de reemplazo",
  "Confirming replaces the saved payment method and retries this order’s existing payment. It does not create a second order.": "Al confirmar se reemplaza el método de pago guardado y se reintenta el pago de este pedido. No se crea otro pedido.",
  "Confirm replacement card": "Confirmar tarjeta de reemplazo",
  "Pickup options": "Opciones de recogida",
  "Need a different pickup time?": "¿Necesitas otro horario de recogida?",
  "Only open windows are shown. Your current time stays reserved until the change succeeds.": "Solo se muestran horarios disponibles. Tu horario actual permanece reservado hasta que el cambio se complete.",
  "New pickup window": "Nuevo horario de recogida",
  "Reason": "Motivo",
  "Change pickup window": "Cambiar horario de recogida",
  "Pickup updated": "Recogida actualizada",
  "Save your new pickup window": "Guarda el nuevo horario de recogida",
  "The calendar file contains only the pickup time window and generic order number. It never includes your address, private link, contact details, or pickup notes.": "El archivo de calendario contiene solo el horario de recogida y el número genérico del pedido. Nunca incluye tu dirección, enlace privado, datos de contacto ni notas de recogida.",
  "Calendar file downloaded. It contains only the new pickup window and order number.": "Se descargó el archivo de calendario. Contiene solo el nuevo horario de recogida y el número del pedido.",
  "Your browser could not create the calendar file. Keep the updated pickup window from this page handy.": "Tu navegador no pudo crear el archivo de calendario. Conserva a mano el horario de recogida actualizado que aparece en esta página.",
  "Your pickup window was updated. You can add the new time to your calendar below.": "Se actualizó tu horario de recogida. Puedes agregar el nuevo horario a tu calendario a continuación.",
  "Book this order again": "Volver a programar este pedido",
  "Cancel order": "Cancelar pedido",
  "Report an order issue": "Informar un problema con el pedido",
  "Protected actions": "Acciones protegidas",
  "Verify once to make changes": "Verifica una vez para hacer cambios",
  "Reading your status never requires a code. To change payment, cancel, report a problem, or manage saved details, verify the mobile number on the order.": "Consultar el estado nunca requiere un código. Para cambiar el pago, cancelar, informar un problema o administrar datos guardados, verifica el número móvil del pedido.",
  "Phone verification is required for protected actions.": "Se requiere verificación telefónica para las acciones protegidas.",
  "Use a different number": "Usar otro número",
  "Complete this anti-bot check only when you need another code.": "Completa esta comprobación contra bots solo cuando necesites otro código.",
  "Verify again now": "Volver a verificar ahora",
  "Receipt & charges": "Recibo y cargos",
  "Your current charges and payment activity.": "Tus cargos actuales y la actividad de pago.",
  "Itemized receipt": "Recibo detallado",
  "Processed weight": "Peso procesado",
  "Price per pound": "Precio por libra",
  "Weight charge": "Cargo por peso",
  "Minimum adjustment": "Ajuste al mínimo",
  "Laundry subtotal": "Subtotal de lavandería",
  "Delivery fee": "Cargo de entrega",
  "Discount": "Descuento",
  "Tax": "Impuesto",
  "Laundry order charge": "Cargo del pedido de lavandería",
  "Order payment captured": "Pago del pedido cobrado",
  "Separate tip payment": "Pago separado de propina",
  "Refunded": "Reembolsado",
  "Net paid including tip": "Pago neto con propina",
  "Order history & wash preferences": "Historial y preferencias de lavado",
  "Available during this verified session.": "Disponible durante esta sesión verificada.",
  "Previous orders": "Pedidos anteriores",
  "Private details disappear from this page when your verified session ends.": "Los datos privados desaparecen de esta página cuando termina tu sesión verificada.",
  "Load more orders": "Cargar más pedidos",
  "Saved wash preferences": "Preferencias de lavado guardadas",
  "Customer supplied": "Proporcionado por el cliente",
  "Default special instructions": "Instrucciones especiales predeterminadas",
  "Save preferences": "Guardar preferencias",
  "Balance and recent activity.": "Saldo y actividad reciente.",
  "Available balance": "Saldo disponible",
  "Recent rewards activity": "Actividad reciente de recompensas",
  "Rewards details disappear from this page when your verified session ends.": "Los detalles de recompensas desaparecen cuando termina tu sesión verificada.",
  "Add a thank-you tip": "Agregar una propina de agradecimiento",
  "Tips are optional and available only after delivery. No amount is selected for you.": "Las propinas son opcionales y solo están disponibles después de la entrega. No seleccionamos ningún monto por ti.",
  "Tip amount in dollars": "Monto de la propina en dólares",
  "Review and submit tip": "Revisar y enviar propina",
  "Recurring pickups": "Recogidas recurrentes",
  "Plan future laundry days.": "Planea futuros días de lavado.",
  "Start a schedule": "Iniciar un horario",
  "How often": "Frecuencia",
  "Every week": "Cada semana",
  "Every two weeks": "Cada dos semanas",
  "Every month": "Cada mes",
  "Start recurring pickups": "Iniciar recogidas recurrentes",
  "Private-link security": "Seguridad del enlace privado",
  "Replace or permanently disable this link.": "Reemplaza o desactiva permanentemente este enlace.",
  "Private link security": "Seguridad del enlace privado",
  "Replace the link if it may have been shared. Disable it only when you no longer need online access; that choice cannot be undone here.": "Reemplaza el enlace si pudo haberse compartido. Desactívalo solo cuando ya no necesites acceso en línea; esa decisión no se puede deshacer aquí.",
  "Copy current private link": "Copiar enlace privado actual",
  "Replace private link": "Reemplazar enlace privado",
  "Permanently disable link": "Desactivar enlace permanentemente",
  "Please confirm": "Confirma la acción",
  "Keep this page private.": "Mantén esta página privada.",
  "The order token stays in the URL fragment and is never sent to analytics. Changes require fresh phone verification and a one-time authorization.": "El token del pedido permanece en el fragmento de la URL y nunca se envía a sistemas de medición. Los cambios requieren una nueva verificación telefónica y una autorización de un solo uso.",

  // Claims.
  "Order Claim | Snappy Coin Laundry": "Reclamo de pedido | Snappy Coin Laundry",
  "Skip to claim form": "Saltar al formulario de reclamo",
  "Customer care": "Atención al cliente",
  "Claim page shortcuts": "Accesos directos de la página de reclamo",
  "Back to order": "Volver al pedido",
  "A direct line to our team": "Comunicación directa con nuestro equipo",
  "Tell us what went wrong.": "Cuéntanos qué salió mal.",
  "Give us the clearest picture you can. A Snappy team member will review the order and follow up using the contact information already on file.": "Explícanos la situación con la mayor claridad posible. Un integrante del equipo de Snappy revisará el pedido y se comunicará mediante los datos de contacto registrados.",
  "What happens next": "Qué sucede después",
  "A person reviews every report.": "Una persona revisa cada informe.",
  "We match your report to the verified order.": "Relacionamos tu informe con el pedido verificado.",
  "Staff review your description and any supporting files.": "El personal revisa tu descripción y los archivos de respaldo.",
  "We contact you after review with the next step.": "Después de revisarlo, nos comunicamos contigo para informarte el siguiente paso.",
  "Submitting a report does not guarantee a particular refund or outcome.": "Enviar un informe no garantiza un reembolso ni un resultado específico.",
  "What kind of issue was it?": "¿Qué tipo de problema ocurrió?",
  "Something is missing": "Falta un artículo",
  "An item was damaged": "Un artículo sufrió daños",
  "Wash or service quality": "Calidad del lavado o servicio",
  "Charge or billing question": "Pregunta sobre un cargo o facturación",
  "Something else": "Otro problema",
  "What happened?": "¿Qué ocurrió?",
  "Include the item, when you noticed the issue, and anything that would help us investigate.": "Incluye el artículo, cuándo notaste el problema y cualquier dato que nos ayude a investigar.",
  "Add an amount you are asking us to review": "Agregar un monto que deseas que revisemos",
  "Requested amount in dollars": "Monto solicitado en dólares",
  "Leave this blank if you are unsure. Our team reviews the full order either way.": "Déjalo en blanco si no estás seguro. Nuestro equipo revisará todo el pedido de cualquier manera.",
  "Helpful, not required": "Útil, pero no obligatorio",
  "Add photos or documents": "Agregar fotos o documentos",
  "Choose up to five JPEG, PNG, or PDF files, no more than 5 MB each. Clear, well-lit photos of the full item and the affected area are most useful. Supported image metadata is removed before submission.": "Elige hasta cinco archivos JPEG, PNG o PDF de no más de 5 MB cada uno. Las fotos claras y bien iluminadas del artículo completo y del área afectada son las más útiles. Los metadatos compatibles de las imágenes se eliminan antes del envío.",
  "Choose evidence files": "Elegir archivos de evidencia",
  "Files ready to submit": "Archivos listos para enviar",
  "Send report for review": "Enviar informe para revisión",
  "Your order stays private.": "Tu pedido permanece privado.",
  "This form opens only after fresh phone verification. One-time claim and file permissions are removed from browser storage before the form opens.": "Este formulario se abre solo después de una nueva verificación telefónica. Los permisos de un solo uso para el reclamo y los archivos se eliminan del almacenamiento del navegador antes de abrir el formulario.",

  // Enumeration-safe private-link recovery.
  "Recover Your Private Order Link | Snappy Coin Laundry": "Recupera el enlace privado de tu pedido | Snappy Coin Laundry",
  "Skip to link recovery": "Saltar a la recuperación del enlace",
  "Recovery page shortcuts": "Accesos directos de la página de recuperación",
  "Open a private link": "Abrir un enlace privado",
  "Private link recovery": "Recuperación del enlace privado",
  "Lost your private link? Verify your phone to get a new one.": "¿Perdiste tu enlace privado? Verifica tu teléfono para obtener uno nuevo.",
  "Get a fresh order link.": "Obtén un enlace nuevo para tu pedido.",
  "Enter the email and mobile number used for pickup. We will verify the phone before replacing any link.": "Ingresa el correo y el número móvil que usaste para la recogida. Verificaremos el teléfono antes de reemplazar cualquier enlace.",
  "Match your pickup details": "Confirma tus datos de recogida",
  "For privacy, this page always gives the same response whether or not the details match an order.": "Para proteger tu privacidad, esta página siempre da la misma respuesta, coincidan o no los datos con un pedido.",
  "Email used for pickup": "Correo usado para la recogida",
  "Mobile number used for pickup": "Número móvil usado para la recogida",
  "Check your phone": "Revisa tu teléfono",
  "Enter the verification code": "Ingresa el código de verificación",
  "A code was sent to the number ending in": "Se envió un código al número que termina en",
  ". Enter it within ten minutes.": ". Ingrésalo dentro de diez minutos.",
  "Verify and replace link": "Verificar y reemplazar enlace",
  "Start again": "Comenzar de nuevo",
  "Request complete": "Solicitud completada",
  "Check your email and texts.": "Revisa tu correo y mensajes de texto.",
  "If the details matched an order, a fresh private link is on its way. Any previous link for that order no longer works.": "Si los datos coincidieron con un pedido, el enlace privado nuevo está en camino. Cualquier enlace anterior de ese pedido dejó de funcionar.",
  "Nothing private is shown here.": "Aquí no se muestra información privada.",
  "This page never confirms an order number, address, customer record, or whether the details matched.": "Esta página nunca confirma un número de pedido, dirección, registro de cliente ni si los datos coincidieron.",
  "Open the link I received": "Abrir el enlace que recibí",
  "Try another recovery": "Intentar otra recuperación",
  "Security note:": "Nota de seguridad:",
  "the verification request stays in this page’s memory only. The replacement private token is sent through the verified contact channels and is never returned to this browser page.": "la solicitud de verificación permanece solo en la memoria de esta página. El token privado de reemplazo se envía por los canales de contacto verificados y nunca regresa a esta página del navegador.",
  "Private recovery pages cannot be opened inside another site.": "Las páginas privadas de recuperación no se pueden abrir dentro de otro sitio.",
  "Enter a valid mobile number.": "Ingresa un número móvil válido.",
  "The verification request could not be started. Try again.": "No se pudo iniciar la solicitud de verificación. Inténtalo de nuevo.",
  "This recovery request expired. Start again for a new code.": "Esta solicitud de recuperación venció. Comienza de nuevo para recibir otro código.",
  "Enter the numeric verification code from the text message.": "Ingresa el código numérico de verificación del mensaje de texto.",
  "The code could not be checked. Try again.": "No se pudo verificar el código. Inténtalo de nuevo.",
  "Private-link recovery is unavailable right now.": "La recuperación de enlaces privados no está disponible en este momento.",
  "Private-link recovery is not available right now. Call the store if you need help with an order.": "La recuperación de enlaces privados no está disponible en este momento. Llama a la lavandería si necesitas ayuda con un pedido.",

  // One-question post-service feedback. The public-review invitation is
  // deliberately identical for either private response.
  "After your delivery": "Después de la entrega",
  "Were you satisfied with this order?": "¿Quedaste satisfecho con este pedido?",
  "Choose one private answer. If you need follow-up, we will route the order to our support team.": "Elige una respuesta privada. Si necesitas seguimiento, enviaremos el pedido a nuestro equipo de soporte.",
  "Satisfaction choices": "Opciones de satisfacción",
  "Yes, I was satisfied": "Sí, quedé satisfecho",
  "I need follow-up": "Necesito seguimiento",
  "Phone verification is required to submit this one-time response. No written review or sensitive details are collected here.": "Se requiere verificación telefónica para enviar esta respuesta una sola vez. Aquí no recopilamos comentarios escritos ni datos sensibles.",
  "Leave a public review (optional)": "Dejar una reseña pública (opcional)",
  "The optional public-review link is offered after either answer. Your private response is not sent to Google.": "El enlace opcional para una reseña pública se ofrece después de cualquiera de las dos respuestas. Tu respuesta privada no se envía a Google.",
  "Feedback is not available for this order.": "Los comentarios no están disponibles para este pedido.",
  "Choose one feedback response.": "Elige una respuesta.",
  "Verify the mobile number before submitting feedback.": "Verifica el número móvil antes de enviar tus comentarios.",
  "Retry the first feedback response before choosing a different answer.": "Vuelve a intentar la primera respuesta antes de elegir otra.",
  "Thank you. Our support team will follow up using the contact information on the order.": "Gracias. Nuestro equipo de soporte se comunicará mediante los datos de contacto del pedido.",
  "Thank you. Your private response was received.": "Gracias. Recibimos tu respuesta privada.",
  "Support follow-up requested": "Seguimiento de soporte solicitado",
  "Thank you for your feedback": "Gracias por tus comentarios",
  "Our support team will follow up using the contact information already on the order.": "Nuestro equipo de soporte se comunicará mediante los datos ya registrados en el pedido.",
  "Your private response was received.": "Recibimos tu respuesta privada.",

  // General legal pages.
  "Back to Snappy Coin Laundry": "Volver a Snappy Coin Laundry",
  "Effective date: June 19, 2026": "Fecha de vigencia: 19 de junio de 2026",
  "Privacy Policy | Snappy Coin Laundry": "Política de privacidad | Snappy Coin Laundry",
  "Privacy Policy": "Política de privacidad",
  "Privacy policy for Snappy Coin Laundry.": "Política de privacidad de Snappy Coin Laundry.",
  "This Privacy Policy explains how Snappy Coin Laundry collects, uses, and protects information when you visit our website, join our email list, or claim a promotional coupon.": "Esta Política de privacidad explica cómo Snappy Coin Laundry recopila, usa y protege información cuando visitas nuestro sitio web, te unes a nuestra lista de correo o solicitas un cupón promocional.",
  "Information We Collect": "Información que recopilamos",
  "We may collect information that you provide directly, including:": "Podemos recopilar información que proporcionas directamente, como:",
  "Name, email address, mobile phone number, and ZIP code for promo coupon claims.": "Nombre, correo electrónico, número de teléfono móvil y código postal para solicitudes de cupones promocionales.",
  "Email address and first name for newsletter or marketing list signups.": "Correo electrónico y nombre para suscripciones al boletín o lista de mercadeo.",
  "Marketing consent choices, SMS verification consent, coupon claim status, and related timestamps.": "Preferencias de consentimiento de mercadeo, consentimiento para verificación por SMS, estado de la solicitud del cupón y fechas relacionadas.",
  "Attribution information such as UTM parameters, referrer, landing page, Facebook click IDs, Meta ad parameters, Google Ads click IDs and ValueTrack parameters, and other click identifiers.": "Información de atribución, como parámetros UTM, sitio de referencia, página de llegada, identificadores de clic de Facebook, parámetros de anuncios de Meta, identificadores de clic de Google Ads, parámetros ValueTrack y otros identificadores de clic.",
  "We may also collect technical information from your browser, such as device and browser details, page views, approximate usage activity, and security challenge results.": "También podemos recopilar información técnica del navegador, como datos del dispositivo y navegador, páginas vistas, actividad aproximada de uso y resultados de comprobaciones de seguridad.",
  "How We Use Information": "Cómo usamos la información",
  "To verify your phone number before issuing a promotional coupon.": "Para verificar tu número de teléfono antes de emitir un cupón promocional.",
  "To email coupon codes and service-related promo messages.": "Para enviar por correo códigos de cupón y mensajes operativos relacionados con la promoción.",
  "To prevent duplicate coupon claims and protect the promotion from abuse.": "Para impedir solicitudes duplicadas y proteger la promoción contra abusos.",
  "To manage email marketing subscriptions and unsubscribe requests.": "Para administrar suscripciones de correo de mercadeo y solicitudes de cancelación.",
  "To measure advertising performance and improve our website.": "Para medir el rendimiento publicitario y mejorar nuestro sitio web.",
  "To comply with legal, security, audit, and operational requirements.": "Para cumplir requisitos legales, de seguridad, auditoría y operación.",
  "SMS Verification And Marketing Consent": "Verificación por SMS y consentimiento de mercadeo",
  "SMS verification is used only to confirm that the mobile phone number belongs to the person claiming the offer. Consent to receive a one-time verification text is separate from marketing consent. We do not treat SMS verification consent as consent to receive SMS marketing.": "La verificación por SMS se usa únicamente para confirmar que el número móvil pertenece a quien solicita la oferta. El consentimiento para recibir un mensaje de verificación de un solo uso es distinto del consentimiento de mercadeo. No consideramos la verificación por SMS como autorización para recibir mercadeo por SMS.",
  "Email marketing consent is optional and must be selected separately. Marketing emails must include an unsubscribe option.": "El consentimiento para mercadeo por correo es opcional y debe seleccionarse por separado. Los correos de mercadeo deben incluir una opción para cancelar la suscripción.",
  "How We Protect Promo Data": "Cómo protegemos los datos promocionales",
  "The promo system is designed so lookup and duplicate-prevention checks use hashed identifiers. Sensitive contact details and coupon codes should not be stored in plain text by the backend. Staff redemption screens should show only the information needed to validate a coupon, such as phone last four digits, and staff actions should be logged.": "El sistema promocional está diseñado para que las búsquedas y controles de duplicados usen identificadores cifrados mediante hash. El sistema no debe guardar en texto sin cifrar los datos de contacto sensibles ni los códigos de cupón. Las pantallas de canje del personal deben mostrar solo la información necesaria para validar un cupón, como los últimos cuatro dígitos del teléfono, y las acciones del personal deben quedar registradas.",
  "Service Providers": "Proveedores de servicios",
  "We may use service providers to operate the website and promotion, including:": "Podemos usar proveedores para operar el sitio web y la promoción, como:",
  "Cloudflare for website hosting, Workers, D1 database, bot prevention, and security services.": "Cloudflare para alojamiento web, Workers, base de datos D1, prevención de bots y servicios de seguridad.",
  "Twilio Verify for one-time phone verification codes.": "Twilio Verify para códigos de verificación telefónica de un solo uso.",
  "Resend for transactional coupon email. Marketing consent and unsubscribe suppression remain recorded in Cloudflare D1.": "Resend para correos operativos del cupón. El consentimiento de mercadeo y la supresión por cancelación permanecen registrados en Cloudflare D1.",
  "Meta Pixel, Google Analytics, and Google Ads for advertising and website measurement.": "Meta Pixel, Google Analytics y Google Ads para publicidad y medición del sitio.",
  "Google Maps for displaying our store location.": "Google Maps para mostrar la ubicación de la lavandería.",
  "DexterLive status services for machine availability information.": "Servicios de estado DexterLive para informar la disponibilidad de máquinas.",
  "Advertising And Analytics": "Publicidad y análisis",
  "We use analytics and advertising tools, including Meta Pixel, Google Analytics, and Google Ads, to understand website activity and measure ad performance after optional cookies are accepted. For the promo claim flow, we send Meta a standard Lead event only after a coupon claim is completed successfully and optional cookies are accepted. We do not send your name, email, phone number, verification code, or coupon code to Meta in that event.": "Usamos herramientas de análisis y publicidad, como Meta Pixel, Google Analytics y Google Ads, para comprender la actividad del sitio y medir anuncios después de que se aceptan las cookies opcionales. En el proceso promocional, enviamos a Meta un evento estándar Lead solo después de completar correctamente una solicitud y aceptar las cookies opcionales. En ese evento no enviamos tu nombre, correo, teléfono, código de verificación ni código de cupón.",
  "The promo form may send advertising attribution metadata to our backend with your claim, including Facebook click IDs, Meta ad parameters, Google Ads click IDs and ValueTrack parameters, and Meta or Google advertising cookie identifiers when optional cookies are accepted and those identifiers exist.": "El formulario promocional puede enviar a nuestro sistema metadatos de atribución publicitaria junto con tu solicitud, incluidos identificadores de clic de Facebook, parámetros de anuncios de Meta, identificadores de clic de Google Ads, parámetros ValueTrack e identificadores de cookies publicitarias de Meta o Google cuando se aceptaron las cookies opcionales y existen esos identificadores.",
  "Unsubscribing": "Cancelación de suscripción",
  "You can unsubscribe from marketing emails using the unsubscribe link in any marketing email. We may keep a suppression record so we can honor your unsubscribe choice.": "Puedes cancelar los correos de mercadeo mediante el enlace incluido en cualquiera de ellos. Podemos conservar un registro de supresión para respetar tu decisión.",
  "Data Retention": "Conservación de datos",
  "We keep information only as long as reasonably needed for the promotion, audit records, fraud prevention, legal compliance, and ordinary business operations.": "Conservamos información solo durante el tiempo razonablemente necesario para la promoción, auditorías, prevención de fraude, cumplimiento legal y operaciones comerciales habituales.",
  "Your Choices": "Tus opciones",
  "You can choose not to submit a promo claim or marketing signup form. You can also adjust browser settings to limit cookies or tracking technologies. Some security, verification, or form features may not work if cookies, scripts, or third-party services are blocked.": "Puedes optar por no enviar una solicitud promocional ni un formulario de mercadeo. También puedes ajustar el navegador para limitar cookies o tecnologías de seguimiento. Algunas funciones de seguridad, verificación o formularios podrían no funcionar si bloqueas cookies, scripts o servicios de terceros.",
  "Contact Us": "Contacto",
  "For privacy questions, email": "Para preguntas de privacidad, escribe a",
  "or write to Snappy Coin Laundry, 2303 McKelvey Rd, Maryland Heights, MO 63043.": "o escribe a Snappy Coin Laundry, 2303 McKelvey Rd, Maryland Heights, MO 63043.",

  "Terms of Use | Snappy Coin Laundry": "Términos de uso | Snappy Coin Laundry",
  "Terms of Use": "Términos de uso",
  "Terms of use for Snappy Coin Laundry.": "Términos de uso de Snappy Coin Laundry.",
  "These Terms of Use apply to the Snappy Coin Laundry website, promotional coupon forms, marketing signup forms, and related online features.": "Estos Términos de uso se aplican al sitio web de Snappy Coin Laundry, formularios de cupones promocionales, formularios de mercadeo y funciones en línea relacionadas.",
  "Website Use": "Uso del sitio web",
  "You may use this website for lawful personal purposes, including learning about our services, checking general store information, joining our email list, and claiming eligible promotions. You may not misuse the site, interfere with security features, submit false information, or attempt to access systems that are not intended for public use.": "Puedes usar este sitio para fines personales lícitos, como conocer nuestros servicios, consultar información general, unirte a la lista de correo y solicitar promociones elegibles. No puedes usar indebidamente el sitio, interferir con sus funciones de seguridad, enviar información falsa ni intentar acceder a sistemas que no sean públicos.",
  "Promotional Offers": "Ofertas promocionales",
  "Promotional offers are subject to the posted offer details, eligibility rules, redemption windows, and availability. Unless stated otherwise, promo coupon claims are limited to one per person, email address, and phone number per promotion. Coupons have no cash value, cannot be sold, and must be redeemed in person.": "Las ofertas están sujetas a los detalles publicados, reglas de elegibilidad, periodos de canje y disponibilidad. Salvo que se indique lo contrario, se permite una solicitud de cupón por persona, correo y teléfono en cada promoción. Los cupones no tienen valor en efectivo, no pueden venderse y deben canjearse en persona.",
  "The free weekday wash promotion is for one eligible 20- or 30-pound washer load. Redemption is manual through staff and is not integrated with DexterPay or automatic machine control. Snappy Coin Laundry may reject, cancel, or refuse claims that appear duplicate, fraudulent, ineligible, expired, or outside the posted terms.": "La promoción de lavado gratis entre semana cubre una carga elegible en lavadora de 20 o 30 libras. El personal hace el canje manualmente; no está integrado con DexterPay ni con controles automáticos. Snappy Coin Laundry puede rechazar o cancelar solicitudes duplicadas, fraudulentas, no elegibles, vencidas o fuera de los términos publicados.",
  "Phone Verification And Coupon Delivery": "Verificación telefónica y entrega del cupón",
  "Some promotions require phone verification before a coupon is issued. You are responsible for providing accurate contact information. A verification code does not guarantee that a coupon will be issued if the claim is invalid, duplicate, expired, or otherwise ineligible.": "Algunas promociones exigen verificación telefónica antes de emitir un cupón. Eres responsable de proporcionar datos de contacto correctos. Un código de verificación no garantiza la emisión si la solicitud es inválida, duplicada, vencida o no elegible.",
  "Email Marketing": "Mercadeo por correo electrónico",
  "If you choose to join our email list, you agree to receive promotional emails from Snappy Coin Laundry. You can unsubscribe using the link in a marketing email. Coupon transaction emails may still be sent when needed to complete a promo claim you requested.": "Si decides unirte a nuestra lista, aceptas recibir correos promocionales de Snappy Coin Laundry. Puedes cancelar la suscripción mediante el enlace de cualquier correo de mercadeo. Aun así podemos enviar correos operativos necesarios para completar una solicitud de cupón que hayas iniciado.",
  "Machine Availability And Third-Party Services": "Disponibilidad de máquinas y servicios de terceros",
  "Machine availability information, map embeds, analytics, security checks, and payment-related references may depend on third-party services. Availability information is provided for convenience and may not reflect real-time conditions at the store.": "La información de disponibilidad, mapas, análisis, comprobaciones de seguridad y referencias de pago puede depender de servicios externos. La disponibilidad se ofrece por conveniencia y podría no reflejar las condiciones en tiempo real.",
  "No Guarantee Of Error-Free Service": "Sin garantía de servicio libre de errores",
  "We work to keep website information accurate, but we do not guarantee that all content, promotions, hours, prices, availability, or third-party information will always be complete, current, or error-free. In-store posted information and staff confirmation may control when there is a discrepancy.": "Procuramos mantener la información correcta, pero no garantizamos que todo el contenido, promociones, horarios, precios, disponibilidad o datos de terceros estén siempre completos, vigentes o libres de errores. Si existe una discrepancia, pueden prevalecer los avisos del local y la confirmación del personal.",
  "Intellectual Property": "Propiedad intelectual",
  "Website text, design, logos, images, and other content are owned by or licensed to Snappy Coin Laundry unless otherwise noted. You may not copy or reuse website content for commercial purposes without permission.": "Salvo indicación contraria, el texto, diseño, logotipos, imágenes y demás contenido pertenecen a Snappy Coin Laundry o se usan bajo licencia. No puedes copiarlos ni reutilizarlos con fines comerciales sin permiso.",
  "Limitation Of Liability": "Limitación de responsabilidad",
  "To the fullest extent allowed by law, Snappy Coin Laundry is not liable for indirect, incidental, consequential, or special damages arising from use of the website, online forms, third-party services, or promotional offers.": "En la máxima medida permitida por la ley, Snappy Coin Laundry no se responsabiliza por daños indirectos, incidentales, consecuentes o especiales derivados del uso del sitio, formularios, servicios externos u ofertas promocionales.",
  "Changes": "Cambios",
  "We may update these terms from time to time. Continued use of the website after updates means you accept the updated terms.": "Podemos actualizar estos términos ocasionalmente. Seguir usando el sitio después de una actualización significa que aceptas los términos actualizados.",
  "Questions about these terms can be sent to": "Las preguntas sobre estos términos pueden enviarse a",
  "or Snappy Coin Laundry, 2303 McKelvey Rd, Maryland Heights, MO 63043.": "o a Snappy Coin Laundry, 2303 McKelvey Rd, Maryland Heights, MO 63043.",

  "Cookie Statement | Snappy Coin Laundry": "Declaración de cookies | Snappy Coin Laundry",
  "Cookie Statement": "Declaración de cookies",
  "Cookie statement for Snappy Coin Laundry.": "Declaración de cookies de Snappy Coin Laundry.",
  "This Cookie Statement explains how Snappy Coin Laundry uses cookies, pixels, local storage, session storage, and similar technologies on our website.": "Esta Declaración de cookies explica cómo Snappy Coin Laundry usa cookies, píxeles, almacenamiento local, almacenamiento de sesión y tecnologías similares en el sitio.",
  "Cookie Choices": "Preferencias de cookies",
  "When you first visit the site, a cookie banner lets you accept or decline optional analytics and advertising cookies. Meta Pixel, Google Analytics, and Google Ads are loaded only after optional cookies are accepted. Essential security, anti-spam, form, and preference tools may still run because they are needed to operate the site and promotion.": "En tu primera visita, un aviso permite aceptar o rechazar cookies opcionales de análisis y publicidad. Meta Pixel, Google Analytics y Google Ads solo se cargan si las aceptas. Las herramientas esenciales de seguridad, prevención de spam, formularios y preferencias pueden funcionar porque son necesarias para operar el sitio y la promoción.",
  "What These Technologies Do": "Qué hacen estas tecnologías",
  "Cookies and similar technologies help websites remember information, protect forms, measure activity, and support advertising. Local storage and session storage are browser storage features that can keep limited information on your device.": "Las cookies y tecnologías similares ayudan a recordar información, proteger formularios, medir actividad y respaldar publicidad. El almacenamiento local y de sesión son funciones del navegador que pueden conservar información limitada en tu dispositivo.",
  "Technologies We Use": "Tecnologías que usamos",
  "Essential and security tools:": "Herramientas esenciales y de seguridad:",
  "Cloudflare and Turnstile help protect forms, reduce spam, and keep the website available.": "Cloudflare y Turnstile ayudan a proteger formularios, reducir spam y mantener disponible el sitio.",
  "Promo attribution storage:": "Almacenamiento de atribución promocional:",
  "The promo form stores first-touch attribution, such as landing URL, referrer, UTM parameters, Facebook click IDs, Meta ad parameters, Google Ads click IDs and ValueTrack parameters, and other ad click IDs, in browser storage so the source of a claim can be submitted with the form. If optional cookies are accepted and Meta or Google advertising cookies exist, the form may also submit browser ID and click ID cookie values with the attribution payload.": "El formulario promocional guarda en el navegador la atribución del primer contacto, como URL de llegada, sitio de referencia, parámetros UTM, identificadores de clic de Facebook, parámetros de anuncios de Meta, identificadores de clic de Google Ads, parámetros ValueTrack y otros identificadores, para enviar el origen junto con la solicitud. Si se aceptan las cookies opcionales y existen cookies publicitarias de Meta o Google, el formulario también puede enviar sus identificadores de navegador y clic con la atribución.",
  "Meta Pixel:": "Meta Pixel:",
  "Meta Pixel measures page views and, after a successful coupon claim, a standard Lead event with generic campaign metadata.": "Meta Pixel mide páginas vistas y, después de una solicitud de cupón correcta, un evento estándar Lead con metadatos genéricos de campaña.",
  "Google measurement:": "Medición de Google:",
  "Google Analytics and Google Ads help us understand website traffic, page activity, and advertising performance.": "Google Analytics y Google Ads nos ayudan a comprender el tráfico, la actividad de las páginas y el rendimiento publicitario.",
  "Embedded or linked services:": "Servicios integrados o enlazados:",
  "Google Maps, DexterLive status services, and social media links may use their own technologies when loaded or opened.": "Google Maps, los servicios de estado DexterLive y los enlaces de redes sociales pueden usar sus propias tecnologías al cargarse o abrirse.",
  "Meta Lead Event": "Evento Lead de Meta",
  "The promo claim flow sends Meta a Lead event only after the backend confirms that the coupon claim was completed successfully. The event uses the content name \"Snappy Promo Coupon Claim.\" It does not include your name, email address, phone number, verification code, or coupon code.": "El proceso promocional envía a Meta un evento Lead solo cuando el sistema confirma que la solicitud se completó correctamente. El evento usa el nombre de contenido \"Snappy Promo Coupon Claim\". No incluye tu nombre, correo, teléfono, código de verificación ni código de cupón.",
  "You can accept or decline optional cookies in the site banner. Most browsers also let you block or delete cookies and site data. Browser privacy settings, ad blockers, and platform-level privacy controls may limit pixels or analytics tools. If you block scripts, cookies, local storage, or security tools, some forms or verification steps may not work correctly.": "Puedes aceptar o rechazar cookies opcionales en el aviso. La mayoría de los navegadores también permiten bloquear o eliminar cookies y datos del sitio. Los ajustes de privacidad, bloqueadores de anuncios y controles de plataforma pueden limitar píxeles o análisis. Si bloqueas scripts, cookies, almacenamiento o herramientas de seguridad, algunos formularios o pasos de verificación podrían no funcionar.",
  "Related Policies": "Políticas relacionadas",
  "See our": "Consulta nuestra",
  "for more detail about how information is collected and used, and our": "para más detalles sobre cómo se recopila y usa información, y nuestros",
  "for website and promotion terms.": "para conocer los términos del sitio y las promociones.",
  "Cookie questions can be sent to": "Las preguntas sobre cookies pueden enviarse a",

  // Pickup-specific policy pages.
  "Pickup & Delivery Privacy | Snappy Coin Laundry": "Privacidad de recogida y entrega | Snappy Coin Laundry",
  "Pickup & Delivery Terms | Snappy Coin Laundry": "Términos de recogida y entrega | Snappy Coin Laundry",
  "Skip to privacy notice": "Saltar al aviso de privacidad",
  "Skip to service terms": "Saltar a los términos del servicio",
  "Return to booking": "Volver a la reservación",
  "Draft · not approved for launch": "Borrador · no aprobado para lanzamiento",
  "Pickup & delivery privacy notice": "Aviso de privacidad de recogida y entrega",
  "This operational draft is not a substitute for approved legal language. Public booking remains feature-flagged off until the owner approves the final notice.": "Este borrador operativo no sustituye un texto legal aprobado. Las reservaciones públicas permanecen desactivadas hasta que el propietario apruebe el aviso final.",
  "Data used to provide service": "Datos usados para prestar el servicio",
  "The system is designed to use contact details, service address, route and bag records, preferences, consents, payment-provider identifiers, order events, and attribution needed to fulfill and support an order. Recoverable sensitive fields are encrypted; exact-match lookups use keyed hashes.": "El sistema está diseñado para usar los datos de contacto, dirección de servicio, registros de rutas y bolsas, preferencias, consentimientos, identificadores del proveedor de pagos, eventos del pedido y atribución necesarios para realizar y atender un pedido. Los campos sensibles recuperables están cifrados; las búsquedas exactas usan hashes con clave.",
  "Cloudflare hosts the API and operational database. Stripe handles card setup and payment. Twilio handles verification and operational texts. Resend handles transactional email.": "Cloudflare aloja la API y la base operativa. Stripe gestiona la configuración de tarjeta y el pago. Twilio gestiona la verificación y mensajes operativos. Resend gestiona correos operativos.",
  "When configured, Google Address Validation receives the pickup address to validate and geocode it. Snappy applies its own service-area boundary to determine eligibility. Exact Google coordinates and Google-standardized address content are not retained; only an allowed place identifier and Snappy’s eligibility decision may be stored.": "Cuando está configurado, Google Address Validation recibe la dirección de recogida para validarla y geocodificarla. Snappy aplica su propio límite de zona de servicio para determinar la elegibilidad. No conservamos las coordenadas exactas de Google ni el contenido de la dirección estandarizada por Google; solo se puede guardar un identificador de lugar permitido y la decisión de elegibilidad de Snappy.",
  "Use of address validation is subject to the": "El uso de la validación de direcciones está sujeto a los",
  "Google Maps Platform Terms": "Términos de Google Maps Platform",
  "Google Privacy Policy": "Política de Privacidad de Google",
  "and": "y",
  "Marketing email and SMS choices are separate and optional. Transactional messages are used to perform requested service. Contact Snappy Coin Laundry using the approved support details once published to request access, correction, or deletion subject to operational and legal retention needs.": "Las preferencias de mercadeo por correo y SMS son separadas y opcionales. Los mensajes operativos se usan para prestar el servicio solicitado. Cuando se publiquen los datos de soporte aprobados, comunícate con Snappy Coin Laundry para solicitar acceso, corrección o eliminación, sujeto a necesidades operativas y legales de conservación.",
  "Pickup & delivery service terms": "Términos del servicio de recogida y entrega",
  "Final terms—including cancellation, unattended handoff, claims, liability, tax, fees, delivery promises, and payment-failure policy—require owner and legal approval. Public booking remains feature-flagged off until an approved version and consent identifier are configured.": "Los términos finales —incluidos cancelación, entrega sin supervisión, reclamos, responsabilidad, impuestos, cargos, compromisos de entrega y política de fallas de pago— requieren aprobación del propietario y legal. Las reservaciones públicas permanecen desactivadas hasta configurar una versión aprobada y su identificador de consentimiento.",
  "How the service works": "Cómo funciona el servicio",
  "The booking flow reserves an available route only after address and phone checks and a successful saved-card setup. The backend calculates the amount after weighing using effective configuration. Payment and fulfillment are tracked separately. A customer may cancel only while the configured policy permits.": "El proceso reserva una ruta disponible solo después de verificar dirección y teléfono y guardar correctamente una tarjeta. El sistema calcula el monto después del pesaje con la configuración vigente. El pago y la prestación se registran por separado. El cliente solo puede cancelar mientras lo permita la política configurada.",
  "Address eligibility may use Google Address Validation. Use of that service is also subject to the": "La elegibilidad de la dirección puede usar Google Address Validation. El uso de ese servicio también está sujeto a los",
  "Customer responsibilities": "Responsabilidades del cliente",
  "Customers must provide accurate contact and access information, follow the approved bag and handoff policy, disclose relevant sensitivities, and protect private status links. Do not place prohibited items or payment data in bags or instructions.": "Los clientes deben proporcionar datos correctos de contacto y acceso, seguir la política aprobada de bolsas y entrega, informar sensibilidades relevantes y proteger los enlaces privados de estado. No coloques artículos prohibidos ni datos de pago en las bolsas o instrucciones.",
  "Snappy Coin Laundry · Maryland Heights, Missouri": "Snappy Coin Laundry · Maryland Heights, Misuri",
  "Service terms": "Términos del servicio",
  "Service providers": "Proveedores de servicios",
  "Your choices": "Tus opciones",
  "Privacy notice": "Aviso de privacidad",

  // Runtime booking, verification, recovery, and transport copy.
  "Booking is available only in a full browser window.": "Las reservaciones solo están disponibles en una ventana completa del navegador.",
  "Your waitlist invitation is ready. Recheck the address, verify the invited phone, and complete secure checkout for the reserved pickup window.": "Tu invitación de la lista de espera está lista. Vuelve a verificar la dirección y el teléfono invitado, y completa el pago seguro para reservar el horario de recogida.",
  "Pickup and delivery is not accepting bookings yet.": "El servicio de recogida y entrega todavía no acepta reservaciones.",
  "Online booking is temporarily paused. Existing orders remain available from the status page.": "Las reservaciones en línea están pausadas temporalmente. Los pedidos existentes siguen disponibles en la página de estado.",
  "The address service returned an invalid eligibility result.": "El servicio de direcciones devolvió un resultado de elegibilidad no válido.",
  "The pickup window in this waitlist invitation is no longer available. Ask staff for a refreshed invitation.": "El horario de recogida de esta invitación ya no está disponible. Pide al personal una invitación actualizada.",
  "This address is outside our current service area.": "Esta dirección está fuera de nuestra zona de servicio actual.",
  "We need to review this address before promising a pickup window.": "Necesitamos revisar esta dirección antes de confirmar un horario de recogida.",
  "Pickup service is paused. Join the waitlist and we will contact you when booking reopens.": "El servicio de recogida está pausado. Únete a la lista de espera y nos comunicaremos contigo cuando vuelvan a abrir las reservaciones.",
  "The address check expired. Please check the address again.": "La verificación de la dirección venció. Vuelve a verificarla.",
  "Current pickup routes are full. Join the waitlist and we will contact you if space opens.": "Las rutas de recogida actuales están llenas. Únete a la lista de espera y nos comunicaremos contigo si se abre un cupo.",
  "Choose a pickup window.": "Elige un horario de recogida.",
  "Choose a pickup window": "Elige un horario de recogida",
  "Accept the required service, privacy, messaging, and saved-card terms.": "Acepta los términos obligatorios del servicio, privacidad, mensajes y tarjeta guardada.",
  "The selected pickup window expired. Please check the address again.": "El horario de recogida seleccionado venció. Vuelve a verificar la dirección.",
  "The order was created without a private status link. Contact support with the request ID.": "El pedido se creó sin un enlace privado de estado. Comunícate con soporte e indica el ID de la solicitud.",
  "You’re on the list. We’ll contact you if service opens for your address.": "Estás en la lista. Nos comunicaremos contigo si el servicio se habilita para tu dirección.",
  "Private link copied. Store it somewhere only you can access.": "Se copió el enlace privado. Guárdalo en un lugar al que solo tú tengas acceso.",
  "Your browser could not copy the link. Open order status and copy the address from the browser bar.": "Tu navegador no pudo copiar el enlace. Abre el estado del pedido y copia la dirección desde la barra del navegador.",
  "Order number copied.": "Se copió el número del pedido.",
  "Your browser could not copy the order number.": "Tu navegador no pudo copiar el número del pedido.",
  "Complete the anti-bot check and try again.": "Completa la verificación contra robots e inténtalo de nuevo.",
  "Booking protection is not configured.": "La protección de las reservaciones no está configurada.",
  "Phone verification protection is not configured.": "La protección de la verificación telefónica no está configurada.",
  "The anti-bot check could not load.": "No se pudo cargar la verificación contra robots.",
  "The anti-bot check could not complete. It has been reset; please try again.": "No se pudo completar la verificación contra robots. Se reinició; inténtalo de nuevo.",
  "The anti-bot check expired. Complete the refreshed check and try again.": "La verificación contra robots venció. Completa la nueva verificación e inténtalo de nuevo.",
  "The anti-bot check timed out. Complete the refreshed check and try again.": "La verificación contra robots agotó el tiempo. Completa la nueva verificación e inténtalo de nuevo.",
  "Something went wrong. Please try again.": "Ocurrió un problema. Inténtalo de nuevo.",
  "Booking could not load.": "No se pudo cargar la reservación.",
  "Booking could not load. Try again or call the store.": "No se pudo cargar la reservación. Inténtalo de nuevo o llama a la lavandería.",
  "A new code was sent.": "Se envió un código nuevo.",
  "Enter a valid 10-digit mobile number.": "Ingresa un número móvil válido de 10 dígitos.",
  "If those details match an order, use the verification code sent to that phone.": "Si esos datos coinciden con un pedido, usa el código de verificación enviado a ese teléfono.",
  "If those details matched an order, a fresh private status link has been sent by email and text.": "Si esos datos coincidieron con un pedido, se envió un nuevo enlace privado de estado por correo electrónico y mensaje de texto.",
  "That code could not be verified. Try again or start a new recovery request.": "No se pudo verificar ese código. Inténtalo de nuevo o inicia otra solicitud de recuperación.",
  "This recovery request can no longer be used. Start a new request if you still need your link.": "Esta solicitud de recuperación ya no se puede usar. Inicia otra si todavía necesitas tu enlace.",
  "We could not complete that request.": "No pudimos completar esa solicitud.",
  "A binary request body is required.": "Se requiere un archivo válido para esta solicitud.",
  "A content type is required.": "Se requiere el tipo de contenido del archivo.",
  "A supported feedback locale is required.": "Se requiere un idioma compatible para enviar la respuesta.",
  "A valid evidence upload grant is required.": "Se requiere una autorización válida para cargar evidencia.",
  "A supported evidence content type is required.": "Se requiere un tipo de archivo de evidencia compatible.",
  "Secure retry protection is unavailable in this browser.": "La protección segura para reintentos no está disponible en este navegador.",
  "The service returned an unreadable response.": "El servicio devolvió una respuesta que no se pudo leer.",
  "The request timed out. Check the connection and try again.": "La solicitud agotó el tiempo. Verifica la conexión e inténtalo de nuevo.",
  "The request was canceled.": "La solicitud fue cancelada.",
  "The evidence upload timed out. The claim was not submitted; return to the status page before retrying.": "La carga de evidencia agotó el tiempo. El reclamo no se envió; vuelve a la página de estado antes de intentarlo de nuevo.",
  "The evidence upload was canceled.": "La carga de evidencia fue cancelada.",
  "The evidence upload could not be confirmed. The claim was not submitted; return to the status page before retrying.": "No se pudo confirmar la carga de evidencia. El reclamo no se envió; vuelve a la página de estado antes de intentarlo de nuevo.",
  "Choose one supported satisfaction response.": "Elige una de las respuestas de satisfacción disponibles.",
  "Evidence bytes must be between 1 byte and 5 MB.": "El archivo de evidencia debe medir entre 1 byte y 5 MB.",
  "Secure payment fields could not load.": "No se pudieron cargar los campos de pago seguro.",
  "Card setup is not available yet.": "La configuración de la tarjeta todavía no está disponible.",
  "Secure payment fields are not ready.": "Los campos de pago seguro todavía no están listos.",
  "Card setup failed.": "No se pudo configurar la tarjeta.",
  "Card setup needs additional confirmation.": "La configuración de la tarjeta necesita una confirmación adicional.",
  "Secure payment authentication is not available.": "La autenticación de pago seguro no está disponible.",
  "Payment authentication failed.": "No se pudo autenticar el pago.",
  "Payment authentication is not complete.": "La autenticación del pago no se completó.",
  "Secure card replacement is not available.": "El reemplazo seguro de la tarjeta no está disponible.",
  "Secure replacement-card fields are not ready.": "Los campos seguros de la tarjeta de reemplazo todavía no están listos.",
  "Replacement card authentication failed.": "No se pudo autenticar la tarjeta de reemplazo.",
  "Replacement card authentication is not complete.": "La autenticación de la tarjeta de reemplazo no se completó.",
  "This browser could not carry the reorder details to a new booking.": "Este navegador no pudo transferir los datos del pedido anterior a una nueva reservación.",

  // Runtime private status, receipt, feedback, and recurring-service copy.
  "Order received": "Pedido recibido",
  "Pickup scheduled": "Recogida programada",
  "Laundry picked up": "Ropa recogida",
  "Weighed and processing": "Pesada y en proceso",
  "Clean and packed": "Limpia y empacada",
  "Out for delivery": "En camino para la entrega",
  "Order canceled": "Pedido cancelado",
  "We’re checking the order details. Your pickup window will appear here once it is confirmed.": "Estamos revisando los datos del pedido. El horario de recogida aparecerá aquí cuando se confirme.",
  "Your pickup is reserved. Have your bags ready during the pickup window shown below.": "Tu recogida está reservada. Ten las bolsas listas durante el horario indicado a continuación.",
  "Your laundry is with our team. We’ll weigh it before washing so the final price is accurate.": "Nuestro equipo tiene tu ropa. La pesaremos antes de lavarla para calcular correctamente el precio final.",
  "Your laundry has been weighed and is moving through wash, dry, and fold.": "Ya pesamos tu ropa y está pasando por lavado, secado y doblado.",
  "Everything is clean, folded, and packed. We’re preparing the return route.": "Todo está limpio, doblado y empacado. Estamos preparando la ruta de entrega.",
  "Your order is with our driver and headed back to you.": "Nuestro conductor lleva tu pedido de regreso a tu domicilio.",
  "Your laundry is back. Your final receipt and support options are available below.": "Tu ropa ya fue entregada. A continuación puedes consultar el recibo final y las opciones de soporte.",
  "No further pickup or delivery is scheduled for this order.": "No hay más recogidas ni entregas programadas para este pedido.",
  "Not charged yet": "Aún no cobrado",
  "Payment processing": "Pago en proceso",
  "Paid": "Pagado",
  "Card confirmation needed": "Se necesita confirmar la tarjeta",
  "Payment needs attention": "El pago requiere atención",
  "Partially refunded": "Reembolso parcial",
  "Payment under review": "Pago en revisión",
  "In-store service": "Servicio en la lavandería",
  "Missing item": "Artículo faltante",
  "Damaged item": "Artículo dañado",
  "Billing question": "Pregunta sobre facturación",
  "Other issue": "Otro problema",
  "Under review": "En revisión",
  "Approved": "Aprobado",
  "Not approved": "No aprobado",
  "Resolved": "Resuelto",
  "Closed by customer": "Cerrado por el cliente",
  "Not enrolled": "No inscrito",
  "Active": "Activo",
  "Review needed": "Requiere revisión",
  "Temporarily paused": "Pausado temporalmente",
  "Closed": "Cerrado",
  "Reward earned": "Recompensa obtenida",
  "Reward used": "Recompensa usada",
  "Reward adjustment": "Ajuste de recompensa",
  "Reward restored": "Recompensa restablecida",
  "Reward expired": "Recompensa vencida",
  "Account credit": "Crédito de la cuenta",
  "Account adjustment": "Ajuste de la cuenta",
  "Weekly": "Semanal",
  "Monthly": "Mensual",
  "Paused": "Pausado",
  "Needs your confirmation": "Necesita tu confirmación",
  "Confirmed": "Confirmado",
  "Skipped": "Omitido",
  "Expired": "Vencido",
  "Choose another pickup window": "Elige otro horario de recogida",
  "Canceled": "Cancelado",
  "Free and clear": "Sin fragancia ni aditivos",
  "Private order pages cannot be opened inside another site.": "Las páginas privadas de pedidos no se pueden abrir dentro de otro sitio.",
  "The private order page could not load.": "No se pudo cargar la página privada del pedido.",
  "Fresh phone verification is required after returning to this page.": "Debes volver a verificar el teléfono después de regresar a esta página.",
  "Enter the private token from your confirmation message.": "Ingresa el código privado de tu mensaje de confirmación.",
  "Refresh the private order before using this control.": "Actualiza el pedido privado antes de usar este control.",
  "Review the tip amount and try again.": "Revisa el monto de la propina e inténtalo de nuevo.",
  "Cancel this pickup?": "¿Cancelar esta recogida?",
  "This stops the order and cannot be undone from this page. If the laundry has already been collected, contact the store instead.": "Esto detiene el pedido y no se puede deshacer desde esta página. Si ya recogimos la ropa, comunícate con la lavandería.",
  "Replace this private link?": "¿Reemplazar este enlace privado?",
  "The current link will stop working immediately. Confirmation messages containing the old link will not update, so copy the replacement before leaving.": "El enlace actual dejará de funcionar de inmediato. Los mensajes de confirmación que contienen el enlace anterior no se actualizarán; copia el nuevo antes de salir.",
  "Replace link": "Reemplazar enlace",
  "Permanently disable this link?": "¿Desactivar este enlace permanentemente?",
  "You will lose online access from this page. This action cannot be undone here; contact the store if you still need help with the order.": "Perderás el acceso en línea desde esta página. Esta acción no se puede deshacer aquí; comunícate con la lavandería si todavía necesitas ayuda con el pedido.",
  "Disable link": "Desactivar enlace",
  "Copying is unavailable in this browser. Use your browser’s address-bar copy control instead.": "La función de copiar no está disponible en este navegador. Usa la opción de copiar de la barra de direcciones.",
  "Private link copied. Share it only with someone you trust to view this order.": "Se copió el enlace privado. Compártelo solo con una persona de confianza que pueda ver este pedido.",
  "The confirmation panel could not open.": "No se pudo abrir el panel de confirmación.",
  "Read-only status is available, but protected actions cannot load phone verification right now.": "Puedes consultar el estado, pero las acciones protegidas no pueden cargar la verificación telefónica en este momento.",
  "Order status could not be refreshed.": "No se pudo actualizar el estado del pedido.",
  "Request a new verification code first.": "Primero solicita un código de verificación nuevo.",
  "That code expired. Enter the mobile number to request a new one.": "Ese código venció. Ingresa el número móvil para solicitar otro.",
  "Fresh phone verification is required before protected portal details can load.": "Debes volver a verificar el teléfono antes de cargar los datos protegidos del portal.",
  "The phone check completed, but the protected session was rejected or expired. Verify again before making changes.": "Se completó la verificación telefónica, pero la sesión protegida fue rechazada o venció. Vuelve a verificar antes de hacer cambios.",
  "Enter the mobile number again to request a code.": "Ingresa de nuevo el número móvil para solicitar un código.",
  "Verify the mobile number again before using this protected action.": "Vuelve a verificar el número móvil antes de usar esta acción protegida.",
  "The action authorization expired before it could be used.": "La autorización de la acción venció antes de poder usarse.",
  "Your order was canceled.": "Tu pedido fue cancelado.",
  "Choose an available pickup window.": "Elige un horario de recogida disponible.",
  "Secure replacement-card fields are ready. Confirm the card to retry the same payment.": "Los campos seguros de la tarjeta de reemplazo están listos. Confirma la tarjeta para reintentar el mismo pago.",
  "Start card replacement again before confirming.": "Inicia de nuevo el reemplazo de la tarjeta antes de confirmar.",
  "Stripe returned a different card setup session.": "Stripe devolvió una sesión distinta de configuración de tarjeta.",
  "The replacement card was saved and the original payment was retried. Refresh if payment is still processing.": "Se guardó la tarjeta de reemplazo y se reintentó el pago original. Actualiza la página si el pago sigue en proceso.",
  "Enter a tip amount with no more than two decimal places.": "Ingresa una propina con no más de dos decimales.",
  "Tip amount must be between $0.50 and $1,000.00.": "La propina debe ser de entre $0.50 y $1,000.00.",
  "Add tip": "Agregar propina",
  "The tip payment was not completed. Retry to resume the same payment.": "El pago de la propina no se completó. Reintenta para continuar con el mismo pago.",
  "Thank you. Your tip was added.": "Gracias. Se agregó tu propina.",
  "Your tip is processing. Refresh before trying again.": "Tu propina está en proceso. Actualiza la página antes de intentarlo de nuevo.",
  "Recurring pickup creation is not available for this order.": "No se puede crear una recogida recurrente para este pedido.",
  "Your recurring pickup schedule was created. Future proposals still require your confirmation.": "Se creó tu programación de recogidas recurrentes. Las próximas propuestas todavía requerirán tu confirmación.",
  "Verify the mobile number again before loading order history.": "Vuelve a verificar el número móvil antes de cargar el historial de pedidos.",
  "The order-history session changed. Verify again before continuing.": "La sesión del historial de pedidos cambió. Vuelve a verificar antes de continuar.",
  "More order history loaded.": "Se cargó más historial de pedidos.",
  "Verify the mobile number again before loading rewards.": "Vuelve a verificar el número móvil antes de cargar las recompensas.",
  "Saved preferences cannot be changed from this order.": "Las preferencias guardadas no se pueden cambiar desde este pedido.",
  "These saved preferences were already updated.": "Estas preferencias guardadas ya estaban actualizadas.",
  "Your saved laundry preferences were updated.": "Se actualizaron tus preferencias de lavado guardadas.",
  "An earlier preference request used different details. Review the current preferences, then submit again with a new request.": "Una solicitud anterior de preferencias usó datos distintos. Revisa las preferencias actuales y vuelve a enviarlas como una solicitud nueva.",
  "That recurring schedule is no longer available.": "Esa programación recurrente ya no está disponible.",
  "That proposed pickup was skipped.": "Se omitió esa recogida propuesta.",
  "Resolve the payment hold before starting another pickup.": "Resuelve la retención del pago antes de iniciar otra recogida.",
  "Verify the mobile number again before opening a protected claim.": "Vuelve a verificar el número móvil antes de abrir un reclamo protegido.",
  "The claim authorization expired before the form could open.": "La autorización del reclamo venció antes de que se pudiera abrir el formulario.",
  "An evidence authorization expired before the form could open.": "Una autorización de evidencia venció antes de que se pudiera abrir el formulario.",
  "Your private link was rotated. This page now contains the replacement link; the old link no longer works.": "Se reemplazó tu enlace privado. Esta página ahora contiene el enlace nuevo; el anterior ya no funciona.",
  "Your order": "Tu pedido",
  "Pending after intake": "Pendiente después de la recepción",
  "Confirmed after pickup": "Se confirmará después de la recogida",
  "Calculated after weighing": "Se calculará después del pesaje",
  "Order update available": "Hay una actualización del pedido",
  "Refresh for the latest update from our team.": "Actualiza para ver la información más reciente de nuestro equipo.",
  "This order was canceled. No further fulfillment steps are scheduled.": "Este pedido fue cancelado. No hay más etapas de servicio programadas.",
  "Your order needs attention": "Tu pedido requiere atención",
  "Please update payment below. Our team is also reviewing an order detail and will contact you if anything else is needed.": "Actualiza el pago a continuación. Nuestro equipo también está revisando un dato del pedido y se comunicará contigo si necesita algo más.",
  "Our team is reviewing the payment and an order detail. We’ll contact you using the information on the order if anything is needed.": "Nuestro equipo está revisando el pago y un dato del pedido. Nos comunicaremos contigo usando la información del pedido si necesitamos algo.",
  "Payment needs your attention": "El pago requiere tu atención",
  "Your card needs confirmation. Use the secure payment section below to keep this order moving.": "Tu tarjeta necesita confirmación. Usa la sección de pago seguro a continuación para que el pedido continúe.",
  "The card could not be charged. Update it below; this retries the same order and does not create a duplicate charge.": "No se pudo cobrar la tarjeta. Actualízala a continuación; esto reintenta el mismo pedido sin crear un cobro duplicado.",
  "The payment is being reviewed. We’ll contact you using the information on the order if anything is needed.": "El pago está en revisión. Nos comunicaremos contigo usando la información del pedido si necesitamos algo.",
  "Our team is reviewing an order detail": "Nuestro equipo está revisando un dato del pedido",
  "Your laundry remains tracked. We’ll contact you using the information on the order if we need anything from you.": "Tu ropa sigue registrada. Nos comunicaremos contigo usando la información del pedido si necesitamos algo de tu parte.",
  "Pending": "Pendiente",
  "Weight-based charges are pending. Payment activity shown here is current.": "Los cargos según el peso están pendientes. La actividad de pago que aparece aquí está actualizada.",
  "This receipt reflects the order total and settled payment activity.": "Este recibo refleja el total del pedido y la actividad de pagos completados.",
  "Charges are itemized; the payment state is shown above.": "Los cargos están detallados; el estado del pago aparece arriba.",
  "No order history is available yet.": "Todavía no hay historial de pedidos disponible.",
  "No rewards have been earned yet. Eligible activity will appear here after enrollment.": "Todavía no has obtenido recompensas. La actividad elegible aparecerá aquí después de la inscripción.",
  "No rewards activity yet.": "Todavía no hay actividad de recompensas.",
  "Order charge": "Cargo del pedido",
  "Weight": "Peso",
  "Claims": "Reclamos",
  "No amount requested": "No se solicitó un monto",
  "View itemized receipt": "Ver recibo detallado",
  "These preferences are read-only because their source order is no longer eligible for customer updates.": "Estas preferencias son de solo lectura porque el pedido de origen ya no admite cambios del cliente.",
  "Choose a new pickup window": "Elige un nuevo horario de recogida",
  "No recurring schedule is active yet.": "Todavía no hay una programación recurrente activa.",
  "No pickup is currently scheduled.": "No hay ninguna recogida programada actualmente.",
  "Pause schedule": "Pausar programación",
  "Resume schedule": "Reanudar programación",
  "That pickup window is no longer available. Choose another open time to continue.": "Ese horario de recogida ya no está disponible. Elige otro horario abierto para continuar.",
  "Continue with proposed route": "Continuar con la ruta propuesta",
  "Choose another route": "Elegir otra ruta",
  "Choose a route": "Elegir una ruta",
  "Skip this pickup": "Omitir esta recogida",
  "This order changed on the server. We refreshed it; review the latest details before trying again.": "Este pedido cambió en el servidor. Lo actualizamos; revisa los datos más recientes antes de intentarlo de nuevo.",
  "Fresh phone verification is required before trying again.": "Debes volver a verificar el teléfono antes de intentarlo de nuevo.",
  "We could not complete that action.": "No pudimos completar esa acción.",
  "Your verified session expired. Verify the mobile number again.": "Tu sesión verificada venció. Vuelve a verificar el número móvil.",
  "Enter the code. The resulting verified session stays only in this page's memory.": "Ingresa el código. La sesión verificada resultante permanece solo en la memoria de esta página.",
  "Update available": "Actualización disponible",
  "Not scheduled yet": "Todavía no está programada",
  "Morning pickup window": "Horario de recogida por la mañana",
  "Afternoon pickup window": "Horario de recogida por la tarde",
  "Scheduled pickup window": "Horario de recogida programado",
  "date unavailable": "fecha no disponible",
  "update available": "actualización disponible",

  // Runtime claims and evidence copy.
  "Private claim pages cannot be opened inside another site.": "Las páginas privadas de reclamos no se pueden abrir dentro de otro sitio.",
  "Review the selected evidence files.": "Revisa los archivos de evidencia seleccionados.",
  "Evidence file": "Archivo de evidencia",
  "The one-time claim authorization expired. Verify again from the private status page.": "La autorización de un solo uso del reclamo venció. Vuelve a verificar desde la página privada de estado.",
  "Return to the private status page and verify again before opening a claim.": "Vuelve a la página privada de estado y verifica de nuevo antes de abrir un reclamo.",
  "Return to the private status page, verify the mobile number, and choose Open a claim again.": "Vuelve a la página privada del pedido, verifica el número móvil y selecciona Abrir un reclamo otra vez.",
  "Enter a requested amount with no more than two decimal places.": "Ingresa un monto solicitado con no más de dos decimales.",
  "Enter an amount of at least $0.01, or leave the requested amount blank.": "Ingresa un monto de al menos $0.01 o deja el monto solicitado en blanco.",
  "Evidence upload is unavailable for one or more selected files. Return to the status page and verify again.": "La carga de evidencia no está disponible para uno o más archivos seleccionados. Vuelve a la página de estado y verifica de nuevo.",
  "An earlier claim request used different details and may already have been received. Check order history before opening another claim.": "Una solicitud de reclamo anterior usó datos distintos y quizá ya fue recibida. Consulta el historial de pedidos antes de abrir otro reclamo.",
  "That one-time claim authorization can no longer be used. Verify again from the private status page. Any evidence uploaded during this attempt was not submitted with a claim.": "Esa autorización de reclamo de un solo uso ya no se puede usar. Vuelve a verificar desde la página privada de estado. La evidencia cargada durante este intento no se envió con ningún reclamo.",
  "The claim could not be confirmed. Check the connection and retry once.": "No se pudo confirmar el reclamo. Verifica la conexión y vuelve a intentarlo una vez.",
  "The secured evidence references remain only in this page and will be reused without another upload when you retry.": "Las referencias seguras de evidencia permanecen solo en esta página y se reutilizarán sin volver a cargar los archivos cuando lo intentes de nuevo.",
  "An evidence authorization expired before the claim was submitted. Your claim was not submitted; return to the private status page and verify again.": "Una autorización de evidencia venció antes de enviar el reclamo. El reclamo no se envió; vuelve a la página privada de estado y verifica de nuevo.",
  "Evidence authorization expired.": "La autorización de evidencia venció.",
  "The evidence service did not accept the selected file contract.": "El servicio de evidencia no aceptó el archivo seleccionado.",
  "Remove": "Quitar",
  "Already on file": "Ya está registrado",
  "Report sent": "Informe enviado",
  "We already have this report.": "Ya tenemos este informe.",
  "Your report is with our team.": "Nuestro equipo recibió tu informe.",
  "Copy reference number": "Copiar número de referencia",
  "Reference number copied.": "Se copió el número de referencia.",
  "Open order page": "Abrir página del pedido",
  "To see this report in order history, reopen your original private order link and verify your mobile number again.": "Para ver este informe en el historial, vuelve a abrir el enlace privado original del pedido y verifica de nuevo tu número móvil.",
  "Size unavailable": "Tamaño no disponible",
});

const SOURCE_KEYS = Object.freeze(Object.keys(ES));
export const CATALOGS = Object.freeze({
  "en-US": Object.freeze(Object.fromEntries(SOURCE_KEYS.map((key) => [key, key]))),
  "es-US": ES,
});

const TEMPLATE_TRANSLATORS = Object.freeze([
  [/^(\d+)m ago$/, (_m, value) => `hace ${value} min`],
  [/^(\d+)h ago$/, (_m, value) => `hace ${value} h`],
  [/^(\d+)d ago$/, (_m, value) => `hace ${value} d`],
  [/^Updated (.+)$/, (_m, value) => `Actualizado ${value}`],
  [/^Opening in (\d+) minute(?:s)?$/, (_m, minutes) => `Abre en ${minutes} ${Number(minutes) === 1 ? "minuto" : "minutos"}`],
  [/^Opening in (\d+) hour(?:s)?(?: (\d+) minute(?:s)?)?$/, (_m, hours, minutes) => `Abre en ${hours} ${Number(hours) === 1 ? "hora" : "horas"}${minutes ? ` ${minutes} ${Number(minutes) === 1 ? "minuto" : "minutos"}` : ""}`],
  [/^(Busy right now|Plenty available|Some available) \(delayed\)$/, (_m, label) => `${ES[label]} (con demora)`],
  [/^Reviewing a recurring pickup from (.+)\. Recheck the address, route, phone, and card before confirming it\.$/, (_m, order) => `Revisando una recogida recurrente del pedido ${order}. Vuelve a verificar la dirección, la ruta, el teléfono y la tarjeta antes de confirmarla.`],
  [/^Reordering (.+)\. Recheck the address, phone, and card to create a new order\.$/, (_m, order) => `Repitiendo el pedido ${order}. Vuelve a verificar la dirección, el teléfono y la tarjeta para crear un pedido nuevo.`],
  [/^(.+)\/lb · (.+) minimum(?: · (.+) delivery)?$/, (_m, rate, minimum, delivery) => `${rate}/libra · mínimo ${minimum}${delivery ? ` · entrega ${delivery}` : ""}`],
  [/^For security, re-enter and verify the mobile number ending in (.+)\.$/, (_m, last4) => `Por seguridad, vuelve a ingresar y verificar el número móvil terminado en ${last4}.`],
  [/^That pickup window does not have room for (\d+) estimated bags?\. Choose another window or a lower bag estimate\.$/, (_m, bags) => `Ese horario no tiene cupo para ${bags} ${Number(bags) === 1 ? "bolsa estimada" : "bolsas estimadas"}. Elige otro horario o reduce la cantidad de bolsas.`],
  [/^(\d+) pickup windows? can currently take (\d+) estimated bags?\.$/, (_m, windows, bags) => `${windows} ${Number(windows) === 1 ? "horario de recogida tiene" : "horarios de recogida tienen"} cupo para ${bags} ${Number(bags) === 1 ? "bolsa estimada" : "bolsas estimadas"}.`],
  [/^No listed pickup window has room for (\d+) estimated bags?\. Choose a lower estimate or call the store\.$/, (_m, bags) => `Ningún horario indicado tiene cupo para ${bags} ${Number(bags) === 1 ? "bolsa estimada" : "bolsas estimadas"}. Elige una cantidad menor o llama a la lavandería.`],
  [/^(\d+) spots? left$/, (_m, count) => `${count} ${Number(count) === 1 ? "cupo disponible" : "cupos disponibles"}`],
  [/^(\d+) estimated bags?$/, (_m, count) => `${count} ${Number(count) === 1 ? "bolsa estimada" : "bolsas estimadas"}`],
  [/^A code was sent to the mobile number ending in (.+)\.$/, (_m, last4) => `Se envió un código al número móvil terminado en ${last4}.`],
  [/^A new code was sent to the mobile number ending in (.+)\.$/, (_m, last4) => `Se envió un código nuevo al número móvil terminado en ${last4}.`],
  [/^Phone verified\. Protected actions are unlocked, but (.+) could not load\. Try verifying again if the problem continues\.$/, (_m, failed) => `Teléfono verificado. Las acciones protegidas están habilitadas, pero no se pudo cargar ${translateFailureList(failed)}. Vuelve a verificar si el problema continúa.`],
  [/^Phone verified\. Protected actions, (rewards, )?order history, receipts, claims, and preferences are unlocked for this short browser session\.$/, (_m, rewards) => `Teléfono verificado. Las acciones protegidas, ${rewards ? "las recompensas, " : ""}el historial de pedidos, los recibos, los reclamos y las preferencias están habilitados durante esta breve sesión del navegador.`],
  [/^Add a (.+) tip\?$/, (_m, amount) => `¿Agregar una propina de ${amount}?`],
  [/^This creates a separate tip payment for (.+)\. It will not change the laundry order charge\.$/, (_m, order) => `Esto crea un pago de propina separado para ${order}. No cambiará el cargo del pedido de lavandería.`],
  [/^Recurring pickups are now (paused|active)\.$/, (_m, status) => `Las recogidas recurrentes ahora están ${status === "paused" ? "en pausa" : "activas"}.`],
  [/^The private link for (.+) was revoked\.$/, (_m, order) => `Se revocó el enlace privado de ${order}.`],
  [/^(\d+) bags? in this order$/, (_m, bags) => `${bags} ${Number(bags) === 1 ? "bolsa" : "bolsas"} en este pedido`],
  [/^Server status updated (.+)\.$/, (_m, value) => `Estado del servidor actualizado ${value}.`],
  [/^Order journey\. Current stage: (.+)\.$/, (_m, stage) => `Recorrido del pedido. Etapa actual: ${ES[stage] || stage}.`],
  [/^(.+)\/lb$/, (_m, rate) => `${rate}/libra`],
  [/^Pricing (.+) · tax rule (.+) · minimum (.+)\.$/, (_m, pricing, tax, minimum) => `Precios ${pricing} · regla fiscal ${tax} · mínimo ${minimum}.`],
  [/^Rewards account: (.+)\.$/, (_m, status) => `Cuenta de recompensas: ${status}.`],
  [/^(.+) · ordered (.+?)(?: · delivered (.+))?$/, (_m, service, ordered, delivered) => `${service} · pedido ${ordered}${delivered ? ` · entregado ${delivered}` : ""}`],
  [/^(.+) · (.+) · balance (.+?)(?: · order (.+?))? · (.+?)(?: · expires (.+))?$/, (_m, type, amount, balance, order, created, expires) => `${type} · ${amount} · saldo ${balance}${order ? ` · pedido ${order}` : ""} · ${created}${expires ? ` · vence ${expires}` : ""}`],
  [/^(.+) requested$/, (_m, amount) => `${amount} solicitado`],
  [/^(.+) · (.+) · (No amount requested|.+ requested)(?: · (.+) approved)? · opened (.+?)(?: · resolved (.+))?$/, (_m, type, status, requested, approved, opened, resolved) => `${type} · ${status} · ${requested === "No amount requested" ? "No se solicitó un monto" : `${requested.replace(/ requested$/, "")} solicitado`}${approved ? ` · ${approved} aprobado` : ""} · abierto ${opened}${resolved ? ` · resuelto ${resolved}` : ""}`],
  [/^Defaults from (.+)\.$/, (_m, order) => `Valores predeterminados de ${order}.`],
  [/^(.+) pickups$/, (_m, cadence) => `Recogidas ${cadence.toLocaleLowerCase("es-US")}`],
  [/^Next proposal: (.+)$/, (_m, date) => `Próxima propuesta: ${date}`],
  [/^Proposed pickup · (.+)$/, (_m, date) => `Recogida propuesta · ${date}`],
  [/^Respond by (.+)\.$/, (_m, date) => `Responde antes de ${date}.`],
  [/^Phone verified until (.+)\. Each protected action still receives its own one-time authorization\.$/, (_m, value) => `Teléfono verificado hasta ${value}. Cada acción protegida recibe además su propia autorización de un solo uso.`],
  [/^(\d+) evidence files? (?:is|are) ready to submit with this report\.$/, (_m, count) => `${count} ${Number(count) === 1 ? "archivo de evidencia está listo" : "archivos de evidencia están listos"} para enviarse con este informe.`],
  [/^(.+) removed\.$/, (_m, name) => `Se quitó ${name}.`],
  [/^(\d+) evidence files? secured\. If claim submission needs a network retry, the same in-memory references will be reused without uploading again\.$/, (_m, count) => `Se ${Number(count) === 1 ? "protegió" : "protegieron"} ${count} ${Number(count) === 1 ? "archivo de evidencia" : "archivos de evidencia"}. Si el reclamo necesita un reintento de red, se reutilizarán las mismas referencias en memoria sin volver a cargar los archivos.`],
  [/^Securing evidence file (\d+) of (\d+) before submitting the claim…$/, (_m, current, total) => `Protegiendo el archivo de evidencia ${current} de ${total} antes de enviar el reclamo…`],
  [/^The claim was not submitted because evidence file (\d+) could not be secured\. Your entered claim details remain on this page\. Return to the private status page and verify again before retrying; do not resubmit a claim just to compensate for this upload failure\.(?: .*)?$/, (_m, index) => `El reclamo no se envió porque no se pudo proteger el archivo de evidencia ${index}. Los datos ingresados permanecen en esta página. Vuelve a la página privada de estado y verifica de nuevo antes de reintentar; no vuelvas a enviar un reclamo solo para compensar esta falla de carga.`],
  [/^Evidence file (\d+)$/, (_m, index) => `Archivo de evidencia ${index}`],
  [/^Remove (.+)$/, (_m, name) => `Quitar ${name}`],
  [/^(\d+) supporting files? (?:was|were) attached\.$/, (_m, count) => `Se ${Number(count) === 1 ? "adjuntó" : "adjuntaron"} ${count} ${Number(count) === 1 ? "archivo de respaldo" : "archivos de respaldo"}.`],
  [/^Reference (.+) is (.+?)\.(?: (\d+) supporting files? (?:was|were) attached\.)? We’ll contact you after a staff member reviews it\.$/, (_m, reference, status, count) => `La referencia ${reference} está ${translateClaimStatus(status)}.${count ? ` Se ${Number(count) === 1 ? "adjuntó" : "adjuntaron"} ${count} ${Number(count) === 1 ? "archivo de respaldo" : "archivos de respaldo"}.` : ""} Nos comunicaremos contigo después de que un miembro del personal la revise.`],
  [/^Reference number: (.+)$/, (_m, reference) => `Número de referencia: ${reference}`],
  [/^Calendar file downloaded\. It contains only the pickup window and order number\.$/, () => "Se descargó el archivo de calendario. Contiene solo el horario de recogida y el número del pedido."],
  [/^Order number copied\.$/, () => "Se copió el número del pedido."],
  [/^Private link copied\. Store it somewhere only you can access\.$/, () => "Se copió el enlace privado. Guárdalo en un lugar al que solo tú tengas acceso."],
]);

function translateFailureList(value) {
  return String(value)
    .replace("order history and preferences", "el historial de pedidos y las preferencias")
    .replace("rewards", "las recompensas")
    .replace(" and ", " y ");
}

function translateClaimStatus(value) {
  return ({
    received: "recibida",
    "under review": "en revisión",
    approved: "aprobada",
    "not approved": "no aprobada",
    resolved: "resuelta",
    "closed by customer": "cerrada por el cliente",
  })[String(value).toLocaleLowerCase("en-US")] || value;
}

function normalizeLocale(value) {
  const normalized = String(value || "").trim().toLowerCase();
  if (normalized === "es" || normalized === "es-us") return "es-US";
  if (normalized === "en" || normalized === "en-us") return "en-US";
  return "";
}

function normalizeRuntimeLocales(values) {
  const requested = Array.isArray(values) ? values : [];
  const enabled = new Set(["en-US"]);
  if (requested.some((value) => normalizeLocale(value) === "es-US")) enabled.add("es-US");
  return Object.freeze(SUPPORTED_LOCALES.filter((value) => enabled.has(value)));
}

let runtimeLocales = normalizeRuntimeLocales(["en-US"]);

function runtimeLocale(value) {
  const normalized = normalizeLocale(value);
  return runtimeLocales.includes(normalized) ? normalized : "";
}

function storedLocale() {
  try { return runtimeLocale(localStorage.getItem(LOCALE_STORAGE_KEY)); }
  catch (_error) { return ""; }
}

function requestedLocale() {
  let query = "";
  try { query = new URL(location.href).searchParams.get("lang") || ""; }
  catch (_error) { /* non-browser tests */ }
  return runtimeLocale(query) || storedLocale() || "en-US";
}

let activeLocale = "en-US";

export function enabledPublicLocales() {
  return [...runtimeLocales];
}

export function configurePublicLocales(values) {
  runtimeLocales = normalizeRuntimeLocales(values);
  activeLocale = requestedLocale();
  return enabledPublicLocales();
}

const localeConfigurationReady = Promise.resolve(configurePublicLocales(PUD_CONFIG.supportedLocales));

export function getLocale() {
  return activeLocale;
}

export function localeSnapshot() {
  return Object.freeze({ locale: activeLocale, timeZone: CENTRAL_TIME_ZONE, currency: DISPLAY_CURRENCY });
}

export function translateText(value, locale = activeLocale) {
  const text = String(value ?? "");
  if (locale !== "es-US") return text;
  const normalized = text.trim().replace(/\s+/g, " ");
  if (!normalized) return text;
  const exact = ES[normalized];
  let translated = exact;
  if (!translated) {
    for (const [pattern, formatter] of TEMPLATE_TRANSLATORS) {
      if (!pattern.test(normalized)) continue;
      translated = normalized.replace(pattern, formatter);
      break;
    }
  }
  if (!translated) return text;
  const leading = text.match(/^\s*/)?.[0] || "";
  const trailing = text.match(/\s*$/)?.[0] || "";
  return `${leading}${translated}${trailing}`;
}

export function translateExternalText(
  value,
  fallback = "We could not complete that request.",
  locale = activeLocale,
) {
  const text = String(value ?? "");
  if (!text) return text;
  const translated = translateText(text, locale);
  if (locale !== "es-US" || translated !== text) return translated;
  return translateText(fallback, locale);
}

export function formatCurrencyCents(cents, options = {}) {
  return new Intl.NumberFormat(activeLocale, {
    style: "currency",
    currency: DISPLAY_CURRENCY,
    ...options,
  }).format(Number(cents || 0) / 100);
}

export function formatCentralDateTime(value, options = {}) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat(activeLocale, {
    timeZone: CENTRAL_TIME_ZONE,
    ...options,
  }).format(date);
}

function translateNode(node) {
  if (node.nodeType === Node.TEXT_NODE) {
    const parent = node.parentElement;
    if (!parent || parent.closest("script,style,noscript,template") || parent.hasAttribute("data-i18n-skip")) return;
    const translated = translateText(node.nodeValue);
    if (translated !== node.nodeValue) node.nodeValue = translated;
    return;
  }
  if (!(node instanceof Element) || node.hasAttribute("data-i18n-skip")) return;
  const translateAttributes = (element) => {
    if (element.hasAttribute("data-i18n-skip")) return;
    for (const attribute of ["aria-label", "title", "placeholder", "content", "alt"]) {
      if (!element.hasAttribute(attribute)) continue;
      const current = element.getAttribute(attribute);
      const translated = translateText(current);
      if (translated !== current) element.setAttribute(attribute, translated);
    }
  };
  translateAttributes(node);
  node.querySelectorAll?.("*").forEach(translateAttributes);
  const walker = document.createTreeWalker(node, NodeFilter.SHOW_TEXT);
  let textNode;
  while ((textNode = walker.nextNode())) translateNode(textNode);
}

function localizedHref(href) {
  if (!href || /^(?:mailto:|tel:|sms:|javascript:|data:)/i.test(href)) return href;
  try {
    const url = new URL(href, location.href);
    if (url.origin !== location.origin || !/^https?:$/.test(url.protocol)) return href;
    if (activeLocale === "es-US") url.searchParams.set("lang", "es");
    else url.searchParams.delete("lang");
    return `${url.pathname}${url.search}${url.hash}`;
  } catch (_error) {
    return href;
  }
}

export function withLocalePath(path) {
  return localizedHref(path);
}

function localizeLinks(container = document) {
  container.querySelectorAll?.("a[href]:not([data-i18n-skip-link])").forEach((anchor) => {
    const next = localizedHref(anchor.getAttribute("href"));
    if (next !== anchor.getAttribute("href")) anchor.setAttribute("href", next);
  });
}

function makeLocaleSwitcher() {
  if (document.querySelector("[data-locale-switcher]")) return;
  const switcher = document.createElement("div");
  switcher.className = "locale-switcher";
  switcher.dataset.localeSwitcher = "";
  switcher.setAttribute("role", "group");
  switcher.setAttribute("aria-label", translateText("Language"));
  switcher.setAttribute("translate", "no");
  for (const locale of runtimeLocales) {
    const label = locale === "es-US" ? "Español" : "English";
    const button = document.createElement("button");
    button.type = "button";
    button.className = "locale-switcher__button";
    button.dataset.locale = locale;
    button.textContent = label;
    button.setAttribute("aria-pressed", String(activeLocale === locale));
    button.addEventListener("click", () => selectLocale(locale));
    switcher.append(button);
  }
  const host = document.querySelector(".pud-header, .navbar, .site-header") || document.body;
  host.append(switcher);
}

export function selectLocale(locale) {
  const normalized = runtimeLocale(locale);
  if (!normalized) return;
  try { localStorage.setItem(LOCALE_STORAGE_KEY, normalized); }
  catch (_error) { /* persistence is best effort */ }
  const url = new URL(location.href);
  if (normalized === "es-US") url.searchParams.set("lang", "es");
  else url.searchParams.delete("lang");
  location.assign(`${url.pathname}${url.search}${url.hash}`);
}

async function boot() {
  await localeConfigurationReady;
  document.documentElement.lang = activeLocale;
  document.documentElement.dir = "ltr";
  document.documentElement.dataset.locale = activeLocale;
  document.documentElement.setAttribute("translate", "no");
  try { localStorage.setItem(LOCALE_STORAGE_KEY, activeLocale); }
  catch (_error) { /* storage may be unavailable */ }
  translateNode(document.documentElement);
  localizeLinks();
  makeLocaleSwitcher();
  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (mutation.type === "characterData") translateNode(mutation.target);
      if (mutation.type === "attributes") translateNode(mutation.target);
      mutation.addedNodes.forEach((node) => {
        translateNode(node);
        if (node instanceof Element) localizeLinks(node);
      });
    }
  });
  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
    characterData: true,
    attributes: true,
    attributeFilter: ["aria-label", "title", "placeholder", "content", "alt"],
  });
  document.dispatchEvent(new CustomEvent("snappy:locale-ready", { detail: localeSnapshot() }));
}

if (typeof document !== "undefined") {
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot, { once: true });
  else boot();
}
