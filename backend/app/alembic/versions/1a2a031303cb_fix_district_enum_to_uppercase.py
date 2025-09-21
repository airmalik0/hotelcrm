"""fix_district_enum_to_uppercase

Revision ID: 1a2a031303cb
Revises: 322cf8b5d6e3
Create Date: 2025-09-21 20:40:57.351535

"""
from alembic import op
import sqlalchemy as sa
import sqlmodel.sql.sqltypes


# revision identifiers, used by Alembic.
revision = '1a2a031303cb'
down_revision = '322cf8b5d6e3'
branch_labels = None
depends_on = None


def upgrade():
    # First, we need to drop the old enum and create a new one with uppercase values
    # This is complex because we need to handle existing data (if any)

    # Step 1: Add a temporary column
    op.add_column('customer', sa.Column('district_temp', sa.String(), nullable=True))

    # Step 2: Copy existing data to temp column (converting to uppercase)
    op.execute("""
        UPDATE customer
        SET district_temp = CASE
            WHEN district = 'Almazar' THEN 'ALMAZAR'
            WHEN district = 'Bektemir' THEN 'BEKTEMIR'
            WHEN district = 'Mirabad' THEN 'MIRABAD'
            WHEN district = 'Mirzo Ulugbek' THEN 'MIRZO_ULUGBEK'
            WHEN district = 'Sergeli' THEN 'SERGELI'
            WHEN district = 'Uchtepa' THEN 'UCHTEPA'
            WHEN district = 'Chilanzar' THEN 'CHILANZAR'
            WHEN district = 'Shaykhantakhur' THEN 'SHAYKHANTAKHUR'
            WHEN district = 'Yunusabad' THEN 'YUNUSABAD'
            WHEN district = 'Yakkasaray' THEN 'YAKKASARAY'
            WHEN district = 'Yashnabad' THEN 'YASHNABAD'
            WHEN district = 'Yangihayot' THEN 'YANGIHAYOT'
            ELSE district::text
        END
        WHERE district IS NOT NULL
    """)

    # Step 3: Drop the old district column
    op.drop_column('customer', 'district')

    # Step 4: Drop the old enum type
    op.execute("DROP TYPE IF EXISTS district CASCADE")

    # Step 5: Create new enum with uppercase values
    district_enum = sa.Enum(
        'ALMAZAR', 'BEKTEMIR', 'MIRABAD', 'MIRZO_ULUGBEK',
        'SERGELI', 'UCHTEPA', 'CHILANZAR', 'SHAYKHANTAKHUR',
        'YUNUSABAD', 'YAKKASARAY', 'YASHNABAD', 'YANGIHAYOT',
        name='district'
    )
    district_enum.create(op.get_bind())

    # Step 6: Add the district column back with the new enum
    op.add_column('customer', sa.Column('district', district_enum, nullable=True))

    # Step 7: Copy data from temp column back to district
    op.execute("""
        UPDATE customer
        SET district = district_temp::district
        WHERE district_temp IS NOT NULL
    """)

    # Step 8: Drop the temporary column
    op.drop_column('customer', 'district_temp')


def downgrade():
    # Reverse the process
    op.add_column('customer', sa.Column('district_temp', sa.String(), nullable=True))

    op.execute("""
        UPDATE customer
        SET district_temp = CASE
            WHEN district = 'ALMAZAR' THEN 'Almazar'
            WHEN district = 'BEKTEMIR' THEN 'Bektemir'
            WHEN district = 'MIRABAD' THEN 'Mirabad'
            WHEN district = 'MIRZO_ULUGBEK' THEN 'Mirzo Ulugbek'
            WHEN district = 'SERGELI' THEN 'Sergeli'
            WHEN district = 'UCHTEPA' THEN 'Uchtepa'
            WHEN district = 'CHILANZAR' THEN 'Chilanzar'
            WHEN district = 'SHAYKHANTAKHUR' THEN 'Shaykhantakhur'
            WHEN district = 'YUNUSABAD' THEN 'Yunusabad'
            WHEN district = 'YAKKASARAY' THEN 'Yakkasaray'
            WHEN district = 'YASHNABAD' THEN 'Yashnabad'
            WHEN district = 'YANGIHAYOT' THEN 'Yangihayot'
            ELSE district::text
        END
        WHERE district IS NOT NULL
    """)

    op.drop_column('customer', 'district')
    op.execute("DROP TYPE IF EXISTS district CASCADE")

    # Create old enum with Title Case values
    district_enum = sa.Enum(
        'Almazar', 'Bektemir', 'Mirabad', 'Mirzo Ulugbek',
        'Sergeli', 'Uchtepa', 'Chilanzar', 'Shaykhantakhur',
        'Yunusabad', 'Yakkasaray', 'Yashnabad', 'Yangihayot',
        name='district'
    )
    district_enum.create(op.get_bind())

    op.add_column('customer', sa.Column('district', district_enum, nullable=True))

    op.execute("""
        UPDATE customer
        SET district = district_temp::district
        WHERE district_temp IS NOT NULL
    """)

    op.drop_column('customer', 'district_temp')
