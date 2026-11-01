"""Renderiza el PDF aportado sin modificar sus páginas. No se ejecuta en Render."""
from pathlib import Path
import json
import pypdfium2 as pdfium
from pypdf import PdfReader

root = Path(__file__).resolve().parent / 'public' / 'presentacion'
pdf_path = root / 'presentacion.pdf'
reader = PdfReader(pdf_path)
document = pdfium.PdfDocument(str(pdf_path))
slides = []
for index, page in enumerate(document):
    text = reader.pages[index].extract_text() or ''
    title = next((line.strip() for line in text.splitlines() if line.strip()), f'Diapositiva {index + 1}')
    if index == 0:
        title = 'Ciberdelito, ciberdefensa y privacidad internacional'
    filename = f'diapositiva-{index + 1:02}.webp'
    bitmap = page.render(scale=1600 / page.get_width())
    picture = bitmap.to_pil()
    picture.save(root / filename, 'WEBP', quality=92, method=6)
    slides.append({'number': index + 1, 'title': title, 'image': f'presentacion/{filename}', 'text': text})
    picture.close()
    bitmap.close()
    page.close()
document.close()
(root / 'slides.json').write_text(json.dumps(slides, ensure_ascii=False), encoding='utf-8')
print(f'{len(slides)} diapositivas renderizadas; PDF original conservado.')
