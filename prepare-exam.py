"""Importa el banco aportado y aplica la revisión académica documentada."""
import json
import re
from pathlib import Path

root = Path(__file__).resolve().parent
source = root.parent / 'Banco SGSI - Completo con respuestas.txt'
sources = {
    'iso27000': ['ISO/IEC 27000:2018 · edición del vocabulario estudiado', 'https://www.iso.org/standard/73906.html'],
    'iso27001': ['ISO/IEC 27001:2022 · SGSI', 'https://committee.iso.org/standard/27001'],
    'soa': ['ISO/IEC JTC 1/SC 27 · Declaración de Aplicabilidad', 'https://committee.iso.org/files/live/sites/jtc1sc27/files/resources/ISO-IECJTC1-SC27-WG1_N3298_Auditing%20Practices%20Note%20-%20SoA.pdf'],
    'hs': ['ISO · Estructura armonizada de sistemas de gestión', 'https://www.iso.org/sites/directives/current/consolidated/'],
    'iso27002': ['ISO/IEC 27002:2022 · Orientación sobre controles', 'https://www.iso.org/standard/75652.html'],
    'criteria': ['ISO/IEC JTC 1/SC 27 · Evaluación y autenticación', 'https://www.iso.org/ics/35.030/x/'],
    'x509': ['ITU-T · X.509', 'https://www.itu.int/ITU-T/recommendations/rec.aspx?rec=X.509'],
    'sql': ['ISO/IEC 9075-1:2023 · SQL', 'https://www.iso.org/standard/76583.html'],
    'csf': ['NIST · CSF 2.0 y sus componentes', 'https://www.nist.gov/cyberframework/faqs'],
    'tiers': ['NIST SP 1302 · CSF Tiers', 'https://www.nist.gov/publications/nist-cybersecurity-framework-20-quick-start-guide-using-csf-tiers'],
    'controls': ['NIST SP 800-53 · Controles de seguridad y privacidad', 'https://csrc.nist.gov/pubs/sp/800/53/r5/upd1/final'],
    'assess': ['NIST SP 800-53A · Evaluación de controles', 'https://csrc.nist.gov/pubs/sp/800/53/a/r5/final'],
    'risk': ['NIST SP 800-30 · Evaluación de riesgos', 'https://csrc.nist.gov/pubs/sp/800/30/r1/final'],
    'forensic': ['NIST SP 800-86 · Técnicas forenses', 'https://csrc.nist.gov/pubs/sp/800/86/final'],
    'fips': ['FIPS 200 · Requisitos mínimos federales', 'https://csrc.nist.gov/pubs/fips/200/final'],
    'ssp': ['NIST SP 800-18 · Planes de seguridad', 'https://csrc.nist.gov/pubs/sp/800/18/r1/final'],
    'datauy': ['IMPO · Ley 18.331', 'https://www.impo.com.uy/bases/leyes/18331-2008'],
    'd64': ['IMPO · Decreto 64/020', 'https://www.impo.com.uy/bases/decretos/64-2020'],
    'd414': ['IMPO · Decreto 414/009', 'https://www.impo.com.uy/bases/decretos/414-2009'],
    'cert': ['IMPO · Ley 18.362, artículo 73', 'https://www.impo.com.uy/bases/leyes/18362-2008/73'],
    'certrole': ['CERTuy · Funciones', 'https://www.gub.uy/centro-nacional-respuesta-incidentes-seguridad-informatica/comunicacion/publicaciones/que-es-el-certuy'],
    'agesic': ['Agesic · Estrategia Nacional de Ciberseguridad', 'https://www.gub.uy/agencia-gobierno-electronico-sociedad-informacion-conocimiento/comunicacion/publicaciones/estrategia-nacional-ciberseguridad-2024-2030-0'],
    'd92': ['IMPO · Decreto 92/014', 'https://www.impo.com.uy/bases/decretos/92-2014'],
    'signature': ['IMPO · Ley 18.600', 'https://www.impo.com.uy/bases/leyes/18600-2009'],
    'procedure': ['IMPO · Decreto 276/013', 'https://www.impo.com.uy/bases/decretos/276-2013'],
    'd71': ['IMPO · Decreto 71/025', 'https://www.impo.com.uy/bases/decretos/71-2025'],
    'cooperation': ['IMPO · Convenio aprobado por Ley 20.004', 'https://www.impo.com.uy/bases/leyes-internacional/20004-2021/1'],
    'cyberlaw': ['IMPO · Ley 20.327', 'https://www.impo.com.uy/bases/leyes/20327-2024'],
    'stalking': ['IMPO · Código Penal, artículo 288 bis', 'https://www.impo.com.uy/bases/codigo-penal/9155-1933/288_BIS'],
    'fraud': ['IMPO · Código Penal, artículo 347 bis', 'https://www.impo.com.uy/bases/codigo-penal/9155-1933/347_BIS'],
    'identity': ['IMPO · Código Penal, artículo 347 ter', 'https://www.impo.com.uy/bases/codigo-penal/9155-1933/347_TER'],
    'defence': ['IMPO · Ley 18.650', 'https://www.impo.com.uy/bases/leyes/18650-2010'],
    'gdpr': ['Comité Europeo · Fundamentos del RGPD', 'https://www.edpb.europa.eu/sme/learn-the-basics/data-protection-basics_en'],
    'breach': ['Comité Europeo · Brechas de datos personales', 'https://www.edpb.europa.eu/sme/assess-the-risks/data-breaches_en'],
    'cobit': ['ISACA · Cascada de metas de COBIT 2019', 'https://www.isaca.org/resources/news-and-trends/industry-news/2019/employing-cobit-2019-for-enterprise-governance-strategy'],
    'zachman': ['IBM · Arquitectura empresarial y Zachman', 'https://public.dhe.ibm.com/software/data/sw-library/infosphere/whitepapers/IndustryModelsforEDM.pdf'],
    'calder': ['IT Governance · Marco Calder–Moir', 'https://www.itgovernance.co.uk/download/Calder-Moir-v2.pdf'],
    'coso': ['Reserva Federal · Componentes de control interno COSO', 'https://www.federalreserve.gov/supervisionreg/caletters/CA%2013-19%20Attachment%20Risk-focused%20Supervision%20Program%20Document.pdf'],
    'itil': ['PeopleCert · Prácticas ITIL 4', 'https://www.peoplecert.org/news-and-announcements/2023/itil-4-management-practices-2023'],
    'cis': ['CIS · Grupos de implementación', 'https://www.cisecurity.org/controls/implementation-groups'],
    'cmmi': ['CMMI Institute · Evaluación y mejora', 'https://cmmiinstitute.com/learning/appraisals/method'],
    'sse': ['ISO/IEC 21827 · SSE-CMM', 'https://www.iso.org/standard/44716.html'],
    'ot': ['NIST SP 800-82 · Seguridad de OT', 'https://csrc.nist.gov/pubs/sp/800/82/r3/final'],
    'isa': ['ISA · Comité ISA99', 'https://www.isa.org/standards-and-publications/isa-standards/isa-standards-committees/isa99'],
    'pci': ['PCI SSC · Alcance y responsabilidades al tercerizar', 'https://www.pcisecuritystandards.org/faqs/does-pci-dss-apply-to-merchants-who-outsource-all-payment-processing-operations-and-never-store-process-or-transmit-cardholder-data/'],
    'segment': ['PCI SSC · Alcance y segmentación', 'https://blog.pcisecuritystandards.org/new-information-supplement-pci-dss-scoping-and-segmentation-guidance-for-modern-network-architectures'],
    'hipaa': ['HHS · HIPAA Security Rule', 'https://www.hhs.gov/hipaa/for-professionals/security/laws-regulations/index.html'],
    'glba': ['FTC · Safeguards Rule', 'https://www.ftc.gov/business-guidance/resources/ftc-safeguards-rule-what-your-business-needs-know'],
    'basel': ['BIS · Comité de Basilea', 'https://www.bis.org/committees/bcbs/overview'],
    'financeiso': ['ISO/TR 13569:2005 · Referencia histórica retirada', 'https://www.iso.org/standard/37245.html'],
    'fisma': ['NIST · Risk Management Framework', 'https://csrc.nist.gov/projects/risk-management/about-rmf'],
    'sox': ['SEC · SOX y control interno del reporte financiero', 'https://www.sec.gov/about/divisions-offices/division-economic-risk-analysis/staff-papers-analyses/newsstudies2009sox-404_studypdf'],
    'ethics': ['USSC · Programa de ética y cumplimiento, § 8B2.1', 'https://guidelines.ussc.gov/apex/r/ussc_apex/guidelinesapp/guidelines?app_gl_id=%C2%A78B2.1'],
    'stig': ['DISA · Guías STIG', 'https://www.cyber.mil/stigs/'],
    'fiscam': ['GAO · FISCAM 2024', 'https://www.gao.gov/products/gao-24-107026'],
}

