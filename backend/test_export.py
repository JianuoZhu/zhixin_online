import urllib.request
import urllib.parse
import json

base_url = "http://localhost:8000"

def get_token():
    req = urllib.request.Request(
        f"{base_url}/api/auth/login",
        data=json.dumps({"email": "admin@example.com", "password": "ChangeMe123!"}).encode("utf-8"),
        headers={"Content-Type": "application/json"}
    )
    with urllib.request.urlopen(req) as res:
        return json.loads(res.read().decode("utf-8"))["access_token"]

def test_export():
    token = get_token()
    req = urllib.request.Request(
        f"{base_url}/api/export/registrations",
        headers={"Authorization": f"Bearer {token}"}
    )
    try:
        with urllib.request.urlopen(req) as res:
            content = res.read()
            print("Status:", res.status)
            print("Headers:", res.info())
            print("Raw prefix:", content[:20])
            with open("test_out.csv", "wb") as f:
                f.write(content)
            print("Successfully saved to test_out.csv")
    except urllib.error.HTTPError as e:
        print("HTTP Error:", e.code, e.reason)
        print(e.read().decode('utf-8'))

if __name__ == "__main__":
    test_export()
