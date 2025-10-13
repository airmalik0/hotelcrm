"""Add booking guests and room max occupancy

Revision ID: a1b2c3d4e5f6
Revises: 88d78804b7dc
Create Date: 2025-10-13 18:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
import sqlmodel.sql.sqltypes
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = 'a1b2c3d4e5f6'
down_revision = '674bac539586'
branch_labels = None
depends_on = None


def upgrade():
    # Add max_occupancy to room table
    op.add_column('room', sa.Column('max_occupancy', sa.Integer(), nullable=False, server_default='2'))

    # Create booking_guests table
    op.create_table('booking_guests',
        sa.Column('id', sa.Uuid(), nullable=False),
        sa.Column('booking_id', sa.Uuid(), nullable=False),
        sa.Column('customer_id', sa.Uuid(), nullable=True),
        sa.Column('full_name', sqlmodel.sql.sqltypes.AutoString(length=200), nullable=True),
        sa.Column('passport_photo_path', sqlmodel.sql.sqltypes.AutoString(length=500), nullable=False),
        sa.Column('origin_city', sqlmodel.sql.sqltypes.AutoString(length=100), nullable=False),
        sa.Column('phone', sqlmodel.sql.sqltypes.AutoString(length=20), nullable=True),
        sa.Column('email', sqlmodel.sql.sqltypes.AutoString(length=255), nullable=True),
        sa.Column('is_primary', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('added_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['booking_id'], ['booking.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['customer_id'], ['customer.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_booking_guests_booking_id'), 'booking_guests', ['booking_id'], unique=False)
    op.create_index(op.f('ix_booking_guests_customer_id'), 'booking_guests', ['customer_id'], unique=False)

    # Migrate existing bookings - create primary guest for each booking
    # This uses the booking's customer as the primary guest
    op.execute("""
        INSERT INTO booking_guests (id, booking_id, customer_id, full_name, passport_photo_path, origin_city, is_primary, added_at)
        SELECT
            gen_random_uuid() as id,
            b.id as booking_id,
            b.customer_id,
            CONCAT(c.first_name, ' ', c.last_name) as full_name,
            COALESCE(c.passport_photo_path, 'migrated/default') as passport_photo_path,
            COALESCE(c.region, 'Unknown') as origin_city,
            true as is_primary,
            b.created_at as added_at
        FROM booking b
        JOIN customer c ON b.customer_id = c.id
    """)


def downgrade():
    # Drop indexes
    op.drop_index(op.f('ix_booking_guests_customer_id'), table_name='booking_guests')
    op.drop_index(op.f('ix_booking_guests_booking_id'), table_name='booking_guests')

    # Drop booking_guests table
    op.drop_table('booking_guests')

    # Remove max_occupancy from room table
    op.drop_column('room', 'max_occupancy')
