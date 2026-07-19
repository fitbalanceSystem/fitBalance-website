// pdfFontsHebrew.js

// הגדרת פונטים עבור pdfMake
pdfMake.fonts = {
    Alef: {
      normal: 'Alef-Regular.ttf',
      bold: 'Alef-Bold.ttf',
      italics: 'Alef-Italic.ttf',
      bolditalics: 'Alef-BoldItalic.ttf'
    }
  };
  
  // כאן יש להכניס את קבצי הטיפוגרפיה בפורמט Base64
  // לדוגמה אני שם ערכים ריקים - יש להחליף ל-Base64 אמיתי של כל קובץ TTF
  pdfMake.vfs = {
    "Alef-Regular.ttf": "BASE64_DATA_OF_REGULAR_TTF",
    "Alef-Bold.ttf": "BASE64_DATA_OF_BOLD_TTF",
    "Alef-Italic.ttf": "BASE64_DATA_OF_ITALIC_TTF",
    "Alef-BoldItalic.ttf": "BASE64_DATA_OF_BOLDITALIC_TTF"
  };
  
  // פונקציה ליצירת PDF
  function generatePDF() {
    const docDefinition = {
      content: [
        { text: 'בס"ד', alignment: 'right', margin: [0, 0, 0, 10] },
        { text: 'נוכחות מתנ"ס - ספטמבר 25', alignment: 'right', margin: [0, 0, 0, 20] },
  
        { text: 'יום ראשון היפ הופ ילדות 18:00 - פסגות', style: 'tableHeader', margin: [0, 0, 0, 5] },
        {
          table: {
            headerRows: 1,
            widths: [40, '*', 60, 60, 60, 60],
            body: [
              ['#', 'שם מלא', '7/9 18:00', '14/9 18:00', '21/9 18:00', '28/9 18:00'],
              ['1', 'יוסף חן ליאן', 'V', 'V', '', ''],
              ['2', 'יצחק יהל', 'V', 'V', '', ''],
              ['3', 'אהרון נועה', 'V', 'V', '', ''],
              ['4', 'אהרון נויה', 'V', 'V', '', ''],
              ['5', 'לוי מאורי', 'V', 'V', '', ''],
              ['6', 'לוי אושרי', '', 'V', '', ''],
              ['7', { text: 'דביר נועה', color: 'red' }, '', '', '', ''],
            ]
          },
          layout: 'lightHorizontalLines'
        },
  
        { text: 'יום ראשון פילאטיס נשים 19:00 - פסגות', style: 'tableHeader', margin: [0, 20, 0, 5] },
        {
          table: {
            headerRows: 1,
            widths: [40, '*', 60, 60, 60, 60],
            body: [
              ['#', 'שם מלא', '7/9 19:00', '14/9 19:00', '21/9 19:00', '28/9 19:00'],
              ['1', 'הררי הודיה השלמה', '', 'V', '', '']
            ]
          },
          layout: 'lightHorizontalLines'
        }
      ],
      styles: {
        tableHeader: { bold: true, fillColor: '#FFFF00', alignment: 'right' }
      },
      defaultStyle: { fontSize: 10, font: 'Alef' } // שימוש בפונט עברי
    };
  
    pdfMake.createPdf(docDefinition).download('נוכחות.pdf');
  }
  
  // קישור לכפתור ב-HTML
  document.addEventListener('DOMContentLoaded', () => {
    const btn = document.getElementById('runBtn');
    if (btn) {
      btn.addEventListener('click', generatePDF);
    }
  });
  