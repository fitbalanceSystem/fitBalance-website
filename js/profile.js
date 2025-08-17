import { selectFromTable, uploadFileToStorage } from '../utilities/dbservice.js';
import { getCurrentUser, checkAuth, logout } from '../utilities/auth.js'

// checkAuth()


const profileImage = document.getElementById('profile-image')
const fullNameEl = document.getElementById('full-name')
const emailEl = document.getElementById('email')
const mobileEl = document.getElementById('mobile')
const idValueEl = document.getElementById('idValue')
const birthDateEl = document.getElementById('birthDate')


const cityEl = document.getElementById('city')
const streetEl = document.getElementById('street')
const houseNoEl = document.getElementById('houseNo')


const payerIdValueEl = document.getElementById('payerIdValue')
const payerFirstNameEl = document.getElementById('payerFirstName')
const payerLastNameEl = document.getElementById('payerLastName')
const payerEmailEl = document.getElementById('payerEmail')
const payerMobileEl = document.getElementById('payerMobile')


const isSignedHealthFormEl = document.getElementById('isSignedHealthForm')
const issignedRegisTrationPolicyEl = document.getElementById('issignedRegisTrationPolicy')
const inWhatsAppListEl = document.getElementById('inWhatsAppList')
const inEmailListEl = document.getElementById('inEmailList')

const memberSinceEl = document.getElementById('member-since')
const uploadInput = document.getElementById('upload-photo')
const saveBtn = document.getElementById('save-photo-btn')
const statusMessage = document.getElementById('status-message')

let newPhotoFile = null

async function loadUserProfile() {
  const user = getCurrentUser()
  if (!user) {
    window.location.href = 'login.html'
    return
  }

  try {
    const id = user.id;
    const data = await selectFromTable('customers', { id });

    if (!data || data.length === 0) throw new Error('משתמש לא נמצא')

    fullNameEl.textContent = data[0].firstName + ' ' + (data[0].lastName || '')
    emailEl.textContent = data[0].email
    mobileEl.textContent = data[0].mobile || '-'
idValueEl.textContent = data[0].idValue || '-'
birthDateEl.textContent = data[0].birthDate || '-'


cityEl.textContent = data[0].city || '-'
streetEl.textContent = data[0].street || '-'
houseNoEl.textContent = data[0].houseNo || '-'


payerIdValueEl.textContent = data[0].payerId || '-'
payerFirstNameEl.textContent = data[0].payerFirstName || '-'
payerLastNameEl.textContent = data[0].payerLastName || '-'
payerEmailEl.textContent = data[0].payerEmail || '-'
payerMobileEl.textContent = data[0].payerMobile || '-'

    isSignedHealthFormEl.innerText  = data[0].isSignedHealthForm ? "✅" : "❌";
    issignedRegisTrationPolicyEl.innerText  = data[0].issignedRegisTrationPolicy ? "✅" : "❌";
    inWhatsAppListEl.innerText  = data[0].inWhatsAppList ? "✅" : "❌";
    inEmailListEl.innerText  = data[0].inEmailList ? "✅" : "❌";

    memberSinceEl.textContent = data[0].created_at
      ? `מתאמנת מאז ${new Date(data[0].created_at).getFullYear()}`
      : '-'

    if (data[0].imageProfile) {
      profileImage.src = data[0].imageProfile
    } else {
      profileImage.src = '../images/logo.png'
    }

    // שמירת תמונת פרופיל ב-localStorage
    user.imageProfile = data[0].imageProfile
    localStorage.setItem('user', JSON.stringify(user))
  } catch (error) {
    statusMessage.textContent = 'שגיאה בטעינת פרטי המשתמש'
    console.error(error)
  }
}

uploadInput.addEventListener('change', () => {
  statusMessage.textContent = ''
  if (uploadInput.files && uploadInput.files.length > 0) {
    newPhotoFile = uploadInput.files[0]

    const reader = new FileReader()
    reader.onload = (e) => {
      profileImage.src = e.target.result
    }
    reader.readAsDataURL(newPhotoFile)

    saveBtn.disabled = false
  } else {
    newPhotoFile = null
    saveBtn.disabled = true
  }
})

saveBtn.addEventListener('click', async () => {
  if (!newPhotoFile) return

  saveBtn.disabled = true
  statusMessage.textContent = 'מעלה תמונה...'
console.log("A");
  const user = getCurrentUser()
  if (!user) {
    window.location.href = 'index.html'
    return
  }

  console.log("B");
  try {
    const bucket = 'avatars'
    const fileExt = newPhotoFile.name.split('.').pop()
    const filePath = `profile/${user.id}/profile_${user.id}.${fileExt}`

    console.log("B.2");
    console.log(bucket);
    console.log(filePath);
    console.log(newPhotoFile);
    // העלאת הקובץ ל-Storage
    await uploadFileToStorage(bucket, filePath, newPhotoFile)

    console.log("B.3");
    // קבלת URL ציבורי
    const imageUrl = getPublicUrl(bucket, filePath)
console.log(imageUrl);
    console.log("C");
    // עדכון URL תמונת הפרופיל בטבלה
    await updateTable('customers', { imageProfile: imageUrl }, { id: user.id })
    
  console.log("D");

    // עדכון תמונת הפרופיל בדף וב-localStorage
    profileImage.src = imageUrl
    user.imageProfile = imageUrl
    localStorage.setItem('user', JSON.stringify(user))

    statusMessage.textContent = 'תמונת הפרופיל נשמרה בהצלחה'
  } catch (error) {
    statusMessage.textContent = 'שגיאה בשמירת תמונת הפרופיל'
    console.error('שגיאה בשמירת תמונת הפרופיל:', error.message)
  } finally {
    saveBtn.disabled = false
  }
})


// async function uploadFileToStorage(bucket, path, file) {
//   const { data, error } = await supabase.storage
//     .from(bucket)
//     .upload(path, file, { cacheControl: '3600', upsert: true })
//   if (error) throw error
//   return data
// }

// function getPublicUrl(bucket, path) {
//   const { data, error } = supabase.storage.from(bucket).getPublicUrl(path)
//   if (error) throw error
//   return data.publicUrl
// }

// async function updateTable(table, newData, filters) {
//   let query = supabase.from(table).update(newData)
//   for (const [key, value] of Object.entries(filters)) {
//     query = query.eq(key, value)
//   }
//   const { error } = await query
//   if (error) throw error
//   return true
// }

loadUserProfile()
