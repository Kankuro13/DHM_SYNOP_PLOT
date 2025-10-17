"""
Management command to check upper air data in the database.
Usage: python manage.py check_upperair_data
"""
from django.core.management.base import BaseCommand
from analysis.models import UpperAirSynopReport, UpperAirWeatherStation
from django.db.models import Count
import logging

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = 'Check upper air data in the database'

    def handle(self, *args, **options):
        self.stdout.write(self.style.SUCCESS('Checking upper air data...'))
        
        # Check stations
        station_count = UpperAirWeatherStation.objects.count()
        self.stdout.write(f'Total upper air stations: {station_count}')
        
        if station_count > 0:
            stations = UpperAirWeatherStation.objects.all()[:5]
            self.stdout.write('Sample stations:')
            for station in stations:
                self.stdout.write(f'  - {station.station_id}: {station.name}')
        
        # Check reports
        report_count = UpperAirSynopReport.objects.count()
        self.stdout.write(f'\nTotal upper air reports: {report_count}')
        
        if report_count > 0:
            # Group by level
            levels = UpperAirSynopReport.objects.values('level').annotate(count=Count('id')).order_by('level')
            self.stdout.write('\nReports by level:')
            for level_data in levels:
                self.stdout.write(f'  - {level_data["level"]}: {level_data["count"]} reports')
            
            # Group by observation time
            times = UpperAirSynopReport.objects.values('observation_time').annotate(count=Count('id')).order_by('-observation_time')[:5]
            self.stdout.write('\nMost recent observation times:')
            for time_data in times:
                self.stdout.write(f'  - {time_data["observation_time"]}: {time_data["count"]} reports')
            
            # Show sample reports
            self.stdout.write('\nSample reports:')
            reports = UpperAirSynopReport.objects.select_related('station').all()[:3]
            for report in reports:
                self.stdout.write(
                    f'  - Station: {report.station.station_id}, '
                    f'Level: {report.level}, '
                    f'Time: {report.observation_time}, '
                    f'Temp: {report.temperature}°C, '
                    f'Height: {report.height}m'
                )
        else:
            self.stdout.write(self.style.WARNING(
                '\nNo upper air reports found. Run "python manage.py fetch_upperair" to fetch data.'
            ))
