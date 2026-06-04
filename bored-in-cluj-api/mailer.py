import resend
import os
from dotenv import load_dotenv

# ⚠️ SECURITY WARNING: If your GitHub repo is public, anyone can see this key!
# Future upgrade: use os.environ.get("RESEND_API_KEY") and a .env file.
load_dotenv()

resend.api_key = os.getenv("RESEND_API_KEY")

def send_system_email(to_email: str, subject: str, html_body: str):
    """
    Transmits an HTML email using the Resend API over standard, unblocked HTTPS (Port 443).
    """
    try:
        # NOTE: onboarding@resend.dev is the default testing address.
        # Once you verify your domain in Resend, change this to something like:
        # "Bored In Cluj Security <noreply@boredincluj.me>"
        r = resend.Emails.send({
            "from": "Bored In Cluj <security@boredincluj.me>",
            "to": to_email,
            "subject": subject,
            "html": html_body
        })

        print(f"📧 SUCCESS: Transmitted API email to {to_email}")
        return True

    except Exception as e:
        print(f"❌ API EMAIL ERROR: Failed to send email to {to_email}. Details: {e}")
        return False