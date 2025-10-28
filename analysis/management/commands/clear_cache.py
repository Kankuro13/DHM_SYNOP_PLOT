"""
Management command to clear the Django cache.
Usage: python manage.py clear_cache
       python manage.py clear_cache --keys  # Show cache keys before clearing
"""
from django.core.management.base import BaseCommand
from django.core.cache import cache


class Command(BaseCommand):
    help = 'Clear the Django cache store (including upper air and surface data cache)'

    def add_arguments(self, parser):
        parser.add_argument(
            '--keys',
            action='store_true',
            help='Display cache keys before clearing',
        )

    def handle(self, *args, **options):
        show_keys = options.get('keys', False)
        
        if show_keys:
            try:
                # Try to get all keys (works with some cache backends like Redis/Memcached)
                if hasattr(cache, 'keys'):
                    keys = cache.keys('*')
                    if keys:
                        self.stdout.write(self.style.WARNING(f'Found {len(keys)} cached items:'))
                        for key in keys[:20]:  # Show first 20
                            self.stdout.write(f'  - {key}')
                        if len(keys) > 20:
                            self.stdout.write(f'  ... and {len(keys) - 20} more')
                    else:
                        self.stdout.write(self.style.WARNING('No cache keys found'))
                else:
                    self.stdout.write(self.style.WARNING('Cache backend does not support key listing'))
            except Exception as e:
                self.stdout.write(self.style.WARNING(f'Could not list cache keys: {e}'))
        
        # Clear the entire cache
        self.stdout.write('Clearing all cache...')
        cache.clear()
        
        self.stdout.write(self.style.SUCCESS('✓ Cache cleared successfully!'))
        self.stdout.write(self.style.SUCCESS('  - Upper air observation times cache cleared'))
        self.stdout.write(self.style.SUCCESS('  - Surface observation times cache cleared'))
        self.stdout.write(self.style.SUCCESS('  - Available levels cache cleared'))
        self.stdout.write(self.style.SUCCESS('  - All other cached data cleared'))
