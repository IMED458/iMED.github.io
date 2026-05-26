from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.units import cm
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_RIGHT, TA_JUSTIFY
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.platypus.flowables import Flowable
from reportlab.lib.colors import HexColor
import os

TEAL = HexColor('#1A7A6E')
TEAL_DARK = HexColor('#145F55')
TEAL_LIGHT = HexColor('#E8F5F3')
TEAL_MID = HexColor('#2A9D8F')
GRAY_TEXT = HexColor('#374151')
GRAY_BORDER = HexColor('#D1D5DB')
WHITE = colors.white
PAGE_W, PAGE_H = A4
MARGIN_L = 2.2 * cm
MARGIN_R = 2.2 * cm
MARGIN_T = 2.0 * cm
MARGIN_B = 2.2 * cm

class ColorHR(Flowable):
    def __init__(self, color, thickness=0.8, width_pct=1.0):
        super().__init__()
        self.color = color
        self.thickness = thickness
        self.width_pct = width_pct
        self.height = thickness + 2
    def draw(self):
        w = (PAGE_W - MARGIN_L - MARGIN_R) * self.width_pct
        self.canv.setStrokeColor(self.color)
        self.canv.setLineWidth(self.thickness)
        self.canv.line(0, self.thickness / 2, w, self.thickness / 2)

def build_styles():
    _ = getSampleStyleSheet()
    return {
      'title': ParagraphStyle('title', fontName='Helvetica-Bold', fontSize=18, leading=24, textColor=TEAL_DARK, spaceAfter=4, alignment=TA_LEFT),
      'subtitle': ParagraphStyle('subtitle', fontName='Helvetica', fontSize=11, leading=15, textColor=GRAY_TEXT, spaceAfter=2, alignment=TA_LEFT),
      'body': ParagraphStyle('body', fontName='Helvetica', fontSize=9.5, leading=14, textColor=GRAY_TEXT, spaceAfter=5, alignment=TA_JUSTIFY),
      'section_heading': ParagraphStyle('section_heading', fontName='Helvetica-Bold', fontSize=11.5, leading=16, textColor=WHITE, alignment=TA_LEFT),
    }

LOGO_PATH = 'public/gbmn-logo.png'

def header_footer(canvas_obj, doc):
    canvas_obj.saveState()
    w, h = A4
    bar_h = 1.5 * cm
    canvas_obj.setFillColor(TEAL)
    canvas_obj.rect(0, h - bar_h, w, bar_h, stroke=0, fill=1)
    if os.path.exists(LOGO_PATH):
        canvas_obj.setFillColor(WHITE)
        canvas_obj.roundRect(MARGIN_L - 3, h - bar_h + 0.1*cm, 5.5*cm+6, 1.2*cm+2, 3, stroke=0, fill=1)
        canvas_obj.drawImage(LOGO_PATH, MARGIN_L, h - bar_h + 0.15*cm, width=5.5*cm, height=1.2*cm, preserveAspectRatio=True, mask='auto')
    canvas_obj.setFillColor(WHITE)
    canvas_obj.setFont('Helvetica-Bold', 8)
    canvas_obj.drawRightString(w - MARGIN_R, h - bar_h + 0.65 * cm, 'Georgian Biomedical and Medical Nexus')
    canvas_obj.setFont('Helvetica', 7)
    canvas_obj.drawRightString(w - MARGIN_R, h - bar_h + 0.3 * cm, 'Peer Review Report | Confidential Document')
    canvas_obj.setStrokeColor(TEAL_MID)
    canvas_obj.setLineWidth(1.5)
    canvas_obj.line(0, h - bar_h - 0.5, w, h - bar_h - 0.5)
    footer_y = MARGIN_B - 0.6 * cm
    canvas_obj.setStrokeColor(GRAY_BORDER)
    canvas_obj.line(MARGIN_L, footer_y + 0.45 * cm, w - MARGIN_R, footer_y + 0.45 * cm)
    canvas_obj.setFillColor(HexColor('#9CA3AF'))
    canvas_obj.setFont('Helvetica', 7)
    canvas_obj.drawString(MARGIN_L, footer_y + 0.15 * cm, 'GBMN — Georgian Biomedical and Medical Nexus | www.gbmn.ge | Since 2022')
    canvas_obj.drawRightString(w - MARGIN_R, footer_y + 0.15 * cm, f'Page {doc.page}')
    canvas_obj.restoreState()


def section_header(title, styles):
    t = Table([[Paragraph(title, styles['section_heading'])]], colWidths=[PAGE_W - MARGIN_L - MARGIN_R])
    t.setStyle(TableStyle([('BACKGROUND',(0,0),(-1,-1),TEAL),('LEFTPADDING',(0,0),(-1,-1),10),('TOPPADDING',(0,0),(-1,-1),6),('BOTTOMPADDING',(0,0),(-1,-1),6)]))
    return t


def build_pdf(output_path):
    doc = SimpleDocTemplate(output_path, pagesize=A4, leftMargin=MARGIN_L, rightMargin=MARGIN_R, topMargin=MARGIN_T + 1.8*cm, bottomMargin=MARGIN_B)
    styles = build_styles()
    s=[]
    s.append(Spacer(1,10))
    s.append(Paragraph('PEER REVIEW REPORT', styles['title']))
    s.append(ColorHR(TEAL, thickness=2.5))
    s.append(Spacer(1,6))
    s.append(Paragraph('Dermatoscopic Vascular Patterns and Invasive Tumor Depth as Predictors of Aggressive Behavior in Basal Cell Carcinoma', styles['subtitle']))
    s.append(Spacer(1,10))
    s.append(section_header('1. SUMMARY', styles))
    s.append(Spacer(1,7))
    s.append(Paragraph('This is a generated preview sample from your provided ReportLab code.', styles['body']))
    s.append(Paragraph('Use this PDF to visually verify print layout, header spacing, and typography.', styles['body']))
    doc.build(s, onFirstPage=header_footer, onLaterPages=header_footer)

if __name__ == '__main__':
    os.makedirs('previews', exist_ok=True)
    out='previews/GBMN_Peer_Review_Report_preview.pdf'
    build_pdf(out)
    print(out)
