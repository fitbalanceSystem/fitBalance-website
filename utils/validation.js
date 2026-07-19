function validateIsraeliPhone(phone) {
  const cleaned = phone.replace(/[\s\-]/g, '');
  if (!/^(05\d{8}|972\d{9}|\+972\d{9})$/.test(cleaned))
    return 'מספר נייד לא תקין (לדוגמה: 050-0000000)';
  return null;
}