# Cada fila corresponde a una pregunta base; la última es la del profesor.
reviews = {
    1: [
        ('Cambiar cantidades afecta la integridad de los datos, aunque el archivo siga disponible.', 'iso27000'),
        ('La edición 2018 de ISO/IEC 27000 aporta visión general y vocabulario. ISO/IEC 27001 establece requisitos del SGSI.', 'iso27000 iso27001'),
        ('La SoA documenta controles necesarios, justificaciones, implementación y exclusiones justificadas del Anexo A.', 'soa'),
        ('La estructura armonizada facilita procesos compartidos, manteniendo los requisitos propios de cada norma.', 'hs'),
        ('ISO/IEC 15408 se relaciona con Common Criteria y la evaluación de seguridad de productos de TI.', 'criteria'),
        ('X.509 estructura certificados de clave pública. Vincular una identidad a una clave pública no otorga permisos ilimitados.', 'x509'),
        ('La serie ISO/IEC 9798 aborda mecanismos de autenticación de entidades.', 'criteria'),
        ('ISO/IEC 9075 corresponde a SQL. Los privilegios limitan operaciones y SELECT consulta datos.', 'sql controls'),
        ('El alcance considera los servicios cubiertos y las interfaces y dependencias externas pertinentes.', 'iso27001'),
        ('Los criterios permiten evaluar riesgos y seleccionar tratamientos adecuados a los riesgos identificados.', 'iso27001'),
        ('El riesgo que permanece después del tratamiento es residual.', 'risk'),
        ('La auditoría contrasta evidencia con criterios y requiere objetividad e imparcialidad.', 'iso27001'),
        ('Investigar causas y verificar la eficacia de acciones correctivas permite abordar la no conformidad.', 'iso27001'),
        ('Un cambio significativo del proveedor puede modificar dependencias, alcance o riesgos del SGSI.', 'iso27001'),
        ('Resultados de pruebas, revisiones de permisos y seguimiento de hallazgos aportan evidencia verificable.', 'assess'),
        ('La estructura armonizada permite integrar procesos y aprovechar el sistema existente, conservando requisitos específicos y tratamiento de riesgos.', 'hs'),
    ],
    2: [
        ('Govern orienta la gestión del riesgo mediante políticas, responsabilidades y supervisión.', 'csf'),
        ('Identify, Protect y Recover son funciones del CSF 2.0; Certify y Audit no son funciones del núcleo.', 'csf'),
        ('El perfil objetivo describe los resultados deseados; el actual representa la situación existente.', 'csf'),
        ('Los Tiers caracterizan el rigor de las prácticas de gobernanza y gestión del riesgo, aportando contexto organizacional.', 'tiers'),
        ('SP 800-53 es el catálogo de controles de seguridad y privacidad.', 'controls'),
        ('SP 800-53A orienta la evaluación de controles mediante procedimientos y métodos de evaluación.', 'assess'),
        ('La evaluación identifica amenazas y vulnerabilidades y estima probabilidad e impacto.', 'risk'),
        ('SP 800-86 aborda la integración de técnicas forenses en la respuesta a incidentes.', 'forensic'),
        ('Detect permite descubrir y analizar eventos adversos; Respond incluye contención y mitigación.', 'csf'),
        ('Recover abarca restaurar capacidades afectadas y comunicar el avance de la recuperación.', 'csf'),
        ('FIPS 200 establece requisitos mínimos para información y sistemas federales dentro de su ámbito.', 'fips'),
        ('La serie SP 800-18 se refiere a planes de seguridad de sistemas; la pregunta identifica la publicación.', 'ssp'),
        ('Examinar registros y probar mecanismos permite obtener evidencia sobre el funcionamiento del control.', 'assess'),
        ('El CSF es adaptable al contexto y al riesgo de organizaciones de distintos sectores.', 'csf'),
        ('Comparar los perfiles actual y objetivo permite detectar brechas y priorizar mejoras.', 'csf'),
        ('El CSF utiliza Core, Profiles y Tiers. Sus seis funciones incluyen Govern y Respond contempla contener y mitigar incidentes.', 'csf tiers'),
    ],
    3: [
        ('La Ley 18.331 reconoce la protección de datos como derecho humano y alcanza tratamientos públicos y privados, con excepciones.', 'datauy'),
        ('La URCDP es el órgano de control del régimen de protección de datos personales.', 'datauy'),
        ('El titular puede acceder a sus datos y solicitar la rectificación de información inexacta, según las condiciones legales.', 'datauy'),
        ('El principio de finalidad limita usos incompatibles con los motivos que justificaron la recolección.', 'datauy'),
        ('Limitar accesos y proteger los datos frente a alteraciones o accesos indebidos concreta obligaciones de seguridad.', 'datauy'),
        ('El Decreto 64/020 desarrolla la responsabilidad proactiva y medidas de seguridad en protección de datos.', 'd64'),
        ('La Ley 18.331 establece el régimen general y el Decreto 414/009 lo reglamenta, incluyendo aspectos del registro de bases.', 'datauy d414'),
        ('El artículo 73 de la Ley 18.362 creó CERTuy en Agesic.', 'cert'),
        ('CERTuy coordina la respuesta técnica y desarrolla tareas de prevención y difusión dentro de sus competencias.', 'certrole'),
        ('La estrategia 2024–2030 y el Marco de Ciberseguridad orientan la gestión nacional y organizacional de ciberseguridad.', 'agesic'),
        ('El Decreto 92/014 incluye disposiciones sobre sistemas y centros de datos de la Administración Central.', 'd92'),
        ('La Ley 18.600 regula el documento electrónico y la firma electrónica.', 'signature'),
        ('Una imagen de firma no acredita las condiciones de firma avanzada. El Decreto 276/013 regula el procedimiento administrativo electrónico.', 'signature procedure'),
        ('Los artículos 1 a 3 regulan el acceso de privados a la Plataforma de Interoperabilidad; los artículos 4 a 6 contemplan mecanismos de identificación digital.', 'd71'),
        ('Debe evaluarse la coordinación técnica y, si hay datos personales comprometidos, las obligaciones correspondientes a la vulneración.', 'certrole d64'),
        ('El régimen alcanza sectores público y privado y reconoce acceso y rectificación, con condiciones y excepciones legales.', 'datauy'),
    ],
    4: [
        ('Preservar evita la pérdida de registros; obtenerlos requiere la vía y autorizaciones aplicables. La custodia documenta su manejo.', 'cooperation'),
        ('La tecnología puede ser objetivo o medio. La figura penal depende de los hechos y sus elementos jurídicos.', 'cyberlaw'),
        ('La Ley 20.327 incorpora delitos y agravantes y contiene medidas educativas y preventivas.', 'cyberlaw'),
        ('El artículo 288 bis contempla la conducta telemática insistente y la alteración grave de la vida de la víctima.', 'stalking'),
        ('La suplantación requiere intención de dañar; el fraude exige analizar el provecho injusto y el perjuicio, entre otros elementos.', 'identity fraud'),
        ('La captación de una transmisión y la inutilización de archivos son conductas diferentes que requieren su propio análisis penal.', 'cyberlaw'),
        ('Procedencia, custodia documentada, hashes comparables y copias identificadas ayudan a preservar integridad y trazabilidad.', 'forensic'),
        ('La recuperación puede coordinarse con la preservación de prueba. La defensa comprende capacidades estatales dentro de su competencia.', 'forensic defence'),
        ('Deben justificarse necesidad de los datos, finalidad y base jurídica del tratamiento.', 'gdpr'),
        ('Contrato y obligación jurídica pueden legitimar tratamientos necesarios. El consentimiento es una de varias bases posibles.', 'gdpr'),
        ('Ofrecer servicios a personas en la Unión o seguir allí su comportamiento puede activar el alcance extraterritorial.', 'gdpr'),
        ('El responsable determina fines y medios; el encargado trata datos por su cuenta y conforme a instrucciones.', 'gdpr'),
        ('La protección debe incorporarse al diseño y limitar por defecto los datos y su accesibilidad a lo necesario.', 'gdpr'),
        ('La gestión de brechas exige investigar, documentar y evaluar las comunicaciones según el riesgo y régimen aplicable.', 'breach'),
        ('La transferencia exige identificar datos, destinatario, finalidad y destino y revisar las garantías del régimen aplicable.', 'datauy'),
        ('La obtención engañosa de credenciales y transferencia no consentida con provecho injusto encaja principalmente en el análisis de fraude informático.', 'fraud'),
    ],
    5: [
        ('La gobernanza alinea decisiones con objetivos, asigna responsabilidades y supervisa valor y riesgos.', 'cobit'),
        ('La cascada conecta necesidades de interesados, metas empresariales, metas de alineamiento y objetivos de gobernanza y gestión.', 'cobit'),
        ('Zachman organiza representaciones de arquitectura empresarial mediante perspectivas y modelos relacionados.', 'zachman'),
        ('Calder–Moir estructura la gobernanza y Zachman organiza las descripciones de arquitectura.', 'calder zachman'),
        ('Ambiente de control, evaluación de riesgos y monitoreo forman parte de los componentes de COSO.', 'coso'),
        ('La gestión de incidentes busca restaurar el servicio; problemas aborda causas y recurrencia.', 'itil'),
        ('Los grupos de implementación priorizan salvaguardas de CIS, incluidas medidas sobre inventarios y configuraciones.', 'cis'),
        ('CMMI permite evaluar fortalezas y debilidades de procesos y orientar su mejora.', 'cmmi'),
        ('SSE-CMM aborda la capacidad de los procesos de ingeniería de seguridad y sus oportunidades de mejora.', 'sse'),
        ('Gobernar supone evaluar, dirigir y supervisar; gestionar incluye planificar e implementar la dirección acordada.', 'cobit'),
        ('Los cambios en OT deben considerar seguridad física, continuidad, compatibilidad, pruebas y reversión.', 'ot'),
        ('El comité ISA99 desarrolla, junto con IEC, referencias de seguridad para automatización y control industrial.', 'isa'),
        ('Aprobaciones, pruebas y trazabilidad permiten verificar el control del ciclo de cambios.', 'controls assess'),
        ('Recurrencia, impacto y disponibilidad aportan información sobre el servicio más allá de la rapidez de cierre.', 'itil'),
        ('COBIT orienta gobernanza; CIS prioriza salvaguardas; Zachman estructura arquitectura empresarial.', 'cobit cis zachman'),
        ('La gobernanza busca alineamiento, creación de valor y gestión de riesgos de información y tecnología.', 'cobit'),
    ],
    6: [
        ('HIPAA es legislación estadounidense sanitaria; las STIG son guías técnicas y PCI DSS es un estándar del sector de pagos.', 'hipaa stig pci'),
        ('Tercerizar no elimina responsabilidades. Hay que delimitar flujos, sistemas y obligaciones compartidas.', 'pci'),
        ('La segmentación requiere aislamiento efectivo y comprobaciones de su funcionamiento para justificar una reducción del alcance.', 'segment'),
        ('El alcance depende del vínculo con entidades reguladas y de las tareas e información de salud tratada.', 'hipaa'),
        ('La Security Rule distingue salvaguardas administrativas, físicas y técnicas para proteger información de salud electrónica comprendida.', 'hipaa'),
        ('La Safeguards Rule exige medidas para proteger determinada información de clientes de instituciones financieras comprendidas.', 'glba'),
        ('Basilea orienta supervisión y riesgos bancarios. ISO/TR 13569:2005 fue una guía financiera; está retirada y se estudia como referencia histórica.', 'basel financeiso'),
        ('La categorización, selección y evaluación de controles y monitoreo forman parte del enfoque federal de gestión de riesgos.', 'fisma'),
        ('Los controles de acceso, segregación de funciones y cambios pueden proteger sistemas que sostienen el reporte financiero.', 'sox'),
        ('Un programa efectivo requiere supervisión, capacitación, canales de comunicación y evaluación de eficacia.', 'ethics'),
        ('El hardening adapta la configuración al rol y reduce funciones y ajustes innecesarios o inseguros.', 'controls stig'),
        ('Una incompatibilidad exige evaluar riesgos e impacto y documentar excepciones aprobadas y posibles medidas compensatorias.', 'ot controls'),
        ('Las STIG concretan configuración técnica; FISCAM aporta una metodología de auditoría de controles de sistemas.', 'stig fiscam'),
        ('La línea base requiere verificación continua y tratamiento documentado de desviaciones y excepciones.', 'controls'),
        ('Alcance, inventario, pruebas y seguimiento de hallazgos permiten demostrar qué controles se evaluaron y sus resultados.', 'assess fiscam'),
        ('Reducir servicios y puertos innecesarios disminuye superficie de ataque. Deben evaluarse compatibilidad y verificaciones manuales pertinentes.', 'stig ot'),
    ],
}
reinforcement = [
    ('La divulgación afecta confidencialidad y el bloqueo a usuarios autorizados afecta disponibilidad.', 'iso27000'),
    ('ISO/IEC 27002 ofrece orientación sobre controles de seguridad.', 'iso27002'),
    ('La SoA justifica exclusiones del Anexo A y refleja si los controles necesarios están implementados.', 'soa'),
    ('Un programa integrado de auditoría debe cubrir el alcance y criterios de ambos sistemas.', 'hs'),
    ('Common Criteria, asociado a ISO/IEC 15408, permite evaluar propiedades de seguridad de productos de TI.', 'criteria'),
    ('La vigencia y la cadena de confianza son comprobaciones relevantes; el certificado no contiene la clave privada.', 'x509'),
    ('Comprobar la identidad declarada es autenticación; decidir permisos corresponde a autorización.', 'criteria'),
    ('El mínimo privilegio concede solo las operaciones y recursos necesarios para la tarea.', 'controls'),
    ('La dependencia externa requiere considerar interfaces y riesgos relacionados con el servicio incluido.', 'iso27001'),
    ('La selección de controles responde a los riesgos identificados y evaluados que necesitan tratamiento.', 'iso27001'),
    ('El riesgo que permanece tras aplicar MFA y otros controles es residual.', 'risk'),
    ('Muestras de autorizaciones y registros fechados permiten contrastar el funcionamiento del control.', 'assess'),
    ('La eficacia se comprueba con resultados posteriores que evidencien una reducción o eliminación de la recurrencia.', 'iso27001'),
    ('Un nuevo servicio puede modificar el alcance y añadir riesgos que deben evaluarse.', 'iso27001'),
    ('Restaurar en una prueba y registrar fallas y correcciones aporta evidencia de recuperabilidad.', 'assess'),
]

