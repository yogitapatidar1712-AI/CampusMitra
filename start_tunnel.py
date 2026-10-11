import subprocess
import re
import time
import sys

print("[TUNNEL] Starting SSH tunnel via localhost.run on port 3000...")
cmd = [
    "ssh",
    "-o", "StrictHostKeyChecking=no",
    "-o", "ServerAliveInterval=30",
    "-o", "ServerAliveCountMax=5",
    "-R", "80:localhost:3000",
    "nokey@localhost.run"
]

try:
    proc = subprocess.Popen(
        cmd,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
        bufsize=1,
        encoding='utf-8',
        errors='replace'
    )

    found_url = None
    for line in iter(proc.stdout.readline, ''):
        match = re.search(r'(https://[a-zA-Z0-9\.\-]+\.lhr\.life)', line)
        if match:
            found_url = match.group(1)
            print("=======================================================")
            print(f"[TUNNEL ACTIVE] URL: {found_url}")
            print(f"[TWILIO WEBHOOK] {found_url}/whatsapp")
            print("=======================================================")
            with open("tunnel_url.txt", "w", encoding='utf-8') as f:
                f.write(f"{found_url}/whatsapp\n")
            break

    # Keep tunnel alive continuously
    while proc.poll() is None:
        time.sleep(1)

except Exception as e:
    print(f"[TUNNEL ERROR] {e}")
