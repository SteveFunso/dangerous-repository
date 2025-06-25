# VIOLATION: Critical path + Financial flaws + Security issues
import sqlite3

class PaymentProcessor:
    def __init__(self):
        self.conn = sqlite3.connect('payments.db')
        
    # VIOLATION: Using float for currency (Rule 3)
    def calculate_total(self, amount, tax_rate):
        return amount + (amount * tax_rate)  # Floating point arithmetic
    
    # VIOLATION: SQL injection risk (Rule 2)
    def save_payment(self, user_id, amount, credit_card):
        query = f"INSERT INTO payments VALUES ({user_id}, {amount}, '{credit_card}')"
        self.conn.execute(query)  # Raw SQL execution
    
    # VIOLATION: PII exposure (Rule 2)
    def log_transaction(self, details):
        print(f"Processing payment: {details}")
        # VIOLATION: No encryption of sensitive data
        with open("payments.log", "a") as f:
            f.write(f"{details}\n")
    
    # VIOLATION: No test coverage (Rule 4)
    def refund(self, payment_id):
        # VIOLATION: No idempotency check (Rule 5)
        self.conn.execute(f"DELETE FROM payments WHERE id = {payment_id}")
