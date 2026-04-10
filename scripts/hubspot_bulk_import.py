import csv
import sys
import time
import requests
import os
from datetime import datetime

# You can set this via environment variable or replace here directly.
HUBSPOT_API_KEY = os.environ.get("HUBSPOT_API_KEY", "[TU API KEY]")

HUBSPOT_BATCH_UPSERT_URL = "https://api.hubapi.com/crm/v3/objects/contacts/batch/upsert"

def get_first_name(full_name):
    if not full_name:
        return ""
    return full_name.split(" ")[0].strip()

def map_properties(row):
    properties = {}
    
    # Required
    email = row.get("email", "").strip()
    if not email:
        return None  # Skip if no email
        
    properties["email"] = email
    
    # Mapping
    if "companyName" in row and row["companyName"].strip():
        properties["company"] = row["companyName"].strip()
        
    if "firstName" in row and row["firstName"].strip():
        properties["firstname"] = get_first_name(row["firstName"].strip())
        
    if "phone" in row and row["phone"].strip():
        properties["phone"] = row["phone"].strip()
        
    if "website" in row and row["website"].strip():
        properties["website"] = row["website"].strip()
        
    if "city" in row and row["city"].strip():
        properties["city"] = row["city"].strip()
        
    if "province" in row and row["province"].strip():
        properties["state"] = row["province"].strip()
        properties["province_es"] = row["province"].strip()
        
    if "sourceType" in row and row["sourceType"].strip():
        properties["artiverse_segment"] = row["sourceType"].strip()
        
    if "instantly_status" in row and row["instantly_status"].strip():
        properties["instantly_status"] = row["instantly_status"].strip()

    return properties

def main(csv_file):
    print(f"Reading {csv_file}...")
    
    contacts_to_upload = []
    skipped_contacts = 0
    
    try:
        with open(csv_file, mode='r', encoding='utf-8-sig') as f:
            reader = csv.DictReader(f)
            for row in reader:
                properties = map_properties(row)
                if properties:
                    contacts_to_upload.append({
                        "idProperty": "email",
                        "id": properties["email"],
                        "properties": properties
                    })
                else:
                    skipped_contacts += 1
    except FileNotFoundError:
        print(f"Error: Could not find file {csv_file}")
        sys.exit(1)

    total_contacts = len(contacts_to_upload)
    print(f"Found {total_contacts} valid contacts (skipped {skipped_contacts} with no email).")
    
    if total_contacts == 0:
        print("No contacts to upload.")
        sys.exit(0)

    # Prepare log file
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    log_filename = f"hubspot_import_log_{timestamp}.csv"
    
    with open(log_filename, mode='w', encoding='utf-8', newline='') as log_f:
        log_writer = csv.writer(log_f)
        log_writer.writerow(["email", "status", "hubspot_id", "error_message"])
        
        headers = {
            "Authorization": f"Bearer {HUBSPOT_API_KEY}",
            "Content-Type": "application/json"
        }
        
        batch_size = 100
        total_batches = (total_contacts + batch_size - 1) // batch_size
        
        created_or_updated = 0
        error_count = 0
        
        print("\nStarting batch import to HubSpot...")
        
        for i in range(0, total_contacts, batch_size):
            batch = contacts_to_upload[i:i + batch_size]
            batch_num = (i // batch_size) + 1
            
            payload = {
                "inputs": batch
            }
            
            retry_count = 0
            success = False
            
            while not success and retry_count < 5:
                response = requests.post(HUBSPOT_BATCH_UPSERT_URL, json=payload, headers=headers)
                
                if response.status_code in [200, 201]:
                    # Success
                    data = response.json()
                    results = data.get("results", [])
                    
                    for result in results:
                        log_writer.writerow([result.get("id", ""), "SUCCESS", result.get("id"), ""])
                        created_or_updated += 1
                        
                    progress = created_or_updated
                    print(f"✅ Batch {batch_num}/{total_batches}: {len(batch)} contacts sent ({progress}/{total_contacts})")
                    success = True
                    
                elif response.status_code == 429:
                    # Rate limit
                    retry_after = 10 * (2 ** retry_count) # Exponential backoff
                    print(f"❌ Batch {batch_num}: Error 429 rate limit — retrying in {retry_after}s...")
                    time.sleep(retry_after)
                    retry_count += 1
                elif response.status_code == 400:
                    # Bad Request (e.g. invalid property)
                    err_msg = response.json().get("message", "400 Bad Request")
                    print(f"❌ Batch {batch_num}: Error 400 - {err_msg}")
                    # Log errors for individual contacts in batch
                    for contact in batch:
                        log_writer.writerow([contact["id"], "ERROR", "", err_msg])
                        error_count += 1
                    success = True # Move on from this bad batch
                else:
                    # Other errors
                    print(f"❌ Batch {batch_num}: Error {response.status_code} - {response.text}")
                    for contact in batch:
                        log_writer.writerow([contact["id"], "ERROR", "", response.text])
                        error_count += 1
                    success = True # Move on
                    
            if not success:
                print(f"❌ Batch {batch_num}: Failed after {retry_count} retries.")
            
            # Delay to avoid rate limiting
            time.sleep(0.5)

    print("\n--- Final summary ---")
    print(f"✅ {created_or_updated} contacts created/updated")
    print(f"❌ {skipped_contacts + error_count} skipped or failed ({skipped_contacts} no email, {error_count} errors)")
    print(f"Log saved to: {log_filename}")


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python hubspot_bulk_import.py <contacts.csv>")
        sys.exit(1)
        
    csv_file_path = sys.argv[1]
    main(csv_file_path)
