"""
Certificate generation using ReportLab.
Generates professional PDF certificates for course completion.
"""
from io import BytesIO
from datetime import datetime
from reportlab.lib.pagesizes import letter, landscape
from reportlab.lib.units import inch
from reportlab.lib.colors import HexColor
from reportlab.pdfgen import canvas
from reportlab.lib.utils import ImageReader


def generate_certificate(user, course, completion_date):
    """
    Generate a PDF certificate for course completion.

    Args:
        user: User model instance
        course: Course model instance
        completion_date: datetime of course completion

    Returns:
        BytesIO object containing the PDF
    """
    buffer = BytesIO()

    # Create PDF in landscape mode
    page_width, page_height = landscape(letter)
    c = canvas.Canvas(buffer, pagesize=landscape(letter))

    # Colors
    primary_red = HexColor('#DC2626')  # Muay Thai red
    dark_gray = HexColor('#1F2937')
    light_gray = HexColor('#6B7280')

    # Add decorative border
    c.setStrokeColor(primary_red)
    c.setLineWidth(3)
    c.rect(0.5 * inch, 0.5 * inch, page_width - 1 * inch, page_height - 1 * inch)

    c.setStrokeColor(dark_gray)
    c.setLineWidth(1)
    c.rect(0.65 * inch, 0.65 * inch, page_width - 1.3 * inch, page_height - 1.3 * inch)

    # Title
    c.setFont('Helvetica-Bold', 48)
    c.setFillColor(primary_red)
    title = 'CERTIFICATE OF COMPLETION'
    title_width = c.stringWidth(title, 'Helvetica-Bold', 48)
    c.drawString((page_width - title_width) / 2, page_height - 1.8 * inch, title)

    # Subtitle
    c.setFont('Helvetica', 16)
    c.setFillColor(light_gray)
    subtitle = 'This certifies that'
    subtitle_width = c.stringWidth(subtitle, 'Helvetica', 16)
    c.drawString((page_width - subtitle_width) / 2, page_height - 2.5 * inch, subtitle)

    # Student Name
    c.setFont('Helvetica-Bold', 36)
    c.setFillColor(dark_gray)
    student_name = user.get_full_name() or user.username
    name_width = c.stringWidth(student_name, 'Helvetica-Bold', 36)
    c.drawString((page_width - name_width) / 2, page_height - 3.3 * inch, student_name)

    # Draw line under name
    c.setStrokeColor(light_gray)
    c.setLineWidth(1)
    line_start = (page_width - 6 * inch) / 2
    line_end = (page_width + 6 * inch) / 2
    c.line(line_start, page_height - 3.45 * inch, line_end, page_height - 3.45 * inch)

    # Completion text
    c.setFont('Helvetica', 16)
    c.setFillColor(light_gray)
    completion_text = 'has successfully completed the course'
    completion_width = c.stringWidth(completion_text, 'Helvetica', 16)
    c.drawString((page_width - completion_width) / 2, page_height - 4.0 * inch, completion_text)

    # Course Name
    c.setFont('Helvetica-Bold', 28)
    c.setFillColor(primary_red)
    course_title = course.title
    course_width = c.stringWidth(course_title, 'Helvetica-Bold', 28)
    c.drawString((page_width - course_width) / 2, page_height - 4.7 * inch, course_title)

    # Difficulty badge
    c.setFont('Helvetica', 14)
    c.setFillColor(dark_gray)
    difficulty_text = f"{course.difficulty.upper()} LEVEL"
    difficulty_width = c.stringWidth(difficulty_text, 'Helvetica', 14)
    c.drawString((page_width - difficulty_width) / 2, page_height - 5.1 * inch, difficulty_text)

    # Platform name
    c.setFont('Helvetica', 18)
    c.setFillColor(light_gray)
    platform_text = 'Dieselnoi Muay Thai'
    platform_width = c.stringWidth(platform_text, 'Helvetica', 18)
    c.drawString((page_width - platform_width) / 2, page_height - 5.7 * inch, platform_text)

    # Completion Date
    c.setFont('Helvetica', 12)
    c.setFillColor(light_gray)
    date_str = completion_date.strftime('%B %d, %Y')
    date_text = f'Completed on {date_str}'
    date_width = c.stringWidth(date_text, 'Helvetica', 12)
    c.drawString((page_width - date_width) / 2, page_height - 6.2 * inch, date_text)

    # Footer
    c.setFont('Helvetica-Oblique', 10)
    c.setFillColor(light_gray)
    footer_text = 'Train hard. Fight easy. The legend of Dieselnoi lives on.'
    footer_width = c.stringWidth(footer_text, 'Helvetica-Oblique', 10)
    c.drawString((page_width - footer_width) / 2, 0.8 * inch, footer_text)

    # Signature line (left side)
    c.setStrokeColor(dark_gray)
    c.setLineWidth(1)
    sig_line_y = 1.5 * inch
    c.line(1.5 * inch, sig_line_y, 4 * inch, sig_line_y)

    c.setFont('Helvetica', 10)
    c.setFillColor(dark_gray)
    c.drawString(1.5 * inch, sig_line_y - 0.25 * inch, 'Dieselnoi Ondam')
    c.setFont('Helvetica-Oblique', 9)
    c.setFillColor(light_gray)
    c.drawString(1.5 * inch, sig_line_y - 0.45 * inch, 'Legendary Muay Thai Fighter')

    # Issue date (right side)
    c.setFont('Helvetica', 9)
    c.setFillColor(light_gray)
    issue_date = datetime.now().strftime('%B %d, %Y')
    c.drawString(page_width - 4 * inch, 1.5 * inch, f'Certificate issued: {issue_date}')

    # Finalize PDF
    c.showPage()
    c.save()

    buffer.seek(0)
    return buffer
