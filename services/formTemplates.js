window.formTemplates = {

  health_declaration: {
    title: 'הצהרת בריאות',
    sections: [
      {
        heading: null,
        paragraphs: ['אני החתום/ה מטה מצהיר/ה בזאת כי:'],
        items: [
          'מצב בריאותי תקין ומאפשר פעילות גופנית.',
          'אין לי מגבלה רפואית המונעת ממני להשתתף בפעילות גופנית.',
          'אני מתחייב/ת להודיע למדריכה על כל שינוי במצב בריאותי.',
          'ידוע לי כי עלי להתייעץ עם רופא לפני תחילת פעילות גופנית אם יש לי ספק לגבי מצב בריאותי.',
          'אני לוקח/ת אחריות מלאה על השתתפותי בפעילות.',
        ],
        listType: 'ol',
      },
      {
        heading: null,
        paragraphs: ['FitBalance לא תישא באחריות לנזק שייגרם כתוצאה ממידע רפואי שלא נמסר.'],
      },
    ],
    fields: [
      { id: 'fullName',  label: 'שם מלא',    type: 'text', required: true  },
      { id: 'idNumber',  label: 'תעודת זהות', type: 'text', required: false },
    ],
  },

  registration_and_health: {
    title: 'נהלי רישום ותשלומים + הצהרת בריאות',
    sections: [
      {
        heading: 'השתתפות',
        items: [
          'ההרשמה מתבצעת לשנת לימודים מלאה.',
          'יש להגיע בלבוש ספורטיבי הולם בהתאם לתקנון הצניעות.',
          'אין להיכנס לשיעור באיחור של יותר מ-10 דקות.',
        ],
        listType: 'ul',
      },
      {
        heading: 'תשלום',
        items: [
          'התשלום מתבצע מראש לכל חודש עד ה-5 בחודש.',
          'איחור בתשלום עלול לגרור השעיה זמנית.',
        ],
        listType: 'ul',
      },
      {
        heading: 'ביטולים והחזרים',
        items: [
          'ביטול עד 14 יום מתחילת הפעילות — החזר מלא.',
          'ביטול לאחר 14 יום — החזר יחסי בניכוי דמי ביטול.',
          'היעדרות מהשיעורים אינה מזכה בהחזר כספי.',
          'הקפאת מנוי אפשרית בהודעה מראש של 7 ימים.',
        ],
        listType: 'ul',
      },
      {
        heading: 'צילום ופרסום',
        items: ['אין לצלם בשיעורים ללא אישור מפורש.'],
        listType: 'ul',
      },
      {
        heading: 'הצהרת בריאות',
        items: [
          'מצב בריאותי תקין ומאפשר פעילות גופנית.',
          'אין לי מגבלה רפואית המונעת ממני להשתתף בפעילות גופנית.',
          'אני מתחייב/ת להודיע למדריכה על כל שינוי במצב בריאותי.',
          'אני לוקח/ת אחריות מלאה על השתתפותי בפעילות.',
        ],
        listType: 'ol',
      },
      {
        heading: null,
        paragraphs: ['FitBalance לא תישא באחריות לנזק שייגרם כתוצאה ממידע רפואי שלא נמסר.'],
      },
    ],
    fields: [
      { id: 'fullName', label: 'שם מלא',    type: 'text', required: true  },
      { id: 'idNumber', label: 'תעודת זהות', type: 'text', required: false },
    ],
  },

  parent_approval: {
    title: 'אישור הורים',
    sections: [
      {
        heading: null,
        paragraphs: ['אני ההורה/אפוטרופוס החתום/ה מטה מאשר/ת:'],
        items: [
          'השתתפות ילדי/ילדתי בפעילות הגופנית של FitBalance.',
          'מצב בריאותו/ה תקין ומאפשר פעילות גופנית.',
          'אין מגבלה רפואית המונעת השתתפות בפעילות.',
          'אני מתחייב/ת להודיע למדריכה על כל שינוי במצב הבריאותי.',
          'אני לוקח/ת אחריות מלאה על השתתפות ילדי/ילדתי בפעילות.',
        ],
        listType: 'ol',
      },
      {
        heading: null,
        paragraphs: ['FitBalance לא תישא באחריות לנזק שייגרם כתוצאה ממידע שלא נמסר.'],
      },
    ],
    fields: [
      { id: 'fullName',   label: 'שם הקטין/ה',           type: 'text', required: true  },
      { id: 'signerName', label: 'שם ההורה/אפוטרופוס',   type: 'text', required: true  },
      { id: 'idNumber',   label: 'ת.ז הורה',              type: 'text', required: false },
    ],
  },

};

// פונקציית עזר: המרת template ל-HTML
window.formTemplates.toHTML = function(formKey) {
  const tpl = window.formTemplates[formKey];
  if (!tpl) return '';
  return tpl.sections.map(sec => {
    let html = '';
    if (sec.heading) html += `<h3>${sec.heading}</h3>`;
    if (sec.paragraphs) sec.paragraphs.forEach(p => { html += `<p>${p}</p>`; });
    if (sec.items?.length) {
      const tag = sec.listType || 'ul';
      html += `<${tag}>${sec.items.map(i => `<li>${i}</li>`).join('')}</${tag}>`;
    }
    return html;
  }).join('');
};
