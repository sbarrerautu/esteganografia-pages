// Hechos documentados separados de la comparación jurídica propuesta para el aula.
const penalBase = 'https://www.impo.com.uy/bases/codigo-penal/9155-1933/';
const cooperation = {
  lawId:'20004', title:'Ley 20.004 · cooperación internacional', articles:'Convenio iberoamericano: preservación y obtención de prueba',
  explanation:'Si una investigación uruguaya requiere registros extranjeros, debe identificar la vía de cooperación aplicable. Este convenio solo sirve cuando vincula a los Estados involucrados y se cumplen sus requisitos.',
  references:[{label:'Convenio completo · IMPO',url:'https://www.impo.com.uy/bases/leyes-internacional/20004-2021/1'}]
};
const personalData = {
  lawId:'18331', title:'Ley 18.331 · protección de datos en Uruguay', articles:'Arts. 10 y 12: seguridad y responsabilidad',
  explanation:'Solo si hay datos personales comprometidos en un tratamiento sometido al régimen uruguayo corresponde analizar estas obligaciones. El robo de criptoactivos no demuestra, por sí solo, una filtración de datos personales.',
  references:[{label:'Art. 10 · seguridad',url:'https://www.impo.com.uy/bases/leyes/18331-2008/10'},{label:'Art. 12 · responsabilidad',url:'https://www.impo.com.uy/bases/leyes/18331-2008/12'}]
};
const gdpr = {
  lawId:'gdpr', title:'GDPR · alcance territorial y brechas', articles:'Arts. 3 y 32–34',
  explanation:'Primero hay que justificar la conexión territorial con la UE y la afectación de datos personales. Después se evalúan seguridad, riesgo y posibles comunicaciones. Una pérdida financiera no activa automáticamente estas reglas.',
  references:[{label:'Comité Europeo · brechas de datos personales',url:'https://www.edpb.europa.eu/sme/assess-the-risks/data-breaches_en'}]
};

export const recentCases = [
  {
    id:'binance', date:'30 OCT 2026', iso:'2026-10-30', region:'Internacional', type:'Incidente comunicado',
    title:'Binance: retiros no autorizados desde sus billeteras operativas',
    summary:'Binance comunicó pérdidas de unos US$6.300 millones tras un compromiso de sus hot wallets el 29 de octubre de 2026.',
    what:'Control de activos y autorización de retiros. No se presume una filtración de datos personales.',
    how:'El comunicado inicial menciona un equipo portátil comprometido y otros puntos de intrusión. La secuencia técnica seguía en investigación; Binance no había hallado evidencia de filtración de claves privadas.',
    law:'Para un hecho equivalente bajo jurisdicción uruguaya, analizar acceso ilícito y fraude informático, según la prueba. La cooperación y las normas de datos tienen condiciones propias, detalladas abajo.',
    outcome:'Binance anunció contención, suspensión temporal de retiros y cobertura de pérdidas con SAFU y fondos propios. Se resume el comunicado del 30/10/2026, sin atribuir una sentencia ni dar por terminado el incidente.',
    url:'https://www.binance.com/en-TR/support/announcement/detail/d3306d9dca5243548c813b605e1d1751', source:'Binance · Comunicado de seguridad del 30/10/2026',
    related:['20327','20004','18331','gdpr'],
    prompt:'¿Qué diferencia hay entre controlar una billetera, autorizar una transferencia y acceder a datos personales?',
    legal:[
      {lawId:'20327',title:'Ley 20.327 · tipos penales incorporados al Código Penal',articles:'Arts. 297 bis y 347 bis del Código Penal',explanation:'En una investigación con competencia uruguaya, el acceso no autorizado a información y las manipulaciones para realizar transferencias no consentidas permitirían examinar estas figuras. Cada una exige acreditar sus elementos; no se afirma que una autoridad ya las haya aplicado a Binance.',references:[{label:'Art. 297 bis · acceso ilícito',url:penalBase+'297_BIS'},{label:'Art. 347 bis · fraude informático',url:penalBase+'347_BIS'}]},
      cooperation,personalData,gdpr
    ]
  },
  {
    id:'bybit', date:'26 FEB 2025', iso:'2025-02-26', region:'Internacional', type:'Robo documentado · atribución del FBI',
    title:'Bybit: una interfaz manipulada termina en un robo de criptoactivos',
    summary:'El FBI atribuyó a Corea del Norte el robo de aproximadamente US$1.500 millones ocurrido en Bybit el 21 de febrero de 2025.',
    what:'Integridad del proceso de firma y control de una billetera de Ethereum. Una wallet fría también depende de cómo se verifica lo que se firma.',
    how:'Según la cronología de Bybit, el atacante manipuló la interfaz de Safe y la transacción presentada a los firmantes. La operación alteró la lógica del contrato y permitió retirar los fondos.',
    law:'La comparación uruguaya permite estudiar fraude informático y, si corresponde, acceso ilícito. La intervención del FBI no convierte automáticamente la Privacy Act de 1974 en la norma aplicable: esa ley se centra en registros de agencias federales.',
    outcome:'El aviso del FBI del 26/02/2025 atribuye el robo a la actividad denominada TraderTraitor y describe movimientos de los activos. Es una atribución investigativa, no una sentencia presentada en esta ficha.',
    url:'https://www.fbi.gov/investigate/cyber/alerts/2025/north-korea-responsible-for-1-5-billion-bybit-hack', source:'FBI · Aviso I-022625-PSA del 26/02/2025',
    extraSources:[{label:'Bybit · Cronología del incidente, 03/03/2025',url:'https://www.bybit.global/en/learn/this-week-in-bybit/bybit-security-incident-timeline'}],
    related:['20327','20004','18331','gdpr'],
    prompt:'¿Alcanza con que varias personas firmen si todas verifican una interfaz manipulada?',
    legal:[
      {lawId:'20327',title:'Ley 20.327 · fraude y acceso ilícito',articles:'Arts. 347 bis y 297 bis del Código Penal',explanation:'La manipulación informática para transferir activos sin consentimiento puede compararse con el art. 347 bis. El acceso ilícito del art. 297 bis exige su propia prueba. Esta es una lectura para hechos bajo competencia uruguaya, no la calificación penal oficial del caso extranjero.',references:[{label:'Art. 347 bis · fraude informático',url:penalBase+'347_BIS'},{label:'Art. 297 bis · acceso ilícito',url:penalBase+'297_BIS'}]},
      cooperation,personalData,gdpr
    ]
  }
];
