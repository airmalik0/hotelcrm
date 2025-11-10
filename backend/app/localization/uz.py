"""
O'zbek tarjimasi uchun backend reportlari va xizmatlari
"""

REPORTS_TRANSLATIONS = {
    # Common report elements
    'generated': 'Yaratilgan',
    'period': 'Davr',
    'filters': 'Filtrlar',
    'utc': 'UTC',

    # Dashboard report
    'hotel_crm_analytics_report': 'Hotel CRM - Analytics Hisoboti',
    'dashboard_overview': 'Dashboard Umumiy Ko\'rinishi',
    'key_performance_indicators': 'Asosiy Ko\'rsatkichlar',

    # Revenue metrics
    'revenue_metrics': 'Daromad Ko\'rsatkichlari',
    'total_revenue': 'Umumiy Daromad',
    'average_daily_rate': 'O\'rtacha Kunlik Stavka (ADR)',
    'revenue_per_available_room': 'Mavjud Xona uchun Daromad (RevPAR)',
    'total_bookings': 'Jami Bron qilishlar',
    'total_nights': 'Jami Kechalar',
    'discounts_given': 'Berilgan Chegirmalar',
    'refunds_processed': 'Qaytarilgan Pullar',

    # Occupancy metrics
    'occupancy_metrics': 'Bandlik Ko\'rsatkichlari',
    'occupancy_rate': 'Bandlik Darajasi',
    'average_length_of_stay': 'O\'rtacha Qolish Davomiyligi',
    'available_room_nights': 'Mavjud Xona-Kechalar',
    'occupied_room_nights': 'Band Xona-Kechalar',
    'cancellations': 'Bekor qilishlar',
    'cancellation_rate': 'Bekor qilish Darajasi',

    # Payment methods
    'payment_method_distribution': 'To\'lov Usullari Taqsimoti',
    'payment_method': 'To\'lov Usuli',
    'percentage': 'Foiz',
    'amount': 'Miqdor',
    'cash': 'Naqd',
    'bank_transfer': 'Bank O\'tkazmasi',
    'terminal_card': 'Terminal/Karta',

    # Customer metrics
    'customer_metrics': 'Mijozlar Ko\'rsatkichlari',
    'total_customers': 'Jami Mijozlar',
    'new_customers': 'Yangi Mijozlar',
    'returning_customers': 'Qaytgan Mijozlar',
    'average_age': 'O\'rtacha Yosh',

    # Age distribution
    'customer_age_distribution': 'Mijozlarning Yosh Bo\'yicha Taqsimoti',
    'age_group': 'Yosh Guruh',
    'count': 'Soni',

    # District distribution
    'customer_district_distribution': 'Mijozlarning Tuman Bo\'yicha Taqsimoti',
    'district': 'Tuman',

    # Comprehensive report
    'comprehensive_analytics_report': 'Keng Qamrovli Analytics Hisoboti',
    'revenue_analysis': 'Daromad Tahlili',
    'occupancy_analysis': 'Bandlik Tahlili',
    'customer_analytics': 'Mijozlar Tahlili',
    'operational_patterns': 'Operatsion Naqshlar',
    'seasonal_trends': 'Mavsumiy Tendentsiyalar',
    'top_customers_by_revenue': 'Daromad Bo\'yicha Eng Yaxshi Mijozlar',
    'revenue_by_district': 'Tumanlar Bo\'yicha Daromad',
    'room_performance_analysis': 'Xona Ishlash Tahlili',

    # Revenue details
    'revenue_overview': 'Daromad Umumiy Ko\'rinishi',
    'period_growth': 'Davr O\'sishi',
    'average_daily_revenue': 'O\'rtacha Kunlik Daromad',
    'peak_day_revenue': 'Eng Yuqori Kunlik Daromad',
    'daily_revenue_trend': 'Kunlik Daromad Tendentsiyasi',
    'date': 'Sana',
    'revenue': 'Daromad',
    'growth_percentage': 'O\'sish %',

    # Occupancy details
    'occupancy_overview': 'Bandlik Umumiy Ko\'rinishi',
    'average_occupancy_rate': 'O\'rtacha Bandlik Darajasi',
    'peak_occupancy_rate': 'Eng Yuqori Bandlik Darajasi',
    'total_room_nights': 'Jami Xona-Kechalar',
    'daily_occupancy_trend': 'Kunlik Bandlik Tendentsiyasi',
    'occupancy_percentage': 'Bandlik %',
    'rooms_occupied': 'Band Xonalar',
    'rooms_available': 'Mavjud Xonalar',

    # Customer details
    'customer_overview': 'Mijozlar Umumiy Ko\'rinishi',
    'average_customer_value': 'Mijozning O\'rtacha Qiymati',

    # Hourly patterns
    'check_in_patterns': 'Kirish Naqshlari',
    'check_out_patterns': 'Chiqish Naqshlari',
    'check_ins': 'Kirishlar',
    'check_outs': 'Chiqishlar',
    'peak_check_in_hour': 'Eng Yuqori Kirish Soati',
    'peak_check_out_hour': 'Eng Yuqori Chiqish Soati',
    'total_events': 'jami hodisalar',

    # Seasonal trends
    'monthly_trends': 'Oylik Tendentsiyalar',
    'month': 'Oy',
    'bookings': 'Bron qilishlar',
    'avg_rate': 'O\'rtacha Stavka',
    'seasonal_patterns': 'Mavsumiy Naqshlar',
    'season': 'Mavsum',
    'performance': 'Ishlash',
    'trend': 'Tendentsiya',

    # Top customers
    'rank': 'Reyting',
    'name': 'Ism',
    'bookings_count': 'Bron qilishlar',
    'avg_booking': 'O\'rtacha Bron',
    'period_revenue': 'Davr Daromadi',

    # District revenue
    'summary': 'Xulosa',
    'districts': 'Tumanlar',
    'share': '% Ulush',

    # Room performance
    'room_performance': 'Xona Ishlashi',
    'total_rooms_analyzed': 'Tahlil Qilingan Xonalar Soni',
    'top_performing_rooms': 'Eng Yaxshi Xonalar (ADR bo\'yicha)',
    'underperforming_rooms': 'Eng Yomon Xonalar (ADR bo\'yicha)',
    'room_number': 'Xona №',
    'category': 'Kategoriya',
    'adr': 'ADR',
    'nights': 'Kechalar',
    'occupancy': 'Bandlik',

    # Chart titles and labels
    'revenue_trend_over_time': 'Vaqt Bo\'yicha Daromad Tendentsiyasi',
    'payment_methods_distribution': 'To\'lov Usullarining Taqsimoti',
    'hourly_check_ins_distribution': 'Soatlik Kirishlar Taqsimoti',
    'hourly_check_outs_distribution': 'Soatlik Chiqishlar Taqsimoti',
    'room_category_performance': 'Kategoriyalar Bo\'yicha Daromad',
    'occupancy_rate_by_category': 'Kategoriyalar Bo\'yicha Bandlik Darajasi',
    'customer_age_distribution_chart': 'Mijozlarning Yosh Bo\'yicha Taqsimoti',
    'top_districts_by_customers': 'Mijozlar Soni Bo\'yicha Eng Yaxshi Tumanlar',
    'seasonal_revenue_and_booking_trends': 'Mavsumiy Daromad va Bron Tendentsiyalari',
    'customer_segmentation': 'Mijozlar Segmentatsiyasi',
    'customer_lifetime_value_by_tenure': 'Mijozlarning Umrbod Qiymati Tajribasi Bo\'yicha',

    # Chart axes
    'hour_of_day': 'Kun Vaqti',
    'number_of_events': 'Hodisalar Soni',
    'number_of_customers': 'Mijozlar Soni',
    'customer_tenure': 'Mijoz Tajribasi',
    'average_ltv': 'O\'rtacha Umrbod Qiymat ($)',

    # Error messages
    'no_revenue_data_available': 'Daromad ma\'lumotlari mavjud emas',
    'no_payment_data_available': 'To\'lov ma\'lumotlari mavjud emas',
    'no_check_ins_data_available': 'Kirish ma\'lumotlari mavjud emas',
    'no_check_outs_data_available': 'Chiqish ma\'lumotlari mavjud emas',
    'no_room_performance_data_available': 'Xona ishlashi ma\'lumotlari mavjud emas',
    'no_age_data_available': 'Yosh ma\'lumotlari mavjud emas',
    'no_district_data_available': 'Tuman ma\'lumotlari mavjud emas',
    'no_seasonal_data_available': 'Mavsumiy ma\'lumotlar mavjud emas',
    'no_customer_segmentation_data_available': 'Mijozlar segmentatsiyasi ma\'lumotlari mavjud emas',
    'no_ltv_data_available': 'Umrbod qiymat ma\'lumotlari mavjud emas',

    # Quick stats
    'quick_statistics': 'Tez Statistikalar',
    'today': 'Bugun',
    'this_week': 'Bu Hafta',
    'this_month': 'Bu Oy',

    # Executive summary
    'executive_summary': 'Ijroiy Xulosa',
    'kpi': 'KPI',

    # Excel sheet names
    'summary_sheet': 'Xulosa',
    'revenue_sheet': 'Daromad',
    'occupancy_sheet': 'Bandlik',
    'customers_sheet': 'Mijozlar',
    'payment_methods_sheet': 'To\'lov Usullari',
    'room_performance_sheet': 'Xona Ishlashi',
    'executive_summary_sheet': 'Ijroiy Xulosa',
    'revenue_analysis_sheet': 'Daromad Tahlili',
    'occupancy_analysis_sheet': 'Bandlik Tahlili',
    'customer_analytics_sheet': 'Mijozlar Tahlili',
    'hourly_patterns_sheet': 'Soatlik Naqshlar',
    'seasonal_trends_sheet': 'Mavsumiy Tendentsiyalar',
    'top_customers_sheet': 'Eng Yaxshi Mijozlar',

    # Excel headers
    'metric': 'Ko\'rsatkich',
    'value': 'Qiymat',
    'growth': 'O\'sish',
    'customers': 'Mijozlar',
    'avg_visits': 'O\'rtacha Tashriflar',

    # Payment analysis
    'payment_method_analysis': 'To\'lov Usuli Tahlili',

    # Customer LTV
    'customer_lifetime_value_analysis': 'Mijozlarning Umrbod Qiymatini Tahlil Qilish',
    'lifetime_value_overview': 'Umrbod Qiymat Umumiy Ko\'rinishi',
    'median_ltv': 'Median Umrbod Qiymat',
    'top_10_average': 'Top 10% O\'rtacha',
    'total_customer_value': 'Mijozlarning Umumiy Qiymati',
    'ltv_distribution': 'Umrbod Qiymat Taqsimoti',
    'ltv_range': 'Umrbod Qiymat Oralig\'i',
    'total_value': 'Umumiy Qiymat',
    'top_customers_by_ltv': 'Umrbod Qiymat Bo\'yicha Eng Yaxshi Mijozlar',
    'customer': 'Mijoz',
    'ltv': 'Umrbod Qiymat',
    'last_visit': 'Oxirgi Tashrif',
}
