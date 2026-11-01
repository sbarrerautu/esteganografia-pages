export const caseAnswers = {
  binance: {
    conclusion:'Poder operar una billetera no equivale a tener autorización para transferir sus activos; acceder a datos personales es otra cuestión.',
    paragraphs:[
      'El control técnico permite ejecutar operaciones. La autorización exige que la operación esté consentida por quien corresponda. Por eso, investigar un retiro requiere determinar quién operó, qué permisos tenía y si existió consentimiento: la capacidad técnica de hacerlo no demuestra que fuera legítimo.',
      'El robo de criptoactivos tampoco acredita por sí solo una filtración de datos personales. Para analizar protección de datos hay que comprobar qué información fue afectada y qué régimen resulta aplicable. Son cuestiones relacionadas, pero no intercambiables.'
    ],
    references:[{label:'Código Penal, art. 347 bis · operaciones no consentidas',url:'https://www.impo.com.uy/bases/codigo-penal/9155-1933/347_BIS'},{label:'Comité Europeo · qué es una brecha de datos personales',url:'https://www.edpb.europa.eu/sme/assess-the-risks/data-breaches_en'}]
  },
  bybit: {
    conclusion:'No. Varias firmas no compensan una verificación basada en información manipulada.',
    paragraphs:[
      'La firma múltiple exige la aprobación de varias personas, pero todas pueden ser engañadas si consultan la misma interfaz comprometida. Bybit describió una manipulación de la interfaz y de la operación presentada a sus firmantes que permitió alterar la lógica de su billetera y retirar fondos.',
      'La conclusión de seguridad es verificar la operación real con información confiable e independiente de la interfaz potencialmente comprometida. El número de firmas, por sí solo, no garantiza que quienes firman estén viendo y aprobando lo que realmente se ejecutará.'
    ],
    references:[{label:'Bybit · cronología y mecanismo del incidente',url:'https://www.bybit.global/en/learn/this-week-in-bybit/bybit-security-incident-timeline'}]
  },
  hubee: {
    conclusion:'La investigación penal busca esclarecer el ataque y sus responsables; la autoridad de datos revisa el cumplimiento de las obligaciones de protección de datos.',
    paragraphs:[
      'La vía penal examina la intrusión, la extracción de información y la responsabilidad de sus autores. La autoridad de protección de datos evalúa cuestiones como la seguridad del tratamiento, la documentación de la brecha y las comunicaciones exigibles. Estas actuaciones pueden desarrollarse en paralelo con la contención y recuperación técnica.',
      'La DINUM informó una denuncia y una notificación a la CNIL. Eso no significa que el comunicado haya declarado una infracción del GDPR ni impuesto una sanción: la existencia del incidente y la responsabilidad jurídica deben distinguirse.'
    ],
    references:[{label:'DINUM · comunicación del incidente HubEE',url:'https://www.numerique.gouv.fr/sinformer/espace-presse/incident-hubee/'},{label:'Comité Europeo · obligaciones ante una brecha',url:'https://www.edpb.europa.eu/sme/assess-the-risks/data-breaches_en'}]
  },
  capita: {
    conclusion:'Porque detectar un ataque no lo contiene: la alerta debe activar una respuesta oportuna y efectiva.',
    paragraphs:[
      'Una alerta informa de un riesgo; si no se analiza y se actúa, el atacante puede continuar dentro del sistema. La organización necesita responsables definidos, prioridades de atención, medidas de contención y procedimientos de recuperación, además de herramientas de detección.',
      'En Capita, el caso documenta una demora en aislar el equipo pese a una alerta temprana. La enseñanza es que la seguridad depende de que personas, procedimientos y tecnología funcionen juntos. Tener una alerta registrada no demuestra por sí solo que la organización haya respondido adecuadamente.'
    ],
    references:[{label:'ICO · resolución y comunicado del caso Capita',url:'https://ico.org.uk/about-the-ico/media-centre/news-and-blogs/2025/10/capita-fined-14m-for-data-breach-affecting-over-6m-people/'},{label:'NIST SP 800-61 Rev. 3 · detección, respuesta y recuperación',url:'https://csrc.nist.gov/pubs/sp/800/61/r3/final'}]
  },
  tiktok: {
    conclusion:'Sí. El acceso remoto puede constituir una transferencia internacional aunque no se envíe una copia por correo.',
    paragraphs:[
      'Lo relevante no es el formato de envío, sino si los datos se ponen a disposición de un destinatario en un tercer país en las condiciones del régimen de transferencias. En la decisión sobre TikTok del 2 de mayo de 2025, la DPC examinó el acceso remoto desde China a datos de usuarios del EEE como una transferencia internacional.',
      'La autoridad determinó incumplimientos de las garantías de transferencia del artículo 46.1 y de transparencia del artículo 13.1.f del GDPR. Mantener los servidores en otro país no resuelve, por sí solo, las obligaciones derivadas de quién puede acceder a los datos y desde dónde.'
    ],
    references:[{label:'DPC · decisión sobre transferencias de TikTok a China',url:'https://www.dataprotection.ie/en/news-media/latest-news/irish-data-protection-commission-fines-tiktok-eu530-million-and-orders-corrective-measures-following'}]
  }
};
