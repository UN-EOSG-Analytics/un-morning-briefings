import os
import psycopg2
from psycopg2 import sql
from datetime import datetime, timedelta
from dotenv import load_dotenv
import sys
import uuid

load_dotenv()

# Database connection
connection = psycopg2.connect(
    host=os.getenv('AZURE_POSTGRES_HOST'),
    database=os.getenv('AZURE_POSTGRES_DB'),
    user=os.getenv('AZURE_POSTGRES_USER'),
    password=os.getenv('AZURE_POSTGRES_PASSWORD'),
    port=os.getenv('AZURE_POSTGRES_PORT', 5432),
    sslmode='require'
)
cursor = connection.cursor()

# Example data
example_entries = [
    {
        'category': 'Article',
        'priority': 'sg-attention',
        'region': 'Africa - East',
        'country': 'Ethiopia',
        'headline': 'Regional Tensions Escalate in Horn of Africa',
        'entry': '<p>New developments in the Horn of Africa region with increased military activities reported near border regions.</p>',
        'source_url': 'https://example.com/article1',
        'pu_note': 'Needs immediate attention',
        'author': 'John Smith',
        'status': 'submitted',
        'approved': True,
    },
    {
        'category': 'Code Cable',
        'priority': 'situational-awareness',
        'region': 'Africa - West',
        'country': 'Nigeria',
        'headline': 'Humanitarian Crisis Updates from Lagos',
        'entry': '<p>Updates on the ongoing humanitarian situation in Lagos with new displacement reports.</p>',
        'source_url': 'https://example.com/cable1',
        'pu_note': '',
        'author': 'Jane Doe',
        'status': 'submitted',
        'approved': True,
    },
    {
        'category': 'Meeting Note/Summary',
        'priority': 'sg-attention',
        'region': 'Americas - North',
        'country': 'United States',
        'headline': 'Security Council Session Summary',
        'entry': '<p>Summary of the latest Security Council meeting discussing international peace and security.</p>',
        'source_url': '',
        'pu_note': 'Confidential - internal use only',
        'author': 'Robert Johnson',
        'status': 'submitted',
        'approved': True,
    },
    {
        'category': 'SitRep',
        'priority': 'situational-awareness',
        'region': 'Asia - Southeast',
        'country': 'Myanmar',
        'headline': 'Situation Report: Yangon Region Stability',
        'entry': '<p>Current status report on Yangon with updates on civilian movements and infrastructure.</p>',
        'source_url': 'https://example.com/sitrep1',
        'pu_note': '',
        'author': 'Maria Garcia',
        'status': 'submitted',
        'approved': False,
    },
    {
        'category': 'Article',
        'priority': 'situational-awareness',
        'region': 'Europe - Western',
        'country': 'Germany',
        'headline': 'EU Economic Forum Concludes',
        'entry': '<p>Economic forum in Berlin concludes with new trade agreements and policy discussions.</p>',
        'source_url': 'https://example.com/article2',
        'pu_note': '',
        'author': 'Klaus Mueller',
        'status': 'submitted',
        'approved': True,
    },
    {
        'category': 'Code Cable',
        'priority': 'sg-attention',
        'region': 'Asia - South',
        'country': 'Afghanistan',
        'headline': 'Humanitarian Access Challenges',
        'entry': '<p>Humanitarian organizations reporting restricted access to remote areas. Cross-border operations facing delays.</p>',
        'source_url': 'https://example.com/cable2',
        'pu_note': 'Critical - needs follow-up',
        'author': 'Ahmed Hassan',
        'status': 'submitted',
        'approved': True,
    },
    {
        'category': 'Meeting Note/Summary',
        'priority': 'situational-awareness',
        'region': 'Americas - Central',
        'country': 'Guatemala',
        'headline': 'UNHCR Regional Office Meeting',
        'entry': '<p>Discussion on refugee management and integration programs in Central America.</p>',
        'source_url': '',
        'pu_note': '',
        'author': 'Carmen Rodriguez',
        'status': 'submitted',
        'approved': True,
    },
    {
        'category': 'Other UN Internal Document',
        'priority': 'situational-awareness',
        'region': 'Africa - Central',
        'country': 'Democratic Republic of Congo',
        'headline': 'Security Update: Eastern Provinces',
        'entry': '<p>Security assessment of eastern provinces with details on armed group movements and IDP situations.</p>',
        'source_url': 'https://example.com/doc1',
        'pu_note': '',
        'author': 'Michel Dupont',
        'status': 'submitted',
        'approved': True,
    },
    {
        'category': 'Article',
        'priority': 'situational-awareness',
        'region': 'Asia - East',
        'country': 'North Korea',
        'headline': 'Regional Military Activities Monitored',
        'entry': '<p>Continuous monitoring of military activities in the region with latest intelligence updates.</p>',
        'source_url': 'https://example.com/article3',
        'pu_note': '',
        'author': 'Lee Min-jun',
        'status': 'submitted',
        'approved': False,
    },
    {
        'category': 'SitRep',
        'priority': 'sg-attention',
        'region': 'Middle East',
        'country': 'Syria',
        'headline': 'Humanitarian Corridor Status Report',
        'entry': '<p>Latest update on humanitarian corridors with data on beneficiaries and supply deliveries.</p>',
        'source_url': 'https://example.com/sitrep2',
        'pu_note': 'For immediate dissemination',
        'author': 'Fatima Al-Rashid',
        'status': 'submitted',
        'approved': True,
    },
    {
        'category': 'Code Cable',
        'priority': 'situational-awareness',
        'region': 'Africa - North',
        'country': 'Libya',
        'headline': 'Tripoli Security Assessment',
        'entry': '<p>Current security assessment of Tripoli with details on recent incidents and stability measures.</p>',
        'source_url': 'https://example.com/cable3',
        'pu_note': '',
        'author': 'Hassan Ibrahim',
        'status': 'submitted',
        'approved': True,
    },
    {
        'category': 'Meeting Note/Summary',
        'priority': 'situational-awareness',
        'region': 'Africa - Southern',
        'country': 'South Africa',
        'headline': 'Regional Cooperation Summit Notes',
        'entry': '<p>Notes from the regional cooperation summit discussing SADC initiatives and cross-border programs.</p>',
        'source_url': '',
        'pu_note': '',
        'author': 'Thandi Mkhize',
        'status': 'submitted',
        'approved': True,
    },
    {
        'category': 'Article',
        'priority': 'sg-attention',
        'region': 'Americas - South',
        'country': 'Venezuela',
        'headline': 'Mass Migration Flow Updates',
        'entry': '<p>Significant updates on migration patterns with regional impact assessments and humanitarian concerns.</p>',
        'source_url': 'https://example.com/article4',
        'pu_note': 'Escalating situation - monitor closely',
        'author': 'Carlos Mendez',
        'status': 'submitted',
        'approved': True,
    },
    {
        'category': 'SitRep',
        'priority': 'situational-awareness',
        'region': 'Asia - Central',
        'country': 'Kazakhstan',
        'headline': 'Border Region Stability Update',
        'entry': '<p>Regular update on border region stability with notes on cross-border activities and local governance.</p>',
        'source_url': 'https://example.com/sitrep3',
        'pu_note': '',
        'author': 'Amir Karimov',
        'status': 'submitted',
        'approved': True,
    },
    {
        'category': 'Code Cable',
        'priority': 'sg-attention',
        'region': 'Middle East',
        'country': 'Yemen',
        'headline': 'Cholera Outbreak Alert',
        'entry': '<p>Health alert regarding cholera outbreak with epidemiological data and urgent intervention recommendations.</p>',
        'source_url': 'https://example.com/cable4',
        'pu_note': 'Public health emergency',
        'author': 'Dr. Youssef Mohammed',
        'status': 'submitted',
        'approved': True,
    },
    {
        'category': 'Other UN Internal Document',
        'priority': 'situational-awareness',
        'region': 'Europe - Western',
        'country': 'France',
        'headline': 'UNODC Partnership Update',
        'entry': '<p>Update on UN Office on Drugs and Crime partnership initiatives and counter-narcotics activities.</p>',
        'source_url': 'https://example.com/doc2',
        'pu_note': '',
        'author': 'Philippe Leclerc',
        'status': 'submitted',
        'approved': False,
    },
    {
        'category': 'Article',
        'priority': 'situational-awareness',
        'region': 'Asia - South',
        'country': 'Pakistan',
        'headline': 'Flood Damage Assessment Report',
        'entry': '<p>Comprehensive assessment of recent flooding with damage estimates and recovery planning discussions.</p>',
        'source_url': 'https://example.com/article5',
        'pu_note': '',
        'author': 'Sana Khan',
        'status': 'submitted',
        'approved': True,
    },
    {
        'category': 'Meeting Note/Summary',
        'priority': 'situational-awareness',
        'region': 'Middle East',
        'country': 'Israel',
        'headline': 'UNRWA Coordination Meeting',
        'entry': '<p>Coordination meeting with UNRWA discussing refugee services and humanitarian operations.</p>',
        'source_url': '',
        'pu_note': '',
        'author': 'David Cohen',
        'status': 'submitted',
        'approved': True,
    },
    {
        'category': 'SitRep',
        'priority': 'sg-attention',
        'region': 'Africa - East',
        'country': 'Somalia',
        'headline': 'Al-Shabaab Activity Monitoring',
        'entry': '<p>Ongoing monitoring of Al-Shabaab activities with operational updates and security assessments.</p>',
        'source_url': 'https://example.com/sitrep4',
        'pu_note': 'Terrorist group tracking',
        'author': 'Abdulrahman Ali',
        'status': 'submitted',
        'approved': True,
    },
    {
        'category': 'Code Cable',
        'priority': 'situational-awareness',
        'region': 'Americas - Central',
        'country': 'Honduras',
        'headline': 'Gang Violence Escalation Report',
        'entry': '<p>Report on escalating gang violence with community impact and law enforcement challenges.</p>',
        'source_url': 'https://example.com/cable5',
        'pu_note': '',
        'author': 'Rosa Martinez',
        'status': 'submitted',
        'approved': True,
    },
]

