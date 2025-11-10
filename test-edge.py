import urllib.request
import json

url = "https://cqfhayframohiulwauny.supabase.co/functions/v1/monitor-documentos-oficiales"
headers = {
    "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNxZmhheWZyYW1vaGl1bHdhdW55Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MTk0NzQ5NCwiZXhwIjoyMDc3NTIzNDk0fQ.CtrvHtM1urfgMd2UMSOK3tjnpxSOe0oLuQ9qBEyVC4g",
    "Content-Type": "application/json"
}

print("Testing Edge Function...")
try:
    req = urllib.request.Request(url, headers=headers, data=b'{}', method='POST')
    with urllib.request.urlopen(req, timeout=30) as response:
        status = response.status
        body = response.read().decode('utf-8')
        
        print(f"Status: {status}")
        print(f"Body length: {len(body)}")
        print(f"Body: {body}")
        
        if body:
            try:
                data = json.loads(body)
                print(f"\nParsed JSON:")
                print(json.dumps(data, indent=2))
            except:
                print("\nNot valid JSON")
except urllib.error.HTTPError as e:
    print(f"HTTP Error {e.code}: {e.reason}")
    print(f"Body: {e.read().decode('utf-8')}")
except urllib.error.URLError as e:
    if 'timed out' in str(e.reason):
        print("Request timed out after 30s")
    else:
        print(f"URL Error: {e.reason}")
except Exception as e:
    print(f"Error: {e}")
