"""
English translations
"""

TRANSLATIONS = {
    # Language selection
    'language_selection': {
        'prompt': '🌍 Выберите язык / Choose language / Tilni tanlang / 选择语言',
        'selected': '✅ You have selected English'
    },

    # Registration
    'registration': {
        'welcome': '👋 Welcome!\n\nTo get started, you need to register.\nPlease send your phone number:',
        'phone_button': '📱 Send phone number',
        'phone_invalid': '❌ Invalid phone number format.\n\nUse one of the formats:\n• +998XXXXXXXXX (Uzbek)\n• 90XXXXXXXX, 91XXXXXXXX, 93-99XXXXXXXX\n• +7XXXXXXXXXX (Russian)\n• 8XXXXXXXXXX\n\nOr press the button to send the number automatically.',
        'phone_exists': '❌ User with number {phone} is already registered.\n\nOne phone number can only be linked to one account.\nIf this is your number, please contact administration.',
        'sms_sent': '📱 SMS code sent to {phone}\n\nEnter the received code:',
        'sms_test_mode': '📱 <b>SMS TEST MODE</b>\n\nYour verification code: <code>{code}</code>\n\n⚠️ <i>This is test mode. In production, the code will be sent to {phone} via SMS</i>\n\nEnter this code to verify your phone number:',
        'sms_verified': '✅ Phone number verified!\n\nNow enter your first name:',
        'name_invalid': '❌ Please enter a valid name (minimum 2 characters, letters only):',
        'registration_complete_hotel': '✅ Registration complete!\n\nWelcome, {name}!\n\n📋 <b>Check-in history:</b>\n{bookings}\n\nYou can:\n• 😞 Leave a complaint\n• 💡 Leave a suggestion\n• ❓ Ask any question about the hotel\n• ⚙️ Change settings\n\nJust press a button or type text.',
        'booking_room_format': '• {date} - room {room}',
        'no_booking_history': '• No check-in history found'
    },

    # Main menu
    'menu': {
        'complaint_emoji': '😞',
        'suggestion_emoji': '💡',
        'question_emoji': '❓',
        'settings_emoji': '⚙️',
        'welcome_back_hotel': 'Welcome back, {name}!\n\nYou can:\n• 😞 Leave a complaint\n• 💡 Leave a suggestion\n• ❓ Ask any question about the hotel\n• ⚙️ Change settings\n\nJust press a button or type text.'
    },
    
    # Settings
    'settings': {
        'menu': '⚙️ Settings\n\nChoose an action:',
        'change_language': '🌍 Change language',
        'back': '⬅️ Back',
        'language_changed': '✅ Language successfully changed to English',
        'select_language': '🌍 Select language:'
    },
    
    # Errors
    'errors': {
        'general': 'An error occurred. Please try later.',
        'user_not_found': 'Error: user not found. Start registration /start',
        'phone_not_found': 'Error: phone number not found. Start registration again /start',
        'sms_error': 'Error verifying code. Please try again.',
        'account_creation': '❌ Error creating account. Please try later or contact administration.',
        'message_processing': 'Sorry, an error occurred while processing your message. Please try again.',
        'not_registered': 'Please start with /start command to register.',
        'follow_instructions': 'Please follow the registration instructions or use /start to begin again.',
        'outdated_account': (
            '⚠️ System update!\n\n'
            'Your account was created in the old version of the bot.\n'
            'Please use /quit to exit, '
            'then /start for a new registration.'
        )
    },
    
    # SMS
    'sms': {
        'new_code_prompt': 'To get a new code, enter: /new_code',
        'code_resent': '📱 New verification code: <code>{code}</code>\n\n⚠️ <i>This is test mode. In production, the code will be sent via SMS</i>',
        'code_sent': '📱 {message}'
    }
}