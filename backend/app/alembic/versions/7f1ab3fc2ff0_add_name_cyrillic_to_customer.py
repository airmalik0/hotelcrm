"""Add name_cyrillic to customer

Revision ID: 7f1ab3fc2ff0
Revises: 4d225c547808
Create Date: 2025-10-18 22:19:27.803796

"""
from alembic import op
import sqlalchemy as sa
import sqlmodel.sql.sqltypes


# revision identifiers, used by Alembic.
revision = '7f1ab3fc2ff0'
down_revision = '4d225c547808'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('customer', sa.Column('name_cyrillic', sqlmodel.sql.sqltypes.AutoString(length=200), nullable=True))


def downgrade():
    op.drop_column('customer', 'name_cyrillic')
