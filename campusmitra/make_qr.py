"""Makes qr.png. Students scan it, WhatsApp opens with 'Hi' already typed.
Run:  python make_qr.py 15551234567    (use the number shown in Meta > WhatsApp > API Setup, digits only)"""
import sys, qrcode
num = sys.argv[1] if len(sys.argv) > 1 else input("Bot WhatsApp number (digits only, with country code): ")
img = qrcode.make(f"https://wa.me/{num}?text=Hi")
img.save("qr.png"); print("qr.png saved")
