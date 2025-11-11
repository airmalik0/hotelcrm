"""update_default_currency_to_uzs

Revision ID: f123456789ab
Revises: 9e56747abd1e
Create Date: 2025-11-11 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
import sqlmodel.sql.sqltypes


# revision identifiers, used by Alembic.
revision = 'f123456789ab'
down_revision = '9e56747abd1e'
branch_labels = None
depends_on = None


def upgrade():
    # Update default currency for users table
    op.alter_column('user', 'currency',
                    existing_type=sqlmodel.sql.sqltypes.AutoString(length=3),
                    server_default='UZS')

    # Update existing users to use UZS currency
    op.execute("UPDATE \"user\" SET currency = 'UZS' WHERE currency = 'USD'")


def downgrade():
    # Revert default currency for users table
    op.alter_column('user', 'currency',
                    existing_type=sqlmodel.sql.sqltypes.AutoString(length=3),
                    server_default='USD')

    # Revert existing users to use USD currency
    op.execute("UPDATE \"user\" SET currency = 'USD' WHERE currency = 'UZS'")
