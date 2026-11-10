"""Genera el PDF descargable a partir de las mismas definiciones de la web."""
import json
from pathlib import Path
from xml.sax.saxutils import escape

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, PageBreak

root = Path(__file__).resolve().parent
source = (root / 'public/theory-data.js').read_text(encoding='utf-8')
groups = json.loads(source.split('=', 1)[1].strip().removesuffix(';'))
output = root / 'public/conceptos.pdf'
pdfmetrics.registerFont(TTFont('Arial', 'C:/Windows/Fonts/arial.ttf'))
pdfmetrics.registerFont(TTFont('ArialBold', 'C:/Windows/Fonts/arialbd.ttf'))
pdfmetrics.registerFontFamily('Arial', normal='Arial', bold='ArialBold')
blue = colors.HexColor('#1246db')
ink = colors.HexColor('#172131')
body = ParagraphStyle('Body', fontName='Arial', fontSize=10, leading=14, textColor=ink, spaceAfter=8)
heading = ParagraphStyle('Heading', parent=body, fontName='ArialBold', fontSize=19, leading=24, textColor=blue, spaceAfter=18, keepWithNext=True)
small = ParagraphStyle('Small', parent=body, fontSize=9, leading=13, textColor=colors.HexColor('#58616e'))

def page_frame(canvas, document):
    width, height = A4
    canvas.saveState()
    canvas.setStrokeColor(blue)
    canvas.line(45, height - 37, width - 45, height - 37)
    canvas.setFont('ArialBold', 9)
    canvas.setFillColor(blue)
    canvas.drawString(45, height - 28, 'CIBEROBSERVATORIO / CONCEPTOS Y TEORÍA')
    canvas.setFont('Arial', 8)
    canvas.setFillColor(colors.HexColor('#58616e'))
    canvas.drawString(45, 27, 'Grupo 4 · Gestión Seguridad de la Información')
    canvas.drawRightString(width - 45, 27, str(document.page))
    canvas.restoreState()

story = []
for index, group in enumerate(groups):
    if index:
        story.append(PageBreak())
    story.append(Paragraph(f'{index + 1:02d} / {escape(group["title"])}', heading))
    if index == 0:
        story.append(Paragraph('92 conceptos organizados en nueve temas. Material de estudio de Sandra Barrera y Matias Bardo. Profesor Nelson Connio.', small))
        story.append(Paragraph('Definiciones generales. Los requisitos de cada delito, derecho u obligación se consultan en la norma aplicable.', small))
        story.append(Spacer(1, 8))
    for item in group['terms']:
        story.append(Paragraph(f'<b>{escape(item["term"])}.</b> {escape(item["definition"])}', body))

document = SimpleDocTemplate(str(output), pagesize=A4, rightMargin=45, leftMargin=45,
                             topMargin=55, bottomMargin=45,
                             title='Conceptos y teoría · Ciberobservatorio',
                             author='Sandra Barrera y Matias Bardo')
document.build(story, onFirstPage=page_frame, onLaterPages=page_frame)
print(f'PDF generado con {sum(len(group["terms"]) for group in groups)} conceptos: {output}')
