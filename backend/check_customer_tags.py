from sqlmodel import Session, select

from app.core.db import engine
from app.models.customer import Customer


def check() -> None:
    with Session(engine) as session:
        result = session.exec(
            select(Customer).where(Customer.id == "8203a7be-b0bc-4b33-bbe6-872446d5e1b7")
        )
        customer = result.first()
        if customer:
            print(f"Customer: {customer.first_name} {customer.last_name}")
            print(f"Tags: {customer.tags}")
            print(f"Tags type: {type(customer.tags)}")
        else:
            print("Customer not found")


check()
