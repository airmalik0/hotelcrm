"""sms_history: add provider fields

Revision ID: 2b9d3f1a7c01
Revises: 0d7ce46cf090
Create Date: 2025-10-14 19:40:00

"""
from alembic import op
import sqlalchemy as sa
import sqlmodel.sql.sqltypes


# revision identifiers, used by Alembic.
revision = '2b9d3f1a7c01'
down_revision = '0d7ce46cf090'
branch_labels = None
depends_on = None


def upgrade():
    # Table name is 'smshistory' per f6bfdf659d90
    op.add_column('smshistory', sa.Column('provider', sqlmodel.sql.sqltypes.AutoString(length=50), nullable=True))
    op.add_column('smshistory', sa.Column('provider_message_id', sqlmodel.sql.sqltypes.AutoString(length=100), nullable=True))
    op.add_column('smshistory', sa.Column('provider_status', sqlmodel.sql.sqltypes.AutoString(length=50), nullable=True))
    op.add_column('smshistory', sa.Column('error_code', sqlmodel.sql.sqltypes.AutoString(length=50), nullable=True))
    op.add_column('smshistory', sa.Column('user_sms_id', sqlmodel.sql.sqltypes.AutoString(length=100), nullable=True))

    op.create_index(op.f('ix_smshistory_provider'), 'smshistory', ['provider'], unique=False)
    op.create_index(op.f('ix_smshistory_provider_message_id'), 'smshistory', ['provider_message_id'], unique=False)
    op.create_index(op.f('ix_smshistory_user_sms_id'), 'smshistory', ['user_sms_id'], unique=False)


def downgrade():
    op.drop_index(op.f('ix_smshistory_user_sms_id'), table_name='smshistory')
    op.drop_index(op.f('ix_smshistory_provider_message_id'), table_name='smshistory')
    op.drop_index(op.f('ix_smshistory_provider'), table_name='smshistory')

    op.drop_column('smshistory', 'user_sms_id')
    op.drop_column('smshistory', 'error_code')
    op.drop_column('smshistory', 'provider_status')
    op.drop_column('smshistory', 'provider_message_id')
    op.drop_column('smshistory', 'provider')