topics = []
questions = []
topic = None
pool = 'base'
current = None
for raw_line in source.read_text(encoding='utf-8-sig').splitlines():
    line = raw_line.strip()
    if not line:
        continue
    topic_match = re.fullmatch(r'TEMA (\d) · (.+)', line)
    if topic_match:
        topic = int(topic_match[1])
        topics.append({'id': topic, 'title': topic_match[2]})
        pool = 'base'
        continue
    if line.startswith('REFUERZO ·'):
        topic = 1
        pool = 'refuerzo'
        continue
    if re.match(r'^(Pregunta|Refuerzo) ', line):
        number = int(re.search(r'(\d+)', line)[1])
        question_pool = 'profesor' if 'del profesor' in line else pool
        suffix = {'base': '', 'profesor': 'p', 'refuerzo': 'r'}[question_pool]
        current = {'id': f't{topic}-{suffix}{number:02}', 'topic': topic, 'pool': question_pool,
                   'number': number, 'multiple': 'múltiple' in line, 'prompt': '', 'options': []}
        questions.append(current)
        continue
    if current is None:
        continue
    option = re.fullmatch(r'([A-E])\. (.+)', line)
    if option:
        current['options'].append({'id': option[1], 'text': option[2]})
    elif line.startswith('Respuesta:'):
        current['correct'] = [letter.strip() for letter in line.split(':', 1)[1].split(',')]
        review = reinforcement[current['number'] - 1] if current['pool'] == 'refuerzo' else reviews[topic][15 if current['pool'] == 'profesor' else current['number'] - 1]
        current['explanation'] = review[0]
        current['sources'] = review[1].split()
    else:
        current['prompt'] = (current['prompt'] + ' ' + line).strip()