try:
    # Get today's date and create dates for the past week
    today = datetime.now().date()
    
    for i, entry in enumerate(example_entries):
        # Distribute entries across the past 7 days
        days_back = (i % 7)
        entry_date = today - timedelta(days=days_back)
        
        insert_query = sql.SQL(
            '''INSERT INTO pu_morning_briefings.entries 
            (id, category, priority, region, country, headline, date, entry, source_url, pu_note, author, status, approved, updated_at)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)'''
        )
        
        entry_id = str(uuid.uuid4())
        
        cursor.execute(insert_query, (
            entry_id,
            entry['category'],
            entry['priority'],
            entry['region'],
            entry['country'],
            entry['headline'],
            entry_date,
            entry['entry'],
            entry['source_url'],
            entry['pu_note'],
            entry['author'],
            entry['status'],
            entry['approved'],
            datetime.now(),
        ))
    
    connection.commit()
    print(f"✓ Successfully inserted {len(example_entries)} example entries into the database!")
    print(f"  - {sum(1 for e in example_entries if e['approved'])} approved entries")
    print(f"  - {sum(1 for e in example_entries if not e['approved'])} pending approval")
    
except Exception as e:
    connection.rollback()
    print(f"✗ Error inserting entries: {e}", file=sys.stderr)
    sys.exit(1)
finally:
    cursor.close()
    connection.close()
