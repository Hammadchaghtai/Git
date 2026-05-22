import json

input_file = r'c:\Users\malib\Documents\fyp\New Project FYP\backend\complete_seed_data.json'
output_file = r'c:\Users\malib\Documents\fyp\New Project FYP\backend\filtered_seed_data.json'

include_models = [
    "compliance.framework",
    "compliance.control",
    "compliance.department",
    "compliance.policy",
    "compliance.risk",
    "compliance.wazuhmapping",
    "compliance.agentprofile",
    "compliance.systemsettings",
    "compliance.smtpsettings",
    "compliance.compliancescan",
    "compliance.scanresult",
    "django_celery_beat.crontabschedule",
    "django_celery_beat.intervalschedule",
    "django_celery_beat.periodictask",
]

with open(input_file, 'r', encoding='utf-8') as f:
    data = json.load(f)

# Filter items
filtered_data = [item for item in data if item['model'] in include_models]

with open(output_file, 'w', encoding='utf-8') as f:
    json.dump(filtered_data, f, indent=4)

print(f"Included {len(filtered_data)} items from {len(data)}. Saved to {output_file}")