assert len(questions) == 111
by_id = {q['id']: q for q in questions}
by_id['t1-02']['options'][0]['text'] = 'ISO/IEC 27000:2018 → visión general y vocabulario del SGSI'
by_id['t1-p01']['options'][0]['text'] = 'La estructura armonizada tiene diez cláusulas; las cláusulas 4 a 10 contienen requisitos auditables de los sistemas de gestión.'
registration = by_id['t3-07']
registration['prompt'] = '¿Qué instrumentos integran el régimen uruguayo de protección de datos personales y registro de bases de datos?'
registration['options'][1]['text'] = 'Ley N.º 18.331'
registration['reviewNote'] = 'Se sustituyó la referencia ambigua a la Resolución 200/009 por la Ley 18.331 para preguntar por el marco general del registro, junto con el Decreto 414/009. Se conserva la clave A y B.'
interoperability = by_id['t3-14']
interoperability['reviewNote'] = 'Se conserva la clave original B y C: el decreto comprende tanto interoperabilidad como identificación digital.'
by_id['t6-07']['options'][2]['text'] = 'ISO/TR 13569:2005 orientaba la seguridad de la información en servicios financieros; es una referencia histórica retirada.'
original_keys = [answer.replace(' ', '').split(',') for answer in re.findall(r'^Respuesta: (.+)$', source.read_text(encoding='utf-8-sig'), re.MULTILINE)]
assert [question['correct'] for question in questions] == original_keys
for question in questions:
    assert len(question['options']) == 5, question['id']
    assert question['correct'] and len(question['correct']) == len(set(question['correct']))
    assert question['multiple'] == (len(question['correct']) > 1), question['id']
    assert all(key in sources for key in question['sources'])

notes = [
    'Tema 3, pregunta 14: se verificó la clave B y C con los dos capítulos del Decreto 71/025: interoperabilidad e identificación digital.',
    'Tema 3, pregunta 7: se reemplazó la referencia a una resolución particular de inscripción por la Ley 18.331.',
    'Tema 1: se precisó la edición 2018 de ISO/IEC 27000 al preguntar por vocabulario y se aclaró el alcance de las cláusulas 4 a 10.',
    'Tema 6, pregunta 7: ISO/TR 13569:2005 se identifica como referencia histórica retirada.',
]
bank = {'reviewed': '21 de noviembre de 2026', 'topics': topics, 'sources': sources,
        'reviewNotes': notes, 'questions': questions}
(root / 'public/exam-bank.js').write_text('export const examBank = ' + json.dumps(bank, ensure_ascii=False, indent=2) + ';\n', encoding='utf-8')
print(f'Banco preparado: {len(questions)} preguntas, {len(topics)} temas y {len(sources)} fuentes de referencia.')
