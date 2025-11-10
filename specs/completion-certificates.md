# Feature Spec: Completion Certificates

## Overview
Automatically generate PDF certificates when students complete all lessons in a course.

---

## Requirements

### Trigger Conditions
- **100% lesson completion** - All lessons in the course must be marked as completed
- Only available to users with active subscription to the course
- Certificate generated on-demand (not pre-generated)

### Certificate Format
- **Type:** PDF
- **Orientation:** Landscape (standard certificate format)
- **Size:** 8.5" x 11" or A4

### Certificate Content
**Required Fields:**
- Student's full name (from User model)
- Course title
- Completion date (date last lesson was completed)
- Certificate ID (unique identifier)
- Issue date (may differ from completion date if regenerated)

**Optional/Nice-to-have:**
- Dieselnoi signature (image)
- Platform logo
- Course difficulty level (Beginner/Intermediate/Advanced)
- Total watch time or number of lessons completed
- QR code linking to verification page

### Certificate Verification
**DECISION: No verification for MVP**
- Just generate PDF, no database record needed
- No verification URL or certificate ID
- Simpler implementation
- Can add verification later if needed

---

## Technical Design

### Backend Changes

**No Database Model Needed (No Verification)**
- Certificates generated on-demand as PDFs
- No certificate records stored in database
- Simpler implementation, fewer moving parts

**New API Endpoint:**
- `POST /api/certificates/generate/` - Generate certificate for a course
  - Request: `{course_id: 123}`
  - Response: `{pdf_url: "presigned-s3-url"}`
  - Validates 100% completion + active subscription
  - Generates PDF in memory, uploads to S3, returns download URL

**PDF Generation Library:**
- **Recommended:** ReportLab (pure Python, full control over layout)
- **Alternative:** WeasyPrint (HTML/CSS to PDF, easier styling)

**Storage:**
- Generate PDF in memory using ReportLab
- Upload to S3: `certificates/{user_id}/{course_id}.pdf`
- Return presigned URL for download (expires in 1 hour)
- Overwrite existing file if regenerated (no versioning)

### Frontend Changes

**Course Detail Page (`courses/[slug]/page.tsx`):**
- Show "Download Certificate" button if:
  - User has 100% completion
  - User has active subscription
- Button triggers API call to generate certificate
- Download PDF automatically

---

## User Flow

1. Student completes final lesson in course
2. UI shows "Certificate Available" message/badge
3. Student clicks "Download Certificate"
4. Backend validates completion + subscription
5. PDF generated in memory (ReportLab)
6. PDF uploaded to S3
7. Presigned download URL returned to frontend
8. Browser downloads PDF
9. Student can re-download anytime (regenerates PDF)

---

## Design Considerations

### Visual Design
- Professional, minimalist design
- Dieselnoi branding (logo, colors)
- Muay Thai theme (subtle Thai patterns/borders?)
- Clear, readable typography

### Security
- Validate subscription status before generation
- Presigned URLs expire after 1 hour
- Rate limit certificate generation (prevent abuse)
- Certificates are tied to user account (can't generate for others)

### Performance
- PDF generation may take 2-3 seconds
- Show loading state in UI
- Cache generated PDFs (don't regenerate every download)
- Consider background job for generation if slow

---

## Open Questions

1. **Certificate design** - Do we have Dieselnoi signature image? Logo files?
2. **Regeneration** - Students can regenerate anytime (overwrites S3 file)
3. **Name changes** - If user changes name, regenerated cert shows new name

---

## Success Metrics

- % of students who complete courses (increased motivation)
- Certificate download rate
- Verification page views (if implemented)
- Student satisfaction (certificates are highly valued social proof)

---

## Implementation Phases

**Phase 1: Core Functionality (MVP)**
- PDF generation endpoint (ReportLab)
- S3 upload and presigned URLs
- Download from course page
- Basic certificate design

**Phase 2: Polish**
- Professional design with Dieselnoi branding
- Email notification when certificate earned
- Certificate preview before download

**Phase 3: Enhancement**
- Verification system (add Certificate model + verification page)
- Sharable certificates (social media integration)
- Print-optimized design
- Multiple language support
