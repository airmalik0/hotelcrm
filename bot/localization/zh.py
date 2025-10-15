TRANSLATIONS = {
    # 语言选择
    'language_selection': {
        'prompt': '🌍 Выберите язык / Choose language / Tilni tanlang / 选择语言',
        'selected': '✅ 您已选择中文'
    },

    # 注册
    'registration': {
        'welcome': '👋 欢迎！\n\n开始前需要完成注册。\n请发送您的手机号码：',
        'phone_button': '📱 发送手机号码',
        'phone_invalid': '❌ 手机号码格式错误。\n\n请使用以下格式：\n• +998XXXXXXXXX（乌兹别克斯坦号码）\n• 90XXXXXXXX、91XXXXXXXX、93-99XXXXXXXX\n• +7XXXXXXXXXX（俄罗斯号码）\n• 8XXXXXXXXXX\n\n或点击按钮自动发送。',
        'phone_exists': '❌ 该号码 {phone} 已被注册。\n\n一个手机号只能绑定一个账户。\n如果这是您的号码，请联系管理员。',
        'sms_sent': '📱 验证码已发送至 {phone}\n\n请输入收到的验证码：',
        'sms_test_mode': '📱 <b>短信测试模式</b>\n\n您的验证码：<code>{code}</code>\n\n⚠️ <i>当前为测试模式。正式环境中验证码将通过短信发送至 {phone}</i>\n\n请输入验证码验证手机号：',
        'sms_verified': '✅ 手机号已验证！\n\n请输入您的名字：',
        'name_invalid': '❌ 请输入有效的名字（至少2个字符，仅限字母）：',
        'registration_complete_hotel': '✅ 注册完成！\n\n欢迎您，{name}！\n\n📋 <b>入住记录：</b>\n{bookings}\n\n您可以：\n• 😞 提交投诉\n• 💡 提交建议\n• ❓ 咨询酒店相关问题\n• ⚙️ 修改设置\n\n点击按钮或直接输入文字即可。',
        'booking_room_format': '• {date} - {room}号房间',
        'no_booking_history': '• 暂无入住记录'
    },

    # 主菜单
    'menu': {
        'complaint_emoji': '😞',
        'suggestion_emoji': '💡',
        'question_emoji': '❓',
        'settings_emoji': '⚙️',
        'welcome_back_hotel': '欢迎回来，{name}！\n\n您可以：\n• 😞 提交投诉\n• 💡 提交建议\n• ❓ 咨询酒店相关问题\n• ⚙️ 修改设置\n\n点击按钮或直接输入文字即可。'
    },
    
    # 设置
    'settings': {
        'menu': '⚙️ 设置\n\n请选择操作：',
        'change_language': '🌍 更改语言',
        'back': '⬅️ 返回',
        'language_changed': '✅ 语言已更改为中文',
        'select_language': '🌍 选择语言：'
    },
    
    # 错误
    'errors': {
        'general': '发生错误，请稍后重试。',
        'user_not_found': '错误：未找到用户。请使用 /start 开始注册',
        'phone_not_found': '错误：未找到手机号。请使用 /start 重新注册',
        'sms_error': '验证码验证失败，请重试。',
        'account_creation': '❌ 创建账户失败，请稍后重试或联系管理员。',
        'message_processing': '抱歉，处理消息时出错，请重试。',
        'not_registered': '请使用 /start 命令进行注册。',
        'follow_instructions': '请按照注册提示操作，或使用 /start 重新开始。',
        'outdated_account': (
            '⚠️ 系统更新！\n\n'
            '您的账户是在旧版本的机器人中创建的。\n'
            '请使用 /quit 退出，'
            '然后使用 /start 重新注册。'
        )
    },
    
    # 短信
    'sms': {
        'new_code_prompt': '获取新验证码请输入：/new_code',
        'code_resent': '📱 新验证码：<code>{code}</code>\n\n⚠️ <i>当前为测试模式。正式环境中验证码将通过短信发送</i>',
        'code_sent': '📱 {message}'
    }
}