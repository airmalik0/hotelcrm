"""add_language_and_currency_to_user

Revision ID: 99514be55752
Revises: 405b3106cee7
Create Date: 2025-10-31 17:18:44.306629

"""
from alembic import op
import sqlalchemy as sa
import sqlmodel.sql.sqltypes


# revision identifiers, used by Alembic.
revision = '99514be55752'
down_revision = '405b3106cee7'
branch_labels = None
depends_on = None


def upgrade():
    # Add language column with default value 'en'
    op.add_column('user', sa.Column('language', sqlmodel.sql.sqltypes.AutoString(length=10), nullable=False, server_default='en'))
    # Add currency column with default value 'USD'
    op.add_column('user', sa.Column('currency', sqlmodel.sql.sqltypes.AutoString(length=3), nullable=False, server_default='USD'))


def downgrade():
    op.drop_column('user', 'currency')
    op.drop_column('user', 'language')
