-- תיקון body_html שנשמר עם HTML entities
UPDATE email_templates SET body_html =
'<h2 style="text-align:right">שלום {{firstName}}! 🎀</h2><p style="text-align:right">שמחים לקבל אותך אלינו ל-<strong>FitBalance</strong>!</p><p style="text-align:right">מחכים לראותך בשיעורים 💪</p><p style="text-align:right">באהבה,<br>צוות FitBalance</p>'
WHERE template_key = 'welcome';

UPDATE email_templates SET body_html =
'<h2 style="text-align:right">יום הולדת שמח {{firstName}}! 🎂🎉</h2><p style="text-align:right">מאחלים לך יום מלא שמחה, בריאות ואנרגיה!</p><p style="text-align:right">באהבה,<br>צוות FitBalance</p>'
WHERE template_key = 'birthday';

UPDATE email_templates SET body_html =
'<p style="text-align:right">שלום {{firstName}},</p><p style="text-align:right">רצינו להזכיר שיש יתרת חוב בסך <strong>{{amount}} ₪</strong>.</p><p style="text-align:right">נשמח לסדר זאת בהקדם 🙏</p><p style="text-align:right">בברכה,<br>צוות FitBalance</p>'
WHERE template_key = 'debt';

UPDATE email_templates SET body_html =
'<h2 style="text-align:right">היי {{firstName}}! 🎉</h2><p style="text-align:right">שמחים לבשר לך על שיבוצך לשנת <strong>{{activityYear}}</strong>:</p><p style="text-align:right">{{programs}}</p><p style="text-align:right">לחתימה על נהלי הרישום לחצי כאן: <a href="{{formLink}}">{{formLink}}</a></p><p style="text-align:right">בברכת אימונים מהנים,</p><p style="text-align:right">אפרת וצוות FitBalance</p>'
WHERE template_key = 'assignment';
