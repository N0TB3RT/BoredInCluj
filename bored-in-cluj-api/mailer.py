import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

# --- SMTP CONFIGURATION ---
# Replace these with your actual Gmail address and the 16-character App Password
SMTP_SERVER = "smtp.gmail.com"
SMTP_PORT = 465
SENDER_EMAIL = "boredincluj@gmail.com"
SENDER_PASSWORD = "iwec bscv bulo nkcm"

def send_system_email(to_email: str, subject: str, html_body: str):
    """
    Opens a secure SSL tunnel to Gmail and transmits an HTML email.
    """
    try:
        # 1. Package the email envelope
        msg = MIMEMultipart()
        msg["From"] = SENDER_EMAIL
        msg["To"] = to_email
        msg["Subject"] = subject

        # 2. Attach the HTML payload
        msg.attach(MIMEText(html_body, "html"))

        # 3. Connect to the server and fire
        with smtplib.SMTP_SSL(SMTP_SERVER, SMTP_PORT) as server:
            server.login(SENDER_EMAIL, SENDER_PASSWORD)
            server.sendmail(SENDER_EMAIL, to_email, msg.as_string())

        print(f"📧 SUCCESS: Transmitted email to {to_email}")
        return True

    except Exception as e:
        print(f"❌ SMTP ERROR: Failed to send email to {to_email}. Details: {e}")
        return False