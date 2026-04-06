"""add profile_image_url to students and companies

Revision ID: f1a2b3c4d5e6
Revises: 0d4caeac2c36
Create Date: 2026-01-03

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
import sqlmodel


# revision identifiers, used by Alembic.
revision: str = 'f1a2b3c4d5e6'
down_revision: Union[str, None] = '0d4caeac2c36'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add profile_image_url to students table
    op.add_column('students', sa.Column('profile_image_url', sa.String(), nullable=True))
    
    # Add profile_image_url to companies table
    op.add_column('companies', sa.Column('profile_image_url', sa.String(), nullable=True))


def downgrade() -> None:
    # Remove profile_image_url from students table
    op.drop_column('students', 'profile_image_url')
    
    # Remove profile_image_url from companies table
    op.drop_column('companies', 'profile_image_url')
