from django.contrib import admin
from .models import SMSLog


@admin.register(SMSLog)
class SMSLogAdmin(admin.ModelAdmin):
    list_display = ('created_at', 'recipient_name', 'phone', 'kind', 'status')
    list_filter = ('kind', 'status')
    search_fields = ('recipient_name', 'phone', 'body')
