"""
中文翻译用于后端报告和服务
"""

REPORTS_TRANSLATIONS = {
    # Common report elements
    'generated': '生成时间',
    'period': '期间',
    'filters': '筛选条件',
    'utc': 'UTC',

    # Dashboard report
    'hotel_crm_analytics_report': '酒店CRM - 分析报告',
    'dashboard_overview': '仪表板概览',
    'key_performance_indicators': '关键绩效指标',

    # Revenue metrics
    'revenue_metrics': '收入指标',
    'total_revenue': '总收入',
    'average_daily_rate': '平均每日房价 (ADR)',
    'revenue_per_available_room': '可用客房收入 (RevPAR)',
    'total_bookings': '总预订数',
    'total_nights': '总入住晚数',
    'discounts_given': '给予折扣',
    'refunds_processed': '处理退款',

    # Occupancy metrics
    'occupancy_metrics': '入住率指标',
    'occupancy_rate': '入住率',
    'average_length_of_stay': '平均入住时间',
    'available_room_nights': '可用客房晚数',
    'occupied_room_nights': '占用客房晚数',
    'cancellations': '取消',
    'cancellation_rate': '取消率',

    # Payment methods
    'payment_method_distribution': '支付方式分布',
    'payment_method': '支付方式',
    'percentage': '百分比',
    'amount': '金额',
    'cash': '现金',
    'bank_transfer': '银行转账',
    'terminal_card': '终端/卡片',

    # Customer metrics
    'customer_metrics': '客户指标',
    'total_customers': '总客户数',
    'new_customers': '新客户',
    'returning_customers': '回头客',
    'average_age': '平均年龄',

    # Age distribution
    'customer_age_distribution': '客户年龄分布',
    'age_group': '年龄组',
    'count': '数量',

    # District distribution
    'customer_district_distribution': '客户区域分布',
    'district': '区域',

    # Comprehensive report
    'comprehensive_analytics_report': '综合分析报告',
    'revenue_analysis': '收入分析',
    'occupancy_analysis': '入住率分析',
    'customer_analytics': '客户分析',
    'operational_patterns': '运营模式',
    'seasonal_trends': '季节性趋势',
    'top_customers_by_revenue': '按收入排序的顶级客户',
    'revenue_by_district': '按区域划分的收入',
    'room_performance_analysis': '客房绩效分析',

    # Revenue details
    'revenue_overview': '收入概览',
    'period_growth': '期间增长',
    'average_daily_revenue': '平均每日收入',
    'peak_day_revenue': '峰值日收入',
    'daily_revenue_trend': '每日收入趋势',
    'date': '日期',
    'revenue': '收入',
    'growth_percentage': '增长 %',

    # Occupancy details
    'occupancy_overview': '入住率概览',
    'average_occupancy_rate': '平均入住率',
    'peak_occupancy_rate': '峰值入住率',
    'total_room_nights': '总客房晚数',
    'daily_occupancy_trend': '每日入住率趋势',
    'occupancy_percentage': '入住率 %',
    'rooms_occupied': '占用客房数',
    'rooms_available': '可用客房数',

    # Customer details
    'customer_overview': '客户概览',
    'average_customer_value': '平均客户价值',

    # Hourly patterns
    'check_in_patterns': '入住模式',
    'check_out_patterns': '退房模式',
    'check_ins': '入住',
    'check_outs': '退房',
    'peak_check_in_hour': '峰值入住时间',
    'peak_check_out_hour': '峰值退房时间',
    'total_events': '总事件数',

    # Seasonal trends
    'monthly_trends': '月度趋势',
    'month': '月份',
    'bookings': '预订',
    'avg_rate': '平均房价',
    'seasonal_patterns': '季节性模式',
    'season': '季节',
    'performance': '绩效',
    'trend': '趋势',

    # Top customers
    'rank': '排名',
    'name': '姓名',
    'bookings_count': '预订数',
    'avg_booking': '平均预订',
    'period_revenue': '期间收入',

    # District revenue
    'summary': '摘要',
    'districts': '区域',
    'share': '% 份额',

    # Room performance
    'room_performance': '客房绩效',
    'total_rooms_analyzed': '分析的总客房数',
    'top_performing_rooms': '最佳客房 (按ADR)',
    'underperforming_rooms': '表现不佳的客房 (按ADR)',
    'room_number': '客房号',
    'category': '类别',
    'adr': 'ADR',
    'nights': '晚数',
    'occupancy': '入住率',

    # Chart titles and labels
    'revenue_trend_over_time': '随时间变化的收入趋势',
    'payment_methods_distribution': '支付方式分布',
    'hourly_check_ins_distribution': '按小时划分的入住分布',
    'hourly_check_outs_distribution': '按小时划分的退房分布',
    'room_category_performance': '按类别划分的收入',
    'occupancy_rate_by_category': '按类别划分的入住率',
    'customer_age_distribution_chart': '客户年龄分布',
    'top_districts_by_customers': '按客户数量排序的顶级区域',
    'seasonal_revenue_and_booking_trends': '季节性收入和预订趋势',
    'customer_segmentation': '客户细分',
    'customer_lifetime_value_by_tenure': '按客户保有期划分的终身价值',

    # Chart axes
    'hour_of_day': '一天中的小时',
    'number_of_events': '事件数量',
    'number_of_customers': '客户数量',
    'customer_tenure': '客户保有期',
    'average_ltv': '平均终身价值 ($)',

    # Error messages
    'no_revenue_data_available': '无收入数据可用',
    'no_payment_data_available': '无支付数据可用',
    'no_check_ins_data_available': '无入住数据可用',
    'no_check_outs_data_available': '无退房数据可用',
    'no_room_performance_data_available': '无客房绩效数据可用',
    'no_age_data_available': '无年龄数据可用',
    'no_district_data_available': '无区域数据可用',
    'no_seasonal_data_available': '无季节性数据可用',
    'no_customer_segmentation_data_available': '无客户细分数据可用',
    'no_ltv_data_available': '无终身价值数据可用',

    # Quick stats
    'quick_statistics': '快速统计',
    'today': '今天',
    'this_week': '本周',
    'this_month': '本月',

    # Executive summary
    'executive_summary': '执行摘要',
    'kpi': 'KPI',

    # Excel sheet names
    'summary_sheet': '摘要',
    'revenue_sheet': '收入',
    'occupancy_sheet': '入住率',
    'customers_sheet': '客户',
    'payment_methods_sheet': '支付方式',
    'room_performance_sheet': '客房绩效',
    'executive_summary_sheet': '执行摘要',
    'revenue_analysis_sheet': '收入分析',
    'occupancy_analysis_sheet': '入住率分析',
    'customer_analytics_sheet': '客户分析',
    'hourly_patterns_sheet': '小时模式',
    'seasonal_trends_sheet': '季节性趋势',
    'top_customers_sheet': '顶级客户',

    # Excel headers
    'metric': '指标',
    'value': '值',
    'growth': '增长',
    'customers': '客户',
    'avg_visits': '平均访问',

    # Payment analysis
    'payment_method_analysis': '支付方式分析',

    # Customer LTV
    'customer_lifetime_value_analysis': '客户终身价值分析',
    'lifetime_value_overview': '终身价值概览',
    'median_ltv': '中位终身价值',
    'top_10_average': '前10%平均',
    'total_customer_value': '客户总价值',
    'ltv_distribution': '终身价值分布',
    'ltv_range': '终身价值范围',
    'total_value': '总价值',
    'top_customers_by_ltv': '按终身价值排序的顶级客户',
    'customer': '客户',
    'ltv': '终身价值',
    'last_visit': '最后访问',
}
