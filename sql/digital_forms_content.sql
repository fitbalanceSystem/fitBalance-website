-- הוספת עמודות תוכן לטפסים דיגיטליים
ALTER TABLE digital_forms
  ADD COLUMN IF NOT EXISTS content_html text,
  ADD COLUMN IF NOT EXISTS fields_json  jsonb;

UPDATE digital_forms SET
  content_html = '<p>אני החתומה מטה, <strong>{{firstName}} {{lastName}}</strong>, מצהירה בזאת כי:</p>
<ol>
  <li>מצב בריאותי תקין ומאפשר פעילות גופנית.</li>
  <li>אין לי מגבלה רפואית המונעת ממני להשתתף בפעילות גופנית.</li>
  <li>אני מתחייבת להודיע למדריכה על כל שינוי במצב בריאותי.</li>
  <li>ידוע לי כי עלי להתייעץ עם רופא לפני תחילת פעילות גופנית אם יש לי ספק לגבי מצב בריאותי.</li>
  <li>אני לוקחת אחריות מלאה על השתתפותי בפעילות.</li>
</ol>
<p>FitBalance לא תישא באחריות לנזק שייגרם כתוצאה ממידע רפואי שלא נמסר.</p>',
  fields_json = '[{"id":"fullName","label":"שם מלא","type":"text","required":true},{"id":"idNumber","label":"תעודת זהות","type":"text","required":false}]'
WHERE form_key = 'health_declaration';

UPDATE digital_forms SET
  content_html = '<h3>השתתפות</h3>
<ul>
  <li>ההרשמה מתבצעת לשנת לימודים מלאה.</li>
  <li>יש להגיע בלבוש ספורטיבי הולם בהתאם לתקנון הצניעות.</li>
  <li>אין להיכנס לשיעור באיחור של יותר מ-10 דקות.</li>
</ul>
<h3>תשלום</h3>
<ul>
  <li>התשלום מתבצע מראש לכל חודש עד ה-5 בחודש.</li>
  <li>איחור בתשלום עלול לגרור השעיה זמנית.</li>
</ul>
<h3>ביטולים והחזרים</h3>
<ul>
  <li>ביטול עד 14 יום מתחילת הפעילות — החזר מלא.</li>
  <li>ביטול לאחר 14 יום — החזר יחסי בניכוי דמי ביטול.</li>
  <li>היעדרות מהשיעורים אינה מזכה בהחזר כספי.</li>
  <li>הקפאת מנוי אפשרית בהודעה מראש של 7 ימים.</li>
</ul>
<h3>הצהרת בריאות</h3>
<p>אני, <strong>{{firstName}} {{lastName}}</strong>, תאריך לידה {{birthDate}}, מתגוררת ב{{city}}, מצהירה כי:</p>
<ol>
  <li>מצב בריאותי תקין ומאפשר פעילות גופנית.</li>
  <li>אין לי מגבלה רפואית המונעת ממני להשתתף בפעילות גופנית.</li>
  <li>אני מתחייבת להודיע למדריכה על כל שינוי במצב בריאותי.</li>
  <li>אני לוקחת אחריות מלאה על השתתפותי בפעילות.</li>
</ol>
<p>FitBalance לא תישא באחריות לנזק שייגרם כתוצאה ממידע רפואי שלא נמסר.</p>',
  fields_json = '[{"id":"fullName","label":"שם מלא","type":"text","required":true},{"id":"idNumber","label":"תעודת זהות","type":"text","required":false}]'
WHERE form_key = 'registration_and_health';

UPDATE digital_forms SET
  content_html = '<p>אני ההורה/אפוטרופוס של <strong>{{firstName}} {{lastName}}</strong>, כיתה {{grade}}, מאשר/ת:</p>
<ol>
  <li>השתתפות ילדי/ילדתי בפעילות הגופנית של FitBalance.</li>
  <li>מצב בריאותו/ה תקין ומאפשר פעילות גופנית.</li>
  <li>אין מגבלה רפואית המונעת השתתפות בפעילות.</li>
  <li>אני מתחייב/ת להודיע למדריכה על כל שינוי במצב הבריאותי.</li>
  <li>אני לוקח/ת אחריות מלאה על השתתפות ילדי/ילדתי בפעילות.</li>
</ol>
<p>FitBalance לא תישא באחריות לנזק שייגרם כתוצאה ממידע שלא נמסר.</p>',
  fields_json = '[{"id":"fullName","label":"שם הקטין/ה","type":"text","required":true},{"id":"signerName","label":"שם ההורה/אפוטרופוס","type":"text","required":true},{"id":"idNumber","label":"ת.ז הורה","type":"text","required":false}]'
WHERE form_key = 'parent_approval';
