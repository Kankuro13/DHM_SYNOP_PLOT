#!/bin/bash
# Quick setup script for upper air map functionality

echo "=========================================="
echo "Upper Air Map - Quick Setup & Fix Script"
echo "=========================================="
echo ""

# Check if we're in the correct directory
if [ ! -f "manage.py" ]; then
    echo "Error: Please run this script from the DHM_SYNOP_PLOT root directory"
    exit 1
fi

echo "Step 1: Checking if upper air stations are imported..."
station_count=$(python manage.py shell -c "from analysis.models import UpperAirWeatherStation; print(UpperAirWeatherStation.objects.count())" 2>/dev/null)

if [ "$station_count" = "0" ] || [ -z "$station_count" ]; then
    echo "  → No stations found. Importing from CSV..."
    python manage.py import_upperstations analysis/data/upperAirSation.csv
    echo "  ✓ Stations imported"
else
    echo "  ✓ Found $station_count upper air stations"
fi

echo ""
echo "Step 2: Checking upper air report data..."
python manage.py check_upperair_data

echo ""
echo "Step 3: Fetching fresh upper air data from Ogimet..."
echo "  (This may take a few minutes...)"
python manage.py fetch_upperair

echo ""
echo "Step 4: Verifying data after fetch..."
python manage.py check_upperair_data

echo ""
echo "=========================================="
echo "Setup Complete!"
echo "=========================================="
echo ""
echo "Next steps:"
echo "1. Start Celery worker:  celery -A weather_map worker --loglevel=info"
echo "2. Start Celery beat:    celery -A weather_map beat --loglevel=info"
echo "3. Start Django server:  python manage.py runserver"
echo "4. Open: http://localhost:8000/upperAirmapDashboard.html"
echo ""
echo "The pressure levels and observation times should now load correctly!"
echo ""
