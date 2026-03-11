"""
Management command to manually fetch upper air data from Ogimet.
Usage: python manage.py fetch_upperair
"""
from django.core.management.base import BaseCommand
from analysis.upperair_task import fetch_upper_air_data
import logging

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = 'Manually fetch upper air data from Ogimet and populate the database'

    def handle(self, *args, **options):
        self.stdout.write(self.style.SUCCESS('Starting upper air data fetch...'))
        
        try:
            # Call the Celery task directly (not async)
            result = fetch_upper_air_data()
            
            self.stdout.write(self.style.SUCCESS(
                f'Successfully fetched upper air data!'
            ))
            
        except Exception as e:
            self.stdout.write(self.style.ERROR(
                f'Error fetching upper air data: {str(e)}'
            ))
            logger.error(f"Error in fetch_upperair command: {e}", exc_info=True)
