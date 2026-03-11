# Generated migration for adding UPPERAIRMAP level and JPEG format

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('analysis', '0008_add_pdf_support'),
    ]

    operations = [
        migrations.AlterField(
            model_name='exportedmap',
            name='map_type',
            field=models.CharField(
                max_length=50,
                choices=[
                    ('PNG', 'PNG'),
                    ('SVG', 'SVG'),
                    ('PDF', 'PDF'),
                    ('JPEG', 'JPEG')
                ]
            ),
        ),
        migrations.AlterField(
            model_name='exportedmap',
            name='level',
            field=models.CharField(
                max_length=20,
                choices=[
                    ('SURFACE', 'Surface'),
                    ('850HPA', '850 hPa'),
                    ('700HPA', '700 hPa'),
                    ('500HPA', '500 hPa'),
                    ('200HPA', '200 hPa'),
                    ('UPPERAIRMAP', 'Upper Air Map'),
                ]
            ),
        ),
    ]
