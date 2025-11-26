# Generated manually to add address detail fields
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("reports", "0001_initial"),
    ]

    operations = [
        migrations.AddField(
            model_name="report",
            name="address_extra",
            field=models.CharField(blank=True, max_length=120),
        ),
        migrations.AddField(
            model_name="report",
            name="apartment",
            field=models.CharField(blank=True, max_length=50),
        ),
        migrations.AddField(
            model_name="report",
            name="street_name",
            field=models.CharField(blank=True, max_length=120),
        ),
        migrations.AddField(
            model_name="report",
            name="street_number",
            field=models.CharField(blank=True, max_length=20),
        ),
    ]
