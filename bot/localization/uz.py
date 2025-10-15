"""
O'zbek tilidagi tarjimalar
"""

TRANSLATIONS = {
    # Til tanlash
    'language_selection': {
        'prompt': '🌍 Выберите язык / Choose language / Tilni tanlang / 选择语言',
        'selected': '✅ Siz o\'zbek tilini tanladingiz'
    },

    # Ro'yxatdan o'tish
    'registration': {
        'welcome': '👋 Xush kelibsiz!\n\nIshni boshlash uchun ro\'yxatdan o\'tish kerak.\nIltimos, telefon raqamingizni yuboring:',
        'phone_button': '📱 Telefon raqamni yuborish',
        'phone_invalid': '❌ Telefon raqami formati noto\'g\'ri.\n\nQuyidagi formatlardan birini ishlating:\n• +998XXXXXXXXX (o\'zbek)\n• 90XXXXXXXX, 91XXXXXXXX, 93-99XXXXXXXX\n• +7XXXXXXXXXX (rossiya)\n• 8XXXXXXXXXX\n\nYoki raqamni avtomatik yuborish uchun tugmani bosing.',
        'phone_exists': '❌ {phone} raqami bilan foydalanuvchi allaqachon ro\'yxatdan o\'tgan.\n\nBitta telefon raqami faqat bitta akkauntga bog\'lanishi mumkin.\nAgar bu sizning raqamingiz bo\'lsa, ma\'muriyat bilan bog\'laning.',
        'sms_sent': '📱 SMS-kod {phone} raqamiga yuborildi\n\nOlingan kodni kiriting:',
        'sms_test_mode': '📱 <b>SMS TEST REJIMI</b>\n\nTasdiqlash kodingiz: <code>{code}</code>\n\n⚠️ <i>Bu test rejimi. Ishlab chiqarishda kod {phone} raqamiga SMS orqali yuboriladi</i>\n\nTelefon raqamini tasdiqlash uchun ushbu kodni kiriting:',
        'sms_verified': '✅ Telefon raqami tasdiqlandi!\n\nEndi ismingizni kiriting:',
        'name_invalid': '❌ Iltimos, to\'g\'ri ism kiriting (kamida 2 ta belgi, faqat harflar):',
        'registration_complete_hotel': '✅ Ro\'yxatdan o\'tish tugallandi!\n\nXush kelibsiz, {name}!\n\n📋 <b>Joylashish tarixi:</b>\n{bookings}\n\nSiz quyidagilarni qilishingiz mumkin:\n• 😞 Shikoyat qoldirish\n• 💡 Taklif qoldirish\n• ❓ Mehmonxona haqida savol berish\n• ⚙️ Sozlamalarni o\'zgartirish\n\nTugmani bosing yoki matn kiriting.',
        'booking_room_format': '• {date} - xona {room}',
        'no_booking_history': '• Joylashish tarixi topilmadi'
    },

    # Asosiy menyu
    'menu': {
        'complaint_emoji': '😞',
        'suggestion_emoji': '💡',
        'question_emoji': '❓',
        'settings_emoji': '⚙️',
        'welcome_back_hotel': 'Xush kelibsiz, {name}!\n\nSiz quyidagilarni qilishingiz mumkin:\n• 😞 Shikoyat qoldirish\n• 💡 Taklif qoldirish\n• ❓ Mehmonxona haqida savol berish\n• ⚙️ Sozlamalarni o\'zgartirish\n\nTugmani bosing yoki matn kiriting.'
    },
    
    # Sozlamalar
    'settings': {
        'menu': '⚙️ Sozlamalar\n\nHarakatni tanlang:',
        'change_language': '🌍 Tilni o\'zgartirish',
        'back': '⬅️ Orqaga',
        'language_changed': '✅ Til muvaffaqiyatli o\'zbek tiliga o\'zgartirildi',
        'select_language': '🌍 Tilni tanlang:'
    },
    
    # Xatolar
    'errors': {
        'general': 'Xatolik yuz berdi. Keyinroq urinib ko\'ring.',
        'user_not_found': 'Xato: foydalanuvchi topilmadi. Ro\'yxatdan o\'tishni boshlang /start',
        'phone_not_found': 'Xato: telefon raqami topilmadi. Ro\'yxatdan o\'tishni qaytadan boshlang /start',
        'sms_error': 'Kodni tekshirishda xatolik. Qaytadan urinib ko\'ring.',
        'account_creation': '❌ Akkaunt yaratishda xatolik. Keyinroq urinib ko\'ring yoki ma\'muriyat bilan bog\'laning.',
        'message_processing': 'Kechirasiz, xabaringizni qayta ishlashda xatolik yuz berdi. Qaytadan urinib ko\'ring.',
        'not_registered': 'Iltimos, ro\'yxatdan o\'tish uchun /start buyrug\'idan boshlang.',
        'follow_instructions': 'Iltimos, ro\'yxatdan o\'tish ko\'rsatmalariga amal qiling yoki qaytadan boshlash uchun /start dan foydalaning.',
        'outdated_account': (
            '⚠️ Tizim yangilanishi!\n\n'
            'Sizning akkountingiz botning eski versiyasida yaratilgan.\n'
            'Iltimos, chiqish uchun /quit, '
            'keyin yangi ro\'yxatdan o\'tish uchun /start buyrug\'idan foydalaning.'
        )
    },
    
    # SMS
    'sms': {
        'new_code_prompt': 'Yangi kod olish uchun kiriting: /new_code',
        'code_resent': '📱 Yangi tasdiqlash kodi: <code>{code}</code>\n\n⚠️ <i>Bu test rejimi. Ishlab chiqarishda kod SMS orqali yuboriladi</i>',
        'code_sent': '📱 {message}'
    }
}