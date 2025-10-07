"""add country_code and region to customer

Revision ID: 3a1c2b7d9f10
Revises: f6bfdf659d90
Create Date: 2025-10-06 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '3a1c2b7d9f10'
down_revision = '88d78804b7dc'
branch_labels = None
depends_on = None


def upgrade():
    # Add columns
    op.add_column('customer', sa.Column('country_code', sa.String(length=2), nullable=True))
    op.add_column('customer', sa.Column('region', sa.String(length=64), nullable=True))

    # Indexes for filtering/grouping
    op.create_index(op.f('ix_customer_country_code'), 'customer', ['country_code'], unique=False)
    op.create_index(op.f('ix_customer_region'), 'customer', ['region'], unique=False)

    # Backfill for existing rows with district set
    # Set country_code='UZ', region='TASHKENT_CITY' where district is not null and fields are null
    op.execute("""
        UPDATE customer
        SET country_code = 'UZ', region = 'TASHKENT_CITY'
        WHERE district IS NOT NULL AND (country_code IS NULL OR region IS NULL)
    """)


def downgrade():
    op.drop_index(op.f('ix_customer_region'), table_name='customer')
    op.drop_index(op.f('ix_customer_country_code'), table_name='customer')
    op.drop_column('customer', 'region')
    op.drop_column('customer', 'country_code')


